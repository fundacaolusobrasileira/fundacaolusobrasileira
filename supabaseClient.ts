import { createClient } from '@supabase/supabase-js';

// Acesso seguro às variáveis de ambiente para evitar erro se import.meta.env for undefined
const env = (import.meta as any).env || {};

// Credenciais do projeto Supabase
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://lhgzyrszzbxjjvnxfwzf.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5kxyqGvP9GV4e2BhvLwWVw_RraqN7Bt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);