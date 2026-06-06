import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (isRealSupabase) {
      const { error } = await supabase
        .from('users')
        .update({
          role: 'rejected'
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      const user = db.users.find((u: any) => u.id === userId);
      if (user) {
        user.role = 'rejected';
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en reject-policies API:", error);
    return NextResponse.json({ error: "Error al rechazar políticas" }, { status: 500 });
  }
}
