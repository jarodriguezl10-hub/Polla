-- ==========================================
-- SCRIPT DE INICIALIZACIÓN - SOFÁ STADIUM SOCCER / POLLA MUNDIAL 2026
-- Ejecuta este script en el Editor SQL (SQL Editor) de tu proyecto de Supabase.
-- ==========================================

-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    points INTEGER DEFAULT 0,
    exact_matches INTEGER DEFAULT 0,
    winner_matches INTEGER DEFAULT 0,
    diff_matches INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Partidos
CREATE TABLE IF NOT EXISTS public.matches (
    id TEXT PRIMARY KEY, -- Ej: m1, m2
    group_name TEXT NOT NULL, -- Ej: Grupo A, Semifinal
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    team_a_code TEXT DEFAULT 'un',
    team_b_code TEXT DEFAULT 'un',
    kickoff_utc TIMESTAMPTZ NOT NULL,
    phase TEXT DEFAULT 'groups' CHECK (phase IN ('groups', 'elimination')),
    score_a INTEGER,
    score_b INTEGER,
    played BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Predicciones
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    score_a INTEGER NOT NULL,
    score_b INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- 4. Tabla de Mensajes del Chat Grupal
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de códigos OTP para Autenticación
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deshabilitar Seguridad de Fila (RLS) en todas las tablas para permitir acceso directo de API
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- CONFIGURACIÓN DE TIEMPO REAL (REALTIME)
-- ==========================================
-- Habilita el envío de actualizaciones en tiempo real a través de WebSockets
-- para el Chat Grupal y la Tabla de Clasificación.

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.users;

-- ==========================================
-- INSERCIÓN DE DATOS DE SEMILLA (SEED DATA)
-- ==========================================

-- Semilla de Partidos Oficiales (Mundial 2026)
-- Nota: Ajusta las fechas de kickoff a tu conveniencia (las de abajo son dinámicas basadas en los días siguientes)
INSERT INTO public.matches (id, group_name, team_a, team_b, team_a_code, team_b_code, kickoff_utc, phase, played) VALUES
('m1', 'Grupo A', 'México', 'Sudáfrica', 'mx', 'za', '2026-06-11T17:00:00Z', 'groups', FALSE),
('m2', 'Grupo A', 'Corea del Sur', 'Chequia', 'kr', 'cz', '2026-06-11T20:00:00Z', 'groups', FALSE),
('m3', 'Grupo B', 'Canadá', 'Bosnia y Herzegovina', 'ca', 'ba', '2026-06-12T19:00:00Z', 'groups', FALSE),
('m4', 'Grupo C', 'Brasil', 'Marruecos', 'br', 'ma', '2026-06-12T22:00:00Z', 'groups', FALSE),
('m5', 'Grupo D', 'Estados Unidos', 'Paraguay', 'us', 'py', '2026-06-13T01:00:00Z', 'groups', FALSE),
('m6', 'Grupo H', 'España', 'Uruguay', 'es', 'uy', '2026-06-13T17:00:00Z', 'groups', FALSE),
('m7', 'Grupo K', 'Portugal', 'Colombia', 'pt', 'co', '2026-06-14T19:00:00Z', 'groups', FALSE),
('m8', 'Octavos de Final', 'Argentina', 'Francia', 'ar', 'fr', '2026-06-28T19:00:00Z', 'elimination', FALSE),
('m9', 'Cuartos de Final', 'Alemania', 'Inglaterra', 'de', 'gb-eng', '2026-07-09T19:00:00Z', 'elimination', FALSE),
('m10', 'Semifinal', 'Ganador C1', 'Ganador C2', 'un', 'un', '2026-07-14T19:00:00Z', 'elimination', FALSE),
('m11', 'Gran Final', 'Ganador S1', 'Ganador S2', 'un', 'un', '2026-07-19T19:00:00Z', 'elimination', FALSE)
ON CONFLICT (id) DO UPDATE SET 
  team_a = EXCLUDED.team_a,
  team_b = EXCLUDED.team_b,
  team_a_code = EXCLUDED.team_a_code,
  team_b_code = EXCLUDED.team_b_code,
  kickoff_utc = EXCLUDED.kickoff_utc,
  phase = EXCLUDED.phase;

-- Semilla de Usuarios Iniciales (Rivales Virtuales)
-- Nota: La contraseña no es necesaria dado que la plataforma utiliza login con código OTP enviado al email.
-- Se crea un administrador por defecto (admin@polla.com)
INSERT INTO public.users (id, email, name, role, points, exact_matches, winner_matches, diff_matches) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@polla.com', 'Administrador Mundial', 'admin', 0, 0, 0, 0),
('00000000-0000-0000-0000-000000000002', 'valderrama@polla.com', 'Pibe Valderrama', 'user', 42, 3, 4, 2),
('00000000-0000-0000-0000-000000000003', 'james@polla.com', 'James Rodríguez', 'user', 38, 2, 5, 1),
('00000000-0000-0000-0000-000000000004', 'falcao@polla.com', 'Radamel Falcao', 'user', 35, 1, 6, 2),
('00000000-0000-0000-0000-000000000005', 'lucho@polla.com', 'Lucho Díaz', 'user', 29, 2, 3, 1),
('00000000-0000-0000-0000-000000000006', 'shakira@polla.com', 'Shakira Mebarak', 'user', 25, 0, 5, 0)
ON CONFLICT (email) DO NOTHING;

-- Mensajes de Chat Semilla iniciales
INSERT INTO public.chat_messages (user_id, user_name, text, created_at) VALUES
('00000000-0000-0000-0000-000000000002', 'Pibe Valderrama', '¡Todo bien, todo bien! ¿Quién gana el primer partido?', NOW() - INTERVAL '2 hours'),
('00000000-0000-0000-0000-000000000003', 'James Rodríguez', 'Yo le puse fe a México, juegan bien de local.', NOW() - INTERVAL '1 hour'),
('00000000-0000-0000-0000-000000000004', 'Radamel Falcao', 'Ojo con Sudáfrica, son rápidos al contragolpe.', NOW() - INTERVAL '30 minutes');
