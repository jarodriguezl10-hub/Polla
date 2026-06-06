import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: "Falta el ID del partido" }, { status: 400 });
    }

    // 1. Fetch Match Details
    let match: any;
    let users: any[] = [];
    let predictions: any[] = [];

    if (isRealSupabase) {
      const { data: mData, error: mErr } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (mErr || !mData) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      match = mData;

      if (match.emails_sent) {
        return NextResponse.json({ error: "El correo ya fue enviado para este partido" }, { status: 400 });
      }

      const { data: uData } = await supabase.from('users').select('id, name, email, points, diff_matches, winner_matches, exact_matches, created_at, receive_emails');
      users = uData || [];

      const { data: pData } = await supabase.from('predictions').select('user_id, score_a, score_b, created_at').eq('match_id', matchId);
      predictions = pData || [];
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      match = db.matches.find((m: any) => m.id === matchId);
      if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      if (match.emails_sent) {
        return NextResponse.json({ error: "El correo ya fue enviado para este partido" }, { status: 400 });
      }
      users = db.users || [];
      predictions = (db.predictions || []).filter((p: any) => p.match_id === matchId);
    }

    // Prepare BCC list
    const bccEmails = users.filter((u: any) => u.email && u.receive_emails !== false).map((u: any) => u.email).join(',');

    // 2. Format HTML table with all predictions
    let rowsHtml = '';
    
    // Sort users by leaderboard position
    const sortedUsers = [...users].sort((a: any, b: any) => {
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
      const p = predictions.find(pred => pred.user_id === user.id);
      const scoreText = p ? `<strong>${p.score_a} - ${p.score_b}</strong>` : `<span style="color: #999">No pronosticó</span>`;
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
        </div>
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hola,</p>
          <p>El partido <strong>${match.team_a} vs ${match.team_b}</strong> ha sido bloqueado oficialmente.</p>
          <p>Para garantizar la 100% transparencia del juego, adjuntamos la copia exacta de todos los pronósticos guardados por los participantes antes del pitazo inicial.</p>
          
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
            Este es un correo automático generado por el sistema de auditoría. Los datos mostrados no pueden ser alterados.
          </p>
        </div>
      </div>
    `;

    // 3. Send email using Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Polla Mundial 2026" <noreply@pollamundial.com>',
      to: 'jarodriguezl10@gmail.com, cristhiancamilo@gmail.com', // Administradores directos
      bcc: bccEmails, // Todos los usuarios suscritos en copia oculta
      subject: `🔒 Auditoría: Pronósticos ${match.team_a} vs ${match.team_b}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);

    // Update match so it doesn't send again
    if (isRealSupabase) {
      await supabase.from('matches').update({ emails_sent: true }).eq('id', matchId);
    } else {
      match.emails_sent = true;
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      const dbMatch = db.matches.find((m: any) => m.id === matchId);
      if (dbMatch) {
        dbMatch.emails_sent = true;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error sending audit emails:", error);
    return NextResponse.json({ error: error.message || "Error al enviar correos" }, { status: 500 });
  }
}
