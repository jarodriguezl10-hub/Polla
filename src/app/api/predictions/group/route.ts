import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const now = new Date().getTime();
    let matches: any[] = [];
    let predictions: any[] = [];
    let users: any[] = [];

    if (isRealSupabase) {
      const [mRes, pRes, uRes] = await Promise.all([
        supabase.from('matches').select('*'),
        supabase.from('predictions').select('*'),
        supabase.from('users').select('*')
      ]);

      if (mRes.error || pRes.error || uRes.error) {
        throw new Error("Supabase fetch failed");
      }

      matches = mRes.data;
      predictions = pRes.data;
      users = uRes.data;
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      matches = db.matches;
      predictions = db.predictions;
      users = db.users;
    }

    // Filter matches that are locked (kickoff <= 10 mins from now)
    const lockedMatchIds = matches
      .filter((m: any) => {
        const kickoff = new Date(m.kickoff_utc || m.date).getTime();
        return (kickoff - now) < 10 * 60 * 1000;
      })
      .map((m: any) => m.id);

    // Filter predictions to only include locked matches
    const publicPredictions = predictions.filter((p: any) => lockedMatchIds.includes(p.match_id));

    // Map user names
    const mapped = publicPredictions.map((p: any) => {
      const user = users.find((u: any) => u.id === p.user_id);
      return {
        matchId: p.match_id,
        userName: user ? user.name : "Usuario",
        scoreA: p.score_a,
        scoreB: p.score_b,
        pointsEarned: p.points_earned
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error in group predictions API:", error);
    return NextResponse.json({ error: "Error al recuperar los pronósticos del grupo" }, { status: 500 });
  }
}
