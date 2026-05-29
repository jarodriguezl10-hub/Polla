import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: "Email no válido" }, { status: 400 });
    }

    // Check if user exists in the database
    let userExists = false;
    if (isRealSupabase) {
      const { data } = await supabase.from('users').select('id').eq('email', email);
      if (data && data.length > 0) {
        userExists = true;
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      // Ensure file exists
      if (!fs.existsSync(DB_PATH)) {
        // Will be created on demand, but for safety:
        userExists = false;
      } else {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const existing = db.users.find((u: any) => u.email === email);
        if (existing) {
          userExists = true;
        }
      }
    }

    // If user does not exist and name is not provided, prompt client to ask for it
    if (!userExists && !name) {
      return NextResponse.json({
        exists: false,
        requiresName: true,
        message: "El correo no está registrado. Por favor, ingresa tu nombre."
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 1. Save OTP in DB
    if (isRealSupabase) {
      // Real Supabase insert
      // Delete old OTPs for this email first
      await supabase.from('otps').delete().eq('email', email);
      const { error } = await supabase.from('otps').insert({ email, code, expires_at: expiresAt });
      if (error) {
        console.error("Error saving OTP to real Supabase:", error);
        return NextResponse.json({ error: "Error al guardar OTP" }, { status: 500 });
      }
    } else {
      // Mock Client insert
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      db.otps = db.otps.filter((o: any) => o.email !== email);
      db.otps.push({ email, code, expiresAt });
      
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }

    console.log(`[AUTH] Código OTP generado para ${email}: ${code}`);

    // 2. Send email via Nodemailer
    let transporter = null;
    let etherealPreviewUrl = null;
    let isEthereal = false;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      isEthereal = false;
    } else {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        isEthereal = true;
      } catch (e) {
        console.error("No se pudo iniciar Nodemailer Ethereal:", e);
      }
    }

    if (transporter) {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Polla Mundial 2026" <noreply@pollamundial.com>',
        to: email,
        subject: `⚽ Tu Código OTP: ${code} - Polla Mundial 2026`,
        html: `
          <div style="background-color: #f8fafc; color: #0f172a; padding: 30px; font-family: 'Outfit', sans-serif; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #10b981; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 40px;">🏆</span>
              <h1 style="color: #059669; margin: 10px 0 0 0; font-size: 24px;">Polla Mundial 2026</h1>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.5; color: #475569;">Hola,</p>
            <p style="font-size: 16px; line-height: 1.5; color: #0f172a;">Has solicitado un código único de un solo uso (OTP) para acceder al panel de la Polla.</p>
            <div style="text-align: center; margin: 30px 0; background: rgba(16, 185, 129, 0.05); border: 1px dashed #10b981; padding: 20px; border-radius: 8px;">
              <span style="font-size: 14px; text-transform: uppercase; color: #475569; display: block; margin-bottom: 5px;">Tu Código OTP</span>
              <strong style="font-size: 32px; letter-spacing: 4px; color: #059669; font-family: monospace;">${code}</strong>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">Este código expirará en 10 minutos.<br>Si no lo solicitaste, puedes omitir este correo.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">Versión 1.0.0 | Creador: Alejandro Rodriguez</p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      if (isEthereal) {
        etherealPreviewUrl = nodemailer.getTestMessageUrl(info);
      }
    }

    return NextResponse.json({
      success: true,
      message: "OTP enviado correctamente",
      previewUrl: etherealPreviewUrl
    });
  } catch (error: any) {
    console.error("Error in OTP request API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
