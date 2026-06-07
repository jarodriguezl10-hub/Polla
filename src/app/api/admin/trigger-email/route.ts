import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';
import nodemailer from 'nodemailer';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { matchId, adminEmail, isTest } = await request.json();
    if (!matchId || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // 1. Verify admin permissions
    let isAdmin = false;
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    if (isRealSupabase) {
      const { data: adminUser } = await supabase.from('users').select('*').ilike('email', normalizedAdminEmail).single();
      isAdmin = adminUser?.role === 'admin';
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const adminUser = db.users.find((u: any) => u.email.toLowerCase() === normalizedAdminEmail);
        isAdmin = adminUser?.role === 'admin';
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    if (!isRealSupabase) {
      return NextResponse.json({ error: "No connection to Supabase" }, { status: 500 });
    }

    // 2. Fetch the specific match
    const { data: match, error: mErr } = await supabase
      .from('matches')
      .select('id, team_a, team_b, kickoff_utc, played, emails_sent')
      .eq('id', matchId)
      .single();

    if (mErr || !match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    // 3. Fetch users who WANT emails (receive_emails = true)
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, name, email, points, diff_matches, winner_matches, exact_matches, created_at, receive_emails')
      .neq('receive_emails', false);
    
    if (uErr) throw uErr;
    if (!users || users.length === 0) return NextResponse.json({ error: "No hay suscriptores a quienes enviar" }, { status: 400 });

    // 4. Setup Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // If isTest is true, ONLY send to the admin's email.
    let bccEmails = users.filter((u: any) => u.email).map((u: any) => u.email).join(',');
    if (isTest) {
      bccEmails = normalizedAdminEmail;
      console.log("TEST MODE: Sending ONLY to admin email:", bccEmails);
    }

    // 5. Get predictions for this match
    const { data: predictions, error: pErr } = await supabase
      .from('predictions')
      .select('user_id, score_a, score_b, created_at')
      .eq('match_id', match.id);
    
    if (pErr) throw pErr;

    let rowsHtml = '';
    
    // Sort all users for the table
    const { data: allUsers } = await supabase.from('users').select('id, name, points, diff_matches, winner_matches, exact_matches, created_at');
    const tableUsers = allUsers || [];

    const sortedUsers = [...tableUsers].sort((a: any, b: any) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      const diffDiff = (b.diff_matches || 0) - (a.diff_matches || 0);
      if (diffDiff !== 0) return diffDiff;
      const winnerDiff = (b.winner_matches || 0) - (a.winner_matches || 0);
      if (winnerDiff !== 0) return winnerDiff;
      const exactDiff = (b.exact_matches || 0) - (a.exact_matches || 0);
      if (exactDiff !== 0) return exactDiff;
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });

    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const pos = i + 1;
      const p = (predictions || []).find((pred: any) => pred.user_id === user.id);
      const scoreText = p && p.score_a !== null && p.score_b !== null ? `<strong>${p.score_a} - ${p.score_b}</strong>` : `<span style="color: #999">No pronosticó</span>`;
      const pointsText = `${user.points || 0} pts`;
      
      rowsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><span style="color: #64748b; font-size: 0.85em; margin-right: 4px;">#${pos}</span> ${user.name || 'Usuario'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${scoreText}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #0284c7; font-weight: bold;">${pointsText}</td>
        </tr>
      `;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⚽ Recibo Oficial de Pronósticos</h2>
          <p style="margin: 5px 0 0 0; color: #94a3b8;">Polla Mundialista 2026</p>
          ${isTest ? '<p style="color: #fdb462; font-weight: bold; margin-top: 10px;">[MODO PRUEBA - ENVÍO MANUAL]</p>' : ''}
        </div>
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hola,</p>
          <p>El partido <strong>${match.team_a} vs ${match.team_b}</strong> ha sido bloqueado oficialmente y el balón está a punto de rodar.</p>
          <p>Para garantizar el 100% de transparencia en el juego, adjuntamos la copia exacta de todos los pronósticos guardados por los participantes antes del pitazo inicial.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Participante</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #cbd5e1;">Marcador</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
            Este es un correo automático generado por el sistema de auditoría.<br/>
            Si no deseas recibir estos correos, el administrador puede desactivarlos en su panel.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Polla Mundial 2026" <noreply@pollamundial.com>',
      to: 'noreply@pollamundial.com', 
      bcc: bccEmails, 
      subject: `${isTest ? '[TEST] ' : ''}🔒 Auditoría Cerrada: Pronósticos ${match.team_a} vs ${match.team_b}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    // Marcar partido como enviado si NO es prueba, o incluso si es prueba podemos dejarlo marcado o no.
    // Dado que el usuario dice "cuando manualmente se envia debe cambiar de color", we'll mark it true even in test, or we'll just mark it true always so the button state changes.
    await supabase.from('matches').update({ emails_sent: true }).eq('id', matchId);

    revalidatePath('/dashboard');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Trigger Email Error:", error);
    return NextResponse.json({ error: error.message || "Error interno enviando correo" }, { status: 500 });
  }
}
