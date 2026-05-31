import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: "Falta el matchId" }, { status: 400 });
    }

    // 1. Check if already announced
    let alreadyAnnounced = false;
    if (isRealSupabase) {
      const { data } = await supabase
        .from('chat_messages')
        .select('id')
        .like('text', `%[MatchID: ${matchId}]%`)
        .limit(1);
      alreadyAnnounced = data && data.length > 0;
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        alreadyAnnounced = (db.chat_messages || []).some((msg: any) => 
          msg.text.includes(`[MatchID: ${matchId}]`)
        );
      }
    }

    if (alreadyAnnounced) {
      return NextResponse.json({ success: true, alreadyAnnounced: true });
    }

    // 2. Fetch match details
    let match: any = null;
    let predictions: any[] = [];
    let users: any[] = [];

    if (isRealSupabase) {
      const [mRes, pRes, uRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('predictions').select('*').eq('match_id', matchId),
        supabase.from('users').select('*')
      ]);
      match = mRes.data;
      predictions = pRes.data || [];
      users = uRes.data || [];
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        match = db.matches.find((m: any) => m.id === matchId);
        predictions = (db.predictions || []).filter((p: any) => p.match_id === matchId);
        users = db.users || [];
      }
    }

    if (!match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    // 3. Format predictions (Admin only)
    const SUPER_ADMIN_EMAILS = ['jarodriguezl10@gmail.com', 'cristhiancamilo@gmail.com'];
    const adminUsers = users.filter(u => SUPER_ADMIN_EMAILS.includes(u.email.toLowerCase()));

    let alejandroPredictionText = "";
    if (adminUsers.length > 0) {
      // Find Alejandro by name or emails
      const alejandro = adminUsers.find(u => 
        (u.name && u.name.toLowerCase().includes('alejandro rodriguez')) || 
        u.email === 'jarodriguezl10@gmail.com' || 
        u.email === 'jrodriguezl10@gmail.com'
      );
      
      if (alejandro) {
        const pred = predictions.find(p => p.user_id === alejandro.id);
        const scoreStr = pred ? `${pred.score_a} - ${pred.score_b}` : 'Sin pronóstico 🚫';
        alejandroPredictionText = `👤 **Pronóstico Alejandro Rodriguez:** ${scoreStr}`;
      }
    }

    const chatMsg = `🔒 **PARTIDO INICIADO** — ${match.team_a} vs ${match.team_b} El partido se ha bloqueado. ${alejandroPredictionText}`.trim();

    // 4. Save to chat messages
    const timestamp = new Date().toISOString();
    if (isRealSupabase) {
      await supabase.from('chat_messages').insert({
        user_id: null,
        user_name: '🤖 Notificación automática',
        text: chatMsg,
        created_at: timestamp
      });
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const newMessage = {
          id: `msg_sys_${Date.now()}`,
          user_id: null,
          user_name: '🤖 Notificación automática',
          text: chatMsg,
          created_at: timestamp
        };

        if (!db.chat_messages) db.chat_messages = [];
        db.chat_messages.push(newMessage);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true, announced: true });
  } catch (error) {
    console.error("Error in announce predictions API:", error);
    return NextResponse.json({ error: "Error al anunciar pronósticos" }, { status: 500 });
  }
}
