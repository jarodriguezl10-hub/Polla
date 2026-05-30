"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isRealSupabase, supabase } from '@/lib/supabaseClient';

const PARTICIPATING_COUNTRIES = [
  { name: "Alemania", code: "de" },
  { name: "Arabia Saudita", code: "sa" },
  { name: "Argelia", code: "dz" },
  { name: "Argentina", code: "ar" },
  { name: "Australia", code: "au" },
  { name: "Austria", code: "at" },
  { name: "Bélgica", code: "be" },
  { name: "Bosnia y Herzegovina", code: "ba" },
  { name: "Brasil", code: "br" },
  { name: "Cabo Verde", code: "cv" },
  { name: "Canadá", code: "ca" },
  { name: "Catar", code: "qa" },
  { name: "Chile", code: "cl" },
  { name: "Colombia", code: "co" },
  { name: "Costa de Marfil", code: "ci" },
  { name: "Croacia", code: "hr" },
  { name: "Curazao", code: "cw" },
  { name: "Dinamarca", code: "dk" },
  { name: "Ecuador", code: "ec" },
  { name: "Egipto", code: "eg" },
  { name: "Escocia", code: "gb-sct" },
  { name: "España", code: "es" },
  { name: "Estados Unidos", code: "us" },
  { name: "Francia", code: "fr" },
  { name: "Ghana", code: "gh" },
  { name: "Haití", code: "ht" },
  { name: "Inglaterra", code: "gb-eng" },
  { name: "Irak", code: "iq" },
  { name: "Japón", code: "jp" },
  { name: "Jordania", code: "jo" },
  { name: "Marruecos", code: "ma" },
  { name: "México", code: "mx" },
  { name: "Noruega", code: "no" },
  { name: "Países Bajos", code: "nl" },
  { name: "Panamá", code: "pa" },
  { name: "Paraguay", code: "py" },
  { name: "Portugal", code: "pt" },
  { name: "RD Congo", code: "cd" },
  { name: "República de Corea", code: "kr" },
  { name: "Senegal", code: "sn" },
  { name: "Sudáfrica", code: "za" },
  { name: "Suecia", code: "se" },
  { name: "Suiza", code: "ch" },
  { name: "Túnez", code: "tn" },
  { name: "Turquía", code: "tr" },
  { name: "Ucrania", code: "ua" },
  { name: "Uruguay", code: "uy" },
  { name: "Uzbekistán", code: "uz" }
];

// Admin emails — these users see the Administration tab
const SUPER_ADMIN_EMAILS = ['jarodriguezl10@gmail.com', 'cristhiancamilo@gmail.com'];
const PAYMENTS_ADMIN_EMAILS = ['jarodriguezl10@gmail.com', 'cristhiancamilo@gmail.com', 'mario.montalvo@gmail.com'];

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tab-dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Data States
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [scrollMatchId, setScrollMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Unread chat messages count
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenChatTimestampRef = useRef<string | null>(null);

  // AI Recommendations state (map of matchId -> recommendation text)
  const [aiPredictions, setAiPredictions] = useState<{ [key: string]: string }>({});
  const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({});

  // Group predictions modal state
  const [modalMatch, setModalMatch] = useState<any | null>(null);
  const [modalPreds, setModalPreds] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState<any | null>(null);
  const [modalUserPreds, setModalUserPreds] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);

  // Filter States
  const [predictionFilter, setPredictionFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  // Admin scores & teams states
  const [adminScores, setAdminScores] = useState<{ [key: string]: { scoreA: string; scoreB: string } }>({});
  const [adminTeams, setAdminTeams] = useState<{ [key: string]: { teamA: string; teamACode: string; teamB: string; teamBCode: string } }>({});
  const [adminLoading, setAdminLoading] = useState<{ [key: string]: boolean }>({});
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPhaseFilter, setAdminPhaseFilter] = useState('all');

  // Admin payment states
  const [selectedUnpaidUserId, setSelectedUnpaidUserId] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentActionLoadingId, setPaymentActionLoadingId] = useState<string | null>(null);
  const [unconciliatedPayments, setUnconciliatedPayments] = useState<any[]>([]);
  const [newRecollectionDate, setNewRecollectionDate] = useState('');
  const [newUnconciliatedNotes, setNewUnconciliatedNotes] = useState('');
  const [unconciliatedLoading, setUnconciliatedLoading] = useState(false);

  // Form states for creating a TOURNAMENT match (dropdowns)
  const [newMatchId, setNewMatchId] = useState('');
  const [newMatchGroup, setNewMatchGroup] = useState('Grupo A');
  const [newMatchTeamA, setNewMatchTeamA] = useState('mx');
  const [newMatchTeamB, setNewMatchTeamB] = useState('za');
  const [newMatchTeamACode, setNewMatchTeamACode] = useState('mx');
  const [newMatchTeamBCode, setNewMatchTeamBCode] = useState('za');
  const [newMatchKickoff, setNewMatchKickoff] = useState('');
  const [newMatchPhase, setNewMatchPhase] = useState('groups');
  const [createMatchLoading, setCreateMatchLoading] = useState(false);

  // Form states for creating a TEST/PRUEBA match (free-text)
  const [testMatchGroup, setTestMatchGroup] = useState('Grupo A');
  const [testMatchTeamA, setTestMatchTeamA] = useState('');
  const [testMatchTeamB, setTestMatchTeamB] = useState('');
  const [testMatchTeamACode, setTestMatchTeamACode] = useState('un');
  const [testMatchTeamBCode, setTestMatchTeamBCode] = useState('un');
  const [testMatchKickoff, setTestMatchKickoff] = useState('');
  const [createTestMatchLoading, setCreateTestMatchLoading] = useState(false);

  // Chat scroll anchor
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  // Menciones, notificaciones y tiempo real
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [replyingToMsgId, setReplyingToMsgId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');


  // Authentication check
  useEffect(() => {
    const userStr = localStorage.getItem('polla_user');
    if (!userStr) {
      router.push('/');
    } else {
      const parsed = JSON.parse(userStr);
      setCurrentUser(parsed);
      // Fetch leaderboard on mount to ensure we always have the user's rank
      fetch('/api/leaderboard')
        .then(res => res.json())
        .then(data => setLeaderboard(data))
        .catch(e => console.error("Error fetching leaderboard on mount", e));
    }
  }, [router]);

  // Real-time clock tick effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load read notification IDs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('polla_read_notifications');
    if (stored) {
      try {
        setReadNotificationIds(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

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
    } else if (activeTab === 'tab-payments') {
      loadAdminData();
      loadUnconciliatedPayments();
    }
  }, [activeTab, currentUser]);

  // Chat Real-Time Synchronization (Supabase Realtime OR dynamic polling fallback)
  useEffect(() => {
    if (!showFloatingChat || !currentUser) return;

    loadChatMessages();
    // Mark all as read when chat opens
    lastSeenChatTimestampRef.current = new Date().toISOString();
    setUnreadCount(0);

    let chatInterval: any = null;

    if (isRealSupabase) {
      const channel = supabase
        .channel('public:chat_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
          const msg = payload.new;
          if (!msg.recipient_ids) {
            setChatMessages((prev) => [...prev, msg]);
            setTimeout(scrollToChatBottom, 100);
          } else {
            const ids = msg.recipient_ids.split(',');
            if (msg.user_id === currentUser.id || ids.includes(currentUser.id)) {
              setChatMessages((prev) => [...prev, msg]);
              setTimeout(scrollToChatBottom, 100);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      chatInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/chat?userId=${currentUser.id}`);
          if (res.ok) {
            const data = await res.json();
            setChatMessages(data);
          }
        } catch (e) { /* ignore */ }
      }, 3000);

      return () => { clearInterval(chatInterval); };
    }
  }, [showFloatingChat, currentUser]);

  // Background polling for unread count when chat is CLOSED
  useEffect(() => {
    if (showFloatingChat || !currentUser) return; // already watching live
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat?userId=${currentUser.id}`);
        if (res.ok) {
          const data: any[] = await res.json();
          if (!lastSeenChatTimestampRef.current) {
            lastSeenChatTimestampRef.current = new Date().toISOString();
          }
          const unseen = data.filter(
            (m) => new Date(m.created_at) > new Date(lastSeenChatTimestampRef.current!)
          );
          setUnreadCount(unseen.length);
        }
      } catch (e) { /* ignore */ }
    }, 15000); // poll every 15 sec
    return () => clearInterval(interval);
  }, [showFloatingChat, currentUser]);

  // Auto-announce match predictions to chat when a match starts/locks (10 mins before kickoff)
  useEffect(() => {
    if (!matches || matches.length === 0) return;

    const checkAndAnnounce = async () => {
      const now = Date.now();
      for (const match of matches) {
        const kickoff = new Date(match.kickoff_utc || match.date).getTime();
        const diffMins = (kickoff - now) / 60000;
        
        // Match locks 10 minutes before kickoff.
        // We check matches that are locked and kickoff is recent (started within the last 24h)
        const isLocked = diffMins <= 10;
        const isRecent = (now - kickoff) < 24 * 60 * 60 * 1000;

        if (isLocked && isRecent) {
          const announcedKey = `announced_${match.id}`;
          if (!localStorage.getItem(announcedKey)) {
            try {
              const res = await fetch('/api/predictions/announce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: match.id })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.success) {
                  localStorage.setItem(announcedKey, 'true');
                }
              }
            } catch (e) {
              console.error('Error invoking prediction announcement:', e);
            }
          }
        }
      }
    };

    checkAndAnnounce();
    const interval = setInterval(checkAndAnnounce, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [matches]);

  // Toggle body class for mobile chat drawer backdrop dimming
  useEffect(() => {
    if (showFloatingChat) {
      document.body.classList.add('chat-open');
    } else {
      document.body.classList.remove('chat-open');
    }
    return () => {
      document.body.classList.remove('chat-open');
    };
  }, [showFloatingChat]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('polla_user');
    window.location.href = '/';
  };

  const scrollToChatBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Switch tabs
  const switchTab = (tabId: string, matchId?: string) => {
    setActiveTab(tabId);
    if (matchId) {
      setScrollMatchId(matchId);
    }
  };

  // Scroll to match card in Predictions tab and highlight it
  useEffect(() => {
    if (activeTab === 'tab-predictions' && scrollMatchId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`match-card-${scrollMatchId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted-card');
          setTimeout(() => {
            element.classList.remove('highlighted-card');
          }, 2000);
          setScrollMatchId(null);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, scrollMatchId]);

  // 1. Dashboard data loader
  const loadDashboardData = async () => {
    try {
      const [lRes, mRes, pRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/matches'),
        fetch(`/api/predictions?userId=${currentUser.id}`)
      ]);
      const leaders = await lRes.json();
      const fetchedMatches = await mRes.json();
      const fetchedPreds = await pRes.json();
      
      setLeaderboard(leaders);
      setMatches(fetchedMatches);
      setPredictions(fetchedPreds);

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
      const [mRes, lRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/leaderboard')
      ]);
      const data = await mRes.json();
      const leaders = await lRes.json();
      
      setMatches(data);
      setLeaderboard(leaders);

      // Seed initial scores and teams states
      const scoresState: any = {};
      const teamsState: any = {};
      data.forEach((match: any) => {
        scoresState[match.id] = {
          scoreA: match.score_a !== null ? match.score_a.toString() : '',
          scoreB: match.score_b !== null ? match.score_b.toString() : ''
        };
        teamsState[match.id] = {
          teamA: match.team_a,
          teamACode: match.team_a_code,
          teamB: match.team_b,
          teamBCode: match.team_b_code
        };
      });
      setAdminScores(scoresState);
      setAdminTeams(teamsState);
    } catch (e) {
      showToast('Error al cargar datos de administrador', 'error');
    }
  };

  // 5. Chat messages loader
  const loadChatMessages = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chat?userId=${currentUser.id}`);
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
    let scoreA = prediction && prediction.score_a !== null ? prediction.score_a : 0;
    let scoreB = prediction && prediction.score_b !== null ? prediction.score_b : 0;

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

  const viewUserPredictions = async (user: any) => {
    setModalUser(user);
    try {
      const res = await fetch(`/api/predictions?userId=${user.id}`);
      if (res.ok) {
        const userPreds = await res.json();
        
        // Filter out matches that are not locked/played
        const lockedOrPlayedMatches = matches.filter(m => {
          const kickoff = new Date(m.kickoff_utc || m.date).getTime();
          const diffMins = (kickoff - currentTime) / 60000;
          return m.played || diffMins <= 10;
        });
        
        const mappedPreds = lockedOrPlayedMatches.map(m => {
          const p = userPreds.find((pred: any) => pred.match_id === m.id);
          return {
            match: m,
            scoreA: p ? p.score_a : null,
            scoreB: p ? p.score_b : null,
            pointsEarned: p ? p.points_earned : null
          };
        });
        
        // Sort by match date descending (most recent first)
        mappedPreds.sort((a, b) => {
          const dateA = new Date(a.match.kickoff_utc || a.match.date).getTime();
          const dateB = new Date(b.match.kickoff_utc || b.match.date).getTime();
          return dateB - dateA;
        });

        setModalUserPreds(mappedPreds);
        setShowUserModal(true);
      }
    } catch (e) {
      console.error(e);
      showToast('Error al cargar pronósticos del participante', 'error');
    }
  };

  // Send a chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput;
    const recipientIds = selectedRecipients.length > 0 
      ? selectedRecipients.map(r => r.id).join(',') 
      : null;

    setChatInput('');
    setSelectedRecipients([]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          text,
          recipientIds
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

  // Chat input listener to trigger mentions (@) dropdown
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);

    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || val[lastAtIndex - 1] === ' ')) {
      const textAfterAt = val.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentionList(true);
        setMentionFilter(textAfterAt);
        return;
      }
    }
    setShowMentionList(false);
  };

  // Add mentioned user as a private message recipient
  const handleSelectMentionRecipient = (user: any) => {
    if (!selectedRecipients.some(r => r.id === user.id)) {
      setSelectedRecipients([...selectedRecipients, user]);
    }
    const lastAtIndex = chatInput.lastIndexOf('@');
    const prefix = chatInput.slice(0, lastAtIndex);
    setChatInput(`${prefix}@${user.name} `);
    setShowMentionList(false);
  };

  // Mark direct message notification as read (dismiss)
  const handleMarkAsRead = (msgId: string) => {
    const updated = [...readNotificationIds, msgId];
    setReadNotificationIds(updated);
    localStorage.setItem('polla_read_notifications', JSON.stringify(updated));
  };

  // Send a private response to a direct message from the notification bell
  const handleSendNotificationReply = async (originalMsg: any) => {
    if (!replyText.trim()) return;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          text: replyText,
          recipientIds: originalMsg.user_id
        })
      });

      if (res.ok) {
        showToast('✅ Respuesta enviada.', 'success');
        handleMarkAsRead(originalMsg.id);
        setReplyingToMsgId(null);
        setReplyText('');
        loadChatMessages();
      } else {
        showToast('Error al enviar respuesta', 'error');
      }
    } catch (e) {
      showToast('Error al enviar respuesta', 'error');
    }
  };

  // Admin save match result + auto-announce in chat
  const handleSaveAdminResult = async (matchId: string) => {
    const scoreA = adminScores[matchId]?.scoreA;
    const scoreB = adminScores[matchId]?.scoreB;

    if (scoreA === '' || scoreA === undefined || scoreB === '' || scoreB === undefined) {
      showToast('Ingresa ambos marcadores antes de guardar.', 'error');
      return;
    }

    // Confirm if match already has scores recorded
    const match = matches.find(m => m.id === matchId);
    if (match && match.score_a !== null && match.score_b !== null) {
      if (!confirm("El partido ya tiene un marcador registrado. ¿Desea cambiar el marcador?")) {
        return;
      }
    }

    setAdminLoading((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch('/api/admin/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          scoreA: parseInt(scoreA),
          scoreB: parseInt(scoreB),
          adminEmail: currentUser.email
        })
      });

      if (res.ok) {
        showToast('✅ Resultado guardado y puntos actualizados.', 'success');
        loadAdminData();
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
    const confirm1 = prompt("¿Deseas reiniciar todos los marcadores y puntuaciones a cero? Escribe CONFIRMAR para continuar:");
    if (confirm1 !== "CONFIRMAR") {
      showToast("Operación cancelada o palabra de confirmación incorrecta.", "error");
      return;
    }

    const confirm2 = prompt("¿Estás absolutamente seguro? Esta acción es irreversible. Escribe CONFIRMAR para confirmar definitivamente:");
    if (confirm2 !== "CONFIRMAR") {
      showToast("Operación cancelada o palabra de confirmación incorrecta.", "error");
      return;
    }

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

  // Admin toggle payment status for a user
  const handleTogglePayment = async (userId: string, paid: boolean) => {
    setPaymentActionLoadingId(userId);
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/admin/user/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          paid,
          adminEmail: currentUser.email
        })
      });

      if (res.ok) {
        showToast(paid ? '✅ Pago registrado con éxito.' : '🔄 Pago revertido con éxito.', 'success');
        if (userId === selectedUnpaidUserId) {
          setSelectedUnpaidUserId('');
        }
        await loadAdminData();
        loadUnconciliatedPayments();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al actualizar el pago', 'error');
      }
    } catch (e) {
      showToast('Error al actualizar el pago', 'error');
    } finally {
      setPaymentActionLoadingId(null);
      setPaymentLoading(false);
    }
  };

  const loadUnconciliatedPayments = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/admin/payments/unconciliated?adminEmail=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setUnconciliatedPayments(data);
      }
    } catch (e) {
      console.error("Error loading unconciliated payments", e);
    }
  };

  const handleCreateUnconciliatedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecollectionDate) {
      showToast('Por favor, selecciona una fecha de recaudo.', 'error');
      return;
    }
    setUnconciliatedLoading(true);
    try {
      const bogotaISO = `${newRecollectionDate}:00-05:00`;
      const utcDate = new Date(bogotaISO).toISOString();

      const res = await fetch('/api/admin/payments/unconciliated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recollectionDate: utcDate,
          notes: newUnconciliatedNotes,
          adminEmail: currentUser.email
        })
      });
      if (res.ok) {
        showToast('✅ Pago sin conciliar registrado con éxito.', 'success');
        setNewRecollectionDate('');
        setNewUnconciliatedNotes('');
        loadUnconciliatedPayments();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al registrar pago sin conciliar', 'error');
      }
    } catch (e) {
      showToast('Error al registrar pago sin conciliar', 'error');
    } finally {
      setUnconciliatedLoading(false);
    }
  };

  const handleConciliatePayment = async (paymentId: string) => {
    if (!confirm('¿Deseas marcar este pago como conciliado?')) return;
    try {
      const res = await fetch('/api/admin/payments/unconciliated', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          adminEmail: currentUser.email
        })
      });
      if (res.ok) {
        showToast('✅ Pago marcado como conciliado.', 'success');
        loadUnconciliatedPayments();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al conciliar pago', 'error');
      }
    } catch (e) {
      showToast('Error al conciliar pago', 'error');
    }
  };

  // Admin save team names and flags
  const handleSaveAdminTeams = async (matchId: string) => {
    const teamA = adminTeams[matchId]?.teamA;
    const teamB = adminTeams[matchId]?.teamB;
    const teamACode = adminTeams[matchId]?.teamACode;
    const teamBCode = adminTeams[matchId]?.teamBCode;

    if (!teamA || !teamB) {
      showToast('Por favor, selecciona ambos equipos.', 'error');
      return;
    }

    setAdminLoading((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch('/api/admin/match/update-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          teamA,
          teamB,
          teamACode: teamACode || 'un',
          teamBCode: teamBCode || 'un',
          adminEmail: currentUser.email
        })
      });

      if (res.ok) {
        showToast('Equipos y banderas actualizados con éxito.', 'success');
        loadAdminData(); // refresh matches
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al actualizar equipos', 'error');
      }
    } catch (e) {
      showToast('Error al actualizar equipos', 'error');
    } finally {
      setAdminLoading((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  // Helper to calculate the next automatic match ID
  // Normalize text by removing accents/diacritics for search
  const normalizeText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const getNextMatchId = () => {
    if (!matches || matches.length === 0) return 'm1';
    let maxNum = 0;
    matches.forEach((m: any) => {
      const idStr = m.id || '';
      if (idStr.startsWith('m')) {
        const num = parseInt(idStr.substring(1));
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `m${maxNum + 1}`;
  };

  // Admin create TOURNAMENT match (with dropdowns for phase/teams)
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMatchKickoff) {
      showToast('Por favor completa la fecha del partido.', 'error');
      return;
    }

    const calculatedId = getNextMatchId();
    const teamACountry = PARTICIPATING_COUNTRIES.find(c => c.code === newMatchTeamA);
    const teamBCountry = PARTICIPATING_COUNTRIES.find(c => c.code === newMatchTeamB);
    if (!teamACountry || !teamBCountry) {
      showToast('Selecciona equipos válidos.', 'error');
      return;
    }

    setCreateMatchLoading(true);

    try {
      const bogotaISO = `${newMatchKickoff}:00-05:00`;
      const kickoffUtc = new Date(bogotaISO).toISOString();

      const res = await fetch('/api/admin/match/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: calculatedId,
          groupName: newMatchGroup,
          teamA: teamACountry.name,
          teamB: teamBCountry.name,
          teamACode: teamACountry.code,
          teamBCode: teamBCountry.code,
          kickoffUtc,
          phase: newMatchPhase,
          adminEmail: currentUser.email
        })
      });

      if (res.ok) {
        showToast('Partido del torneo creado con éxito.', 'success');
        setNewMatchTeamA('mx');
        setNewMatchTeamB('za');
        setNewMatchTeamACode('mx');
        setNewMatchTeamBCode('za');
        setNewMatchKickoff('');
        loadAdminData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al crear partido', 'error');
      }
    } catch (e) {
      showToast('Error de red al crear partido', 'error');
    } finally {
      setCreateMatchLoading(false);
    }
  };

  // Admin create TEST/PRUEBA match (free-text team names)
  const handleCreateTestMatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testMatchKickoff) {
      showToast('Por favor completa la fecha del partido de prueba.', 'error');
      return;
    }

    const calculatedId = getNextMatchId();
    setCreateTestMatchLoading(true);

    try {
      const bogotaISO = `${testMatchKickoff}:00-05:00`;
      const kickoffUtc = new Date(bogotaISO).toISOString();

      const res = await fetch('/api/admin/match/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: calculatedId,
          groupName: testMatchGroup,
          teamA: testMatchTeamA,
          teamB: testMatchTeamB,
          teamACode: testMatchTeamACode,
          teamBCode: testMatchTeamBCode,
          kickoffUtc,
          phase: 'PRUEBA',
          adminEmail: currentUser.email
        })
      });

      if (res.ok) {
        showToast('Partido de prueba creado con éxito.', 'success');
        setTestMatchTeamA('');
        setTestMatchTeamB('');
        setTestMatchTeamACode('un');
        setTestMatchTeamBCode('un');
        setTestMatchKickoff('');
        loadAdminData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al crear partido de prueba', 'error');
      }
    } catch (e) {
      showToast('Error de red al crear partido de prueba', 'error');
    } finally {
      setCreateTestMatchLoading(false);
    }
  };

  if (!currentUser) return null;

  // Next match display calculations
  const now = currentTime;
  const unplayedMatches = matches
    .filter((m) => !m.played)
    .sort((a, b) => new Date(a.kickoff_utc || a.date).getTime() - new Date(b.kickoff_utc || b.date).getTime());
  const nextMatch = unplayedMatches[0];

  // Get dynamic list of imminent matches (at least 4 matches)
  const getImminentMatches = () => {
    const todayDate = new Date(currentTime);
    const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).getTime();
    const endOfTomorrow = startOfToday + (2 * 24 * 60 * 60 * 1000); // 48 hours

    // 1. Filter matches today & tomorrow
    const todayAndTomorrowMatches = matches.filter(m => {
      const kTime = new Date(m.kickoff_utc || m.date).getTime();
      return kTime >= startOfToday && kTime < endOfTomorrow;
    });

    todayAndTomorrowMatches.sort((a, b) => new Date(a.kickoff_utc || a.date).getTime() - new Date(b.kickoff_utc || b.date).getTime());

    if (todayAndTomorrowMatches.length >= 4) {
      return todayAndTomorrowMatches;
    }

    // 2. Backfill with next upcoming chronologically
    const allSortedMatches = [...matches].sort((a, b) => new Date(a.kickoff_utc || a.date).getTime() - new Date(b.kickoff_utc || b.date).getTime());
    const upcomingFromToday = allSortedMatches.filter(m => {
      const kTime = new Date(m.kickoff_utc || m.date).getTime();
      return kTime >= startOfToday;
    });

    if (upcomingFromToday.length >= 4) {
      return upcomingFromToday.slice(0, 4);
    }
    return allSortedMatches.slice(0, 4);
  };

  const imminentMatches = getImminentMatches();

  // Helper for countdown text
  const getCierraCountDownText = (kickoffStr: string) => {
    const kickoff = new Date(kickoffStr).getTime();
    const closeTime = kickoff - (10 * 60 * 1000); // 10 minutes before kickoff
    const diffMs = closeTime - currentTime;

    if (diffMs <= 0) {
      return "Bloqueado 🔒";
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs > 24 * 60 * 60 * 1000) {
      return `Cierra en ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else if (diffMs > 60 * 60 * 1000) {
      return `Cierra en ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffMs >= 60 * 1000) {
      return `Cierra en ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else {
      const displaySecs = String(Math.max(0, diffSecs)).padStart(2, '0');
      return `Cierra en ${displaySecs} segundos`;
    }
  };

  // Direct message notifications helper
  const directMessageNotifications = chatMessages.filter(msg => {
    if (!msg.recipient_ids) return false;
    if (msg.user_id === currentUser?.id) return false;
    const ids = msg.recipient_ids.split(',');
    const isRecipient = ids.includes(currentUser?.id);
    const isUnread = !readNotificationIds.includes(msg.id);
    return isRecipient && isUnread;
  });

  // Matches list rendering filtering logic
  const filteredMatches = matches.filter((m) => {
    const pred = predictions.find((p) => p.match_id === m.id);
    const hasPrediction = pred && pred.score_a !== null && pred.score_b !== null;

    if (predictionFilter === 'done' && !hasPrediction) return false;
    if (predictionFilter === 'todo' && hasPrediction) return false;

    const kickoff = new Date(m.kickoff_utc || m.date).getTime();
    const diffMins = (kickoff - now) / (60 * 1000);
    const isLocked = diffMins <= 10;

    if (stateFilter === 'open' && (isLocked || m.played)) return false;
    if (stateFilter === 'locked' && !isLocked && !m.played) return false;
    return true;
  });

  const adminFilteredMatches = matches.filter(match => {
    const term = normalizeText(adminSearch);
    const teamAMatch = normalizeText(match.team_a || '').includes(term);
    const teamBMatch = normalizeText(match.team_b || '').includes(term);
    const idMatch = normalizeText(match.id || '').includes(term);
    const groupMatch = normalizeText(match.group_name || match.group || '').includes(term);
    const matchesSearch = teamAMatch || teamBMatch || idMatch || groupMatch;

    if (adminPhaseFilter === 'groups') {
      return matchesSearch && match.phase === 'groups';
    }
    if (adminPhaseFilter === 'elimination') {
      return matchesSearch && match.phase === 'elimination';
    }
    if (adminPhaseFilter === 'PRUEBA') {
      return matchesSearch && match.phase === 'PRUEBA';
    }
    return matchesSearch;
  });

  // Find current user's position in the leaderboard
  const getUserRank = () => {
    if (!leaderboard || leaderboard.length === 0 || !currentUser) {
      return null;
    }
    const index = leaderboard.findIndex((u) => u.id === currentUser.id);
    if (index === -1) return null;
    const rank = index + 1;
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}°`;
  };

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

  const getGroupStandings = () => {
    const standings: { [groupName: string]: { [teamName: string]: { team: string; code: string; pts: number; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; gd: number } } } = {};

    matches.forEach(m => {
      if (m.phase === 'groups') {
        const grp = m.group_name || m.group || 'Grupo Desconocido';
        if (!standings[grp]) standings[grp] = {};
        if (!standings[grp][m.team_a]) {
          standings[grp][m.team_a] = { team: m.team_a, code: m.team_a_code, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, gd: 0 };
        }
        if (!standings[grp][m.team_b]) {
          standings[grp][m.team_b] = { team: m.team_b, code: m.team_b_code, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, gd: 0 };
        }

        if (m.played && m.score_a !== null && m.score_b !== null) {
          const sa = m.score_a;
          const sb = m.score_b;
          const tA = standings[grp][m.team_a];
          const tB = standings[grp][m.team_b];

          tA.pj += 1;
          tB.pj += 1;
          tA.gf += sa;
          tA.gc += sb;
          tB.gf += sb;
          tB.gc += sa;
          tA.gd = tA.gf - tA.gc;
          tB.gd = tB.gf - tB.gc;

          if (sa > sb) {
            tA.pts += 3;
            tA.pg += 1;
            tB.pp += 1;
          } else if (sa < sb) {
            tB.pts += 3;
            tB.pg += 1;
            tA.pp += 1;
          } else {
            tA.pts += 1;
            tB.pts += 1;
            tA.pe += 1;
            tB.pe += 1;
          }
        }
      }
    });

    const sorted: { [groupName: string]: any[] } = {};
    Object.keys(standings).forEach(grp => {
      sorted[grp] = Object.values(standings[grp]).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });
    });

    return sorted;
  };

  const filteredMentionUsers = leaderboard
    .filter((u: any) => u.id !== currentUser?.id)
    .filter((u: any) => (u.name || '').toLowerCase().includes(mentionFilter.toLowerCase()))
    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  const pagadasCount = leaderboard.filter(u => u.paid).length;
  const pendientesCount = leaderboard.filter(u => !u.paid).length;
  const sinConciliarCount = unconciliatedPayments.filter(p => !p.conciliated).length;
  const conciliadoCount = unconciliatedPayments.filter(p => p.conciliated).length;
  const totalRecaudoVal = (pagadasCount * 100000) + (sinConciliarCount * 100000) + (conciliadoCount * 100000);
  const totalRecaudoStr = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalRecaudoVal);
  const totalPersonas = pagadasCount + pendientesCount;

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
          <img src="/JD8048-FUTS_balon.jpg" alt="Balón" className="header-ball-logo" />
          <h2 style={{ lineHeight: 1.1, fontSize: 'clamp(0.85rem, 4vw, 1.1rem)' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Polla Mundial</span> <br/> 
            2026
          </h2>
        </div>

        <div className="header-profile">
          <div className="user-info">
            <span className="user-name">{currentUser.name}</span>
            {currentUser.role === 'admin' && <span className="user-role badge-admin">Admin</span>}
          </div>
          <div className="points-pill rank-pill" title={`${currentUser.points} puntos`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {getUserRank() ? (
              <>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>Pos:</span>
                <span>{getUserRank()}</span>
              </>
            ) : (
              <span>{currentUser.points} pts</span>
            )}
          </div>

          {/* Notification Bell */}
          <div className="notification-bell-container" style={{ position: 'relative', marginRight: '4px' }}>
            <button 
              className="btn btn-icon bell-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notificaciones"
            >
              <i className="fa-solid fa-bell"></i>
              {directMessageNotifications.length > 0 && (
                <span className="bell-badge">
                  {directMessageNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown-panel glass-panel">
                <div className="notification-dropdown-header">
                  <h4>Mensajes Privados</h4>
                  <button className="btn-close-dropdown" onClick={() => setShowNotifications(false)}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div className="notification-dropdown-body">
                  {directMessageNotifications.length === 0 ? (
                    <p className="no-notifications-text" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '15px' }}>
                      No tienes mensajes nuevos
                    </p>
                  ) : (
                    directMessageNotifications.map((msg) => (
                      <div key={msg.id} className="notification-item" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '10px 0' }}>
                        <div className="notification-item-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <strong className="notification-sender">{msg.user_name}</strong>
                          <span className="notification-time" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="notification-text" style={{ fontSize: '0.8rem', margin: '4px 0', wordBreak: 'break-word' }}>{msg.text}</p>
                        
                        {replyingToMsgId === msg.id ? (
                          <div className="notification-reply-form" onClick={(e) => e.stopPropagation()} style={{ marginTop: '8px' }}>
                            <input 
                              type="text" 
                              className="reply-input"
                              style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '6px' }}
                              placeholder={`Responder a ${msg.user_name}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              autoFocus
                            />
                            <div className="reply-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                                onClick={() => setReplyingToMsgId(null)}
                              >
                                Cancelar
                              </button>
                              <button 
                                className="btn btn-primary"
                                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                                onClick={() => handleSendNotificationReply(msg)}
                              >
                                Enviar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="notification-actions" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingToMsgId(msg.id);
                                setReplyText('');
                              }}
                            >
                              <i className="fa-solid fa-reply"></i> Responder
                            </button>
                            <button 
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(msg.id);
                              }}
                            >
                              <i className="fa-solid fa-trash"></i> Descartar
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
          onClick={() => switchTab('tab-groups')}
          className={`tab-btn ${activeTab === 'tab-groups' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-table-list"></i> Grupos
        </button>
        <button
          onClick={() => switchTab('tab-rules')}
          className={`tab-btn ${activeTab === 'tab-rules' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-circle-info"></i> Reglas
        </button>
        {(currentUser.role === 'admin' || (currentUser.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()))) && (
          <button
            onClick={() => switchTab('tab-admin')}
            className={`tab-btn ${activeTab === 'tab-admin' ? 'active' : ''}`}
          >
            <i className="fa-solid fa-gears"></i> Administración
          </button>
        )}
        {(currentUser.role === 'admin' || (currentUser.email && PAYMENTS_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()))) && (
          <button
            onClick={() => switchTab('tab-payments')}
            className={`tab-btn ${activeTab === 'tab-payments' ? 'active' : ''}`}
          >
            <i className="fa-solid fa-credit-card"></i> Pagos
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
              {/* 1. PUNTOS TOTALES */}
              <div className="glass-panel metric-card bg-pastel-green">
                <div className="metric-icon bg-blue"><i className="fa-solid fa-star"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.points}</h3>
                  <p>Puntos Totales</p>
                </div>
              </div>
              {/* 2. PUNTAJE PERFECTO */}
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-gold"><i className="fa-solid fa-award"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.exact_matches || 0}</h3>
                  <p>Puntaje Perfecto</p>
                </div>
              </div>
              {/* 3. GANADOR CORRECTO */}
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-green"><i className="fa-solid fa-circle-check"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.winner_matches || 0}</h3>
                  <p>Ganador Correcto</p>
                </div>
              </div>
              {/* 4. GOLES EXACTOS */}
              <div className="glass-panel metric-card">
                <div className="metric-icon bg-purple"><i className="fa-solid fa-futbol"></i></div>
                <div className="metric-data">
                  <h3>{currentUser.exact_matches || 0}</h3>
                  <p>Goles Exactos</p>
                </div>
              </div>
            </div>

            <div className="dashboard-layout">
              <div className="glass-panel dash-main-panel">
                <div className="ad-video-container" style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                  <video 
                    src="/videos/qr_vending.mp4" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                    style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#6cb4d4' }}
                  />
                  <div style={{ backgroundColor: '#1e293b', padding: '12px', textAlign: 'center' }}>
                    <a href="https://www.qrvending.co/" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}>
                      Visita www.qrvending.co <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.85rem' }}></i>
                    </a>
                  </div>
                </div>
                
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

              {/* Partidos inminentes grid */}
              <div className="glass-panel dash-side-panel imminent-matches-section">
                <h3>Partidos Inminentes</h3>
                <div className="imminent-matches-grid">
                  {imminentMatches.map((match) => {
                    const isPlayed = match.played;
                    const matchDate = new Date(match.kickoff_utc || match.date).getTime();
                    const now = new Date().getTime();
                    const diffMins = (matchDate - now) / 60000;
                    const isLocked = diffMins <= 10;
                    
                    const pred = predictions.find((p) => p.match_id === match.id);
                    const hasPrediction = pred && pred.score_a !== null && pred.score_b !== null;
                    
                    let cardBgClass = "imminent-card bg-orange";
                    if (isLocked) {
                      cardBgClass = "imminent-card bg-blue";
                    } else if (hasPrediction) {
                      cardBgClass = "imminent-card bg-green";
                    }
                    
                    return (
                      <div key={match.id} className={cardBgClass}>
                        <div className="imminent-card-header">
                          <span className="imminent-group">{match.group_name || match.group}</span>
                          <span className="imminent-countdown">
                            {isPlayed ? "Finalizado ⚽" : getCierraCountDownText(match.kickoff_utc || match.date)}
                          </span>
                        </div>
                        <div className="imminent-card-body">
                          <div className="imminent-team">
                            {getFlagUrl(match.team_a_code) ? (
                              <img src={getFlagUrl(match.team_a_code)!} alt={match.team_a} className="flag-img-sm" />
                            ) : (
                              <div className="flag-placeholder-sm">?</div>
                            )}
                            <span className="team-name-sm">{match.team_a}</span>
                          </div>
                          
                          <div className="imminent-score">
                            {hasPrediction ? (
                              <span className="score-text">{pred.score_a} - {pred.score_b}</span>
                            ) : (
                              <span className="score-text">- : -</span>
                            )}
                          </div>
                          
                          <div className="imminent-team">
                            {getFlagUrl(match.team_b_code) ? (
                              <img src={getFlagUrl(match.team_b_code)!} alt={match.team_b} className="flag-img-sm" />
                            ) : (
                              <div className="flag-placeholder-sm">?</div>
                            )}
                            <span className="team-name-sm">{match.team_b}</span>
                          </div>
                        </div>
                        <div className="imminent-card-footer">
                          <span className="match-date-sm">
                            {formatDateFriendly(match.kickoff_utc || match.date)}
                            {isPlayed && ` (Oficial: ${match.score_a} - ${match.score_b})`}
                          </span>
                          {!isPlayed && !isLocked && (
                            <button 
                              className="btn btn-xs btn-primary-outline" 
                              style={{ fontSize: '0.7rem', padding: '3px 8px', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer' }}
                              onClick={() => switchTab('tab-predictions', match.id)}
                            >
                              {hasPrediction ? "Editar" : "Pronosticar"}
                            </button>
                          )}
                          {isLocked && !isPlayed && (
                            <button 
                              className="btn btn-xs btn-secondary-outline" 
                              style={{ fontSize: '0.7rem', padding: '3px 8px', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer' }}
                              onClick={() => viewGroupPredictions(match.id)}
                            >
                              <i className="fa-solid fa-eye"></i> Ver resultados
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                <span className="filter-label"><i className="fa-solid fa-pen-to-square"></i> Pronóstico:</span>
                <div className="segmented-control">
                  <button 
                    type="button"
                    className={`segment-btn ${predictionFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPredictionFilter('all')}
                  >
                    Todos
                  </button>
                  <button 
                    type="button"
                    className={`segment-btn ${predictionFilter === 'done' ? 'active' : ''}`}
                    onClick={() => setPredictionFilter('done')}
                  >
                    Realizado
                  </button>
                  <button 
                    type="button"
                    className={`segment-btn ${predictionFilter === 'todo' ? 'active' : ''}`}
                    onClick={() => setPredictionFilter('todo')}
                  >
                    Por hacer
                  </button>
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label"><i className="fa-solid fa-lock-open"></i> Estado:</span>
                <div className="segmented-control">
                  <button 
                    type="button"
                    className={`segment-btn ${stateFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStateFilter('all')}
                  >
                    Todos
                  </button>
                  <button 
                    type="button"
                    className={`segment-btn ${stateFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setStateFilter('open')}
                  >
                    Abiertos
                  </button>
                  <button 
                    type="button"
                    className={`segment-btn ${stateFilter === 'locked' ? 'active' : ''}`}
                    onClick={() => setStateFilter('locked')}
                  >
                    Bloqueados
                  </button>
                </div>
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
                  const hasPrediction = pred && pred.score_a !== null && pred.score_b !== null;

                  let cardClass = "";
                  if (match.played) {
                    cardClass = hasPrediction ? 'bg-pastel-green' : '';
                  } else if (isLocked) {
                    cardClass = 'bg-pastel-blue';
                  } else if (hasPrediction) {
                    cardClass = 'bg-pastel-green';
                  }

                  return (
                    <div id={`match-card-${match.id}`} key={match.id} className={`glass-panel match-card ${cardClass}`}>
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
                                <span className="score-val">{predA !== null ? predA : '-'}</span>
                                <button className="spinner-btn" onClick={() => adjustScore(match.id, 'A', 1)}>+</button>
                              </div>
                              <span className="score-colon">:</span>
                              <div className="score-spinner">
                                <button className="spinner-btn" onClick={() => adjustScore(match.id, 'B', -1)}>-</button>
                                <span className="score-val">{predB !== null ? predB : '-'}</span>
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
                              <i className="fa-solid fa-eye"></i> Ver resultados
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

            <div className="leaderboard-search-container">
              <div className="search-input-wrapper">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  type="text"
                  placeholder="Buscar participante por nombre..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className="leaderboard-search-input"
                />
                {leaderboardSearch && (
                  <button onClick={() => setLeaderboardSearch('')} className="clear-search-btn" title="Limpiar búsqueda">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="glass-panel leaderboard-panel">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th className="rank-col">Pos</th>
                    <th>Participante</th>
                    <th className="points-header-col text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted">Cargando clasificación...</td>
                    </tr>
                  ) : (() => {
                    const filtered = leaderboard.filter(player =>
                      (player.name || '').toLowerCase().includes(leaderboardSearch.toLowerCase())
                    );
                    
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="text-center py-4 text-muted">No se encontraron competidores</td>
                        </tr>
                      );
                    }

                    return filtered.map((player) => {
                      // Find rank in the full sorted leaderboard (1-based index)
                      const rank = leaderboard.findIndex(u => u.id === player.id) + 1;
                      let rankDisp: any = rank.toString();
                      if (rank === 1) rankDisp = '🥇';
                      else if (rank === 2) rankDisp = '🥈';
                      else if (rank === 3) rankDisp = '🥉';
                      else if (rank === 4) rankDisp = '🏅';

                      return (
                        <tr key={player.id} className={player.id === currentUser.id ? 'me-row' : ''}>
                          <td className="rank-col">{rankDisp}</td>
                          <td style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => viewUserPredictions(player)} title="Ver pronósticos de este participante">
                            <strong>{player.name}</strong> 
                            {player.id === currentUser.id && (
                              <span style={{ fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-primary)', color: 'white', marginLeft: '6px' }}>
                                TÚ
                              </span>
                            )}
                          </td>
                          <td className="points-col text-right">
                            <div className="points-wrapper">
                              <span className="points-val">{player.points} pts</span>
                              {player.streak >= 3 && (
                                <span className="fire-streak-badge animate-pulse" title={`¡Racha de ${player.streak} marcadores perfectos seguidos!`}>
                                  🔥
                                </span>
                              )}
                              <span className={`trend-badge trend-${player.trend}`} title={player.trend === 'up' ? 'Subió de posición' : player.trend === 'down' ? 'Bajó de posición' : 'Mantuvo posición'}>
                                {player.trend === 'up' && <i className="fa-solid fa-caret-up trend-up-arrow"></i>}
                                {player.trend === 'down' && <i className="fa-solid fa-caret-down trend-down-arrow"></i>}
                                {player.trend === 'same' && <span className="trend-same-dot">●</span>}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 7: GRUPOS */}
        {activeTab === 'tab-groups' && (
          <section className="tab-pane active animate-fade-in">
            <div className="section-header">
              <h2>Clasificación de Grupos del Mundial</h2>
              <p>Sigue el desempeño en vivo de las 48 selecciones clasificadas organizadas en sus respectivos grupos.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {Object.entries(getGroupStandings()).map(([groupName, teams]) => (
                <div key={groupName} className="glass-panel" style={{ padding: '16px' }}>
                  <h3 style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '6px', marginBottom: '12px', fontSize: '1.1rem' }}>{groupName}</h3>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                        <th style={{ textAlign: 'left', padding: '6px 0' }}>Pos</th>
                        <th style={{ textAlign: 'left' }}>Equipo</th>
                        <th>PJ</th>
                        <th>PG</th>
                        <th>PE</th>
                        <th>PP</th>
                        <th>GF</th>
                        <th>GC</th>
                        <th>DG</th>
                        <th>PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t, idx) => (
                        <tr key={t.team} style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <td style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ textAlign: 'left', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
                            {t.code && t.code !== 'un' && (
                              <img 
                                src={`https://flagcdn.com/16x12/${t.code.toLowerCase()}.png`} 
                                alt={t.team} 
                                style={{ borderRadius: '2px', width: '16px', height: '12px' }}
                              />
                            )}
                            {t.team}
                          </td>
                          <td>{t.pj}</td>
                          <td>{t.pg}</td>
                          <td>{t.pe}</td>
                          <td>{t.pp}</td>
                          <td>{t.gf}</td>
                          <td>{t.gc}</td>
                          <td style={{ color: t.gd > 0 ? '#10b981' : (t.gd < 0 ? '#ef4444' : 'inherit') }}>
                            {t.gd > 0 ? `+${t.gd}` : t.gd}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{t.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: REGLAS */}
        {activeTab === 'tab-rules' && (
          <section className="tab-pane active">
            <div className="glass-panel rules-panel">
              <h2>Reglamento Oficial de Puntuación (Polla Mundial)</h2>
              <p>La predicción solo incluye los <strong>90 MINUTOS de tiempo reglamentario</strong> más (+) el tiempo de reposición dado por el árbitro, pero <strong>EXCLUYE</strong> cualquier tiempo adicional (2 x 15 minutos) o el resultado de las series de penaltis.</p>

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

              <div className="rules-additional" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="rules-section-card" style={{ background: 'rgba(255,255,255,0.45)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,72,130,0.1)' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-secondary)', fontSize: '0.95rem', fontWeight: 700 }}>⏱️ Plazo de Predicción</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text)' }}>Usted puede cambiar su predicción hasta máximo <strong>10 minutos</strong> antes de la fecha-hora de inicio del partido.</p>
                </div>

                <div className="rules-section-card" style={{ background: 'rgba(255,255,255,0.45)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,72,130,0.1)' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-secondary)', fontSize: '0.95rem', fontWeight: 700 }}>🏆 Distribución de Premios</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: '1.6' }}>
                    <li><strong>Primer puesto:</strong> 60% del fondo acumulado.</li>
                    <li><strong>Segundo puesto:</strong> 20% del fondo acumulado.</li>
                    <li><strong>Tercer puesto:</strong> 10% del fondo acumulado.</li>
                    <li><strong>Cuarto puesto:</strong> 10% del fondo acumulado.</li>
                    <li style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: '6px', listStyleType: 'none', fontStyle: 'italic' }}>* Se descuentan los impuestos correspondientes (ej. 4*1000).</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: ADMINISTRACIÓN */}
        {activeTab === 'tab-admin' && (currentUser.role === 'admin' || (currentUser.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()))) && (
          <section className="tab-pane active">
            <div className="section-header">
              <h2>Consola de Administración y Simulador</h2>
              <p>Gestiona todos los partidos del torneo, ingresa nuevos enfrentamientos y actualiza los equipos clasificados a la fase de eliminación directa.</p>
            </div>

            <div className="admin-grid">
              <div className="glass-panel admin-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ margin: 0 }}>Partidos del Torneo ({adminFilteredMatches.length})</h3>
                  
                  {/* SEARCH & FILTERS */}
                  <div className="admin-filters" style={{ margin: 0, width: 'auto', flex: 1, justifyContent: 'flex-end' }}>
                    <input 
                      type="text" 
                      className="admin-search-input" 
                      style={{ maxWidth: '240px' }}
                      placeholder="Buscar por equipo o grupo..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                    <select 
                      className="admin-filter-select"
                      style={{ maxWidth: '180px' }}
                      value={adminPhaseFilter}
                      onChange={(e) => setAdminPhaseFilter(e.target.value)}
                    >
                      <option value="all">Todas las fases</option>
                      <option value="groups">Fase de Grupos</option>
                      <option value="elimination">Fases Eliminatorias</option>
                      <option value="PRUEBA">Fase PRUEBA</option>
                    </select>
                  </div>
                </div>

                <div className="admin-matches-grid">
                  {adminFilteredMatches.map((match) => {
                    const scoreA = adminScores[match.id]?.scoreA || '';
                    const scoreB = adminScores[match.id]?.scoreB || '';
                    const isElimination = match.phase === 'elimination';

                    const currentA = adminTeams[match.id]?.teamA || match.team_a;
                    const currentB = adminTeams[match.id]?.teamB || match.team_b;

                    return (
                      <div key={match.id} className="admin-match-row" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span className="badge" style={{ background: '#e2e8f0', color: '#475569', fontWeight: 600 }}>{match.id}</span>
                          <strong style={{ fontSize: '0.95rem' }}>{match.group_name || match.group}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {formatDateFriendly(match.kickoff_utc || match.date)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          {/* TEAMS DISPLAY / DROPDOWNS */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {isElimination ? (
                              <div className="admin-teams-select-container" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <div className="admin-team-select-group">
                                  <label>Local:</label>
                                  <select
                                    className="admin-select"
                                    value={currentA}
                                    onChange={(e) => {
                                      const country = PARTICIPATING_COUNTRIES.find(c => c.name === e.target.value);
                                      setAdminTeams(prev => ({
                                        ...prev,
                                        [match.id]: {
                                          ...prev[match.id] || { teamB: match.team_b, teamBCode: match.team_b_code },
                                          teamA: e.target.value,
                                          teamACode: country ? country.code : 'un'
                                        }
                                      }));
                                    }}
                                  >
                                    {/* Include current value if it is not in the country list */}
                                    {!PARTICIPATING_COUNTRIES.some(c => c.name === match.team_a) && (
                                      <option value={match.team_a}>{match.team_a}</option>
                                    )}
                                    {PARTICIPATING_COUNTRIES.map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="admin-team-select-group" style={{ marginTop: '4px' }}>
                                  <label>Visitante:</label>
                                  <select
                                    className="admin-select"
                                    value={currentB}
                                    onChange={(e) => {
                                      const country = PARTICIPATING_COUNTRIES.find(c => c.name === e.target.value);
                                      setAdminTeams(prev => ({
                                        ...prev,
                                        [match.id]: {
                                          ...prev[match.id] || { teamA: match.team_a, teamACode: match.team_a_code },
                                          teamB: e.target.value,
                                          teamBCode: country ? country.code : 'un'
                                        }
                                      }));
                                    }}
                                  >
                                    {!PARTICIPATING_COUNTRIES.some(c => c.name === match.team_b) && (
                                      <option value={match.team_b}>{match.team_b}</option>
                                    )}
                                    {PARTICIPATING_COUNTRIES.map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                {match.team_a} vs {match.team_b}
                              </div>
                            )}
                          </div>

                          {/* SCORE INPUTS & ACTION BUTTONS */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

                            <div className="admin-save-btns">
                              <button 
                                className="btn btn-primary" 
                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                onClick={() => handleSaveAdminResult(match.id)}
                                disabled={adminLoading[match.id]}
                              >
                                {adminLoading[match.id] ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-save"></i> Marcador</>}
                              </button>
                              
                              {isElimination && (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                  onClick={() => handleSaveAdminTeams(match.id)}
                                  disabled={adminLoading[match.id]}
                                >
                                  {adminLoading[match.id] ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-people-group"></i> Guardar Equipos</>}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="admin-side-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 2. INGRESAR NUEVO PARTIDO */}
                <div className="glass-panel">
                  <h3><i className="fa-solid fa-trophy" style={{ color: '#c49a1c', marginRight: '6px' }}></i> Ingresar Nuevo Partido</h3>
                  <form onSubmit={handleCreateMatch} style={{ marginBottom: '0' }}>
                    <div className="admin-form-group">
                      <label>ID del Partido (Automático):</label>
                      <input 
                        type="text" 
                        value={getNextMatchId()} 
                        readOnly 
                        style={{ backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Fase:</label>
                      <select 
                        value={newMatchPhase} 
                        onChange={(e) => setNewMatchPhase(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                      >
                        <option value="groups">Fase de Grupos</option>
                        <option value="elimination">Fases Eliminatorias</option>
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Nombre del Grupo / Fase:</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Grupo A o Octavos de Final" 
                        value={newMatchGroup} 
                        onChange={(e) => setNewMatchGroup(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label>Equipo Local:</label>
                        <select 
                          value={newMatchTeamA} 
                          onChange={(e) => {
                            setNewMatchTeamA(e.target.value);
                            setNewMatchTeamACode(e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                          required
                        >
                          {PARTICIPATING_COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label>Equipo Visitante:</label>
                        <select 
                          value={newMatchTeamB} 
                          onChange={(e) => {
                            setNewMatchTeamB(e.target.value);
                            setNewMatchTeamBCode(e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                          required
                        >
                          {PARTICIPATING_COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label>Fecha y Hora de Inicio:</label>
                      <input 
                        type="datetime-local" 
                        value={newMatchKickoff} 
                        onChange={(e) => setNewMatchKickoff(e.target.value)} 
                        required 
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={createMatchLoading}>
                      {createMatchLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus"></i> Crear Partido</>}
                    </button>
                  </form>
                </div>

                {/* INGRESAR PARTIDO DE PRUEBA */}
                <div className="glass-panel" style={{ borderLeft: '4px solid #ea580c' }}>
                  <h3><i className="fa-solid fa-flask" style={{ color: '#ea580c', marginRight: '6px' }}></i> Ingresar Partido de Prueba</h3>
                  <p className="info-text" style={{ fontSize: '0.82rem', marginBottom: '14px', color: 'var(--color-text-muted)' }}>
                    Crea un partido de prueba con equipos personalizados. Se asigna automáticamente la fase <strong>PRUEBA</strong>.
                  </p>
                  <form onSubmit={handleCreateTestMatch} style={{ marginBottom: '0' }}>
                    <div className="admin-form-group">
                      <label>ID del Partido (Automático):</label>
                      <input 
                        type="text" 
                        value={getNextMatchId()} 
                        readOnly 
                        style={{ backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Fase:</label>
                      <input 
                        type="text" 
                        value="PRUEBA" 
                        readOnly 
                        style={{ backgroundColor: 'rgba(234,88,12,0.08)', cursor: 'not-allowed', color: '#c2410c', fontWeight: 700 }}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Nombre del Grupo / Fase:</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Grupo A o Prueba Final" 
                        value={testMatchGroup} 
                        onChange={(e) => setTestMatchGroup(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label>Equipo Local:</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Equipo A" 
                          value={testMatchTeamA} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestMatchTeamA(val);
                            const country = PARTICIPATING_COUNTRIES.find(c => c.name.toLowerCase() === val.toLowerCase());
                            setTestMatchTeamACode(country ? country.code : 'un');
                          }}
                          required 
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Equipo Visitante:</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Equipo B" 
                          value={testMatchTeamB} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestMatchTeamB(val);
                            const country = PARTICIPATING_COUNTRIES.find(c => c.name.toLowerCase() === val.toLowerCase());
                            setTestMatchTeamBCode(country ? country.code : 'un');
                          }}
                          required 
                        />
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label>Fecha y Hora de Inicio:</label>
                      <input 
                        type="datetime-local" 
                        value={testMatchKickoff} 
                        onChange={(e) => setTestMatchKickoff(e.target.value)} 
                        required 
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={createTestMatchLoading} style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                      {createTestMatchLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-flask"></i> Crear Partido de Prueba</>}
                    </button>
                  </form>
                </div>

                {/* 3. AJUSTES DE SIMULACIÓN */}
                <div className="glass-panel">
                  <h3>Ajustes de Simulación</h3>
                  <p className="info-text" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                    Como administrador, puedes registrar goles oficiales a la izquierda. Los puntajes de los competidores virtuales y del usuario se actualizarán automáticamente en la pestaña de Posiciones.
                  </p>
                  
                  <div className="sim-actions">
                    <button onClick={handleResetDB} className="btn btn-secondary btn-block" style={{ marginTop: '0' }}>
                      <i className="fa-solid fa-rotate-left"></i> Restablecer Resultados
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 8: PAGOS */}
        {activeTab === 'tab-payments' && (currentUser.role === 'admin' || (currentUser.email && PAYMENTS_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()))) && (
          <section className="tab-pane active">
            <div className="section-header">
              <h2>Administración de Pagos</h2>
              <p>Gestiona las inscripciones y el estado de pago de los participantes del torneo.</p>
            </div>

            {/* INDICADORES DE PAGOS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: '160px', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Recaudo</span>
                <strong style={{ fontSize: '1.4rem', color: '#15803d', marginTop: '6px' }}>{totalRecaudoStr}</strong>
              </div>

              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: '160px', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Personas Total</span>
                <strong style={{ fontSize: '1.4rem', color: 'var(--color-text)', marginTop: '6px' }}>{totalPersonas}</strong>
              </div>

              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: '160px', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Pendiente de Pago</span>
                <strong style={{ fontSize: '1.4rem', color: '#b91c1c', marginTop: '6px' }}>{pendientesCount}</strong>
              </div>

              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: '160px', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sin Conciliar</span>
                <strong style={{ fontSize: '1.4rem', color: '#ea580c', marginTop: '6px' }}>{sinConciliarCount}</strong>
              </div>
            </div>

            {/* DUAL COLUMN LAYOUT: Card Left & Unconciliated Card Right */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'start' }}>
              
              {/* Left Column Card - Control de Estado de Pagos */}
              <div className="glass-panel" style={{ flex: '1 1 100%', minWidth: '280px', padding: '24px', margin: 0 }}>
                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-fifa-blue)' }}></i> Control de Estado de Pagos
                </h3>
                <p className="info-text" style={{ fontSize: '0.88rem', marginBottom: '20px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  Registra y gestiona los pagos de inscripción. Selecciona un participante en la lista desplegable o haz clic directamente sobre un registro en la lista de pendientes para marcarlo como pagado.
                </p>

                {/* Selector de pendientes */}
                <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--color-text)' }}>
                    Registrar Pago (Solo pendientes):
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select
                      className="admin-select"
                      value={selectedUnpaidUserId}
                      onChange={(e) => setSelectedUnpaidUserId(e.target.value)}
                      style={{ flex: 1, minWidth: '240px', fontSize: '0.85rem', padding: '8px 12px', borderRadius: '8px' }}
                      disabled={paymentLoading}
                    >
                      <option value="">Selecciona un participante...</option>
                      {leaderboard.filter(u => !u.paid).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      onClick={() => selectedUnpaidUserId && handleTogglePayment(selectedUnpaidUserId, true)}
                      disabled={!selectedUnpaidUserId || paymentLoading}
                    >
                      {paymentLoading && selectedUnpaidUserId === paymentActionLoadingId ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        'Marcar como Pagado'
                      )}
                    </button>
                  </div>
                </div>

                {/* Listas de Pagos side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* LISTA PENDIENTES */}
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Inscripciones Pendientes ({leaderboard.filter(u => !u.paid).length})</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                        Clic para pagar
                      </span>
                    </h4>
                    <div className="payment-list-scrollable" style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                      {leaderboard.filter(u => !u.paid).length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
                          ¡Todos los participantes han pagado! 🎉
                        </p>
                      ) : (
                        leaderboard.filter(u => !u.paid).map(u => (
                          <div
                            key={u.id}
                            className="payment-row-item unpaid"
                            onClick={() => !paymentLoading && handleTogglePayment(u.id, true)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: 'rgba(239, 68, 68, 0.05)',
                              border: '1px solid rgba(239, 68, 68, 0.1)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                              <strong style={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.email}</span>
                            </div>
                            <div style={{ marginLeft: '10px', flexShrink: 0 }}>
                              {paymentLoading && paymentActionLoadingId === u.id ? (
                                <i className="fa-solid fa-spinner fa-spin" style={{ color: '#ef4444' }}></i>
                              ) : (
                                <i className="fa-regular fa-square" style={{ color: '#ef4444', fontSize: '1.05rem' }}></i>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* LISTA CONFIRMADOS */}
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: '#15803d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Inscripciones Pagadas ({leaderboard.filter(u => u.paid).length})</span>
                    </h4>
                    <div className="payment-list-scrollable" style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                      {leaderboard.filter(u => u.paid).length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
                          Ningún participante ha pagado aún.
                        </p>
                      ) : (
                        leaderboard.filter(u => u.paid).map(u => (
                          <div
                            key={u.id}
                            className="payment-row-item paid"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              border: '1px solid rgba(34, 197, 94, 0.1)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                              <strong style={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.email}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '10px' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontWeight: 600 }}>PAGADO</span>
                              <button
                                onClick={() => !paymentLoading && handleTogglePayment(u.id, false)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--color-text-muted)',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Revertir pago"
                                disabled={paymentLoading}
                              >
                                {paymentLoading && paymentActionLoadingId === u.id ? (
                                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.8rem' }}></i>
                                ) : (
                                  <i className="fa-solid fa-rotate-left" style={{ fontSize: '0.8rem' }}></i>
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Card - Registrar Pago Sin Conciliar */}
              <div className="glass-panel" style={{ flex: '1 1 100%', minWidth: '280px', padding: '24px', margin: 0 }}>
                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-plus" style={{ color: '#ea580c' }}></i> Registrar Pago Sin Conciliar
                </h3>
                <p className="info-text" style={{ fontSize: '0.88rem', marginBottom: '20px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  Registra un recaudo directo de dinero que aún no ha sido conciliado con un participante específico del torneo.
                </p>

                <form onSubmit={handleCreateUnconciliatedPayment} style={{ marginBottom: '24px' }}>
                  <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Fecha y Hora de Recaudo:</label>
                    <input 
                      type="datetime-local" 
                      value={newRecollectionDate}
                      onChange={(e) => setNewRecollectionDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                    />
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Observaciones (Opcional):</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Transferencia de Juan"
                      value={newUnconciliatedNotes}
                      onChange={(e) => setNewUnconciliatedNotes(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={unconciliatedLoading}>
                    {unconciliatedLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus"></i> Crear Pago Sin Conciliar</>}
                  </button>
                </form>

                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Historial de Recaudos ({unconciliatedPayments.length})</span>
                </h4>
                <div className="payment-list-scrollable" style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                  {unconciliatedPayments.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
                      No hay recaudos registrados.
                    </p>
                  ) : (
                    unconciliatedPayments.map((p, idx) => {
                      const isConciliated = !!p.conciliated;
                      const dateObj = p.recollection_date ? new Date(p.recollection_date) : null;
                      const displayDate = dateObj
                        ? new Intl.DateTimeFormat('es-CO', { 
                            timeZone: 'America/Bogota', 
                            year: 'numeric', month: '2-digit', day: '2-digit', 
                            hour: '2-digit', minute: '2-digit', hour12: false 
                          }).format(dateObj)
                        : (p.recollection_date || '');

                      return (
                        <div 
                          key={p.id || idx} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '10px 12px', 
                            background: isConciliated ? 'rgba(34, 197, 94, 0.05)' : 'rgba(234, 88, 12, 0.05)', 
                            border: isConciliated ? '1px solid rgba(34, 197, 94, 0.15)' : '1px solid rgba(234, 88, 12, 0.1)', 
                            borderRadius: '8px',
                            opacity: isConciliated ? 0.85 : 1
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isConciliated ? '#15803d' : '#c2410c' }}>
                                {isConciliated ? 'Conciliado' : 'Sin Conciliar'}
                              </span>
                              {isConciliated && (
                                <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontWeight: 600 }}>✓</span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{displayDate}</span>
                            {p.notes && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text)', marginTop: '4px', fontStyle: 'italic' }}>
                                {p.notes}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                            {!isConciliated && (
                              <button
                                onClick={() => handleConciliatePayment(p.id)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.7rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                                title="Marcar como conciliado"
                              >
                                <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>Conciliar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
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
                    </tr>
                  </thead>
                  <tbody>
                    {modalPreds.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center" style={{ color: 'var(--color-text-muted)' }}>
                          Ninguno ingresó pronóstico.
                        </td>
                      </tr>
                    ) : (
                      modalPreds.map((pred, i) => (
                        <tr key={i}>
                          <td><strong>{pred.userName}</strong></td>
                          <td className="text-center" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                            {pred.scoreA !== null && pred.scoreB !== null ? `${pred.scoreA} : ${pred.scoreB}` : '- : -'}
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

      {/* POPUP MODAL: USER PREDICTIONS */}
      {showUserModal && modalUser && (
        <div className="modal" onClick={() => setShowUserModal(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pronósticos de {modalUser.name}</h3>
              <button className="btn-close-modal" onClick={() => setShowUserModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="predictions-list-container">
                <table className="modal-predictions-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Partido</th>
                      <th className="text-center">Pronóstico</th>
                      <th className="text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalUserPreds.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                          No hay partidos bloqueados ni finalizados aún.
                        </td>
                      </tr>
                    ) : (
                      modalUserPreds.map((item, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {formatDateFriendly(item.match.kickoff_utc || item.match.date)}
                                {item.match.played ? ' (Finalizado)' : ' (Bloqueado)'}
                              </span>
                              <strong>{item.match.team_a} vs {item.match.team_b}</strong>
                            </div>
                          </td>
                          <td className="text-center" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                            {item.scoreA !== null && item.scoreB !== null ? `${item.scoreA} : ${item.scoreB}` : '- : -'}
                          </td>
                          <td className="text-right text-green" style={{ fontWeight: 800 }}>
                            {item.match.played ? `+${item.pointsEarned || 0} pts` : '-'}
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

      {/* FLOATING CHAT BUTTON (FAB) - BOTTOM RIGHT */}
      <button 
        className={`chat-fab ${showFloatingChat ? 'active' : ''}`} 
        onClick={() => {
          setShowFloatingChat(!showFloatingChat);
          if (!showFloatingChat) {
            // Mark as read when opening
            lastSeenChatTimestampRef.current = new Date().toISOString();
            setUnreadCount(0);
          }
        }}
        title="Chat de Grupo"
      >
        <i className="fa-solid fa-comments"></i>
        {unreadCount > 0 && !showFloatingChat && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0f172a',
            lineHeight: 1
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* FLOATING CHAT WINDOW */}
      {showFloatingChat && (
        <div className="floating-chat-window glass-panel animate-fade-in">
          <div className="floating-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-comments text-green"></i>
              <h3>Chat de la Polla</h3>
            </div>
            <button className="btn-close-chat" onClick={() => setShowFloatingChat(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="floating-chat-messages">
            {chatMessages.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', margin: 'auto', padding: '20px' }}>
                No hay mensajes. ¡Sé el primero!
              </p>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.user_id === currentUser.id;
                const date = new Date(msg.created_at);
                const timeDisp = `${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;

                return (
                  <div key={msg.id} className={`chat-msg ${isMe ? 'chat-msg-me' : 'chat-msg-other'} ${msg.recipient_ids ? 'chat-msg-private' : ''}`}>
                    {!isMe && <span className="chat-msg-user">{msg.user_name} {msg.recipient_ids && <span className="private-tag"><i className="fa-solid fa-lock" style={{ fontSize: '0.6rem' }}></i> Privado</span>}</span>}
                    {isMe && msg.recipient_ids && <div className="chat-msg-user-private" style={{ marginBottom: '4px' }}><span className="private-tag"><i className="fa-solid fa-lock" style={{ fontSize: '0.6rem' }}></i> Privado</span></div>}
                    <span>{msg.text}</span>
                    <span className="chat-msg-time">{timeDisp}</span>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef}></div>
          </div>

          <form onSubmit={handleSendChat} className="floating-chat-input-bar" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {selectedRecipients.length > 0 && (
              <div className="chat-selected-recipients" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 12px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>Para:</span>
                {selectedRecipients.map((user) => (
                  <span key={user.id} className="recipient-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px' }}>
                    @{user.name}
                    <button 
                      type="button" 
                      className="btn-remove-recipient" 
                      style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', padding: '0 2px' }}
                      onClick={() => setSelectedRecipients(selectedRecipients.filter(r => r.id !== user.id))}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {showMentionList && filteredMentionUsers.length > 0 && (
              <div className="mention-dropdown-list" style={{ position: 'absolute', bottom: '60px', left: '10px', right: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 -4px 15px rgba(0,0,0,0.08)', maxHeight: '180px', overflowY: 'auto', zIndex: 1000 }}>
                {filteredMentionUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="mention-item"
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}
                    onClick={() => handleSelectMentionRecipient(user)}
                  >
                    <strong>{user.name}</strong> <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>({user.email})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="input-wrapper-row" style={{ display: 'flex', width: '100%', gap: '8px', padding: '10px 12px', background: 'white', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <input
                type="text"
                placeholder="Escribe tu mensaje... (@ para privado)"
                className="chat-input-field"
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem' }}
                value={chatInput}
                onChange={handleChatInputChange}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </form>
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
