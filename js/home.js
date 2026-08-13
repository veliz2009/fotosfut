(function () {
  const date = (d) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`));
  const clubCard = (club) => `<a href="eventos.html?club=${club.id}" class="club-card">${UI.image(club.cover_path, `Portada de ${club.name}`)}<div class="club-card-content"><div><h3>${club.name}</h3><p>${club.events?.[0]?.count || 0} eventos disponibles</p></div><span class="round-arrow">→</span></div></a>`;
  const eventCard = (event) => `<a class="event-card" href="galeria.html?evento=${event.id}">${UI.image(event.cover_path, `${event.name} vs ${event.opponent}`, 'event-image')}<div class="event-card-content"><p class="event-meta">${date(event.event_date)} · ${event.venue || 'Evento deportivo'}</p><h3>${event.name}${event.opponent ? ` <span class="vs">vs</span> ${event.opponent}` : ''}</h3><p>${event.clubs?.name || ''} · ${event.photos?.[0]?.count || 0} fotos</p><span class="card-link">Ver fotografías →</span></div></a>`;
  window.Cards = { clubCard, eventCard, date };
  document.addEventListener('DOMContentLoaded', async () => {
    const clubs = document.querySelector('#home-clubs'), events = document.querySelector('#home-events');
    if (!AppData.configured()) { clubs.innerHTML = UI.empty('Configurá Supabase para publicar tus clubes.'); events.innerHTML = UI.empty('Tus próximos eventos aparecerán acá.'); return; }
    try { clubs.innerHTML = (await AppData.clubs()).slice(0, 3).map(clubCard).join('') || UI.empty('Todavía no hay clubes publicados.'); }
    catch (error) { clubs.innerHTML = UI.empty('No pudimos cargar los clubes.'); console.error(error); }
    try { events.innerHTML = (await AppData.events({ featured: true, limit: 2 })).map(eventCard).join('') || UI.empty('Todavía no hay eventos destacados.'); }
    catch (error) { events.innerHTML = UI.empty('No pudimos cargar los eventos.'); console.error(error); }
  });
})();
