import { NextResponse } from 'next/server';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

const PAYMENTS_ADMIN_EMAILS = ['jarodriguezl10@gmail.com', 'jrodriguezl10@gmail.com', 'cristhiancamilo@gmail.com', 'mario.montalvo@gmail.com'];

// Shared admin verification helper
async function verifyAdmin(adminEmail: string): Promise<boolean> {
  if (PAYMENTS_ADMIN_EMAILS.includes(adminEmail.trim().toLowerCase())) return true;

  if (isRealSupabase) {
    const { data: adminUser } = await supabase.from('users').select('role').eq('email', adminEmail.trim().toLowerCase()).single();
    return adminUser?.role === 'admin';
  } else {
    const fs = require('fs');
    const path = require('path');
    const DB_PATH = path.join(process.cwd(), 'database.json');
    if (fs.existsSync(DB_PATH)) {
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      const adminUser = db.users.find((u: any) => u.email.toLowerCase() === adminEmail.trim().toLowerCase());
      return adminUser?.role === 'admin';
    }
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');

    if (!adminEmail) {
      return NextResponse.json({ error: "Email no proporcionado" }, { status: 400 });
    }

    if (!(await verifyAdmin(adminEmail))) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('unconciliated_payments')
        .select('*')
        .order('recollection_date', { ascending: false });

      if (error) {
        console.error("Error fetching unconciliated_payments from Supabase:", error);
        return NextResponse.json([]);
      }
      return NextResponse.json(data || []);
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const payments = db.unconciliated_payments || [];
        return NextResponse.json(payments);
      }
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error in GET unconciliated payments:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { recollectionDate, notes, adminEmail } = await request.json();
    if (!recollectionDate || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    if (!(await verifyAdmin(adminEmail))) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    if (isRealSupabase) {
      const { data, error } = await supabase
        .from('unconciliated_payments')
        .insert({ recollection_date: recollectionDate, notes: notes || null, conciliated: false })
        .select()
        .single();

      if (error) {
        console.error("Error inserting unconciliated payment in Supabase:", error);
        return NextResponse.json({ 
          error: "Error al guardar en base de datos. Verifica que la tabla 'unconciliated_payments' exista con las columnas recollection_date (TIMESTAMPTZ), conciliated (BOOLEAN) y conciliated_at (TIMESTAMPTZ)." 
        }, { status: 500 });
      }
      return NextResponse.json({ success: true, data });
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (!db.unconciliated_payments) {
          db.unconciliated_payments = [];
        }
        const newPayment = {
          id: Math.random().toString(36).substring(2, 9),
          recollection_date: recollectionDate,
          notes: notes || null,
          conciliated: false,
          conciliated_at: null,
          created_at: new Date().toISOString()
        };
        db.unconciliated_payments.push(newPayment);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        return NextResponse.json({ success: true, data: newPayment });
      }
      return NextResponse.json({ error: "Base de datos local no encontrada" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in POST unconciliated payments:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH: Mark a payment as conciliated
export async function PATCH(request: Request) {
  try {
    const { paymentId, adminEmail } = await request.json();
    if (!paymentId || !adminEmail) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    if (!(await verifyAdmin(adminEmail))) {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    if (isRealSupabase) {
      const { error } = await supabase
        .from('unconciliated_payments')
        .update({ conciliated: true, conciliated_at: new Date().toISOString() })
        .eq('id', paymentId);

      if (error) {
        console.error("Error updating unconciliated payment in Supabase:", error);
        return NextResponse.json({ error: "Error al actualizar el pago." }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } else {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const payment = (db.unconciliated_payments || []).find((p: any) => p.id === paymentId);
        if (payment) {
          payment.conciliated = true;
          payment.conciliated_at = new Date().toISOString();
          fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ error: "Base de datos local no encontrada" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in PATCH unconciliated payments:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
