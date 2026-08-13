/* Elementos compartidos: navegación, pie, avisos y carrito local. */
(function () {
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const cartKey = 'enfoque-juego-cart-v1';
  const getCart = () => { try { return JSON.parse(localStorage.getItem(cartKey)) || []; } catch { return []; } };
  const saveCart = (items) => { localStorage.setItem(cartKey, JSON.stringify(items)); window.dispatchEvent(new Event('cart:changed')); };
  window.Shop = {
    money: (value) => money.format(Number(value || 0)),
    cart: getCart,
    add(photo, event) {
      const items = getCart();
      if (!items.some(item => item.id === photo.id)) {
        items.push({ id: photo.id, photo_code: photo.photo_code, file_name: photo.file_name, price_ars: photo.price_ars, preview_path: photo.preview_path, event_id: event.id, event_name: event.name, opponent: event.opponent });
        saveCart(items); window.UI.toast('Foto agregada al carrito.', 'success');
      } else window.UI.toast('Esta foto ya está en tu carrito.');
    },
    remove(id) { saveCart(getCart().filter(item => item.id !== id)); },
    clear() { saveCart([]); },
    total: () => getCart().reduce((sum, x) => sum + Number(x.price_ars || 0), 0)
  };
  const icon = (name) => ({ search: '⌕', cart: '⌑', arrow: '→', close: '×', menu: '☰' }[name] || '');
  window.UI = {
    toast(message, type = '') {
      const host = document.querySelector('#toast-host') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast-host' }));
      const node = document.createElement('div'); node.className = `toast ${type}`; node.textContent = message; host.append(node);
      setTimeout(() => node.remove(), 4300);
    },
    setLoading(element, loading, label = 'Guardando…') {
      if (!element) return; element.disabled = loading; element.dataset.originalText ||= element.textContent; element.textContent = loading ? label : element.dataset.originalText;
    },
    empty(message) { return `<div class="empty-state"><span>◌</span><p>${message}</p></div>`; },
    image(path, alt, cls = '') { return path ? `<img class="${cls}" src="${AppData.previewUrl(path)}" alt="${alt}" loading="lazy">` : `<div class="image-placeholder ${cls}" aria-label="Sin imagen">◒</div>`; }
  };
  function renderShell() {
    const c = window.CONFIG; const current = location.pathname.split('/').pop() || 'index.html';
    const header = document.querySelector('[data-site-header]');
    if (header) header.innerHTML = `
      <a class="brand" href="index.html" aria-label="${c.NOMBRE_SITIO}, inicio"><span class="brand-mark">${c.LOGO_TEXTO}</span><span>${c.NOMBRE_SITIO}</span></a>
      <button class="menu-button" aria-label="Abrir menú">${icon('menu')}</button>
      <nav class="main-nav" aria-label="Navegación principal">
        <a class="${current === 'index.html' ? 'active' : ''}" href="index.html">Inicio</a><a class="${current === 'clubes.html' ? 'active' : ''}" href="clubes.html">Clubes</a><a class="${current === 'eventos.html' ? 'active' : ''}" href="eventos.html">Eventos</a>
        <a class="nav-search" href="eventos.html#buscar">${icon('search')} <span>Buscar</span></a>
        <a class="cart-link ${current === 'carrito.html' ? 'active' : ''}" href="carrito.html">${icon('cart')} <span>Carrito</span><b data-cart-count>0</b></a>
      </nav>`;
    const footer = document.querySelector('[data-site-footer]');
    if (footer) footer.innerHTML = `<div><a class="brand footer-brand" href="index.html"><span class="brand-mark">${c.LOGO_TEXTO}</span><span>${c.NOMBRE_SITIO}</span></a><p>${c.DESCRIPCION_SITIO}</p></div><div><h3>Contacto</h3><a href="https://wa.me/${c.WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:${c.EMAIL}">${c.EMAIL}</a><a href="${c.INSTAGRAM_URL}" target="_blank" rel="noopener">${c.INSTAGRAM}</a></div><small>© ${new Date().getFullYear()} ${c.NOMBRE_SITIO}. Todos los derechos reservados.</small>`;
    const menu = header?.querySelector('.menu-button');
    menu?.addEventListener('click', () => header.classList.toggle('nav-open'));
  }
  function cartCount() { document.querySelectorAll('[data-cart-count]').forEach(n => n.textContent = Shop.cart().length); }
  document.addEventListener('DOMContentLoaded', () => {
    renderShell(); cartCount();
    document.querySelectorAll('[data-config]').forEach((node) => {
      const value = CONFIG[node.dataset.config]; if (value) node.textContent = value;
    });
    if (document.title.includes('Enfoque de Juego')) document.title = document.title.replace('Enfoque de Juego', CONFIG.NOMBRE_SITIO);
    document.querySelector('meta[name="description"]')?.setAttribute('content', CONFIG.DESCRIPCION_SITIO);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', CONFIG.NOMBRE_SITIO);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', CONFIG.DESCRIPCION_SITIO);
  });
  window.addEventListener('cart:changed', cartCount);
})();
