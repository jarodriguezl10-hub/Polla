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
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'rejected')),
    points INTEGER DEFAULT 0,
    exact_matches INTEGER DEFAULT 0,
    winner_matches INTEGER DEFAULT 0,
    diff_matches INTEGER DEFAULT 0,
    paid BOOLEAN DEFAULT FALSE,
    receive_emails BOOLEAN DEFAULT TRUE,
    accepted_data_policy BOOLEAN DEFAULT FALSE,
    accepted_transparency BOOLEAN DEFAULT FALSE,
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
    ai_prediction TEXT DEFAULT NULL,
    emails_sent BOOLEAN DEFAULT FALSE,
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
    recipient_ids TEXT DEFAULT NULL,
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

-- 6. Tabla de Pagos Sin Conciliar
CREATE TABLE IF NOT EXISTS public.unconciliated_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recollection_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    conciliated BOOLEAN DEFAULT FALSE,
    conciliated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Deshabilitar Seguridad de Fila (RLS) en todas las tablas para permitir acceso directo de API
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.unconciliated_payments DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- CONFIGURACIÓN DE TIEMPO REAL (REALTIME)
-- ==========================================
-- Habilita el envío de actualizaciones en tiempo real a través de WebSockets
-- para el Chat Grupal y la Tabla de Clasificación.

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.users;

-- ==========================================
-- FIN DEL SCRIPT DE INICIALIZACIÓN
-- Los datos se insertarán vía script de migración
-- ==========================================
