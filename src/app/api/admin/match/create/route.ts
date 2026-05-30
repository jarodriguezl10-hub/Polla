import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

const ADMIN_EMAILS = ['jarodriguezl10@gmail.com', 'jrodriguezl10@gmail.com', 'mario.montalvo@gmail.com', 'cristhiancamilo@gmail.com'];

export async function POST(request: Request) {
  try {
    const { id, groupName, teamA, teamB, teamACode, teamBCode, kickoffUtc, phase, adminEmail } = await request.json();
    if (!id || !groupName || !teamA || !teamB || !kickoffUtc || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Verify admin
    let isAdmin = ADMIN_EMAILS.includes(adminEmail.trim().toLowerCase());
    
    if (!isAdmin) {
      if (isRealSupabase) {
        const { data: adminUser } = await supabase.from('users').select('role').eq('email', adminEmail.trim().toLowerCase()).single();
        isAdmin = adminUser?.role === 'admin';
      } else {
        const fs = require('fs');
        const path = require('path');
        const DB_PATH = path.join(process.cwd(), 'database.json');
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const adminUser = db.users.find((u: any) => u.email.toLowerCase() === adminEmail.trim().toLowerCase());
        isAdmin = adminUser?.role === 'admin';
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    // Create match
    if (isRealSupabase) {
      const { error } = await supabase
        .from('matches')
        .insert({
          id,
          group_name: groupName,
          team_a: teamA,
          team_b: teamB,
          team_a_code: teamACode || 'un',
          team_b_code: teamBCode || 'un',
          kickoff_utc: kickoffUtc,
          phase: phase || 'groups',
          score_a: null,
          score_b: null,
          played: false
        });

      if (error) throw error;
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      // Check duplicate ID
      if (db.matches.some((m: any) => m.id === id)) {
        return NextResponse.json({ error: "ID de partido ya existe" }, { status: 400 });
      }

      db.matches.push({
        id,
        group_name: groupName,
        team_a: teamA,
        team_b: teamB,
        team_a_code: teamACode || 'un',
        team_b_code: teamBCode || 'un',
        kickoff_utc: kickoffUtc,
        phase: phase || 'groups',
        score_a: null,
        score_b: null,
        played: false
      });
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
