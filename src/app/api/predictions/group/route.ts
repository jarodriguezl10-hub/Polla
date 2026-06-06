import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache on Vercel Edge for 60 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    if (!matchId) return NextResponse.json({ error: "Falta matchId" }, { status: 400 });

    const now = new Date().getTime();
    let matches: any[] = [];
    let predictions: any[] = [];
    let users: any[] = [];

    if (isRealSupabase) {
      // 1. Fetch the specific match to determine if it is locked
      const { data: matchesData, error: mErr } = await supabase.from('matches').select('id, kickoff_utc, played').eq('id', matchId).single();
      if (mErr || !matchesData) throw new Error("Supabase matches fetch failed");
      
      const kickoff = new Date(matchesData.kickoff_utc || matchesData.date).getTime();
      const isLocked = (kickoff - now) < 10 * 60 * 1000 || matchesData.played;

      if (!isLocked) return NextResponse.json([]); // Don't expose predictions if not locked

      const lockedMatchIds = [matchId];

      // 2. Fetch users
      const { data: usersData, error: uErr } = await supabase
        .from('users')
        .select('id, name, points, diff_matches, winner_matches, exact_matches, created_at');
      if (uErr) throw new Error("Supabase users fetch failed");
      users = usersData || [];

      // 3. Fetch predictions ONLY for this single locked match
      const { data: predsData, error: pErr } = await supabase
        .from('predictions')
        .select('user_id, match_id, score_a, score_b, points_earned, created_at')
        .eq('match_id', matchId);
      
      if (pErr) throw new Error("Supabase predictions fetch failed");
      predictions = predsData || [];
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const m = db.matches.find((m: any) => m.id === matchId);
      if (!m) throw new Error("Match not found");
      const kickoff = new Date(m.kickoff_utc || m.date).getTime();
      const isLocked = (kickoff - now) < 10 * 60 * 1000 || m.played;
      if (!isLocked) return NextResponse.json([]);

      predictions = (db.predictions || []).filter((p: any) => p.match_id === matchId);
      users = db.users || [];
    }

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
    for (const user of users) {
      const p = predictions.find((p: any) => p.user_id === user.id && p.match_id === matchId);
      mapped.push({
        matchId: matchId,
        userName: user.name || "Usuario",
        scoreA: p ? p.score_a : null,
        scoreB: p ? p.score_b : null,
        pointsEarned: p ? p.points_earned : null,
        updatedAt: p ? p.created_at : null
      });
    }

    // Set Cache-Control to 1 YEAR. This uses Vercel Edge Cache.
    // The CDN will store this exact match ID response and Supabase will never be hit again.
    return NextResponse.json(mapped, {
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
        'Cache-Tag': `polla_b_match_${matchId}` // Future-proofing for multi-tournament
      }
    });
  } catch (error) {
    console.error("Error in group predictions API:", error);
    return NextResponse.json({ error: "Error al recuperar los pronósticos del grupo" }, { status: 500 });
  }
}
