-- ============================================================
-- SQL PARA EL MÓDULO DE LISTADO DE ASISTENCIA
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.asistencia_beneficiarios (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo     TEXT NOT NULL,
  tipo_doc            TEXT DEFAULT 'TI',
  documento           TEXT NOT NULL UNIQUE,
  edad                INTEGER,
  sexo                TEXT,
  
  -- Poblaciones Diferenciales (Booleans para mapeo con Formato Excel)
  p_primera_infancia  BOOLEAN DEFAULT FALSE,
  p_infancia          BOOLEAN DEFAULT FALSE,
  p_adolescencia      BOOLEAN DEFAULT FALSE,
  p_joven               BOOLEAN DEFAULT FALSE,
  p_adulto            BOOLEAN DEFAULT FALSE,
  p_victima           BOOLEAN DEFAULT FALSE,
  p_lgbti             BOOLEAN DEFAULT FALSE,
  p_discapacidad      BOOLEAN DEFAULT FALSE,
  p_etnia             BOOLEAN DEFAULT FALSE,
  p_religion          BOOLEAN DEFAULT FALSE,
  p_migrante          BOOLEAN DEFAULT FALSE,
  p_desvinculado      BOOLEAN DEFAULT FALSE,
  
  adulto_responsable  TEXT,
  direccion           TEXT,
  corregimiento       TEXT,
  barrio              TEXT,
  contacto            TEXT,
  
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.asistencia_beneficiarios ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Ver asistencia autenticados" ON public.asistencia_beneficiarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestionar asistencia autenticados" ON public.asistencia_beneficiarios FOR ALL TO authenticated USING (true);
