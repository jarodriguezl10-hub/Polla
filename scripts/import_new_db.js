const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// New Supabase Keys
const SUPABASE_URL = 'https://epmrvxjsqbsfqtftrjnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwbXJ2eGpzcWJzZnF0ZnRyam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MTE2ODAsImV4cCI6MjA5NjI4NzY4MH0.fd7aOELjYC5s1fkCx9HWGtZIT444qufbjelbTE0qdXM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'users',
  'matches',
  'predictions',
  'chat_messages',
  'unconciliated_payments',
  'otps'
];

async function importData() {
  console.log('Iniciando inyección de datos a la nueva base de datos...');
  
  const exportsDir = path.join(__dirname, 'db_exports');
  if (!fs.existsSync(exportsDir)) {
    console.error('No se encontró el directorio db_exports. Ejecuta primero export_old_db.js');
    return;
  }

  for (const table of tables) {
    console.log(`\nImportando tabla: ${table}...`);
    const filePath = path.join(exportsDir, `${table}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Archivo no encontrado: ${filePath}. Saltando...`);
      continue;
    }

    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Fix for matches table phase constraint
    if (table === 'matches') {
      data = data.map(match => {
        if (match.phase === 'PRUEBA') {
          return { ...match, phase: 'groups' };
        }
        return match;
      });
    }
    
    if (data.length === 0) {
      console.log(`No hay datos en ${table}. Saltando...`);
      continue;
    }

    // Dividir en lotes de 500 para no sobrecargar el API
    const BATCH_SIZE = 500;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(table).upsert(batch);
      
      if (error) {
        console.error(`Error importando lote en ${table}:`, error.message);
      } else {
        console.log(`✅ ${batch.length} registros insertados/actualizados en ${table}.`);
      }
    }
  }
  
  console.log('\n¡Inyección de datos finalizada!');
}

importData();
