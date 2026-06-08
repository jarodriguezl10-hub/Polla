import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';
import { calculatePredictionPoints } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    // Optional: Validate admin
    // For this one-time script we just run it directly.

    let users: any[] = [];
    let matches: any[] = [];
    let predictions: any[] = [];

    if (isRealSupabase) {
      const { data: u } = await supabase.from('users').select('*');
      const { data: m } = await supabase.from('matches').select('*');
      
      // Fetch all predictions with pagination
      let allPreds = [];
      let from = 0;
      let step = 999;
      while (true) {
        const { data: p } = await supabase.from('predictions').select('*').range(from, from + step);
        if (!p || p.length === 0) break;
        allPreds.push(...p);
        from += step + 1;
      }
      
      users = u || [];
      matches = m || [];
      predictions = allPreds;
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        users = db.users || [];
        matches = db.matches || [];
        predictions = db.predictions || [];
      }
    }

    // Reset user stats
    const userStats = new Map();
    users.forEach(u => {
      userStats.set(u.id, {
        points: 0,
        exact_matches: 0,
        winner_matches: 0,
        diff_matches: 0
      });
    });

    const predUpdates = [];

    // Recalculate
    for (const pred of predictions) {
      const match = matches.find(m => m.id === pred.match_id);
      if (!match || match.score_a === null || match.score_b === null || match.score_a === undefined || match.score_b === undefined) {
        continue;
      }

      const stats = calculatePredictionPoints(
        pred.score_a,
        pred.score_b,
        match.score_a,
        match.score_b,
        match.phase
      );

      predUpdates.push({
        id: pred.id,
        points_earned: stats.points
      });

      const uStats = userStats.get(pred.user_id);
      if (uStats) {
        uStats.points += stats.points;
        if (stats.exact) uStats.exact_matches += 1;
        if (stats.winner) uStats.winner_matches += 1;
        uStats.diff_matches += (stats.diff || 0); // diff now stores exact goals count
      }
    }

    // Update Database
    if (isRealSupabase) {
      // Update users
      for (const [userId, stats] of userStats.entries()) {
        await supabase.from('users').update({
          points: stats.points,
          exact_matches: stats.exact_matches,
          winner_matches: stats.winner_matches,
          diff_matches: stats.diff_matches
        }).eq('id', userId);
      }
      
      // Update predictions points
      for (const update of predUpdates) {
        await supabase.from('predictions').update({
          points_earned: update.points_earned
        }).eq('id', update.id);
      }

    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      db.users.forEach((u: any) => {
        const s = userStats.get(u.id);
        if (s) {
          u.points = s.points;
          u.exact_matches = s.exact_matches;
          u.winner_matches = s.winner_matches;
          u.diff_matches = s.diff_matches;
        }
      });

      db.predictions.forEach((p: any) => {
        const u = predUpdates.find(up => up.id === p.id);
        if (u) {
          p.points_earned = u.points_earned;
        }
      });

      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }

    return NextResponse.json({ success: true, message: 'All scores recalculated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
