const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
const url = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].replace(/\"/g, '').trim();
const key = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')).split('=')[1].replace(/\"/g, '').trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function run() {
  console.log("=== INICIANDO RESPALDO (BACKUP) ===");
  
  // 1. Respaldar Usuarios
  const { data: users } = await supabase.from('users').select('*');
  fs.writeFileSync('backup_users.json', JSON.stringify(users, null, 2));
  console.log(`✅ Respaldo de ${users.length} usuarios guardado en backup_users.json`);

  // 2. Respaldar Partidos
  const { data: matches } = await supabase.from('matches').select('*');
  fs.writeFileSync('backup_matches.json', JSON.stringify(matches, null, 2));
  console.log(`✅ Respaldo de ${matches.length} partidos guardado en backup_matches.json`);

  // 3. Respaldar Predicciones (usando paginación para traer TODAS)
  let allPreds = [];
  let from = 0;
  let step = 999;
  while (true) {
    const { data: p } = await supabase.from('predictions').select('*').range(from, from + step);
    if (!p || p.length === 0) break;
    allPreds.push(...p);
    from += step + 1;
  }
  fs.writeFileSync('backup_predictions.json', JSON.stringify(allPreds, null, 2));
  console.log(`✅ Respaldo de ${allPreds.length} predicciones guardado en backup_predictions.json`);

  console.log("\n=== INICIANDO LIMPIEZA DE BASE DE DATOS ===");

  // Encontrar partidos de Prueba
  const pruebaMatches = matches.filter(m => m.group_name && m.group_name.toLowerCase().includes('prueba'));
  const pruebaMatchIds = pruebaMatches.map(m => m.id);
  
  console.log(`Se encontraron ${pruebaMatchIds.length} partidos de prueba para eliminar.`);

  if (pruebaMatchIds.length > 0) {
    // 4. Eliminar predicciones asociadas a los partidos de prueba
    const { error: predError } = await supabase
      .from('predictions')
      .delete()
      .in('match_id', pruebaMatchIds);
    
    if (predError) {
      console.error("❌ Error eliminando predicciones:", predError);
      return;
    }
    console.log(`✅ Predicciones asociadas a los partidos de prueba eliminadas.`);

    // 5. Eliminar los partidos de prueba
    const { error: matchError } = await supabase
      .from('matches')
      .delete()
      .in('id', pruebaMatchIds);

    if (matchError) {
      console.error("❌ Error eliminando partidos:", matchError);
      return;
    }
    console.log(`✅ Partidos de prueba eliminados exitosamente.`);
  }

  // 6. Resetear puntajes de todos los usuarios
  const { error: userError } = await supabase
    .from('users')
    .update({
      points: 0,
      exact_matches: 0,
      winner_matches: 0,
      diff_matches: 0
    })
    .neq('id', 'dummy_condition_to_update_all_rows'); // Supabase requires a filter for bulk updates, or we can update by id

  if (userError) {
    // Si falla el update masivo, actualizamos uno por uno
    console.log("El update masivo falló o no está permitido. Actualizando usuarios por lotes...");
    for (const u of users) {
      await supabase.from('users').update({
        points: 0,
        exact_matches: 0,
        winner_matches: 0,
        diff_matches: 0
      }).eq('id', u.id);
    }
    console.log(`✅ Todos los usuarios han sido reseteados a 0 puntos individualmente.`);
  } else {
    console.log(`✅ Todos los usuarios han sido reseteados a 0 puntos masivamente.`);
  }

  // 7. Resetear points_earned de las predicciones restantes a 0 (opcional, por sanidad de la DB)
  console.log("Actualizando predicciones restantes a 0 puntos ganados...");
  let remainingPreds = allPreds.filter(p => !pruebaMatchIds.includes(p.match_id));
  const chunkSize = 100;
  for (let i = 0; i < remainingPreds.length; i += chunkSize) {
    const chunk = remainingPreds.slice(i, i + chunkSize).map(p => ({ ...p, points_earned: 0 }));
    await supabase.from('predictions').upsert(chunk, { onConflict: 'id' });
  }
  console.log(`✅ Todas las predicciones restantes ahora valen 0 puntos.`);

  console.log("\n🚀 ¡BASE DE DATOS LISTA PARA EL MUNDIAL!");
}

run();
