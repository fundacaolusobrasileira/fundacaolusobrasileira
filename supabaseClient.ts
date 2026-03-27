import { createClient } from '@supabase/supabase-js';

// Acesso seguro às variáveis de ambiente para evitar erro se import.meta.env for undefined
const env = (import.meta as any).env || {};

// Credenciais do projeto Supabase
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ekxdvzquvoaeunmgopdp.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVreGR2enF1dm9hZXVubWdvcGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDgyODUsImV4cCI6MjA4OTAyNDI4NX0.vCFSSWAHOU5sbTVuelJtVSRixwl3WHycSbYrZhwaqA0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);