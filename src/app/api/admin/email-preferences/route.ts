import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { preferences } = await request.json();
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: "Preferencias inválidas" }, { status: 400 });
    }

    if (isRealSupabase) {
      // Supabase does not support bulk updates natively with a single query easily via JS client unless using RPC.
      // So we will loop and update. Since it's only ~80 users and only Admin does this, it's fine.
      const promises = Object.entries(preferences).map(([userId, receive]) => {
        return supabase
          .from('users')
          .update({ receive_emails: receive })
          .eq('id', userId);
      });

      await Promise.all(promises);
    } else {
      // Fallback
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        Object.entries(preferences).forEach(([userId, receive]) => {
          const u = db.users.find((user: any) => user.id === userId);
          if (u) u.receive_emails = receive;
        });
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving email preferences:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
