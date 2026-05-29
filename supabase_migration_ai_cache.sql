-- Agregar columna para cachear predicciones de IA (Gemini)
-- Ejecutar en: Supabase Dashboard > SQL Editor
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS ai_prediction TEXT DEFAULT NULL;
