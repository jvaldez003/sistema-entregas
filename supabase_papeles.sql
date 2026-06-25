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
  is_replacement      BOOLEAN      DEFAULT false,
  days_added_later    BOOLEAN      DEFAULT false,
  novedad_observacion TEXT,
  ruta_ida            TEXT,
  valor_ida           TEXT,
  ruta_regreso        TEXT,
  valor_regreso       TEXT,
  sisben              TEXT,
  recogio_ticket      BOOLEAN      DEFAULT NULL,
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
ADD COLUMN dia_sabado BOOLEAN DEFAULT false,
ADD COLUMN is_replacement BOOLEAN DEFAULT false,
ADD COLUMN days_added_later BOOLEAN DEFAULT false,
ADD COLUMN novedad_observacion TEXT,
ADD COLUMN ruta_ida TEXT,
ADD COLUMN valor_ida TEXT,
ADD COLUMN ruta_regreso TEXT,
ADD COLUMN valor_regreso TEXT,
ADD COLUMN sisben TEXT,
ADD COLUMN recogio_ticket BOOLEAN DEFAULT NULL;
*/


-- ============================================================
-- TABLA PARA HISTORIAL DE RECOGIDA DE TICKETS POR MES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_recojos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cedula     TEXT NOT NULL,
  mes_anio   TEXT NOT NULL,            -- formato: 'YYYY-MM'  ej: '2026-05'
  recogio    BOOLEAN DEFAULT NULL,     -- true=sí recogió, false=no recogió
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cedula, mes_anio)
);

-- ============================================================
-- TABLA SNAPSHOT MENSUAL DE BENEFICIARIOS
-- Se llena automáticamente al entrar al mes siguiente.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beneficiarios_mes (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  cedula          TEXT         NOT NULL,
  mes_anio        TEXT         NOT NULL,
  nombre_completo TEXT,
  valor_ida       TEXT,
  valor_regreso   TEXT,
  destino         TEXT,
  universidad     TEXT,
  ruta            TEXT,
  dia_lunes       BOOLEAN      DEFAULT false,
  dia_martes      BOOLEAN      DEFAULT false,
  dia_miercoles   BOOLEAN      DEFAULT false,
  dia_jueves      BOOLEAN      DEFAULT false,
  dia_viernes     BOOLEAN      DEFAULT false,
  dia_sabado      BOOLEAN      DEFAULT false,
  sisben          TEXT,
  created_at      TIMESTAMPTZ  DEFAULT now(),
  UNIQUE(cedula, mes_anio)
);

ALTER TABLE public.beneficiarios_mes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver beneficiarios_mes autenticados"    ON public.beneficiarios_mes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insertar beneficiarios_mes autenticados" ON public.beneficiarios_mes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Actualizar beneficiarios_mes autenticados" ON public.beneficiarios_mes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Eliminar beneficiarios_mes autenticados" ON public.beneficiarios_mes FOR DELETE TO authenticated USING (true);

-- Migración si ya existe entrega_papeles (ejecutar solo la nueva tabla):
-- CREATE TABLE IF NOT EXISTS public.ticket_recojos (...) -- ver arriba

-- RLS para ticket_recojos
ALTER TABLE public.ticket_recojos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver ticket_recojos autenticados"
  ON public.ticket_recojos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insertar ticket_recojos autenticados"
  ON public.ticket_recojos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Actualizar ticket_recojos autenticados"
  ON public.ticket_recojos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Eliminar ticket_recojos autenticados"
  ON public.ticket_recojos FOR DELETE TO authenticated USING (true);

-- ============================================================
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
