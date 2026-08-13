(function () {
  const host = () => document.querySelector('#cart-items');
  function render() {
    const items = Shop.cart(); const button = document.querySelector('#send-order');
    host().innerHTML = items.length ? items.map(item => `<article class="cart-item">${UI.image(item.preview_path, `Foto ${item.photo_code}`)}<div class="cart-item-info"><b>${item.event_name}${item.opponent ? ` vs ${item.opponent}` : ''}</b><span>${item.photo_code || item.file_name}</span></div><strong class="cart-item-price">${Shop.money(item.price_ars)}</strong><button class="icon-button" data-remove="${item.id}" aria-label="Quitar foto">×</button></article>`).join('') : UI.empty('Tu carrito está vacío. Elegí un evento para encontrar tus fotos.');
    document.querySelector('#summary-quantity').textContent = items.length; document.querySelector('#summary-total').textContent = Shop.money(Shop.total()); document.querySelector('#clear-cart').hidden = !items.length; button.disabled = !items.length;
  }
  document.addEventListener('DOMContentLoaded', () => {
    render(); host().addEventListener('click', (e) => { const b = e.target.closest('[data-remove]'); if (b) { Shop.remove(b.dataset.remove); render(); } });
    document.querySelector('#clear-cart').addEventListener('click', () => { if (confirm('¿Querés vaciar el carrito?')) { Shop.clear(); render(); } });
    document.querySelector('#send-order').addEventListener('click', async (e) => {
      const items = Shop.cart(); if (!items.length) return;
      const phone = String(CONFIG.WHATSAPP || '').replace(/\D/g, '');
      if (/[Xx]/.test(String(CONFIG.WHATSAPP || '')) || phone.length < 10 || /^0+$/.test(phone)) {
        UI.toast('Falta configurar el WhatsApp real del fotógrafo en js/config.js.');
        return;
      }
      if (!AppData.configured()) { UI.toast('Falta conectar Supabase antes de enviar pedidos.'); return; }
      const button = e.currentTarget;
      // Se abre en el gesto del usuario para evitar que los bloqueadores de popups impidan WhatsApp.
      const whatsappWindow = window.open('', '_blank');
      UI.setLoading(button, true, 'Registrando pedido…');
      try {
        const order = await AppData.createOrder(items.map(x => x.id));
        const grouped = items.reduce((acc, item) => { const title = `${item.event_name}${item.opponent ? ` vs ${item.opponent}` : ''}`; (acc[title] ||= []).push(item.photo_code || item.file_name); return acc; }, {});
        const lines = Object.entries(grouped).flatMap(([title, codes]) => [`Evento: ${title}`, `Fotografías: ${codes.join(', ')}`, '']);
        const message = `Hola, quiero comprar estas fotografías:%0A%0A${encodeURIComponent(lines.join('\n'))}%0ATotal: ${encodeURIComponent(Shop.money(Shop.total()))}%0APedido: ${order.order_number || order}`;
        Shop.clear(); render(); const target = `https://wa.me/${CONFIG.WHATSAPP}?text=${message}`;
        if (whatsappWindow) { whatsappWindow.opener = null; whatsappWindow.location.replace(target); } else location.assign(target);
        UI.toast('Pedido registrado. Abrimos WhatsApp para enviarlo.', 'success');
      } catch (error) {
        whatsappWindow?.close();
        const message = error.message || '';
        UI.toast(message.includes('create_customer_order') ? 'Falta ejecutar la migración del checkout en Supabase. Abrí supabase/migration_checkout_whatsapp.sql y ejecutala en SQL Editor.' : (message || 'No pudimos registrar el pedido. Intentá nuevamente.'));
        console.error(error);
      }
      finally { UI.setLoading(button, false); }
    });
  });
})();
