const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envLines = fs.readFileSync('.env', 'utf8').split('\n');
const urlLine = envLines.find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL'));
process.env.NEXT_PUBLIC_SUPABASE_URL = urlLine.split('=')[1].trim().replace(/"/g, '');

// 1. REEMPLAZA EL TEXTO ENTRE LAS COMILLAS SIMPLES DE ABAJO POR TU LLAVE SECRETA (service_role)
const MI_LLAVE_SECRETA = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwbXJ2eGpzcWJzZnF0ZnRyam56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcxMTY4MCwiZXhwIjoyMDk2Mjg3NjgwfQ.R37I1QWyzOo7GXRvpVcBZts2CfCke3AhCtIsye7vh20';

async function probarLlave() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error('❌ Error: No se encontró la URL de Supabase en el archivo .env');
    return;
  }

  if (MI_LLAVE_SECRETA === 'PEGA_TU_LLAVE_AQUI' || MI_LLAVE_SECRETA === '') {
    console.error('❌ Error: Aún no has pegado tu llave secreta en la línea 5 del script.');
    return;
  }

  console.log(`Intentando conectar a ${url} con la llave maestra...`);
  
  const supabase = createClient(url, MI_LLAVE_SECRETA);

  try {
    // Intentamos hacer una consulta a la tabla 'users'
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      console.error('❌ Error de conexión! La base de datos rechazó la llave:', error.message);
    } else {
      console.log('✅ ¡ÉXITO TOTAL! La llave es válida y tiene permisos correctos.');
      console.log('Datos de prueba recibidos:', data);
    }
  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
  }
}

probarLlave();
