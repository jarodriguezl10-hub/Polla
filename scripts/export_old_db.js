const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Old Supabase Keys
const SUPABASE_URL = 'https://dyojdcgjxowfregsbohq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5b2pkY2dqeG93ZnJlZ3Nib2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTY3NjcsImV4cCI6MjA5NTU5Mjc2N30.bjYQhB1pqjOEqsowGjCM1J2oawdrFBu1bfBuPsernJE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'users',
  'matches',
  'predictions',
  'chat_messages',
  'unconciliated_payments',
  'otps'
];

async function exportData() {
  console.log('Iniciando extracción de la base de datos antigua...');
  
  const exportsDir = path.join(__dirname, 'db_exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir);
  }

  for (const table of tables) {
    console.log(`Exportando tabla: ${table}...`);
    
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error(`Error exportando ${table}:`, error.message);
        hasMore = false;
      } else {
        allData = allData.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    if (allData.length > 0) {
      const filePath = path.join(exportsDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf8');
      console.log(`✅ ${table}: ${allData.length} registros exportados.`);
    }
  }
  
  console.log('Extracción finalizada.');
}

exportData();
