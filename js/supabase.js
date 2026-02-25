// ===== SUPABASE CLIENT INITIALIZATION =====

const SUPABASE_URL = 'https://cytcnudzqxmcnujiodoj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KLUBmUGLjGXy4A_CT_A6Yw_6Yfc44yr';

const supabaseLib = window.supabase;

if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
  console.error('Supabase CDN library is not loaded.');
} else {
  const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Expose under dedicated names and keep compatibility with existing code.
  window.supabaseClient = supabaseClient;
  window.ctfSupabase = supabaseClient;
  window.supabase = supabaseClient;
}
