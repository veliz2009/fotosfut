(function () {
  const eventCount = (club) => club.events?.[0]?.count || 0;
  document.addEventListener('DOMContentLoaded', async () => {
    const list = document.querySelector('#clubs-list');
    if (!AppData.configured()) { list.innerHTML = UI.empty('Configurá Supabase para mostrar los clubes.'); return; }
    try {
      const clubs = await AppData.clubs();
      list.innerHTML = clubs.map((club) => `<a href="eventos.html?club=${club.id}" class="club-card">${UI.image(club.cover_path, `Portada de ${club.name}`)}<div class="club-card-content"><div><h3>${club.name}</h3><p>${eventCount(club)} eventos disponibles</p></div><span class="round-arrow">→</span></div></a>`).join('') || UI.empty('Aún no hay clubes publicados.');
    } catch (error) { list.innerHTML = UI.empty('No pudimos cargar los clubes.'); console.error(error); }
  });
})();
