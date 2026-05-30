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

    // Sort users by leaderboard criteria
    users.sort((a: any, b: any) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      const diffDiff = (b.diff_matches || 0) - (a.diff_matches || 0);
      if (diffDiff !== 0) return diffDiff;
      const winnerDiff = (b.winner_matches || 0) - (a.winner_matches || 0);
      if (winnerDiff !== 0) return winnerDiff;
      const exactDiff = (b.exact_matches || 0) - (a.exact_matches || 0);
      if (exactDiff !== 0) return exactDiff;
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });

    const mapped: any[] = [];
    for (const matchId of lockedMatchIds) {
      for (const user of users) {
        const p = predictions.find((p: any) => p.user_id === user.id && p.match_id === matchId);
        mapped.push({
          matchId: matchId,
          userName: user.name || "Usuario",
          scoreA: p ? p.score_a : null,
          scoreB: p ? p.score_b : null,
          pointsEarned: p ? p.points_earned : null
        });
      }
    }

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error in group predictions API:", error);
    return NextResponse.json({ error: "Error al recuperar los pronósticos del grupo" }, { status: 500 });
  }
}
