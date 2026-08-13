(function () {
  let activeClub = new URLSearchParams(location.search).get('club') || '';
  let search = new URLSearchParams(location.search).get('q') || '';
  const list = () => document.querySelector('#events-list');
  const renderEvents = async () => {
    list().innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
      const events = await AppData.events({ clubId: activeClub || undefined, search: search || undefined });
      const date = (d) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`));
      list().innerHTML = events.map((event) => `<a class="event-card" href="galeria.html?evento=${event.id}">${UI.image(event.cover_path, `${event.name} vs ${event.opponent}`, 'event-image')}<div class="event-card-content"><p class="event-meta">${date(event.event_date)} · ${event.venue || 'Evento deportivo'}</p><h3>${event.name}${event.opponent ? ` <span class="vs">vs</span> ${event.opponent}` : ''}</h3><p>${event.clubs?.name || ''} · ${event.photos?.[0]?.count || 0} fotos</p><span class="card-link">Ver fotografías →</span></div></a>`).join('') || UI.empty('No encontramos eventos con esos criterios.');
    } catch (error) { list().innerHTML = UI.empty('No pudimos cargar los eventos.'); console.error(error); }
  };
  document.addEventListener('DOMContentLoaded', async () => {
    const filterHost = document.querySelector('#club-filters'); const input = document.querySelector('#event-query'); input.value = search;
    if (!AppData.configured()) { list().innerHTML = UI.empty('Configurá Supabase para mostrar los eventos.'); return; }
    try {
      const clubs = await AppData.clubs();
      filterHost.innerHTML = `<button class="filter-button ${!activeClub ? 'active' : ''}" data-club="">Todos</button>` + clubs.map(c => `<button class="filter-button ${activeClub === c.id ? 'active' : ''}" data-club="${c.id}">${c.short_name || c.name}</button>`).join('');
      filterHost.addEventListener('click', (e) => { const btn = e.target.closest('[data-club]'); if (!btn) return; activeClub = btn.dataset.club; filterHost.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn)); renderEvents(); });
      document.querySelector('#event-search').addEventListener('submit', (e) => { e.preventDefault(); search = input.value.trim(); renderEvents(); });
      await renderEvents();
    } catch (error) { list().innerHTML = UI.empty('No pudimos preparar los filtros.'); console.error(error); }
  });
})();
