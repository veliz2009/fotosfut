/* Conexión única a Supabase. No agregues claves service_role en este archivo. */
(function () {
  const c = window.CONFIG;
  const configured = c && c.SUPABASE_URL.startsWith('https://') &&
    c.SUPABASE_ANON_KEY && !c.SUPABASE_ANON_KEY.startsWith('PEGAR_');

  window.supabaseConfigured = Boolean(configured && window.supabase);
  window.supabaseClient = window.supabaseConfigured
    ? window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
    : null;
})();
