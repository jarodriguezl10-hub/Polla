import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: "userId es obligatorio" }, { status: 400 });
    }

    if (isRealSupabase) {
      const { data, error } = await supabase.from('predictions').select('*').eq('user_id', userId);
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

      const filtered = db.predictions.filter((p: any) => p.user_id === userId);
      return NextResponse.json(filtered);
    }
  } catch (error) {
    console.error("Error in predictions API:", error);
    return NextResponse.json({ error: "Error al recuperar predicciones" }, { status: 500 });
  }
}
