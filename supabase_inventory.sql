-- ============================================================
-- SQL PARA EL MÓDULO DE INVENTARIO (ASEO Y PAPELERÍA)
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- 1. Tabla de Catálogo de Productos
CREATE TABLE IF NOT EXISTS public.inventario_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  categoria     TEXT DEFAULT 'General',
  unidad_medida TEXT DEFAULT 'Unidad',
  stock_minimo  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Movimientos (Entradas y Salidas)
CREATE TABLE IF NOT EXISTS public.inventario_movimientos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id     UUID REFERENCES public.inventario_items(id) ON DELETE CASCADE,
  tipo        TEXT CHECK (tipo IN ('ENTRADA', 'SALIDA')) NOT NULL,
  cantidad    INTEGER NOT NULL,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia  TEXT, -- Número de solicitud/factura (ej: 14736)
  solicitante TEXT, -- Quien pidió (ej: Anny Lorena)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas (Simplificadas para usuarios autenticados)
CREATE POLICY "Ver inventario autenticados" ON public.inventario_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestionar inventario autenticados" ON public.inventario_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Ver movimientos autenticados" ON public.inventario_movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insertar movimientos autenticados" ON public.inventario_movimientos FOR INSERT TO authenticated WITH CHECK (true);
