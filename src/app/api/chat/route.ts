import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

// GET: Retrieve all chat messages
export async function GET() {
  try {
    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const messages = db.chat_messages || [];
      // Sort by date ascending
      const sorted = [...messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return NextResponse.json(sorted);
    }
  } catch (error) {
    console.error("Error in GET chat API:", error);
    return NextResponse.json({ error: "Error al recuperar mensajes" }, { status: 500 });
  }
}

// POST: Send a new chat message
export async function POST(request: Request) {
  try {
    const { userId, userName, text } = await request.json();
    if (!userId || !userName || !text) {
      return NextResponse.json({ error: "Faltan parámetros del mensaje" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          user_name: userName,
          text,
          created_at: timestamp
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, message: data });
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      if (!db.chat_messages) db.chat_messages = [];

      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user_id: userId,
        user_name: userName,
        text,
        created_at: timestamp
      };

      db.chat_messages.push(newMessage);
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

      return NextResponse.json({ success: true, message: newMessage });
    }
  } catch (error) {
    console.error("Error in POST chat API:", error);
    return NextResponse.json({ error: "Error al guardar el mensaje" }, { status: 500 });
  }
}
