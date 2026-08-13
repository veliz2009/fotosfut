# Enfoque de Juego

Una plataforma estática, rápida y profesional para publicar y vender fotografías de fútbol. El visitante elige un club, entra al partido, selecciona fotos y envía el pedido por WhatsApp. El administrador gestiona todo desde `admin.html`, sin tocar el código diario.

## Arquitectura elegida

La web usa **HTML, CSS y JavaScript sin framework**, desplegados en **Cloudflare Pages**, y **Supabase** para la base de datos, usuarios y fotografías. Es la opción más simple para este caso:

- No hay servidor propio, PHP ni mantenimiento de backend.
- Cloudflare Pages entrega el sitio estático de forma global, con HTTPS y solicitudes estáticas gratuitas; es más apropiado para una web comercial que GitHub Pages, cuya política no permite usar Pages como hosting de e-commerce.
- Supabase reúne la base de datos, el acceso al panel y el almacenamiento de imágenes en una sola cuenta.
- Los archivos originales se guardan en un bucket **privado**. Las imágenes que ve el público son previews WebP reducidas con marca de agua en un bucket público.
- La clave anónima de Supabase que figura en el frontend es pública por diseño. Los permisos reales están en las reglas RLS de la base y de Storage; nunca se usa una `service_role` en el navegador.

## Límites gratuitos que importan

Al momento de preparar este proyecto, Supabase Free incluye 1 GB de Storage, 500 MB de base de datos, 5 GB de egreso y 5 GB de egreso cacheado; los proyectos gratuitos se pausan después de una semana sin actividad y el máximo de archivo es 50 MB. Consultá siempre la [página oficial de precios de Supabase](https://supabase.com/pricing), ya que las cuotas pueden cambiar.

Cloudflare Pages Free permite hasta 500 despliegues por mes, 20.000 archivos por sitio y 25 MiB por archivo; sus solicitudes a archivos estáticos son gratuitas e ilimitadas según la [documentación oficial de Pages](https://developers.cloudflare.com/pages/platform/limits/) y [precios](https://developers.cloudflare.com/pages/functions/pricing/). Como las fotos se almacenan en Supabase, el límite de archivos de Pages no afecta a las galerías.

Cuándo podrías necesitar pagar: si superás el almacenamiento o transferencia de previews/originales en Supabase, necesitás archivos individuales mayores de 50 MB, o requerís que el proyecto no se pause. El primer paso de crecimiento más simple es Supabase Pro; más adelante se puede migrar sólo el almacenamiento de originales a Cloudflare R2 sin rehacer la web.

## Estructura del proyecto

```text
index.html              Página principal
clubes.html             Directorio de clubes
eventos.html            Buscador y listado de eventos
galeria.html            Galería paginada y visor
carrito.html            Carrito y checkout por WhatsApp
admin.html              Panel protegido
css/                    Diseño público, responsive y panel
js/config.js            Textos, contacto, marca de agua y Supabase
js/api.js               Operaciones ordenadas con Supabase
js/admin.js             Administración y carga masiva
supabase/schema.sql     Base de datos y reglas de seguridad
_headers                Cabeceras de seguridad para Cloudflare Pages
```

## Instalación, paso a paso

### 1. Programas y cuentas

Necesitás únicamente:

1. Una cuenta gratuita en [Supabase](https://supabase.com/).
2. Una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up).
3. Una cuenta gratuita de GitHub (recomendada para publicar actualizaciones) o la opción de carga directa de Cloudflare.
4. Un editor de texto. [Visual Studio Code](https://code.visualstudio.com/) es una buena opción, pero no es obligatorio.

### 2. Crear el proyecto en Supabase

1. En Supabase, elegí **New project**.
2. Escribí un nombre, una contraseña de base de datos segura (guardala en un lugar privado) y una región cercana.
3. Esperá a que el proyecto termine de crearse.
4. Abrí **SQL Editor** → **New query**.
5. Abrí el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto, copiá todo su contenido, pegalo en el editor y presioná **Run**.

Esto crea las tablas `clubs`, `events`, `photos`, `orders` y `order_items`; activa las reglas de seguridad; y crea los buckets `previews` y `originals`.

Si ya habías ejecutado este proyecto antes de la simplificación del checkout, ejecutá una sola vez [migration_checkout_whatsapp.sql](supabase/migration_checkout_whatsapp.sql) en el mismo SQL Editor.

### 3. Crear el administrador

1. En Supabase abrí **Authentication** → **Users** → **Add user**.
2. Creá tu usuario con email y una contraseña fuerte. No compartas esa contraseña.
3. Volvé a **SQL Editor** y ejecutá, reemplazando el email:

```sql
update public.profiles set role = 'admin' where email = 'tu-email@ejemplo.com';
```

4. En **Authentication** → **Providers** → **Email**, dejá activado Email. Para el primer administrador creado manualmente no se necesita una pantalla de registro pública.

### 4. Conectar la página con Supabase

1. En Supabase, abrí **Project Settings** → **API**.
2. Copiá `Project URL` y la clave `anon`/`publishable` pública.
3. Abrí [`js/config.js`](js/config.js).
4. Reemplazá solamente estos valores:

```js
SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
SUPABASE_ANON_KEY: 'TU_CLAVE_ANON_O_PUBLISHABLE'
```

No pegues `service_role`, `secret key`, la contraseña de la base ni ningún token administrativo en este archivo.

### 5. Probar la web en tu computadora

Podés abrir `index.html` con doble clic para mirar el diseño. Para probar correctamente la navegación y Supabase usá un servidor local:

1. Si tenés Python instalado, abrí una terminal en la carpeta del proyecto y ejecutá `python -m http.server 8000`.
2. Abrí `http://localhost:8000` en el navegador.
3. Entrá en `http://localhost:8000/admin.html` e iniciá sesión.

Como alternativa, en VS Code instalá la extensión **Live Server**, hacé clic derecho en `index.html` y elegí “Open with Live Server”.

### 6. Cargar contenido desde el panel

1. Entrá a `admin.html` e iniciá sesión.
2. En **Clubes**, creá cada club. Podés cargar un logo y una portada.
3. En **Eventos**, elegí el club, completá fecha, rival y precio inicial por foto.
4. En **Subir fotos**, seleccioná el evento, elegí el precio y seleccioná muchas fotografías a la vez.
5. Esperá a que todas indiquen **Listo**. El panel procesa tres archivos simultáneamente para mantener la carga estable.
6. En **Fotos**, podés seleccionar muchas imágenes y publicar, ocultar, cambiar el precio o eliminar de una sola vez.

Al eliminar una foto desde el panel se borran también su preview y su original. Antes de borrar, el sistema pide confirmación.

### 7. Publicar gratis en Cloudflare Pages

La forma recomendada es GitHub porque cada actualización publicada queda guardada.

1. Creá un repositorio vacío en GitHub (por ejemplo `enfoque-de-juego`). No subas fotos al repositorio.
2. Subí todos los archivos de esta carpeta al repositorio.
3. En Cloudflare, abrí **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
4. Elegí el repositorio.
5. Como no usamos framework, indicá:
   - **Framework preset:** `None`
   - **Build command:** dejar vacío
   - **Build output directory:** `/`
6. Presioná **Save and Deploy**.
7. Cloudflare mostrará una URL con formato `https://tu-proyecto.pages.dev`. Esa es la dirección pública.

También podés usar **Direct Upload** en Cloudflare Pages para subir la carpeta; para actualizaciones frecuentes, GitHub es más práctico.

### 8. Autorizar la dirección pública en Supabase

Después del primer despliegue, en Supabase abrí **Authentication** → **URL Configuration**:

1. En **Site URL**, pegá la dirección `https://tu-proyecto.pages.dev`.
2. En **Redirect URLs**, agregá esa misma dirección y, si usás dominio propio, agregalo también.
3. Guardá los cambios.

## Uso diario

### Crear una cobertura

1. Entrá a `/admin.html`.
2. Creá o elegí el club.
3. Creá el evento con fecha y precio inicial.
4. Abrí **Subir fotos**, seleccioná el evento y elegí todas las imágenes.
5. Publicá. Los visitantes ya podrán encontrarlas por club o búsqueda.

### Gestionar pedidos

El checkout registra las fotos y el total en Supabase **antes** de abrir WhatsApp. No solicita nombre, teléfono ni email: el número del comprador ya aparece cuando te escribe por WhatsApp. En el panel, **Pedidos** muestra la selección y el total; cambiá el estado a Nuevo, Contactado, Pagado, Entregado o Cancelado.

El pago real todavía no está integrado intencionalmente: esta primera versión evita manejar tarjetas o credenciales de pago. Para Mercado Pago más adelante, se agrega una Edge Function de Supabase que cree la preferencia de pago y, mediante webhook, marque el pedido pagado y entregue URLs temporales de los originales.

## Seguridad de las fotografías

- `previews` es público sólo para mostrar versiones reducidas con marca de agua.
- `originals` es privado. Las políticas de Storage sólo permiten a un perfil `admin` subir, ver o borrar archivos de ese bucket.
- Los originales no se incluyen en la galería, en el carrito ni en el HTML público.
- El panel genera una preview WebP de hasta 1600 px con la marca configurada antes de subirla.
- La función de pedidos recalcula precios y verifica la disponibilidad en Supabase: el total que envía un navegador no es confiable ni se usa.
- Las reglas RLS evitan que visitantes creen clubes, eventos, fotos o cambien precios, incluso si intentan llamar a la API directamente.

La marca de agua disuade el uso indebido, pero ninguna imagen que se muestra en un navegador puede tener protección absoluta contra capturas de pantalla. Por eso la preview es una versión reducida y no el original.

## ¿QUÉ PUEDO MODIFICAR?

| Quiero cambiar | Dónde hacerlo |
| --- | --- |
| Nombre, subtítulo y descripción del sitio | `js/config.js` (`NOMBRE_SITIO`, `TITULO_PRINCIPAL`, `SUBTITULO`, `DESCRIPCION_SITIO`) |
| WhatsApp, email e Instagram | `js/config.js` |
| Texto del logo | `js/config.js` (`LOGO_TEXTO`) |
| Logos y portadas de clubes/eventos | Panel → Clubes / Eventos |
| Clubes, eventos y textos de las coberturas | Panel → Clubes / Eventos |
| Fotos, visibilidad y precio individual | Panel → Fotos |
| Precio inicial de una cobertura | Panel → Eventos |
| Precios generales de respaldo | `js/config.js`, bloque `PRECIOS` |
| Marca de agua: texto, posición, tamaño, opacidad | `js/config.js`, bloque `MARCA_DE_AGUA` |
| Colores de todo el diseño | `css/style.css`, bloque `:root` al comienzo |
| Diseño profundo | Archivos dentro de `css/` y `js/` |

Los precios de las fotos cargadas tienen prioridad sobre `PRECIOS`: la fuente de verdad para una compra es `photos.price_ars` en Supabase. El valor del evento sirve para definir el precio inicial de las nuevas cargas, y el bloque `PRECIOS` es un respaldo fácil de encontrar.

## Actualizar la página

1. Cambiá lo que necesites, ya sea desde el panel (contenido) o en el archivo indicado arriba (diseño/configuración).
2. Si usás GitHub, confirmá/subí los cambios al repositorio. Cloudflare desplegará automáticamente en pocos minutos.
3. Si usás Direct Upload, creá un nuevo despliegue desde Cloudflare y subí la carpeta actualizada.

Para cambios de contenido hechos en el panel no hay que desplegar nada: aparecen directamente porque están guardados en Supabase.
