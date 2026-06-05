import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export const revalidate = 60; // Cache on Vercel Edge for 60 seconds

export async function GET() {
  try {
    let users: any[] = [];
    let recentMatches: any[] = [];
    let recentPredictions: any[] = [];

    if (isRealSupabase) {
      // 1. Fetch ALL users (just 77 rows, tiny payload)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, points, diff_matches, winner_matches, exact_matches, paid, created_at');
      if (userError) throw userError;
      users = userData || [];

      // 2. Fetch only the last 5 played matches to calculate streaks and trends efficiently
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, kickoff_utc, score_a, score_b, played')
        .eq('played', true)
        .order('kickoff_utc', { ascending: false })
        .limit(5);
      
      if (matchError) throw matchError;
      recentMatches = matchData || [];

      // 3. Fetch predictions ONLY for those last 5 matches (Max 5 * 77 = 385 rows!)
      if (recentMatches.length > 0) {
        const matchIds = recentMatches.map((m: any) => m.id);
        const { data: predData, error: predError } = await supabase
          .from('predictions')
          .select('user_id, match_id, score_a, score_b, points_earned')
          .in('match_id', matchIds);
        
        if (predError) throw predError;
        recentPredictions = predData || [];
      }
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      users = db.users || [];
      recentMatches = (db.matches || []).filter((m: any) => m.played).sort((a: any, b: any) => {
        const dateA = new Date(a.kickoff_utc || a.date).getTime();
        const dateB = new Date(b.kickoff_utc || b.date).getTime();
        return dateB - dateA; // Descending
      }).slice(0, 5);
      
      const matchIds = recentMatches.map((m: any) => m.id);
      recentPredictions = (db.predictions || []).filter((p: any) => matchIds.includes(p.match_id));
    }

    const lastPlayedMatch = recentMatches[0]; // The most recent played match

    // Map each user to their stats structure for calculation
    const userStatsMap: { [key: string]: any } = {};
    users.forEach((u: any) => {
      userStatsMap[u.id] = {
        user: u,
        // Current values
        points: u.points || 0,
        diff_matches: u.diff_matches || 0,
        winner_matches: u.winner_matches || 0,
        exact_matches: u.exact_matches || 0,
        created_at: u.created_at || new Date().toISOString(),
        // Previous values (before last match was resolved)
        prev_points: u.points || 0,
        prev_diff: u.diff_matches || 0,
        prev_winner: u.winner_matches || 0,
        prev_exact: u.exact_matches || 0,
        streak: 0
      };
    });

    // Subtract last match's score contributions to find the previous state
    if (lastPlayedMatch) {
      recentPredictions.forEach((pred: any) => {
        if (pred.match_id === lastPlayedMatch.id) {
          const stats = userStatsMap[pred.user_id];
          if (stats) {
            stats.prev_points -= (pred.points_earned || 0);

            const score_a = pred.score_a;
            const score_b = pred.score_b;
            const real_a = lastPlayedMatch.score_a;
            const real_b = lastPlayedMatch.score_b;

            if (score_a !== null && score_b !== null && real_a !== null && real_b !== null) {
              const predWinner = score_a > score_b ? 1 : (score_a < score_b ? -1 : 0);
              const realWinner = real_a > real_b ? 1 : (real_a < real_b ? -1 : 0);

              if (predWinner === realWinner) {
                stats.prev_winner -= 1;

                const predDiff = score_a - score_b;
                const realDiff = real_a - real_b;
                if (predDiff === realDiff) {
                  stats.prev_diff -= 1;
                }

                if (score_a === real_a && score_b === real_b) {
                  stats.prev_exact -= 1;
                }
              }
            }
          }
        }
      });
    }

    // Calculate active streaks from most recent played match backwards (up to 5)
    users.forEach((u: any) => {
      let activeStreak = 0;
      for (const match of recentMatches) {
        const pred = recentPredictions.find((p: any) => p.user_id === u.id && p.match_id === match.id);
        if (pred && pred.score_a === match.score_a && pred.score_b === match.score_b) {
          activeStreak++;
        } else {
          break; // Streak broken
        }
      }
      if (userStatsMap[u.id]) {
        userStatsMap[u.id].streak = activeStreak;
      }
    });

    // Compute Rankings
    const statsList = Object.values(userStatsMap);

    // Current ranking
    statsList.sort((a: any, b: any) => {
      const pointsDiff = b.points - a.points;
      if (pointsDiff !== 0) return pointsDiff;
      const diffDiff = b.diff_matches - a.diff_matches;
      if (diffDiff !== 0) return diffDiff;
      const winnerDiff = b.winner_matches - a.winner_matches;
      if (winnerDiff !== 0) return winnerDiff;
      const exactDiff = b.exact_matches - a.exact_matches;
      if (exactDiff !== 0) return exactDiff;
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });
    statsList.forEach((stat: any, idx: number) => {
      stat.currentRank = idx + 1;
    });

    // Previous ranking
    statsList.sort((a: any, b: any) => {
      const pointsDiff = b.prev_points - a.prev_points;
      if (pointsDiff !== 0) return pointsDiff;
      const diffDiff = b.prev_diff - a.prev_diff;
      if (diffDiff !== 0) return diffDiff;
      const winnerDiff = b.prev_winner - a.prev_winner;
      if (winnerDiff !== 0) return winnerDiff;
      const exactDiff = b.prev_exact - a.prev_exact;
      if (exactDiff !== 0) return exactDiff;
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });
    statsList.forEach((stat: any, idx: number) => {
      stat.prevRank = idx + 1;
    });

    // Enrich users with trend and streak
    const enrichedUsers = statsList.map((stat: any) => {
      let trend: 'up' | 'down' | 'same' = 'same';
      if (lastPlayedMatch) {
        if (stat.currentRank < stat.prevRank) trend = 'up';
        else if (stat.currentRank > stat.prevRank) trend = 'down';
      }
      return {
        ...stat.user,
        trend,
        streak: stat.streak,
        currentRank: stat.currentRank
      };
    });

    // Sort final list by current rank before returning
    enrichedUsers.sort((a: any, b: any) => a.currentRank - b.currentRank);

    // Return with Cache headers (revalidate already tells Next.js App Router to cache)
    return NextResponse.json(enrichedUsers, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error("Error in leaderboard API:", error);
    return NextResponse.json({ error: "Error al recuperar la clasificación" }, { status: 500 });
  }
}
