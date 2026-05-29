import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (isRealSupabase) {
      const { data, error } = await supabase.from('matches').select('*').order('kickoff_utc', { ascending: true });
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      const sorted = [...db.matches].sort((a: any, b: any) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime());
      return NextResponse.json(sorted);
    }
  } catch (error) {
    console.error("Error in matches API:", error);
    return NextResponse.json({ error: "Error al recuperar partidos" }, { status: 500 });
  }
}
