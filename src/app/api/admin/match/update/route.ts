import { NextResponse } from 'next/server';
import { supabase, isRealSupabase, recalculateMockScores } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { matchId, scoreA, scoreB, adminEmail } = await request.json();
    if (!matchId || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // 1. Verify admin permissions
    let isAdmin = false;
    let users: any[] = [];

    if (isRealSupabase) {
      const { data: adminUser } = await supabase.from('users').select('*').eq('email', adminEmail).single();
      isAdmin = adminUser?.role === 'admin';
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      const adminUser = db.users.find((u: any) => u.email === adminEmail);
      isAdmin = adminUser?.role === 'admin';
      users = db.users;
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    // 2. Update score
    const cleanScoreA = scoreA === null || scoreA === "" ? null : parseInt(scoreA);
    const cleanScoreB = scoreB === null || scoreB === "" ? null : parseInt(scoreB);
    const played = cleanScoreA !== null && cleanScoreB !== null;

    if (isRealSupabase) {
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          score_a: cleanScoreA,
          score_b: cleanScoreB,
          played
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Real Supabase: Let's do the recalculations
      const [mRes, pRes, uRes] = await Promise.all([
        supabase.from('matches').select('*'),
        supabase.from('predictions').select('*'),
        supabase.from('users').select('*')
      ]);

      if (!mRes.error && !pRes.error && !uRes.error) {
        // Run same logic to update in real Supabase database
        const dbState = { matches: mRes.data, predictions: pRes.data, users: uRes.data };
        
        // Custom JS recalculation function running on the server
        recalculateMockScores(dbState);

        // Save back users and predictions points to database
        for (const user of dbState.users) {
          await supabase.from('users').update({
            points: user.points,
            exact_matches: user.exact_matches,
            winner_matches: user.winner_matches,
            diff_matches: user.diff_matches
          }).eq('id', user.id);
        }

        for (const pred of dbState.predictions) {
          await supabase.from('predictions').update({
            points_earned: pred.points_earned
          }).eq('id', pred.id);
        }
      }

    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const match = db.matches.find((m: any) => m.id === matchId);
      if (match) {
        match.score_a = cleanScoreA;
        match.score_b = cleanScoreB;
        match.played = played;

        recalculateMockScores(db);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in admin match update:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
