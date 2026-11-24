// Keep the existing application import path while sharing the integration's
// connected client and preview-aware session storage everywhere.
export { supabase } from "@/integrations/supabase/client";
export const isSupabaseConfigured = true;
