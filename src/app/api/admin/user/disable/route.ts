import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  if (!isRealSupabase) return NextResponse.json({ success: true });
  
  const { adminEmail, userId, isDisabled, disableReason } = await request.json();
  
  // Verify admin
  const { data: adminData } = await supabase.from('users').select('role').eq('email', adminEmail).single();
  if (!adminData || adminData.role !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error } = await supabase.from('users').update({ is_disabled: isDisabled, disable_reason: disableReason }).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true });
}
