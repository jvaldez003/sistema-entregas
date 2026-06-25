-- ============================================================
-- EJECUTA ESTE SQL EN: Supabase → SQL Editor → New query
-- Políticas RLS para beneficiarios_mes (y tabla si no existe)
-- ============================================================

-- 1. Crear tabla (si aún no existe)
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

-- 2. Activar RLS
ALTER TABLE public.beneficiarios_mes ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas viejas (evita error "policy already exists")
DROP POLICY IF EXISTS "bm_insert" ON public.beneficiarios_mes;
DROP POLICY IF EXISTS "bm_update" ON public.beneficiarios_mes;
DROP POLICY IF EXISTS "bm_delete" ON public.beneficiarios_mes;
DROP POLICY IF EXISTS "Ver beneficiarios_mes autenticados" ON public.beneficiarios_mes;
DROP POLICY IF EXISTS "Insertar beneficiarios_mes autenticados" ON public.beneficiarios_mes;
DROP POLICY IF EXISTS "Actualizar beneficiarios_mes autenticados" ON public.beneficiarios_mes;
DROP POLICY IF EXISTS "Eliminar beneficiarios_mes autenticados" ON public.beneficiarios_mes;

-- 4. Crear políticas correctas (una por una, sintaxis completa)
CREATE POLICY "Ver beneficiarios_mes autenticados"
  ON public.beneficiarios_mes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insertar beneficiarios_mes autenticados"
  ON public.beneficiarios_mes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Actualizar beneficiarios_mes autenticados"
  ON public.beneficiarios_mes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Eliminar beneficiarios_mes autenticados"
  ON public.beneficiarios_mes
  FOR DELETE
  TO authenticated
  USING (true);
