-- ============================================================
-- EJECUTA ESTE SQL EN: Supabase → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entrega_papeles (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo     TEXT         NOT NULL,
  cedula              TEXT         UNIQUE NOT NULL,
  correo              TEXT,
  telefono            TEXT,
  estado_entrega      TEXT         DEFAULT 'NO ENTREGÓ', -- Opciones: SÍ ENTREGÓ, NO ENTREGÓ, APLICA, NO APLICA
  created_at          TIMESTAMPTZ  DEFAULT now()
);

-- RLS
ALTER TABLE public.entrega_papeles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver entrega_papeles autenticados"
  ON public.entrega_papeles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Insertar entrega_papeles autenticados"
  ON public.entrega_papeles FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Actualizar entrega_papeles autenticados"
  ON public.entrega_papeles FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Eliminar entrega_papeles autenticados"
  ON public.entrega_papeles FOR DELETE
  TO authenticated USING (true);
