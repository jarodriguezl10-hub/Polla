"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isRealSupabase, supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tab-dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Data States
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // AI Recommendations state (map of matchId -> recommendation text)
  const [aiPredictions, setAiPredictions] = useState<{ [key: string]: string }>({});
  const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({});

  // Group predictions modal state
  const [modalMatch, setModalMatch] = useState<any | null>(null);
  const [modalPreds, setModalPreds] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Filter States
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  // Admin scores states
  const [adminScores, setAdminScores] = useState<{ [key: string]: { scoreA: string; scoreB: string } }>({});
  const [adminLoading, setAdminLoading] = useState<{ [key: string]: boolean }>({});

  // Chat scroll anchor
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    const userStr = localStorage.getItem('polla_user');
    if (!userStr) {
      router.push('/');
    } else {
      setCurrentUser(JSON.parse(userStr));
    }
  }, [router]);

  // Load active tab data
  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'tab-dashboard') {
      loadDashboardData();
    } else if (activeTab === 'tab-predictions') {
      loadPredictionsData();
    } else if (activeTab === 'tab-leaderboard') {
      loadLeaderboardData();
    } else if (activeTab === 'tab-admin') {
      loadAdminData();
    } else if (activeTab === 'tab-chat') {
      loadChatMessages();
    }
  }, [activeTab, currentUser]);

  // Chat Real-Time Synchronization (Supabase Realtime OR dynamic polling fallback)
  useEffect(() => {
    if (activeTab !== 'tab-chat') return;

    let chatInterval: any = null;

    if (isRealSupabase) {
      // Connect to real-time WebSockets via Supabase channel
      const channel = supabase
        .channel('public:chat_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
          setChatMessages((prev) => [...prev, payload.new]);
          setTimeout(scrollToChatBottom, 100);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback Polling in mock offline mode (every 3 seconds)
      chatInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/chat');
          if (res.ok) {
            const data = await res.json();
            setChatMessages(data);
          }
        } catch (e) {
          // Ignore
        }
      }, 3000);

      return () => {
        clearInterval(chatInterval);
      };
    }
  }, [activeTab]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('polla_user');
    router.push('/');
  };

  const scrollToChatBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Switch tabs
  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  // 1. Dashboard data loader
  const loadDashboardData = async () => {
    try {
      const [lRes, mRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/matches')
      ]);
      const leaders = await lRes.json();
      const fetchedMatches = await mRes.json();
      
      setLeaderboard(leaders);
      setMatches(fetchedMatches);

      // Update current user points dynamically
      const me = leaders.find((u: any) => u.id === currentUser.id);
      if (me) {
        setCurrentUser(me);
        localStorage.setItem('polla_user', JSON.stringify(me));
      }
    } catch (e) {
      showToast('Error al cargar datos del Dashboard', 'error');
    }
  };

  // 2. Predictions data loader
  const loadPredictionsData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/matches'),
        fetch(`/api/predictions?userId=${currentUser.id}`)
      ]);
      setMatches(await mRes.json());
      setPredictions(await pRes.json());
    } catch (e) {
      showToast('Error al cargar pronósticos', 'error');
    }
  };

  // 3. Leaderboard data loader
  const loadLeaderboardData = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      setLeaderboard(await res.json());
    } catch (e) {
      showToast('Error al cargar posiciones', 'error');
    }
  };

  // 4. Admin matches data loader
  const loadAdminData = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data);

      // Seed initial scores states
      const scoresState: any = {};
      data.forEach((match: any) => {
        scoresState[match.id] = {
          scoreA: match.score_a !== null ? match.score_a.toString() : '',
          scoreB: match.score_b !== null ? match.score_b.toString() : ''
        };
      });
      setAdminScores(scoresState);
    } catch (e) {
      showToast('Error al cargar datos de administrador', 'error');
    }
  };

  // 5. Chat messages loader
  const loadChatMessages = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        setChatMessages(await res.json());
        setTimeout(scrollToChatBottom, 100);
      }
    } catch (e) {
      showToast('Error al cargar el historial del chat', 'error');
    }
  };

  // Save Prediction to DB (auto-triggered by spinners)
  const savePrediction = async (matchId: string, scoreA: number, scoreB: number) => {
    try {
      const res = await fetch('/api/predictions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, matchId, scoreA, scoreB })
      });
      const data = await res.json();

      if (res.ok) {
        // Update local predictions state array
        setPredictions((prev) => {
          const index = prev.findIndex((p) => p.match_id === matchId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index].score_a = scoreA;
            updated[index].score_b = scoreB;
            return updated;
          } else {
            return [...prev, { match_id: matchId, score_a: scoreA, score_b: scoreB, points_earned: 0 }];
          }
        });
      } else {
        showToast(data.error || 'Error al guardar pronóstico', 'error');
      }
    } catch (e) {
      showToast('Error de red al guardar pronóstico', 'error');
    }
  };

  // Adjust spin buttons goals
  const adjustScore = (matchId: string, side: 'A' | 'B', change: number) => {
    // Find current values
    const prediction = predictions.find((p) => p.match_id === matchId);
    let scoreA = prediction ? prediction.score_a : 0;
    let scoreB = prediction ? prediction.score_b : 0;

    if (side === 'A') {
      scoreA = Math.max(0, scoreA + change);
    } else {
      scoreB = Math.max(0, scoreB + change);
    }

    savePrediction(matchId, scoreA, scoreB);
  };

  // Fetch AI Predictions from Gemini Route
  const handleConsultAI = async (matchId: string) => {
    setAiLoading((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      });
      const data = await res.json();

      if (res.ok) {
        setAiPredictions((prev) => ({ ...prev, [matchId]: data.recommendation }));
      } else {
        showToast(data.error || 'Error al conectar con la Inteligencia Artificial', 'error');
      }
    } catch (e) {
      showToast('Error de red al consultar IA', 'error');
    } finally {
      setAiLoading((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  // View Group Predictions modal for locked match
  const viewGroupPredictions = async (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    setModalMatch(match);
    
    try {
      const res = await fetch('/api/predictions/group');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((p: any) => p.matchId === matchId);
        setModalPreds(filtered);
        setShowModal(true);
      }
    } catch (e) {
      showToast('Error al cargar pronósticos de grupo', 'error');
    }
  };

  // Send a chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput;
    setChatInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          text
        })
      });

      if (res.ok) {
        const data = await res.json();
        // If Ethereal/Mock client is active, we immediately append it locally since realtime trigger is simulated
        if (!isRealSupabase) {
          setChatMessages((prev) => [...prev, data.message]);
          setTimeout(scrollToChatBottom, 100);
        }
      } else {
        showToast('Error al enviar el mensaje', 'error');
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    }
  };

  // Admin save match result
  const handleSaveAdminResult = async (matchId: string) => {
    const scoreA = adminScores[matchId]?.scoreA;
    const scoreB = adminScores[matchId]?.scoreB;

    setAdminLoading((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch('/api/admin/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          scoreA: scoreA === '' ? null : parseInt(scoreA),
          scoreB: scoreB === '' ? null : parseInt(scoreB),
          adminEmail: currentUser.email
        })
      });

      if (res.ok) {
        showToast('Resultado guardado y clasificación recalculada.', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al actualizar', 'error');
      }
    } catch (e) {
      showToast('Error al guardar resultado', 'error');
    } finally {
      setAdminLoading((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  // Reset database simulation (Admin)
  const handleResetDB = async () => {
    if (!confirm("¿Deseas reiniciar todos los marcadores y puntuaciones a cero?")) return;

    try {
      for (const match of matches) {
        await fetch('/api/admin/match/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.id,
            scoreA: null,
            scoreB: null,
            adminEmail: currentUser.email
          })
        });
      }
      showToast('Posiciones y marcadores reiniciados con éxito.', 'success');
      loadAdminData();
    } catch (e) {
      showToast('Error al restablecer posiciones', 'error');
    }
  };

  if (!currentUser) return null;

  // Next match display calculations
  const now = new Date().getTime();
  const unplayedMatches = matches
    .filter((m) => !m.played)
    .sort((a, b) => new Date(a.kickoff_utc || a.date).getTime() - new Date(b.kickoff_utc || b.date).getTime());
  const nextMatch = unplayedMatches[0];

  // Matches list rendering filtering logic
  const filteredMatches = matches.filter((m) => {
    if (phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
    const kickoff = new Date(m.kickoff_utc || m.date).getTime();
    const diffMins = (kickoff - now) / (60 * 1000);
    const isLocked = diffMins <= 10;

    if (stateFilter === 'open' && (isLocked || m.played)) return false;
    if (stateFilter === 'locked' && !isLocked && !m.played) return false;
    return true;
  });

  // Date and Time Format Helpers
  const formatDateFriendly = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} - ${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;
  };

  const getFlagUrl = (code: string) => {
    if (!code || code === 'un') return null;
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  };

  return (
    <div className="app-container">
      {/* Background patterns */}
      <div className="soccer-pitch-bg"></div>
      <div className="decor-circle circle-1"></div>
      <div className="decor-circle circle-2"></div>
      <div className="decor-circle circle-3"></div>

      {/* Header bar */}
      <header className="glass-panel main-header">
        <div className="header-brand">
          <i className="fa-solid fa-trophy trophy-gradient"></i>
          <h2>Polla Mundial 2026</h2>
        </div>

        <div className="header-profile">
          <div className="user-info">
            <span className="user-name">{currentUser.name}</span>
            {currentUser.role === 'admin' && <span className="user-role badge-admin">Admin</span>}
          </div>
          <div className="points-pill">
            <span>{currentUser.points}</span> pts
          </div>
          <button onClick={handleLogout} className="btn btn-icon" title="Cerrar Sesión">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      {/* Navigation tabs bar */}
      <nav className="glass-panel tab-navigation">
        <button
          onClick={() => switchTab('tab-dashboard')}
          className={`tab-btn ${activeTab === 'tab-dashboard' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-chart-line"></i> Dashboard
        </button>
        <button
          onClick={() => switchTab('tab-predictions')}
          className={`tab-btn ${activeTab === 'tab-predictions' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-pen-to-square"></i> Pronósticos
        </button>
        <button
          onClick={() => switchTab('tab-leaderboard')}
          className={`tab-btn ${activeTab === 'tab-leaderboard' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-ranking-star"></i> Posiciones
        </button>
        <button
          onClick={() => switchTab('tab-chat')}
          className={`tab-btn ${activeTab === 'tab-chat' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-comments"></i> Chat de Grupo
        </button>
        <button
          onClick={() => switchTab('tab-rules')}
          className={`tab-btn ${activeTab === 'tab-rules' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-circle-info"></i> Reglas
        </button>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => switchTab('tab-admin')}
            className={`tab-btn ${activeTab === 'tab-admin' ? 'active' : ''}`}
          >
            <i className="fa-solid fa-gears"></i> Administración
          </button>
        )}
      </nav>

      {/* Main content display */}
      <main className="tab-content-container">

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'tab-dashboard' && (
          <section className="tab-pane active">
            {/* Quick Metrics */}
            <div className="metrics-grid">
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-blue"><i className="fa-solid fa-star"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.points}</h3>
                  <p>Puntos Totales</p>
                </div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-green"><i className="fa-solid fa-bullseye"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.exact_matches || 0}</h3>
                  <p>Marcador Exacto</p>
                </div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-gold"><i className="fa-solid fa-circle-check"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.winner_matches || 0}</h3>
                  <p>Ganador Correcto</p>
                </div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-purple"><i className="fa-solid fa-scale-balanced"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.diff_matches || 0}</h3>
                  <p>Diferencia Goles</p>
                </div>
              </div>
            </div>

            <div className="dashboard-layout">
              <div className="glass-panel dash-main-panel">
                <h2>¡Bienvenido a la Polla Mundial 2026!</h2>
                <p>Prepara tus predicciones con precisión. El sistema bloqueará los partidos exactamente 10 minutos antes del pitazo inicial de forma automatizada. ¡Haz tus jugadas!</p>
                
                <div className="dashboard-buttons">
                  <button className="btn btn-primary" onClick={() => switchTab('tab-predictions')}>
                    <i className="fa-solid fa-pen-to-square"></i> Hacer Pronósticos
                  </button>
                  <button className="btn btn-secondary" onClick={() => switchTab('tab-leaderboard')}>
                    <i className="fa-solid fa-list-ol"></i> Ver Tabla de Posiciones
                  </button>
                </div>
              </div>

              {/* Inminent match warning */}
              <div className="glass-panel dash-side-panel">
                <h3>Partido Inminente</h3>
                <div className="next-match-box">
                  {nextMatch ? (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                        {nextMatch.group_name} - {formatDateFriendly(nextMatch.kickoff_utc || nextMatch.date)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div className="team-block" style={{ flex: 1 }}>
                          {getFlagUrl(nextMatch.team_a_code) ? (
                            <img src={getFlagUrl(nextMatch.team_a_code)!} alt={nextMatch.team_a} className="flag-img" />
                          ) : (
                            <div className="flag-placeholder">?</div>
                          )}
                          <div className="team-name" style={{ fontSize: '0.85rem' }}>{nextMatch.team_a}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>VS</div>
                        <div className="team-block" style={{ flex: 1 }}>
                          {getFlagUrl(nextMatch.team_b_code) ? (
                            <img src={getFlagUrl(nextMatch.team_b_code)!} alt={nextMatch.team_b} className="flag-img" />
                          ) : (
                            <div className="flag-placeholder">?</div>
                          )}
                          <div className="team-name" style={{ fontSize: '0.85rem' }}>{nextMatch.team_b}</div>
                        </div>
                      </div>
                      {((new Date(nextMatch.kickoff_utc || nextMatch.date).getTime() - now) / 60000) <= 10 ? (
                        <span className="status-badge badge-locked"><i className="fa-solid fa-lock"></i> Cerrado</span>
                      ) : (
                        <span className="status-badge badge-open">
                          <i className="fa-solid fa-unlock"></i> Cierra en {Math.floor((new Date(nextMatch.kickoff_utc || nextMatch.date).getTime() - now) / 60000)}m
                        </span>
                      )}
                      <button 
                        className="btn btn-secondary btn-block" 
                        style={{ marginTop: '10px', fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={() => switchTab('tab-predictions')}
                      >
                        Ver Pronósticos
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-text-muted)' }}>No hay partidos pendientes</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: PRONÓSTICOS */}
        {activeTab === 'tab-predictions' && (
          <section className="tab-pane active">
            <div className="section-header">
              <h2>Mis Pronósticos</h2>
              <p>Predice los marcadores del Mundial 2026. Recuerda que se bloquean 10 minutos antes del inicio.</p>
            </div>

            {/* Filters panel */}
            <div className="glass-panel predictions-filters">
              <div className="filter-group">
                <label htmlFor="filter-phase"><i className="fa-solid fa-filter"></i> Fase:</label>
                <select id="filter-phase" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
                  <option value="all">Todos los partidos</option>
                  <option value="groups">Fase de Grupos</option>
                  <option value="elimination">Fases Eliminatorias</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="filter-state"><i className="fa-solid fa-lock-open"></i> Estado:</label>
                <select id="filter-state" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  <option value="open">Abiertos para Pronóstico</option>
                  <option value="locked">Bloqueados / Jugados</option>
                </select>
              </div>
            </div>

            {/* Matches list container */}
            <div className="matches-list">
              {filteredMatches.length === 0 ? (
                <div className="glass-panel text-center" style={{ padding: '40px', color: 'var(--color-text-muted)' }}>
                  <i className="fa-solid fa-circle-question" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                  <p>No se encontraron encuentros.</p>
                </div>
              ) : (
                filteredMatches.map((match) => {
                  const kickoff = new Date(match.kickoff_utc || match.date).getTime();
                  const diffMins = (kickoff - now) / 60000;
                  const isLocked = diffMins <= 10;

                  const pred = predictions.find((p) => p.match_id === match.id);
                  const predA = pred ? pred.score_a : null;
                  const predB = pred ? pred.score_b : null;

                  return (
                    <div key={match.id} className="glass-panel match-card">
                      <div className="match-card-header">
                        <span className="match-phase">{match.group_name || match.group}</span>
                        <span>{formatDateFriendly(match.kickoff_utc || match.date)}</span>
                      </div>
                      <div className="match-card-body">
                        {/* Team A */}
                        <div className="team-block">
                          {getFlagUrl(match.team_a_code) ? (
                            <img src={getFlagUrl(match.team_a_code)!} alt={match.team_a} className="flag-img" />
                          ) : (
                            <div className="flag-placeholder">?</div>
                          )}
                          <span className="team-name">{match.team_a}</span>
                        </div>

                        {/* Prediction inputs */}
                        <div className="score-inputs">
                          {match.played || isLocked ? (
                            <div className="score-locked-display">
                              <span className="locked-score">{predA !== null ? predA : '-'}</span>
                              <span className="score-slash">:</span>
                              <span className="locked-score">{predB !== null ? predB : '-'}</span>
                            </div>
                          ) : (
                            <>
                              <div className="score-spinner">
                                <button className="spinner-btn" onClick={() => adjustScore(match.id, 'A', -1)}>-</button>
                                <span className="score-val">{predA !== null ? predA : '0'}</span>
                                <button className="spinner-btn" onClick={() => adjustScore(match.id, 'A', 1)}>+</button>
                              </div>
                              <span className="score-colon">:</span>
                              <div className="score-spinner">
                                <button className="spinner-btn" onClick={() => adjustScore(match.id, 'B', -1)}>-</button>
                                <span className="score-val">{predB !== null ? predB : '0'}</span>
                                <button className="spinner-btn" onClick={() => adjustScore(match.id, 'B', 1)}>+</button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Team B */}
                        <div className="team-block">
                          {getFlagUrl(match.team_b_code) ? (
                            <img src={getFlagUrl(match.team_b_code)!} alt={match.team_b} className="flag-img" />
                          ) : (
                            <div className="flag-placeholder">?</div>
                          )}
                          <span className="team-name">{match.team_b}</span>
                        </div>
                      </div>
                      <div className="match-card-footer">
                        {match.played ? (
                          <span className="status-badge badge-played"><i className="fa-solid fa-circle-check"></i> Finalizado</span>
                        ) : isLocked ? (
                          <span className="status-badge badge-locked"><i className="fa-solid fa-lock"></i> Bloqueado</span>
                        ) : (
                          <span className="status-badge badge-open"><i className="fa-solid fa-unlock"></i> Abierto</span>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {match.played ? (
                            <>
                              <div className="real-results-box">Oficial: <strong>{match.score_a} - {match.score_b}</strong></div>
                              <div className="points-earned-tag">+{pred ? pred.points_earned : 0} pts</div>
                            </>
                          ) : isLocked ? (
                            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => viewGroupPredictions(match.id)}>
                              <i className="fa-solid fa-eye"></i> Ver Grupo
                            </button>
                          ) : (
                            <>
                              {aiPredictions[match.id] ? null : (
                                <button 
                                  className="btn btn-ai-predict" 
                                  onClick={() => handleConsultAI(match.id)}
                                  disabled={aiLoading[match.id]}
                                >
                                  {aiLoading[match.id] ? (
                                    <>
                                      <i className="fa-solid fa-spinner fa-spin"></i> Consultando...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-wand-magic-sparkles"></i> Consultar IA
                                    </>
                                  )}
                                </button>
                              )}
                              <span className="save-status-msg" style={{ display: predA !== null ? 'inline-flex' : 'none' }}>
                                <i className="fa-solid fa-circle-check text-green"></i> Guardado
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* AI Prediction details panel */}
                      {aiPredictions[match.id] && (
                        <div className="ai-recommendation-box">
                          <i className="fa-solid fa-robot"></i> <strong>Recomendación IA:</strong> {aiPredictions[match.id]}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* TAB 3: POSICIONES */}
        {activeTab === 'tab-leaderboard' && (
          <section className="tab-pane active">
            <div className="section-header">
              <h2>Tabla de Posiciones</h2>
              <p>Competidores en vivo. ¡Suma puntos y llega a la cima de la tabla!</p>
            </div>

            <div className="glass-panel leaderboard-panel">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th className="rank-col">Pos</th>
                    <th>Participante</th>
                    <th className="stat-col"><span className="desktop-only">Exactos</span><span className="mobile-only">EX</span></th>
                    <th className="stat-col"><span className="desktop-only">Ganador</span><span className="mobile-only">G</span></th>
                    <th className="stat-col"><span className="desktop-only">Diferencia</span><span className="mobile-only">DF</span></th>
                    <th className="points-col">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center">Cargando clasificación...</td>
                    </tr>
                  ) : (
                    leaderboard.map((player, index) => {
                      const rank = index + 1;
                      let rankDisp: any = rank.toString();
                      if (rank === 1) rankDisp = '🥇';
                      else if (rank === 2) rankDisp = '🥈';
                      else if (rank === 3) rankDisp = '🥉';

                      return (
                        <tr key={player.id} className={player.id === currentUser.id ? 'me-row' : ''}>
                          <td className="rank-col">{rankDisp}</td>
                          <td>
                            <strong>{player.name}</strong> 
                            {player.id === currentUser.id && (
                              <span style={{ fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-primary)', color: 'white', marginLeft: '6px' }}>
                                TÚ
                              </span>
                            )}
                          </td>
                          <td className="stat-col">{player.exact_matches || 0}</td>
                          <td className="stat-col">{player.winner_matches || 0}</td>
                          <td className="stat-col">{player.diff_matches || 0}</td>
                          <td className="points-col">{player.points} pts</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: CHAT DE GRUPO */}
        {activeTab === 'tab-chat' && (
          <section className="tab-pane active">
            <div className="section-header">
              <h2>Chat Grupal</h2>
              <p>Comenta los partidos, debate marcadores y bromea con tus amigos del grupo en tiempo real.</p>
            </div>

            <div className="glass-panel chat-container" style={{ padding: 0 }}>
              <div className="chat-messages-box">
                {chatMessages.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', margin: 'auto' }}>
                    No hay mensajes en este chat. ¡Sé el primero en escribir!
                  </p>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.user_id === currentUser.id;
                    const date = new Date(msg.created_at);
                    const timeDisp = `${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;

                    return (
                      <div key={msg.id} className={`chat-msg ${isMe ? 'chat-msg-me' : 'chat-msg-other'}`}>
                        {!isMe && <span className="chat-msg-user">{msg.user_name}</span>}
                        <span>{msg.text}</span>
                        <span className="chat-msg-time">{timeDisp}</span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef}></div>
              </div>

              <form onSubmit={handleSendChat} className="chat-input-bar">
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  className="chat-input-field"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
                  Enviar <i className="fa-solid fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </section>
        )}

        {/* TAB 5: REGLAS */}
        {activeTab === 'tab-rules' && (
          <section className="tab-pane active">
            <div className="glass-panel rules-panel">
              <h2>Reglamento Oficial de Puntuación (Polla Mundial)</h2>
              <p>Los puntos se otorgan en base al resultado oficial de los <strong>90 minutos de juego reglamentario</strong> más el tiempo de adición.</p>

              <div className="rules-table-container">
                <table className="rules-table">
                  <thead>
                    <tr>
                      <th>Criterio de Acierto</th>
                      <th>Fase de Grupos</th>
                      <th>Fases Eliminatorias</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Resultado (Ganador o Empate)</strong><br /><span className="rule-detail">Por acertar quién gana o si hay empate.</span></td>
                      <td className="points">+5 pts</td>
                      <td className="points">+10 pts</td>
                    </tr>
                    <tr>
                      <td><strong>Goles Exactos de cada Equipo</strong><br /><span className="rule-detail">Acertar los goles del local o visitante (+2/+4 por cada equipo).</span></td>
                      <td className="points">+2 pts c/u</td>
                      <td className="points">+4 pts c/u</td>
                    </tr>
                    <tr>
                      <td><strong>Diferencia de Goles</strong><br /><span className="rule-detail">Acertar la diferencia exacta de goles (ej: 2-0 y termina 3-1).</span></td>
                      <td className="points">+1 pt</td>
                      <td className="points">+2 pts</td>
                    </tr>
                    <tr className="highlight-row">
                      <td><strong>Puntaje Perfecto Máximo</strong></td>
                      <td><strong>10 puntos</strong></td>
                      <td><strong>20 puntos</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: ADMINISTRACIÓN */}
        {activeTab === 'tab-admin' && currentUser.role === 'admin' && (
          <section className="tab-pane active">
            <div className="section-header">
              <h2>Consola de Administración y Simulador</h2>
              <p>Registra marcadores reales para simular el avance del torneo y ver cómo se recalculan los puntajes y se reordenan posiciones al instante.</p>
            </div>

            <div className="admin-grid">
              <div className="glass-panel admin-main">
                <h3>Partidos del Torneo</h3>
                <div className="admin-matches-grid">
                  {matches.map((match) => {
                    const scoreA = adminScores[match.id]?.scoreA || '';
                    const scoreB = adminScores[match.id]?.scoreB || '';

                    return (
                      <div key={match.id} className="admin-match-row">
                        <div className="admin-match-info">
                          <div className="teams">{match.team_a} vs {match.team_b}</div>
                          <div className="meta">{match.group_name || match.group} - {formatDateFriendly(match.kickoff_utc || match.date)}</div>
                        </div>
                        <div className="admin-score-inputs">
                          <input
                            type="number"
                            min="0"
                            className="admin-score-input"
                            value={scoreA}
                            onChange={(e) => setAdminScores(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], scoreA: e.target.value }
                            }))}
                            placeholder="L"
                            disabled={adminLoading[match.id]}
                          />
                          <span>:</span>
                          <input
                            type="number"
                            min="0"
                            className="admin-score-input"
                            value={scoreB}
                            onChange={(e) => setAdminScores(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], scoreB: e.target.value }
                            }))}
                            placeholder="V"
                            disabled={adminLoading[match.id]}
                          />
                        </div>
                        <div>
                          <button 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                            onClick={() => handleSaveAdminResult(match.id)}
                            disabled={adminLoading[match.id]}
                          >
                            {adminLoading[match.id] ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-save"></i> Guardar</>}
                          </button>
                        </div>
                        <div>
                          <span id={`admin-status-${match.id}`}></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel admin-side">
                <h3>Ajustes de Simulación</h3>
                <p className="info-text">Como administrador, puedes registrar goles oficiales a la izquierda. Los puntajes de los competidores virtuales y del usuario se actualizarán automáticamente en la pestaña de Posiciones.</p>
                
                <div className="sim-actions">
                  <button onClick={handleResetDB} className="btn btn-secondary btn-block">
                    <i className="fa-solid fa-rotate-left"></i> Restablecer Resultados
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* CREDIT FOOTER */}
      <footer className="app-footer">
        <p>Versión 1.0.0 | Creador: Alejandro Rodriguez</p>
      </footer>

      {/* POPUP MODAL: GROUP PREDICTIONS (FAIR PLAY DISPLAY) */}
      {showModal && modalMatch && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pronósticos del Grupo</h3>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="match-info-banner">
                <div className="match-card-compact">
                  <div className="team-block" style={{ flexDirection: 'row', gap: '6px' }}>
                    {getFlagUrl(modalMatch.team_a_code) && (
                      <img src={getFlagUrl(modalMatch.team_a_code)!} alt={modalMatch.team_a} className="flag-img" style={{ width: '30px', height: '20px' }} />
                    )}
                    <span>{modalMatch.team_a}</span>
                  </div>
                  <div>vs</div>
                  <div className="team-block" style={{ flexDirection: 'row', gap: '6px' }}>
                    <span>{modalMatch.team_b}</span>
                    {getFlagUrl(modalMatch.team_b_code) && (
                      <img src={getFlagUrl(modalMatch.team_b_code)!} alt={modalMatch.team_b} className="flag-img" style={{ width: '30px', height: '20px' }} />
                    )}
                  </div>
                </div>
              </div>
              <div className="predictions-list-container">
                <table className="modal-predictions-table">
                  <thead>
                    <tr>
                      <th>Participante</th>
                      <th className="text-center">Pronóstico</th>
                      <th className="text-right">Puntos Ganados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalPreds.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center" style={{ color: 'var(--color-text-muted)' }}>
                          Ninguno ingresó pronóstico.
                        </td>
                      </tr>
                    ) : (
                      modalPreds.map((pred, i) => (
                        <tr key={i}>
                          <td><strong>{pred.userName}</strong></td>
                          <td className="text-center" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                            {pred.scoreA} : {pred.scoreB}
                          </td>
                          <td className="text-right text-green" style={{ fontWeight: 800 }}>
                            {modalMatch.played ? `+${pred.pointsEarned} pts` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
