import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { userId, matchId, scoreA, scoreB } = await request.json();
    if (!userId || !matchId || scoreA === undefined || scoreB === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // 1. Fetch match and check kickoff lock
    let match = null;

    if (isRealSupabase) {
      const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (error || !data) {
        return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      }
      match = data;
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      match = db.matches.find((m: any) => m.id === matchId);
      if (!match) {
        return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      }
    }

    // Lock validation: 10 minutes before kickoff (server UTC time)
    const now = new Date().getTime();
    const kickoff = new Date(match.kickoff_utc || match.date).getTime();
    const diffMs = kickoff - now;
    if (diffMs < 10 * 60 * 1000) {
      return NextResponse.json({ error: "El partido está cerrado. No se admiten pronósticos a menos de 10 minutos de iniciar." }, { status: 400 });
    }

    // 2. Save prediction
    if (isRealSupabase) {
      // Delete old prediction if exists (or upsert)
      const { error } = await supabase
        .from('predictions')
        .upsert({
          user_id: userId,
          match_id: matchId,
          score_a: parseInt(scoreA),
          score_b: parseInt(scoreB),
          points_earned: 0
        }, { onConflict: 'user_id,match_id' });

      if (error) {
        console.error("Supabase prediction save error:", error);
        return NextResponse.json({ error: "Error al guardar el pronóstico" }, { status: 500 });
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      let index = db.predictions.findIndex((p: any) => p.user_id === userId && p.match_id === matchId);
      if (index !== -1) {
        db.predictions[index].score_a = parseInt(scoreA);
        db.predictions[index].score_b = parseInt(scoreB);
      } else {
        db.predictions.push({
          id: `p_${userId}_${matchId}`,
          user_id: userId,
          match_id: matchId,
          score_a: parseInt(scoreA),
          score_b: parseInt(scoreB),
          points_earned: 0
        });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in save prediction API:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
