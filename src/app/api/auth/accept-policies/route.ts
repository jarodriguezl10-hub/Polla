import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId es obligatorio" }, { status: 400 });
    }

    if (isRealSupabase) {
      const { error } = await supabase
        .from('users')
        .update({ 
          accepted_data_policy: true,
          accepted_transparency: true
        })
        .eq('id', userId);

      if (error) {
        console.error("Error updating policies in Supabase:", error);
        return NextResponse.json({ error: "Error al actualizar políticas" }, { status: 500 });
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const userIndex = db.users.findIndex((u: any) => u.id === userId);
      if (userIndex !== -1) {
        db.users[userIndex].accepted_data_policy = true;
        db.users[userIndex].accepted_transparency = true;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      } else {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en accept-policies API:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
