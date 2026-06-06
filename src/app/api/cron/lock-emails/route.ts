import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';
import nodemailer from 'nodemailer';

export async function GET(request: Request) {
  try {
    // Vercel Cron sends a specific header, but we allow manual trigger via GET for testing
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    if (!isRealSupabase) {
      return NextResponse.json({ error: "No connection to Supabase" }, { status: 500 });
    }

    const now = new Date().getTime();

    // 1. Encontrar partidos que se acaban de bloquear (Faltan <= 10 mins) y NO han enviado emails
    const { data: matches, error: mErr } = await supabase
      .from('matches')
      .select('id, team_a, team_b, kickoff_utc, played, emails_sent')
      .eq('emails_sent', false)
      .eq('played', false);

    if (mErr) throw mErr;
    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: "No pending matches" });
    }

    const lockedMatches = matches.filter((m: any) => {
      const kickoff = new Date(m.kickoff_utc).getTime();
      const diffMins = (kickoff - now) / (60 * 1000);
      return diffMins <= 10 && diffMins >= -120; // Only matches currently happening or about to happen
    });

    if (lockedMatches.length === 0) {
      return NextResponse.json({ message: "No matches locking right now" });
    }

    // 2. Fetch users who WANT emails (receive_emails = true)
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, name, email, points, diff_matches, winner_matches, exact_matches, created_at, receive_emails')
      .neq('receive_emails', false); // Get true or null
    
    if (uErr) throw uErr;
    if (!users || users.length === 0) return NextResponse.json({ message: "No subscribers" });

    // 3. Setup Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const bccEmails = users.filter((u: any) => u.email).map((u: any) => u.email).join(',');
    let sentCount = 0;

    // 4. Procesar cada partido bloqueado
    for (const match of lockedMatches) {
      // Obtener todos los pronósticos de ese partido
      const { data: predictions, error: pErr } = await supabase
        .from('predictions')
        .select('user_id, score_a, score_b, created_at')
        .eq('match_id', match.id);
      
      if (pErr) continue;

      let rowsHtml = '';
      
      // Sort all users (even those who don't receive emails, for the table)
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
        to: 'noreply@pollamundial.com', // Se envía a un noreply
        bcc: bccEmails, // Copia oculta a todos los participantes con receive_emails = true
        subject: `🔒 Auditoría Cerrada: Pronósticos ${match.team_a} vs ${match.team_b}`,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      sentCount++;

      // Marcar partido como enviado
      await supabase.from('matches').update({ emails_sent: true }).eq('id', match.id);
    }

    return NextResponse.json({ success: true, processed: lockedMatches.length, emailsSent: sentCount });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
