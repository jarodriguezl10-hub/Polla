const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
const url = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].replace(/\"/g, '').trim();
const key = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')).split('=')[1].replace(/\"/g, '').trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);
supabase.from('predictions').select('id', { count: 'exact' }).then(res => console.log('Total predictions:', res.count));
