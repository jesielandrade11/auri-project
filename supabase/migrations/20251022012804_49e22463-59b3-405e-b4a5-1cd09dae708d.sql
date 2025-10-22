-- Fix Supabase linter warning: set stable search_path on function without it
-- atualizar_status_vencidas currently lacks search_path; set it explicitly
ALTER FUNCTION public.atualizar_status_vencidas()
  SET search_path = public;