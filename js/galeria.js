(function () {
  const eventId = new URLSearchParams(location.search).get('evento'); let event; let photos = []; let page = 0; let total = 0; const size = 24;
  const grid = () => document.querySelector('#photo-grid');
  const renderPhoto = (photo, index) => `<button class="photo-card" data-index="${index}" aria-label="Ver foto ${photo.photo_code || photo.file_name}">${UI.image(photo.preview_path, `Previsualización ${photo.photo_code || photo.file_name}`)}</button>`;
  const info = () => document.querySelector('#gallery-info');
  async function loadPage() {
    const more = document.querySelector('#load-more'); more.disabled = true; more.textContent = 'Cargando…';
    try { const result = await AppData.photos(eventId, page, size); photos.push(...result.data); total = result.count || 0; grid().insertAdjacentHTML('beforeend', result.data.map((p, i) => renderPhoto(p, (page * size) + i)).join('')); page += 1; more.hidden = photos.length >= total; document.querySelector('#photo-count').textContent = `${total} fotografías disponibles`; }
    catch (error) { UI.toast('No pudimos cargar más fotografías.'); console.error(error); }
    finally { more.disabled = false; more.textContent = 'Cargar más fotos'; }
  }
  function open(index) {
    const photo = photos[index]; if (!photo) return; const dialog = document.querySelector('#photo-viewer');
    dialog.dataset.index = index; document.querySelector('#viewer-image').src = AppData.previewUrl(photo.preview_path); document.querySelector('#viewer-image').alt = `Previsualización ${photo.photo_code || photo.file_name}`; document.querySelector('#viewer-code').textContent = photo.photo_code || photo.file_name; document.querySelector('#viewer-price').textContent = Shop.money(photo.price_ars); dialog.showModal();
  }
  document.addEventListener('DOMContentLoaded', async () => {
    if (!eventId) { info().innerHTML = UI.empty('Elegí un evento para ver sus fotografías.'); return; }
    if (!AppData.configured()) { info().innerHTML = UI.empty('Configurá Supabase para mostrar esta galería.'); return; }
    try { event = await AppData.event(eventId); const date = new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(`${event.event_date}T12:00:00`)); info().innerHTML = `<p class="eyebrow">${event.clubs?.name || 'EVENTO'} / ${date.toUpperCase()}</p><h1 class="gallery-title">${event.name}${event.opponent ? ` <span class="vs">vs</span> ${event.opponent}` : ''}</h1><p>${event.description || `${event.venue || 'Cobertura deportiva'} · Elegí tus fotos favoritas y hacé tu pedido.`}</p>`; await loadPage(); }
    catch (error) { info().innerHTML = UI.empty('No encontramos este evento o no está publicado.'); console.error(error); return; }
    grid().addEventListener('click', (e) => { const card = e.target.closest('[data-index]'); if (card) open(Number(card.dataset.index)); });
    document.querySelector('#load-more').addEventListener('click', loadPage);
    const viewer = document.querySelector('#photo-viewer'); viewer.querySelector('.viewer-close').onclick = () => viewer.close(); viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
    viewer.querySelector('.viewer-prev').onclick = () => open((Number(viewer.dataset.index) - 1 + photos.length) % photos.length); viewer.querySelector('.viewer-next').onclick = () => open((Number(viewer.dataset.index) + 1) % photos.length);
    document.querySelector('#viewer-add').onclick = () => { const p = photos[Number(viewer.dataset.index)]; Shop.add(p, event); };
    const count = () => document.querySelector('[data-gallery-cart-count]').textContent = Shop.cart().length; count(); window.addEventListener('cart:changed', count);
  });
})();
