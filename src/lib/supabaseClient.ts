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
  const matches = [
    { id: "m1", group_name: "Grupo A", team_a: "México", team_b: "Sudáfrica", team_a_code: "mx", team_b_code: "za", kickoff_utc: getRelativeDateString(0, 0, 5), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m2", group_name: "Grupo A", team_a: "Corea del Sur", team_b: "Chequia", team_a_code: "kr", team_b_code: "cz", kickoff_utc: getRelativeDateString(0, 2), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m3", group_name: "Grupo B", team_a: "Canadá", team_b: "Suiza", team_a_code: "ca", team_b_code: "ch", kickoff_utc: getRelativeDateString(1), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m4", group_name: "Grupo C", team_a: "Brasil", team_b: "Marruecos", team_a_code: "br", team_b_code: "ma", kickoff_utc: getRelativeDateString(1, 4), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m5", group_name: "Grupo D", team_a: "Estados Unidos", team_b: "Paraguay", team_a_code: "us", team_b_code: "py", kickoff_utc: getRelativeDateString(2), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m6", group_name: "Grupo H", team_a: "España", team_b: "Uruguay", team_a_code: "es", team_b_code: "uy", kickoff_utc: getRelativeDateString(3), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m7", group_name: "Grupo K", team_a: "Portugal", team_b: "Colombia", team_a_code: "pt", team_b_code: "co", kickoff_utc: getRelativeDateString(4), phase: "groups", score_a: null, score_b: null, played: false },
    { id: "m8", group_name: "Octavos de Final", team_a: "Argentina", team_b: "Francia", team_a_code: "ar", team_b_code: "fr", kickoff_utc: getRelativeDateString(10), phase: "elimination", score_a: null, score_b: null, played: false },
    { id: "m9", group_name: "Cuartos de Final", team_a: "Alemania", team_b: "Inglaterra", team_a_code: "de", team_b_code: "gb-eng", kickoff_utc: getRelativeDateString(12), phase: "elimination", score_a: null, score_b: null, played: false },
    { id: "m10", group_name: "Semifinal", team_a: "Ganador C1", team_b: "Ganador C2", team_a_code: "un", team_b_code: "un", kickoff_utc: getRelativeDateString(14), phase: "elimination", score_a: null, score_b: null, played: false },
    { id: "m11", group_name: "Gran Final", team_a: "Ganador S1", team_b: "Ganador S2", team_a_code: "un", team_b_code: "un", kickoff_utc: getRelativeDateString(16), phase: "elimination", score_a: null, score_b: null, played: false }
  ];

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

// Removed legacy global recalculateMockScores function which reset users to 0

export function calculatePredictionPoints(predA: number, predB: number, realA: number | null, realB: number | null, phase: string) {
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
