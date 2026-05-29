import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isRealSupabase = supabaseUrl !== '' && supabaseAnonKey !== '';

// Real Supabase Client
let realClient: any = null;
if (isRealSupabase) {
  realClient = createClient(supabaseUrl, supabaseAnonKey);
}

// Local File Database Mock for Server Side Fallback (matching Supabase API shapes)
let mockDbCached: any = null;

function getRelativeDateString(daysOffset: number, hoursOffset = 0, minutesOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  date.setMinutes(date.getMinutes() + minutesOffset);
  return date.toISOString();
}

function getInitialMockData() {
  const groups = [
    { name: "Grupo A", teams: [ {name: "México", code: "mx"}, {name: "Sudáfrica", code: "za"}, {name: "Australia", code: "au"}, {name: "Haití", code: "ht"} ] },
    { name: "Grupo B", teams: [ {name: "Canadá", code: "ca"}, {name: "Bosnia y Herzegovina", code: "ba"}, {name: "Irak", code: "iq"}, {name: "Cabo Verde", code: "cv"} ] },
    { name: "Grupo C", teams: [ {name: "Brasil", code: "br"}, {name: "Marruecos", code: "ma"}, {name: "Jordania", code: "jo"}, {name: "Curazao", code: "cw"} ] },
    { name: "Grupo D", teams: [ {name: "Estados Unidos", code: "us"}, {name: "Paraguay", code: "py"}, {name: "Japón", code: "jp"}, {name: "Argelia", code: "dz"} ] },
    { name: "Grupo E", teams: [ {name: "Argentina", code: "ar"}, {name: "Croacia", code: "hr"}, {name: "Catar", code: "qa"}, {name: "Túnez", code: "tn"} ] },
    { name: "Grupo F", teams: [ {name: "Francia", code: "fr"}, {name: "Bélgica", code: "be"}, {name: "Arabia Saudita", code: "sa"}, {name: "RD Congo", code: "cd"} ] },
    { name: "Grupo G", teams: [ {name: "España", code: "es"}, {name: "Uruguay", code: "uy"}, {name: "Uzbekistán", code: "uz"}, {name: "Costa de Marfil", code: "ci"} ] },
    { name: "Grupo H", teams: [ {name: "Portugal", code: "pt"}, {name: "Colombia", code: "co"}, {name: "Escocia", code: "gb-sct"}, {name: "Ghana", code: "gh"} ] },
    { name: "Grupo I", teams: [ {name: "Inglaterra", code: "gb-eng"}, {name: "Países Bajos", code: "nl"}, {name: "Senegal", code: "sn"}, {name: "Panamá", code: "pa"} ] },
    { name: "Grupo J", teams: [ {name: "Alemania", code: "de"}, {name: "Austria", code: "at"}, {name: "Noruega", code: "no"}, {name: "República de Corea", code: "kr"} ] },
    { name: "Grupo K", teams: [ {name: "Suiza", code: "ch"}, {name: "Suecia", code: "se"}, {name: "Turquía", code: "tr"}, {name: "Ecuador", code: "ec"} ] },
    { name: "Grupo L", teams: [ {name: "Dinamarca", code: "dk"}, {name: "Chile", code: "cl"}, {name: "Ucrania", code: "ua"}, {name: "Egipto", code: "eg"} ] }
  ];

  const matches: any[] = [];
  let matchCounter = 1;
  const startDate = new Date("2026-06-11T17:00:00Z");

  groups.forEach((g, gIdx) => {
    const t = g.teams;
    const pairings = [
      [0, 1], [2, 3],
      [0, 2], [1, 3],
      [0, 3], [1, 2]
    ];

    pairings.forEach((pair, pIdx) => {
      const matchId = `m${matchCounter}`;
      const dateOffset = gIdx * 1.2 + Math.floor(pIdx / 2) * 4;
      const kickoff = new Date(startDate.getTime() + dateOffset * 24 * 60 * 60 * 1000 + (pIdx % 2 ? 3 : 0) * 60 * 60 * 1000);

      matches.push({
        id: matchId,
        group_name: g.name,
        team_a: t[pair[0]].name,
        team_b: t[pair[1]].name,
        team_a_code: t[pair[0]].code,
        team_b_code: t[pair[1]].code,
        kickoff_utc: kickoff.toISOString(),
        phase: "groups",
        score_a: null,
        score_b: null,
        played: false
      });
      matchCounter++;
    });
  });

  // Round of 32 (Dieciseisavos)
  for (let i = 1; i <= 16; i++) {
    const dateOffset = 17 + Math.floor((i - 1) / 4) * 1.5;
    const kickoff = new Date(startDate.getTime() + dateOffset * 24 * 60 * 60 * 1000 + ((i - 1) % 4 * 3) * 60 * 60 * 1000);
    matches.push({
      id: `m${matchCounter}`,
      group_name: "Dieciseisavos de Final",
      team_a: `Clasificado A${i}`,
      team_b: `Clasificado B${i}`,
      team_a_code: "un",
      team_b_code: "un",
      kickoff_utc: kickoff.toISOString(),
      phase: "elimination",
      score_a: null,
      score_b: null,
      played: false
    });
    matchCounter++;
  }

  // Round of 16 (Octavos)
  for (let i = 1; i <= 8; i++) {
    const dateOffset = 23 + Math.floor((i - 1) / 2) * 1.5;
    const kickoff = new Date(startDate.getTime() + dateOffset * 24 * 60 * 60 * 1000 + ((i - 1) % 2 * 4) * 60 * 60 * 1000);
    matches.push({
      id: `m${matchCounter}`,
      group_name: "Octavos de Final",
      team_a: `Ganador D${2*i-1}`,
      team_b: `Ganador D${2*i}`,
      team_a_code: "un",
      team_b_code: "un",
      kickoff_utc: kickoff.toISOString(),
      phase: "elimination",
      score_a: null,
      score_b: null,
      played: false
    });
    matchCounter++;
  }

  // Quarter-finals (Cuartos)
  for (let i = 1; i <= 4; i++) {
    const dateOffset = 28 + Math.floor((i - 1) / 2) * 2;
    const kickoff = new Date(startDate.getTime() + dateOffset * 24 * 60 * 60 * 1000 + ((i - 1) % 2 * 4) * 60 * 60 * 1000);
    matches.push({
      id: `m${matchCounter}`,
      group_name: "Cuartos de Final",
      team_a: `Ganador O${2*i-1}`,
      team_b: `Ganador O${2*i}`,
      team_a_code: "un",
      team_b_code: "un",
      kickoff_utc: kickoff.toISOString(),
      phase: "elimination",
      score_a: null,
      score_b: null,
      played: false
    });
    matchCounter++;
  }

  // Semi-finals
  for (let i = 1; i <= 2; i++) {
    const dateOffset = 33 + (i - 1) * 2;
    const kickoff = new Date(startDate.getTime() + dateOffset * 24 * 60 * 60 * 1000);
    matches.push({
      id: `m${matchCounter}`,
      group_name: "Semifinal",
      team_a: `Ganador C${2*i-1}`,
      team_b: `Ganador C${2*i}`,
      team_a_code: "un",
      team_b_code: "un",
      kickoff_utc: kickoff.toISOString(),
      phase: "elimination",
      score_a: null,
      score_b: null,
      played: false
    });
    matchCounter++;
  }

  // Third-place play-off
  matches.push({
    id: `m${matchCounter}`,
    group_name: "Tercer Puesto",
    team_a: "Perdedor S1",
    team_b: "Perdedor S2",
    team_a_code: "un",
    team_b_code: "un",
    kickoff_utc: new Date(startDate.getTime() + 37 * 24 * 60 * 60 * 1000).toISOString(),
    phase: "elimination",
    score_a: null,
    score_b: null,
    played: false
  });
  matchCounter++;

  // Grand Final
  matches.push({
    id: `m${matchCounter}`,
    group_name: "Gran Final",
    team_a: "Ganador S1",
    team_b: "Ganador S2",
    team_a_code: "un",
    team_b_code: "un",
    kickoff_utc: new Date(startDate.getTime() + 38 * 24 * 60 * 60 * 1000).toISOString(),
    phase: "elimination",
    score_a: null,
    score_b: null,
    played: false
  });

  const users = [
    { id: "u_admin", email: "admin@polla.com", name: "Administrador Mundial", role: "admin", points: 0, exact_matches: 0, winner_matches: 0, diff_matches: 0 },
    { id: "u1", email: "valderrama@polla.com", name: "Pibe Valderrama", role: "user", points: 42, exact_matches: 3, winner_matches: 4, diff_matches: 2 },
    { id: "u2", email: "james@polla.com", name: "James Rodríguez", role: "user", points: 38, exact_matches: 2, winner_matches: 5, diff_matches: 1 },
    { id: "u3", email: "falcao@polla.com", name: "Radamel Falcao", role: "user", points: 35, exact_matches: 1, winner_matches: 6, diff_matches: 2 },
    { id: "u4", email: "lucho@polla.com", name: "Lucho Díaz", role: "user", points: 29, exact_matches: 2, winner_matches: 3, diff_matches: 1 },
    { id: "u5", email: "shakira@polla.com", name: "Shakira Mebarak", role: "user", points: 25, exact_matches: 0, winner_matches: 5, diff_matches: 0 }
  ];

  const predictions: any[] = [];
  const mockUsers = ["u1", "u2", "u3", "u4", "u5"];

  matches.forEach(match => {
    mockUsers.forEach(userId => {
      predictions.push({
        id: `p_${userId}_${match.id}`,
        user_id: userId,
        match_id: match.id,
        score_a: Math.floor(Math.random() * 4),
        score_b: Math.floor(Math.random() * 4),
        points_earned: 0
      });
    });
  });

  const chat_messages = [
    { id: "msg1", user_id: "u1", user_name: "Pibe Valderrama", text: "¡Todo bien, todo bien! ¿Quién gana el primer partido?", created_at: getRelativeDateString(-1, -4) },
    { id: "msg2", user_id: "u2", user_name: "James Rodríguez", text: "Yo le puse fe a México, juegan bien de local.", created_at: getRelativeDateString(-1, -3) },
    { id: "msg3", user_id: "u3", user_name: "Radamel Falcao", text: "Ojo con Sudáfrica, son rápidos al contragolpe.", created_at: getRelativeDateString(-1, -2) }
  ];

  return { users, matches, predictions, chat_messages, otps: [] };
}

// Read database.json in Node context (Next API routes)
function loadMockDb(): any {
  if (typeof window !== 'undefined') {
    // Client Side Fallback: use localStorage
    const localData = localStorage.getItem('polla_mock_db');
    if (localData) {
      return JSON.parse(localData);
    }
    const initial = getInitialMockData();
    localStorage.setItem('polla_mock_db', JSON.stringify(initial));
    return initial;
  }

  // Server Side Fallback: use fs
  if (mockDbCached) return mockDbCached;
  const fs = require('fs');
  const path = require('path');
  const DB_PATH = path.join(process.cwd(), 'database.json');

  if (!fs.existsSync(DB_PATH)) {
    const initial = getInitialMockData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    mockDbCached = initial;
    return initial;
  }
  
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    mockDbCached = JSON.parse(raw);
    return mockDbCached;
  } catch (e) {
    const initial = getInitialMockData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    mockDbCached = initial;
    return initial;
  }
}

// Save database.json in Node context / localStorage
function saveMockDb(data: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('polla_mock_db', JSON.stringify(data));
    return;
  }

  mockDbCached = data;
  const fs = require('fs');
  const path = require('path');
  const DB_PATH = path.join(process.cwd(), 'database.json');
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Recalculates user points based on real match scores
export function recalculateMockScores(db: any) {
  const userBaselines: any = {
    u_admin: 0,
    u1: 25,
    u2: 22,
    u3: 18,
    u4: 15,
    u5: 12
  };

  db.users.forEach((user: any) => {
    user.points = userBaselines[user.id] || 0;
    user.exact_matches = 0;
    user.winner_matches = 0;
    user.diff_matches = 0;
  });

  db.predictions.forEach((pred: any) => {
    const match = db.matches.find((m: any) => m.id === pred.match_id);
    if (match && match.played) {
      const stats = calculatePredictionPoints(pred.score_a, pred.score_b, match.score_a, match.score_b, match.phase);
      pred.points_earned = stats.points;

      const user = db.users.find((u: any) => u.id === pred.user_id);
      if (user) {
        user.points += stats.points;
        if (stats.exact) user.exact_matches += 1;
        if (stats.winner) user.winner_matches += 1;
        if (stats.diff) user.diff_matches += 1;
      }
    } else {
      pred.points_earned = 0;
    }
  });
}

function calculatePredictionPoints(predA: number, predB: number, realA: number, realB: number, phase: string) {
  if (predA === null || predB === null || realA === null || realB === null) {
    return { points: 0, exact: false, winner: false, diff: false };
  }

  const isGroup = phase === "groups";
  const ptsWinner = isGroup ? 5 : 10;
  const ptsGoals = isGroup ? 2 : 4;
  const ptsDiff = isGroup ? 1 : 2;

  const predWinner = predA > predB ? 1 : (predA < predB ? -1 : 0);
  const realWinner = realA > realB ? 1 : (realA < realB ? -1 : 0);
  
  let points = 0;
  let exact = false;
  let winner = false;
  let diff = false;

  if (predWinner === realWinner) {
    points += ptsWinner;
    winner = true;

    const correctHome = predA === realA;
    const correctAway = predB === realB;

    if (correctHome) points += ptsGoals;
    if (correctAway) points += ptsGoals;

    const predDiff = predA - predB;
    const realDiff = realA - realB;
    if (predDiff === realDiff) {
      points += ptsDiff;
      diff = true;
    }

    if (correctHome && correctAway) {
      exact = true;
    }
  } else {
    // Check local/visitor goals even if outcome is wrong
    if (predA === realA) points += ptsGoals;
    if (predB === realB) points += ptsGoals;
  }

  return { points, exact, winner, diff };
}

// Unified Mock Client matching Supabase syntax
const mockClient = {
  from: (table: string) => {
    return {
      select: (columns = '*') => {
        return {
          eq: (column: string, value: any) => {
            const db = loadMockDb();
            const data = db[table] || [];
            const filtered = data.filter((item: any) => item[column] === value);
            return Promise.resolve({ data: filtered, error: null });
          },
          order: (column: string, { ascending = true } = {}) => {
            const db = loadMockDb();
            let data = db[table] || [];
            data = [...data].sort((a: any, b: any) => {
              if (a[column] < b[column]) return ascending ? -1 : 1;
              if (a[column] > b[column]) return ascending ? 1 : -1;
              return 0;
            });
            return Promise.resolve({ data, error: null });
          },
          single: () => {
            const db = loadMockDb();
            const data = db[table] || [];
            return Promise.resolve({ data: data[0] || null, error: data.length === 0 ? { message: "No data" } : null });
          },
          then: (callback: any) => {
            const db = loadMockDb();
            const data = db[table] || [];
            return Promise.resolve(callback({ data, error: null }));
          }
        };
      },
      insert: (rows: any | any[]) => {
        const db = loadMockDb();
        if (!db[table]) db[table] = [];
        
        const toInsert = Array.isArray(rows) ? rows : [rows];
        const inserted = toInsert.map(row => ({
          id: row.id || `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...row,
          created_at: row.created_at || new Date().toISOString()
        }));

        db[table].push(...inserted);
        saveMockDb(db);

        return Promise.resolve({ data: inserted, error: null });
      },
      update: (fields: any) => {
        return {
          eq: (column: string, value: any) => {
            const db = loadMockDb();
            const data = db[table] || [];
            let updatedCount = 0;

            db[table] = data.map((item: any) => {
              if (item[column] === value) {
                updatedCount++;
                return { ...item, ...fields };
              }
              return item;
            });

            if (updatedCount > 0) {
              if (table === 'matches') {
                recalculateMockScores(db);
              }
              saveMockDb(db);
            }

            const updatedRows = db[table].filter((item: any) => item[column] === value);
            return Promise.resolve({ data: updatedRows, error: null });
          }
        };
      },
      upsert: (rows: any | any[]) => {
        const db = loadMockDb();
        if (!db[table]) db[table] = [];

        const toUpsert = Array.isArray(rows) ? rows : [rows];
        toUpsert.forEach((row: any) => {
          // If prediction, match on user_id and match_id
          let index = -1;
          if (table === 'predictions') {
            index = db[table].findIndex((item: any) => item.user_id === row.user_id && item.match_id === row.match_id);
          } else {
            index = db[table].findIndex((item: any) => item.id === row.id);
          }

          if (index !== -1) {
            db[table][index] = { ...db[table][index], ...row };
          } else {
            db[table].push({
              id: row.id || `row_${Date.now()}`,
              ...row,
              created_at: row.created_at || new Date().toISOString()
            });
          }
        });

        saveMockDb(db);
        return Promise.resolve({ data: toUpsert, error: null });
      }
    };
  },
  channel: () => {
    return {
      on: () => {
        return {
          subscribe: () => {
            // Simulated subscription return
            return { unsubscribe: () => {} };
          }
        };
      }
    };
  }
};

// Export active client (Real or Mock Fallback)
export const supabase = isRealSupabase ? realClient : mockClient;
export { mockClient };

// Auto-initialize local JSON database if mock is used on server side
if (!isRealSupabase && typeof window === 'undefined') {
  try {
    loadMockDb();
  } catch (e) {
    console.error("Error auto-initializing local mock database:", e);
  }
}
