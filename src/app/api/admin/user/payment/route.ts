import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

const ADMIN_EMAILS = ['jarodriguezl10@gmail.com', 'jrodriguezl10@gmail.com', 'mario.montalvo@gmail.com', 'cristhiancamilo@gmail.com'];

export async function POST(request: Request) {
  try {
    const { userId, paid, adminEmail } = await request.json();
    if (!userId || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Verify admin
    let isAdmin = false;
    if (ADMIN_EMAILS.includes(adminEmail.trim().toLowerCase())) {
      isAdmin = true;
    } else if (isRealSupabase) {
      const { data: adminUser } = await supabase.from('users').select('role').eq('email', adminEmail.trim().toLowerCase()).single();
      isAdmin = adminUser?.role === 'admin';
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const adminUser = db.users.find((u: any) => u.email.toLowerCase() === adminEmail.trim().toLowerCase());
        isAdmin = adminUser?.role === 'admin';
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    if (isRealSupabase) {
      const { error } = await supabase
        .from('users')
        .update({ paid: !!paid })
        .eq('id', userId);

      if (error) {
        console.error("Error updating user payment in Supabase:", error);
        return NextResponse.json({ 
          error: "Error en base de datos. Asegúrate de ejecutar en el SQL Editor de Supabase: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;" 
        }, { status: 500 });
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const user = db.users.find((u: any) => u.id === userId);
        if (user) {
          user.paid = !!paid;
          fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        } else {
          return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in payment update route:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
