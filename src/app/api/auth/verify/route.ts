import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { email: rawEmail, code, name } = await request.json();
    if (!rawEmail || !code) {
      return NextResponse.json({ error: "Email y código son obligatorios" }, { status: 400 });
    }
    const email = rawEmail.trim().toLowerCase();

    let isValid = false;

    // 1. Verify OTP
    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('otps')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Código OTP incorrecto o expirado" }, { status: 400 });
      }

      const isExpired = new Date() > new Date(data.expires_at);
      if (isExpired) {
        await supabase.from('otps').delete().eq('email', email);
        return NextResponse.json({ error: "Código OTP expirado" }, { status: 400 });
      }

      isValid = true;
      // Delete OTP once verified
      await supabase.from('otps').delete().eq('email', email);
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const otpIndex = db.otps.findIndex((o: any) => o.email === email && o.code === code);
      if (otpIndex === -1) {
        return NextResponse.json({ error: "Código OTP incorrecto" }, { status: 400 });
      }

      const otp = db.otps[otpIndex];
      const isExpired = new Date() > new Date(otp.expiresAt);
      
      // Delete OTP
      db.otps.splice(otpIndex, 1);
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

      if (isExpired) {
        return NextResponse.json({ error: "Código OTP expirado" }, { status: 400 });
      }

      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json({ error: "Verificación fallida" }, { status: 400 });
    }

    // 2. Fetch or Create User
    let user = null;

    if (isRealSupabase) {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!fetchError && existingUser) {
        user = existingUser;
      } else {
        // Create user in real Supabase
        const defaultName = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
        const cleanName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        const finalName = name && name.trim() ? name.trim() : cleanName;
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email,
            name: finalName,
            role: 'user',
            points: 0,
            exact_matches: 0,
            winner_matches: 0,
            diff_matches: 0
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating user in Supabase:", insertError);
          return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
        }
        user = newUser;
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      let existingUser = db.users.find((u: any) => u.email === email);
      if (existingUser) {
        user = existingUser;
      } else {
        const defaultName = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
        const cleanName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        const finalName = name && name.trim() ? name.trim() : cleanName;
        
        user = {
          id: "u_" + Date.now(),
          email,
          name: finalName,
          role: 'user',
          points: 0,
          exact_matches: 0,
          winner_matches: 0,
          diff_matches: 0
        };
        db.users.push(user);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
