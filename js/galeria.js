// ===========================================================
// Galería pública — selección de fotos, animaciones y envío del pedido
// Las fotos se obtienen de las funciones de Netlify (/api/listar y /api/foto)
// ===========================================================

document.getElementById('statPrecio').textContent = '$' + PRECIO_FOTO;
document.getElementById('precioTexto').textContent = '$' + PRECIO_FOTO;

const galeria = document.getElementById('galeria');
const cantidadSeleccionSpan = document.getElementById('cantidadSeleccion');
const totalPagoSpan = document.getElementById('totalPago');
const btnEnviar = document.getElementById('btnEnviar');
const statTotalFotos = document.getElementById('statTotalFotos');
const ticket = document.querySelector('.ticket');
const nav = document.querySelector('.nav');
const visorFotos = document.getElementById('visorFotos');
const visorContenido = document.getElementById('visorContenido');
const visorImagen = document.getElementById('visorImagen');
const visorContador = document.getElementById('visorContador');
const visorNombre = document.getElementById('visorNombre');
const btnCerrarVisor = document.getElementById('btnCerrarVisor');
const btnFotoAnterior = document.getElementById('btnFotoAnterior');
const btnFotoSiguiente = document.getElementById('btnFotoSiguiente');
const btnSeleccionarVisor = document.getElementById('btnSeleccionarVisor');

let fotosActuales = [];
let indiceFotoActiva = 0;
let activadorVisor = null;

const iconoCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="#0E2A1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caracter]));
}

// ---------- Barra de navegación: cambia de estilo al hacer scroll ----------
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ---------- Revelado de secciones al hacer scroll ----------
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada) => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('is-visible');
      observador.unobserve(entrada.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => observador.observe(el));

// ---------- Carga la lista de fotos publicadas por el administrador ----------
fetch('/api/listar?_=' + Date.now())
  .then((res) => res.json())
  .then((lista) => dibujarGaleria(lista))
  .catch(() => {
    galeria.innerHTML = '<p class="vacio">Aún no hay fotos disponibles. Volvé a intentarlo más tarde.</p>';
    statTotalFotos.textContent = '0';
  });

function dibujarGaleria(fotos) {
  animarConteo(statTotalFotos, fotos ? fotos.length : 0);

  if (!fotos || fotos.length === 0) {
    galeria.innerHTML = '<p class="vacio">Aún no hay fotos disponibles. Volvé a intentarlo más tarde.</p>';
    return;
  }

  fotosActuales = fotos;
  galeria.innerHTML = '';

  fotos.forEach((nombreArchivo, indice) => {
    const card = document.createElement('div');
    const nombreSeguro = escaparHTML(nombreArchivo);
    card.className = 'foto-card';
    card.style.animationDelay = Math.min(indice * 0.05, 0.6) + 's';

    card.innerHTML = `
      <button class="abrir-visor" type="button" aria-label="Ver foto ${indice + 1}">
        <img src="/api/foto?nombre=${encodeURIComponent(nombreArchivo)}" alt="Foto del partido" loading="lazy">
      </button>
      <button class="marca-check" type="button" aria-label="Seleccionar ${nombreSeguro}" aria-pressed="false">${iconoCheck}</button>
      <span class="precio-tag">$${PRECIO_FOTO}</span>
    `;

    card.dataset.nombre = nombreArchivo;
    card.dataset.indice = indice;

    card.querySelector('.abrir-visor').addEventListener('click', (evento) => abrirVisor(indice, evento.currentTarget));
    card.querySelector('.marca-check').addEventListener('click', () => alternarSeleccion(card));

    galeria.appendChild(card);
  });
}

// Anima un número contando de 0 hasta el valor final (efecto marcador de estadio)
function animarConteo(elemento, valorFinal) {
  const duracion = 700;
  const inicio = performance.now();

  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    elemento.textContent = Math.round(progreso * valorFinal);
    if (progreso < 1) requestAnimationFrame(paso);
  }

  requestAnimationFrame(paso);
}

function alternarSeleccion(card) {
  const yaSeleccionada = card.classList.toggle('selected');
  const botonSeleccion = card.querySelector('.marca-check');
  const nombre = card.dataset.nombre;

  botonSeleccion.setAttribute('aria-pressed', yaSeleccionada ? 'true' : 'false');
  botonSeleccion.setAttribute('aria-label', `${yaSeleccionada ? 'Quitar de la selección' : 'Seleccionar'} ${nombre}`);
  calcularTotal();
  actualizarBotonVisor();
}

function abrirVisor(indice, activador) {
  if (!fotosActuales.length) return;

  activadorVisor = activador || document.activeElement;
  visorFotos.setAttribute('aria-hidden', 'false');
  document.body.classList.add('visor-abierto');
  mostrarFoto(indice);
  btnCerrarVisor.focus();
}

function cerrarVisor() {
  visorFotos.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('visor-abierto');

  if (activadorVisor && typeof activadorVisor.focus === 'function') {
    activadorVisor.focus();
  }
}

function mostrarFoto(indice) {
  const totalFotos = fotosActuales.length;
  if (!totalFotos) return;

  indiceFotoActiva = (indice + totalFotos) % totalFotos;
  const nombreArchivo = fotosActuales[indiceFotoActiva];

  visorImagen.src = '/api/foto?nombre=' + encodeURIComponent(nombreArchivo);
  visorImagen.alt = 'Vista previa de ' + nombreArchivo;
  visorContador.textContent = `Foto ${indiceFotoActiva + 1} de ${totalFotos}`;
  visorNombre.textContent = nombreArchivo;
  btnFotoAnterior.disabled = totalFotos === 1;
  btnFotoSiguiente.disabled = totalFotos === 1;
  actualizarBotonVisor();
}

function moverVisor(direccion) {
  mostrarFoto(indiceFotoActiva + direccion);
}

function actualizarBotonVisor() {
  if (!visorFotos || visorFotos.getAttribute('aria-hidden') === 'true') return;

  const card = galeria.querySelector(`[data-indice="${indiceFotoActiva}"]`);
  const seleccionada = card && card.classList.contains('selected');

  btnSeleccionarVisor.textContent = seleccionada ? 'Quitar de la selección' : 'Seleccionar foto';
  btnSeleccionarVisor.setAttribute('aria-pressed', seleccionada ? 'true' : 'false');
}

btnCerrarVisor.addEventListener('click', cerrarVisor);
btnFotoAnterior.addEventListener('click', () => moverVisor(-1));
btnFotoSiguiente.addEventListener('click', () => moverVisor(1));
btnSeleccionarVisor.addEventListener('click', () => {
  const card = galeria.querySelector(`[data-indice="${indiceFotoActiva}"]`);
  if (card) alternarSeleccion(card);
});

visorFotos.addEventListener('click', (evento) => {
  if (evento.target === visorFotos) cerrarVisor();
});

window.addEventListener('keydown', (evento) => {
  if (visorFotos.getAttribute('aria-hidden') === 'true') return;

  if (evento.key === 'Escape') {
    evento.preventDefault();
    cerrarVisor();
  }
  if (evento.key === 'ArrowLeft') {
    evento.preventDefault();
    moverVisor(-1);
  }
  if (evento.key === 'ArrowRight') {
    evento.preventDefault();
    moverVisor(1);
  }
});

let inicioDeslizamientoX = 0;
let inicioDeslizamientoY = 0;

visorContenido.addEventListener('touchstart', (evento) => {
  const toque = evento.changedTouches[0];
  inicioDeslizamientoX = toque.clientX;
  inicioDeslizamientoY = toque.clientY;
}, { passive: true });

visorContenido.addEventListener('touchend', (evento) => {
  const toque = evento.changedTouches[0];
  const distanciaX = toque.clientX - inicioDeslizamientoX;
  const distanciaY = toque.clientY - inicioDeslizamientoY;

  if (Math.abs(distanciaX) < 45 || Math.abs(distanciaX) <= Math.abs(distanciaY)) return;
  moverVisor(distanciaX < 0 ? 1 : -1);
}, { passive: true });

function calcularTotal() {
  const seleccionadas = document.querySelectorAll('#galeria .foto-card.selected');
  const cantidad = seleccionadas.length;
  const total = cantidad * PRECIO_FOTO;

  cantidadSeleccionSpan.textContent = cantidad;
  totalPagoSpan.textContent = total.toFixed(2);
  btnEnviar.disabled = cantidad === 0;

  if (ticket) ticket.classList.toggle('visible', cantidad > 0);
}

btnEnviar.addEventListener('click', () => {
  const seleccionadas = document.querySelectorAll('#galeria .foto-card.selected');
  if (seleccionadas.length === 0) return;

  const nombresSeleccionados = Array.from(seleccionadas).map((c) => c.dataset.nombre);
  const total = (nombresSeleccionados.length * PRECIO_FOTO).toFixed(2);

  const mensaje = [
    'Hola, quiero comprar las siguientes fotos del partido:',
    '',
    ...nombresSeleccionados.map((nombre, i) => `${i + 1}. ${nombre} - $${PRECIO_FOTO}`),
    '',
    `Total a pagar: $${total}`
  ].join('\n');

  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
});
