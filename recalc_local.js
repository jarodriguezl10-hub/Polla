const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
const url = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].replace(/\"/g, '').trim();
const key = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')).split('=')[1].replace(/\"/g, '').trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

function calculatePredictionPoints(predA, predB, realA, realB, phase) {
  if (predA === null || predB === null || realA === null || realB === null) {
    return { points: 0, exact: false, winner: false, diff: 0 };
  }
  const isGroup = phase === "groups" || phase === "PRUEBA";
  const ptsWinner = isGroup ? 5 : 10;
  const ptsGoals = isGroup ? 2 : 4;
  const ptsDiff = isGroup ? 1 : 2;

  const predWinner = predA > predB ? 1 : (predA < predB ? -1 : 0);
  const realWinner = realA > realB ? 1 : (realA < realB ? -1 : 0);
  
  let points = 0;
  let exact = false;
  let winner = false;
  let exactGoalsCount = 0;

  const correctHome = predA === realA;
  const correctAway = predB === realB;

  if (correctHome) exactGoalsCount += 1;
  if (correctAway) exactGoalsCount += 1;

  if (predWinner === realWinner) {
    points += ptsWinner;
    winner = true;
    if (correctHome) points += ptsGoals;
    if (correctAway) points += ptsGoals;
    const predDiff = predA - predB;
    const realDiff = realA - realB;
    if (predDiff === realDiff) points += ptsDiff;
    if (correctHome && correctAway) exact = true;
  } else {
    if (correctHome) points += ptsGoals;
    if (correctAway) points += ptsGoals;
  }

  return { points, exact, winner, diff: exactGoalsCount };
}

async function run() {
  console.log("Fetching data...");
  const { data: users } = await supabase.from('users').select('*');
  const { data: matches } = await supabase.from('matches').select('*');
  
  let predictions = [];
  let from = 0;
  let step = 999;
  while (true) {
    const { data: p } = await supabase.from('predictions').select('*').range(from, from + step);
    if (!p || p.length === 0) break;
    predictions.push(...p);
    from += step + 1;
  }
  console.log("Predictions fetched:", predictions.length);

  const userStats = new Map();
  users.forEach(u => userStats.set(u.id, { points: 0, exact_matches: 0, winner_matches: 0, diff_matches: 0 }));

  const predUpdates = [];
  for (const pred of predictions) {
    const match = matches.find(m => m.id === pred.match_id);
    if (!match || match.score_a === null || match.score_b === null) continue;

    const stats = calculatePredictionPoints(pred.score_a, pred.score_b, match.score_a, match.score_b, match.phase);
    predUpdates.push({ id: pred.id, points_earned: stats.points });
    
    const uStats = userStats.get(pred.user_id);
    if (uStats) {
      uStats.points += stats.points;
      if (stats.exact) uStats.exact_matches += 1;
      if (stats.winner) uStats.winner_matches += 1;
      uStats.diff_matches += stats.diff;
    }
  }

  console.log("Updating users...");
  for (const [userId, stats] of userStats.entries()) {
    await supabase.from('users').update(stats).eq('id', userId);
  }

  console.log("Updating predictions...");
  // Bulk update predictions is not supported directly in Supabase JS easily, so we chunk it
  const chunkSize = 100;
  for (let i = 0; i < predUpdates.length; i += chunkSize) {
    const chunk = predUpdates.slice(i, i + chunkSize);
    await supabase.from('predictions').upsert(chunk, { onConflict: 'id' });
    console.log(`Updated preds ${i} to ${i + chunk.length}`);
  }
  console.log("Done!");
}
run();
