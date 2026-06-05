import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let users: any[] = [];

    if (isRealSupabase) {
      // 1. Fetch ALL users (just 77 rows, tiny payload)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, points, diff_matches, winner_matches, exact_matches, paid, phone, created_at');
      if (userError) throw userError;
      users = userData || [];
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      users = db.users || [];
    }

    // Since calculating streak/trend requires downloading 11,000 prediction rows on every request,
    // we bypass it to prevent exceeding the 5GB Supabase Egress limit.
    // Users are simply sorted by their current points.

    const enrichedUsers = users.map((u: any) => ({
      ...u,
      trend: 'same', // Hardcoded to save bandwidth
      streak: 0      // Hardcoded to save bandwidth
    }));

    // Sort final list by current rank (1 to N)
    enrichedUsers.sort((a: any, b: any) => {
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

    // Add currentRank
    enrichedUsers.forEach((u: any, idx: number) => {
      u.currentRank = idx + 1;
    });

    return NextResponse.json(enrichedUsers);
  } catch (error) {
    console.error("Error in leaderboard API:", error);
    return NextResponse.json({ error: "Error al recuperar la clasificación" }, { status: 500 });
  }
}
