import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

// GET: Retrieve chat messages (public messages + private messages related to the user)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter in JS to support missing column gracefully if migration hasn't run yet
      const filtered = (data || []).filter((msg: any) => {
        if (!msg.recipient_ids) return true; // public message
        if (!userId) return false; // hide private messages if no user context
        const ids = msg.recipient_ids.split(',');
        return msg.user_id === userId || ids.includes(userId);
      });

      return NextResponse.json(filtered);
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const messages = db.chat_messages || [];
      const filtered = messages.filter((msg: any) => {
        if (!msg.recipient_ids) return true; // public message
        if (!userId) return false;
        const ids = msg.recipient_ids.split(',');
        return msg.user_id === userId || ids.includes(userId);
      });

      // Sort by date ascending
      const sorted = [...filtered].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return NextResponse.json(sorted);
    }
  } catch (error) {
    console.error("Error in GET chat API:", error);
    return NextResponse.json({ error: "Error al recuperar mensajes" }, { status: 500 });
  }
}

// POST: Send a new chat message (supports optional recipientIds)
export async function POST(request: Request) {
  try {
    const { userId, userName, text, recipientIds } = await request.json();
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
          created_at: timestamp,
          recipient_ids: recipientIds || null
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
        created_at: timestamp,
        recipient_ids: recipientIds || null
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
