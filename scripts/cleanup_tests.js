const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://epmrvxjsqbsfqtftrjnz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwbXJ2eGpzcWJzZnF0ZnRyam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MTE2ODAsImV4cCI6MjA5NjI4NzY4MH0.fd7aOELjYC5s1fkCx9HWGtZIT444qufbjelbTE0qdXM'
);

async function cleanup() {
  console.log('Iniciando limpieza de base de datos...');

  // 1. Encontrar todos los partidos que son de prueba y están finalizados
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .ilike('group_name', '%prueba%')
    .eq('played', true);

  if (matchErr) {
    console.error('Error buscando partidos:', matchErr);
    return;
  }

  if (!matches || matches.length === 0) {
    console.log('No se encontraron partidos de prueba finalizados.');
  } else {
    const matchIds = matches.map(m => m.id);
    console.log(`Se encontraron ${matchIds.length} partidos de prueba finalizados. Eliminando...`);

    // 2. Eliminar las predicciones de esos partidos
    // Supabase permite borrar usando in('match_id', matchIds)
    const { data: delPreds, error: delPredsErr } = await supabase
      .from('predictions')
      .delete()
      .in('match_id', matchIds);

    if (delPredsErr) {
      console.error('Error borrando predicciones:', delPredsErr);
    } else {
      console.log('✅ Predicciones de prueba eliminadas.');
    }

    // 3. Eliminar los partidos de prueba
    const { data: delMatches, error: delMatchesErr } = await supabase
      .from('matches')
      .delete()
      .in('id', matchIds);

    if (delMatchesErr) {
      console.error('Error borrando partidos:', delMatchesErr);
    } else {
      console.log('✅ Partidos de prueba eliminados.');
    }
  }

  // 4. Recalcular los puntos de TODOS los usuarios para que quede 100% consistente
  console.log('Recalculando puntos de todos los usuarios...');
  
  // Obtenemos todos los usuarios
  const { data: users, error: usersErr } = await supabase.from('users').select('id');
  if (usersErr) {
    console.error('Error obteniendo usuarios:', usersErr);
    return;
  }

  // Obtenemos TODAS las predicciones restantes
  const { data: allPreds, error: allPredsErr } = await supabase
    .from('predictions')
    .select('user_id, points_earned');
  
  if (allPredsErr) {
    console.error('Error obteniendo predicciones restantes:', allPredsErr);
    return;
  }

  let updatedCount = 0;
  for (const user of users) {
    const userPreds = allPreds.filter(p => p.user_id === user.id);
    
    let totalPoints = 0;
    let exactMatches = 0;
    let winnerMatches = 0;
    let diffMatches = 0;

    for (const p of userPreds) {
      const pts = p.points_earned || 0;
      totalPoints += pts;
      if (pts === 10) exactMatches++;
      if (pts === 7) diffMatches++;
      if (pts === 5) winnerMatches++;
    }

    // Actualizar usuario
    await supabase.from('users').update({
      points: totalPoints,
      exact_matches: exactMatches,
      winner_matches: winnerMatches,
      diff_matches: diffMatches
    }).eq('id', user.id);

    updatedCount++;
  }

  console.log(`✅ Puntos recalculados y puestos a cero (o su valor real) para ${updatedCount} usuarios.`);
  console.log('¡Limpieza completada exitosamente!');
}

cleanup();
