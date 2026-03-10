-- ============================================================
-- EJECUTA ESTE SQL EN: Supabase → SQL Editor → New query
-- ============================================================

-- 1. Tabla principal de entregas
CREATE TABLE IF NOT EXISTS public.entregas (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha               DATE         NOT NULL,
  recurso             TEXT         NOT NULL,
  docente             TEXT         NOT NULL,
  aula                TEXT         NOT NULL,
  horario             TEXT,
  dia                 TEXT,
  quien_entrega       TEXT,
  firma_quien_recibe  TEXT,
  observaciones       TEXT,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de perfiles (para listar usuarios en el admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Trigger: crea perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Row Level Security (RLS) — solo usuarios autenticados pueden leer/escribir
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver todas las entregas
CREATE POLICY "Ver entregas autenticados"
  ON public.entregas FOR SELECT
  TO authenticated USING (true);

-- Cualquier usuario autenticado puede insertar
CREATE POLICY "Insertar entregas autenticados"
  ON public.entregas FOR INSERT
  TO authenticated WITH CHECK (true);

-- Solo el autor puede eliminar sus propios registros
CREATE POLICY "Eliminar propias entregas"
  ON public.entregas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Perfiles: solo el propio usuario los ve
CREATE POLICY "Ver perfil propio"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);
