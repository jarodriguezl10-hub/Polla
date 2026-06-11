const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const lines = fs.readFileSync('.env', 'utf8').split('\n');
const url = lines.find(l=>l.includes('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].trim().replace(/\"/g, '');
const key = lines.find(l=>l.includes('SUPABASE_SERVICE_ROLE_KEY')).split('=')[1].trim().replace(/\"/g, '');
const supabase = createClient(url, key);

async function run() {
  console.log("Migrating users table...");
  const { error: e1 } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;' });
  console.log('e1:', e1);
  const { error: e2 } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS disable_reason TEXT;' });
  console.log('e2:', e2);
  const { error: e3 } = await supabase.rpc('exec_sql', { sql: 'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value BOOLEAN);' });
  console.log('e3:', e3);
  const { error: e4 } = await supabase.rpc('exec_sql', { sql: 'INSERT INTO settings (key, value) VALUES (\'registration_open\', true) ON CONFLICT (key) DO NOTHING;' });
  console.log('e4:', e4);
}
run();
