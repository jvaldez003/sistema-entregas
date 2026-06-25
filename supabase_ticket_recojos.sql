-- ============================================================
-- EJECUTA ESTE SQL EN: Supabase → SQL Editor → New query
-- Columnas SISBEN + recogida de tickets + tabla ticket_recojos
-- ============================================================

-- 1. Columnas nuevas en entrega_papeles (si la tabla ya existía)
ALTER TABLE public.entrega_papeles
ADD COLUMN IF NOT EXISTS sisben TEXT,
ADD COLUMN IF NOT EXISTS recogio_ticket BOOLEAN DEFAULT NULL;

-- 2. Tabla de recogida de tickets por mes
CREATE TABLE IF NOT EXISTS public.ticket_recojos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cedula     TEXT NOT NULL,
  mes_anio   TEXT NOT NULL,
  recogio    BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cedula, mes_anio)
);

-- 3. RLS
ALTER TABLE public.ticket_recojos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver ticket_recojos autenticados" ON public.ticket_recojos;
DROP POLICY IF EXISTS "Insertar ticket_recojos autenticados" ON public.ticket_recojos;
DROP POLICY IF EXISTS "Actualizar ticket_recojos autenticados" ON public.ticket_recojos;
DROP POLICY IF EXISTS "Eliminar ticket_recojos autenticados" ON public.ticket_recojos;

CREATE POLICY "Ver ticket_recojos autenticados"
  ON public.ticket_recojos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insertar ticket_recojos autenticados"
  ON public.ticket_recojos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Actualizar ticket_recojos autenticados"
  ON public.ticket_recojos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Eliminar ticket_recojos autenticados"
  ON public.ticket_recojos
  FOR DELETE
  TO authenticated
  USING (true);
