import { NextResponse } from 'next/server';
import { supabase, isRealSupabase, calculatePredictionPoints } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { matchId, scoreA, scoreB, adminEmail } = await request.json();
    if (!matchId || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // 1. Verify admin permissions
    let isAdmin = false;

    if (isRealSupabase) {
      const { data: adminUser } = await supabase.from('users').select('*').eq('email', adminEmail).single();
      isAdmin = adminUser?.role === 'admin';
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const adminUser = db.users.find((u: any) => u.email === adminEmail);
        isAdmin = adminUser?.role === 'admin';
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    // 2. Prepare scores
    const cleanScoreA = scoreA === null || scoreA === "" ? null : parseInt(scoreA);
    const cleanScoreB = scoreB === null || scoreB === "" ? null : parseInt(scoreB);
    const played = cleanScoreA !== null && cleanScoreB !== null;

    if (isRealSupabase) {
      // 3. Fetch Old Match State
      const { data: oldMatch, error: fetchMatchError } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (fetchMatchError || !oldMatch) throw new Error("Match not found");

      // 4. Update the Match
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          score_a: cleanScoreA,
          score_b: cleanScoreB,
          played
        })
        .eq('id', matchId);
      if (matchError) throw matchError;

      // 5. Fetch all users
      const { data: users, error: usersError } = await supabase.from('users').select('*');
      if (usersError || !users) throw usersError;

      // 6. Fetch all predictions for THIS specific match (paginated to handle >1000 users seamlessly)
      let matchPredictions: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.from('predictions').select('*').eq('match_id', matchId).range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          matchPredictions.push(...data);
          page++;
          if (data.length < 1000) hasMore = false;
        }
      }

      // 7. Calculate Deltas and Update Users
      for (const pred of matchPredictions) {
        // Calculate old stats
        const oldStats = calculatePredictionPoints(pred.score_a, pred.score_b, oldMatch.score_a, oldMatch.score_b, oldMatch.phase);
        // Calculate new stats
        const newStats = calculatePredictionPoints(pred.score_a, pred.score_b, cleanScoreA, cleanScoreB, oldMatch.phase);

        // Calculate differences
        const pointDiff = newStats.points - oldStats.points;
        const exactDiff = (newStats.exact ? 1 : 0) - (oldStats.exact ? 1 : 0);
        const winnerDiff = (newStats.winner ? 1 : 0) - (oldStats.winner ? 1 : 0);
        const diffDiff = (newStats.diff ? 1 : 0) - (oldStats.diff ? 1 : 0);

        // If there's a difference, update the user
        if (pointDiff !== 0 || exactDiff !== 0 || winnerDiff !== 0 || diffDiff !== 0) {
          const user = users.find((u: any) => u.id === pred.user_id);
          if (user) {
            user.points = (user.points || 0) + pointDiff;
            user.exact_matches = (user.exact_matches || 0) + exactDiff;
            user.winner_matches = (user.winner_matches || 0) + winnerDiff;
            user.diff_matches = (user.diff_matches || 0) + diffDiff;

            await supabase.from('users').update({
              points: user.points,
              exact_matches: user.exact_matches,
              winner_matches: user.winner_matches,
              diff_matches: user.diff_matches
            }).eq('id', user.id);
          }
        }

        // Always update the prediction points if they changed
        if (newStats.points !== (pred.points_earned || 0)) {
          await supabase.from('predictions').update({
            points_earned: newStats.points
          }).eq('id', pred.id);
        }
      }
    } else {
      // Local Mock DB Logic
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const matchIndex = db.matches.findIndex((m: any) => m.id === matchId);
      if (matchIndex !== -1) {
        const oldMatch = { ...db.matches[matchIndex] };
        
        // Update match
        db.matches[matchIndex].score_a = cleanScoreA;
        db.matches[matchIndex].score_b = cleanScoreB;
        db.matches[matchIndex].played = played;

        // Apply Deltas to all predictions for this match
        const matchPredictions = db.predictions.filter((p: any) => p.match_id === matchId);
        
        for (const pred of matchPredictions) {
          const oldStats = calculatePredictionPoints(pred.score_a, pred.score_b, oldMatch.score_a, oldMatch.score_b, oldMatch.phase);
          const newStats = calculatePredictionPoints(pred.score_a, pred.score_b, cleanScoreA, cleanScoreB, oldMatch.phase);

          const pointDiff = newStats.points - oldStats.points;
          const exactDiff = (newStats.exact ? 1 : 0) - (oldStats.exact ? 1 : 0);
          const winnerDiff = (newStats.winner ? 1 : 0) - (oldStats.winner ? 1 : 0);
          const diffDiff = (newStats.diff ? 1 : 0) - (oldStats.diff ? 1 : 0);

          const user = db.users.find((u: any) => u.id === pred.user_id);
          if (user) {
            user.points = (user.points || 0) + pointDiff;
            user.exact_matches = (user.exact_matches || 0) + exactDiff;
            user.winner_matches = (user.winner_matches || 0) + winnerDiff;
            user.diff_matches = (user.diff_matches || 0) + diffDiff;
          }

          pred.points_earned = newStats.points;
        }

        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    revalidatePath('/api/leaderboard');
    revalidatePath('/api/matches');
    revalidatePath('/api/predictions/group');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in admin match update:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
