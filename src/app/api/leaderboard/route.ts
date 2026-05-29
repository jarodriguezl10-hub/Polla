import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    let users: any[] = [];

    if (isRealSupabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      users = data || [];
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      users = db.users || [];
    }

    // Sort by points desc, then by exact matches desc
    const sorted = [...users].sort((a: any, b: any) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      
      const exactDiff = (b.exact_matches || 0) - (a.exact_matches || 0);
      return exactDiff;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Error in leaderboard API:", error);
    return NextResponse.json({ error: "Error al recuperar la clasificación" }, { status: 500 });
  }
}
