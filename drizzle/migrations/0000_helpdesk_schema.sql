CREATE TYPE public.app_role AS ENUM ('colaborador','tecnico');
CREATE TYPE public.ticket_status AS ENUM ('aberto','em_atendimento','resolvido');
CREATE TYPE public.ticket_priority AS ENUM ('baixa','media','alta');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'tecnico'));

CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'tecnico') THEN RAISE EXCEPTION 'Apenas técnicos podem alterar perfis'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode alterar seu próprio perfil'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role);
END $$;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''));
  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE role='tecnico') THEN 'colaborador'::public.app_role ELSE 'tecnico'::public.app_role END);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number serial,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  priority public.ticket_priority NOT NULL DEFAULT 'media',
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT USAGE ON SEQUENCE public.tickets_number_seq TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets read" ON public.tickets FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'tecnico'));
CREATE POLICY "tickets insert own" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'aberto' AND assigned_to IS NULL);
CREATE POLICY "tickets tecnico update" ON public.tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'tecnico')) WITH CHECK (public.has_role(auth.uid(),'tecnico'));

CREATE OR REPLACE FUNCTION public.touch_ticket() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); NEW.created_by = OLD.created_by; NEW.title = OLD.title; NEW.description = OLD.description; RETURN NEW; END $$;
CREATE TRIGGER tickets_touch BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.touch_ticket();

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_comments TO authenticated;
GRANT ALL ON public.ticket_comments TO service_role;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read" ON public.ticket_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND (t.created_by = auth.uid() OR public.has_role(auth.uid(),'tecnico'))));
CREATE POLICY "comments tecnico insert" ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.has_role(auth.uid(),'tecnico'));