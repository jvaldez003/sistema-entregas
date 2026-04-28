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
  residencia          TEXT,
  destino             TEXT,
  universidad         TEXT,
  horario             TEXT,
  ruta                TEXT,
  dia_lunes           BOOLEAN      DEFAULT false,
  dia_martes          BOOLEAN      DEFAULT false,
  dia_miercoles       BOOLEAN      DEFAULT false,
  dia_jueves          BOOLEAN      DEFAULT false,
  dia_viernes         BOOLEAN      DEFAULT false,
  dia_sabado          BOOLEAN      DEFAULT false,
  created_at          TIMESTAMPTZ  DEFAULT now()
);

-- Si la tabla ya existe, ejecuta estos ALTER TABLE para agregar las nuevas columnas:
/*
ALTER TABLE public.entrega_papeles
ADD COLUMN residencia TEXT,
ADD COLUMN destino TEXT,
ADD COLUMN universidad TEXT,
ADD COLUMN horario TEXT,
ADD COLUMN ruta TEXT,
ADD COLUMN dia_lunes BOOLEAN DEFAULT false,
ADD COLUMN dia_martes BOOLEAN DEFAULT false,
ADD COLUMN dia_miercoles BOOLEAN DEFAULT false,
ADD COLUMN dia_jueves BOOLEAN DEFAULT false,
ADD COLUMN dia_viernes BOOLEAN DEFAULT false,
ADD COLUMN dia_sabado BOOLEAN DEFAULT false;
*/


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
