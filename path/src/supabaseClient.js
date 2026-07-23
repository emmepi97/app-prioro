import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function getConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Variabili Supabase mancanti. Inserisci VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY su Vercel e fai Redeploy.';
  }

  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    return 'VITE_SUPABASE_URL non valida. Deve essere simile a https://xxxx.supabase.co, non una API key.';
  }

  if (supabaseAnonKey.startsWith('sb_secret_')) {
    return 'Stai usando una Secret Key. Nel frontend devi usare la Publishable Key o la anon public key, mai la Secret Key.';
  }

  if (!(supabaseAnonKey.startsWith('sb_publishable_') || supabaseAnonKey.startsWith('eyJ'))) {
    return 'VITE_SUPABASE_ANON_KEY non sembra una Publishable Key o una anon public key valida.';
  }

  return '';
}

export const supabaseConfigError = getConfigError();
export const isSupabaseConfigured = !supabaseConfigError;
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
