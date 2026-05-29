import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { matchId, teamA, teamB, teamACode, teamBCode, adminEmail } = await request.json();
    if (!matchId || !adminEmail || !teamA || !teamB) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Verify admin
    let isAdmin = false;
    if (isRealSupabase) {
      const { data: adminUser } = await supabase.from('users').select('role').eq('email', adminEmail).single();
      isAdmin = adminUser?.role === 'admin';
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      const adminUser = db.users.find((u: any) => u.email === adminEmail);
      isAdmin = adminUser?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    // Update match team names and flags
    if (isRealSupabase) {
      const { error } = await supabase
        .from('matches')
        .update({
          team_a: teamA,
          team_b: teamB,
          team_a_code: teamACode,
          team_b_code: teamBCode
        })
        .eq('id', matchId);

      if (error) throw error;
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const match = db.matches.find((m: any) => m.id === matchId);
      if (match) {
        match.team_a = teamA;
        match.team_b = teamB;
        match.team_a_code = teamACode;
        match.team_b_code = teamBCode;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating match teams:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
