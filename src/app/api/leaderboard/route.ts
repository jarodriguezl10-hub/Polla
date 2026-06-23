export const revalidate = 60; // Cache on Vercel Edge for 60 seconds
import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    let users: any[] = [];
    let recentMatches: any[] = [];
    let recentPredictions: any[] = [];

    if (isRealSupabase) {
      // 1. Obtener todos los usuarios con sus stats de puntos
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, points, diff_matches, winner_matches, exact_matches, paid, created_at, receive_emails, accepted_data_policy, accepted_transparency, is_disabled');
      
      if (userError) throw new Error("Supabase users fetch failed");
      users = userData || [];

      // 2. Obtener SOLO los últimos 5 partidos jugados para las rachas (en lugar de todos los partidos)
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, kickoff_utc, score_a, score_b, played')
        .eq('played', true)
        .order('kickoff_utc', { ascending: false })
        .limit(5);

      if (matchError) throw new Error("Supabase matches fetch failed: " + matchError.message);
      recentMatches = matchData || [];

      const last5Ids = recentMatches.map(m => m.id);

      // 3. Obtener SOLO las predicciones de esos 5 últimos partidos
      if (last5Ids.length > 0) {
        const { data: predsData, error: predsError } = await supabase
          .from('predictions')
          .select('user_id, match_id, score_a, score_b, points_earned')
          .in('match_id', last5Ids);
        
        if (predsError) throw new Error("Supabase predictions fetch failed");
        recentPredictions = predsData || [];
      }

    } else {
      // Fallback a JSON local...
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      users = db.users || [];
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
        receive_emails: u.receive_emails !== false,
        accepted_data_policy: u.accepted_data_policy === true,
        accepted_transparency: u.accepted_transparency === true,
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
      const exactDiff = b.exact_matches - a.exact_matches;
      if (exactDiff !== 0) return exactDiff;
      const winnerDiff = b.winner_matches - a.winner_matches;
      if (winnerDiff !== 0) return winnerDiff;
      const diffDiff = b.diff_matches - a.diff_matches;
      if (diffDiff !== 0) return diffDiff;
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
      const exactDiff = b.prev_exact - a.prev_exact;
      if (exactDiff !== 0) return exactDiff;
      const winnerDiff = b.prev_winner - a.prev_winner;
      if (winnerDiff !== 0) return winnerDiff;
      const diffDiff = b.prev_diff - a.prev_diff;
      if (diffDiff !== 0) return diffDiff;
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
    return NextResponse.json(enrichedUsers);
  } catch (error) {
    console.error("Error in leaderboard API:", error);
    return NextResponse.json({ error: "Error al recuperar la clasificación" }, { status: 500 });
  }
}
