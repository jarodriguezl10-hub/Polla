import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  if (!isRealSupabase) return NextResponse.json({ registration_open: true });
  
  const { data, error } = await supabase.from('settings').select('*').eq('key', 'registration_open');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  if (data && data.length > 0) {
    return NextResponse.json({ registration_open: data[0].value === true || data[0].value === 'true' });
  }
  return NextResponse.json({ registration_open: true });
}

export async function POST(request: Request) {
  if (!isRealSupabase) return NextResponse.json({ success: true });
  
  const { adminEmail, registrationOpen } = await request.json();
  
  // Verify admin
  const { data: adminData } = await supabase.from('users').select('role').eq('email', adminEmail).single();
  if (!adminData || adminData.role !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error } = await supabase.from('settings').upsert({ key: 'registration_open', value: registrationOpen });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true });
}
