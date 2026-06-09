const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
const url = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].replace(/\"/g, '').trim();
const key = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')).split('=')[1].replace(/\"/g, '').trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function checkPrueba() {
  const { data: matches } = await supabase.from('matches').select('*').ilike('group_name', '%Prueba%');
  console.log("Matches found with Prueba:", matches.length);
  if (matches.length > 0) {
    console.log("Example:", matches[0]);
  }
}
checkPrueba();
