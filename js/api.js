/* Acceso ordenado a Supabase. Las políticas SQL hacen cumplir los permisos. */
(function () {
  const db = window.supabaseClient;
  const missing = () => { throw new Error('Conectá Supabase en js/config.js para usar el sitio.'); };
  const assertDb = () => { if (!db) missing(); return db; };
  const unwrap = async (query) => {
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  };
  const previewUrl = (path) => path ? assertDb().storage.from('previews').getPublicUrl(path).data.publicUrl : '';
  const safeName = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();

  window.AppData = {
    configured: () => Boolean(db),
    previewUrl,
    safeName,
    async clubs({ published = true } = {}) {
      let q = assertDb().from('clubs').select('*, events(count)').order('name');
      if (published) q = q.eq('published', true);
      return (await unwrap(q)).data;
    },
    async club(id) { return (await unwrap(assertDb().from('clubs').select('*').eq('id', id).single())).data; },
    async events({ clubId, featured = false, published = true, limit, search } = {}) {
      let q = assertDb().from('events').select('*, clubs(id, name, short_name, logo_path), photos(count)')
        .order('event_date', { ascending: false });
      if (published) q = q.eq('published', true);
      if (clubId) q = q.eq('club_id', clubId);
      if (featured) q = q.eq('featured', true);
      // También se filtra del lado del navegador para incluir el nombre del club
      // (una relación) y formatos de fecha como 10/08/2026.
      if (limit && !search) q = q.limit(limit);
      let rows = (await unwrap(q)).data;
      if (search) {
        const needle = String(search).trim().toLocaleLowerCase('es-AR');
        const matching = (value) => String(value || '').toLocaleLowerCase('es-AR').includes(needle);
        rows = rows.filter(event => {
          const parts = String(event.event_date || '').split('-');
          const localDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
          return matching(event.name) || matching(event.opponent) || matching(event.venue) || matching(event.event_date) || matching(localDate) || matching(event.clubs?.name);
        });
      }
      return limit ? rows.slice(0, limit) : rows;
    },
    async event(id) {
      return (await unwrap(assertDb().from('events').select('*, clubs(id, name, short_name, logo_path)').eq('id', id).single())).data;
    },
    async photos(eventId, page = 0, size = 24) {
      let q = assertDb().from('photos').select('*', { count: 'exact' }).eq('event_id', eventId)
        .eq('published', true).order('created_at').range(page * size, page * size + size - 1);
      return unwrap(q);
    },
    async allEventPhotos(eventId) {
      return (await unwrap(assertDb().from('photos').select('*').eq('event_id', eventId).order('created_at'))).data;
    },
    async adminPhotos({ eventId } = {}) {
      let q = assertDb().from('photos').select('*, events(id, name, opponent, clubs(name))').order('created_at', { ascending: false });
      if (eventId) q = q.eq('event_id', eventId);
      return (await unwrap(q)).data;
    },
    async createClub(values) { return (await unwrap(assertDb().from('clubs').insert(values).select().single())).data; },
    async updateClub(id, values) { return (await unwrap(assertDb().from('clubs').update(values).eq('id', id).select().single())).data; },
    async deleteClub(id) {
      const events = await this.events({ clubId: id, published: false });
      for (const event of events) await this.deleteEvent(event.id);
      await unwrap(assertDb().from('clubs').delete().eq('id', id));
    },
    async createEvent(values) { return (await unwrap(assertDb().from('events').insert(values).select().single())).data; },
    async updateEvent(id, values) { return (await unwrap(assertDb().from('events').update(values).eq('id', id).select().single())).data; },
    async deleteEvent(id) {
      const photos = await this.allEventPhotos(id); if (photos.length) await this.deletePhotos(photos);
      await unwrap(assertDb().from('events').delete().eq('id', id));
    },
    async createPhoto(values) { return (await unwrap(assertDb().from('photos').insert(values).select().single())).data; },
    async updatePhotos(ids, values) { await unwrap(assertDb().from('photos').update(values).in('id', ids)); },
    async deletePhotos(rows) {
      const client = assertDb();
      const originals = rows.map(x => x.original_path).filter(Boolean);
      const previews = rows.map(x => x.preview_path).filter(Boolean);
      if (originals.length) await unwrap(client.storage.from('originals').remove(originals));
      if (previews.length) await unwrap(client.storage.from('previews').remove(previews));
      await unwrap(client.from('photos').delete().in('id', rows.map(x => x.id)));
    },
    async upload(bucket, path, file, onProgress) {
      // Supabase Storage no expone progreso granular en el navegador; se informa por archivo.
      onProgress && onProgress();
      const { error } = await assertDb().storage.from(bucket).upload(path, file, { upsert: false, cacheControl: '31536000' });
      if (error) throw error;
    },
    async signedOriginal(path) {
      const { data, error } = await assertDb().storage.from('originals').createSignedUrl(path, 60);
      if (error) throw error;
      return data.signedUrl;
    },
    async createOrder(photoIds) {
      const { data, error } = await assertDb().rpc('create_customer_order', { p_photo_ids: photoIds });
      if (error) throw error;
      return data;
    },
    async orders() {
      return (await unwrap(assertDb().from('orders').select('*, order_items(*, photos(file_name, photo_code, preview_path))').order('created_at', { ascending: false }))).data;
    },
    async updateOrder(id, status) { await unwrap(assertDb().from('orders').update({ status }).eq('id', id)); },
    async currentUser() { return (await assertDb().auth.getUser()).data.user; },
    async profile() {
      const user = await this.currentUser();
      if (!user) return null;
      return (await unwrap(assertDb().from('profiles').select('*').eq('id', user.id).single())).data;
    },
    async signIn(email, password) { const { error } = await assertDb().auth.signInWithPassword({ email, password }); if (error) throw error; },
    async signOut() { const { error } = await assertDb().auth.signOut(); if (error) throw error; }
  };
})();
