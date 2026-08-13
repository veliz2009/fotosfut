/*
 * CONFIGURACIÓN FÁCIL DEL SITIO
 *
 * Este archivo concentra los textos y datos de contacto que normalmente vas
 * a querer personalizar. Las claves "anon" de Supabase son públicas por
 * diseño: la seguridad real está en las políticas de supabase/schema.sql.
 */
window.CONFIG = {
  NOMBRE_SITIO: 'Enfoque de Juego',
  DESCRIPCION_SITIO: 'Fotografía deportiva profesional. Encontrá las fotos de tu partido.',
  TITULO_PRINCIPAL: 'Reviví cada momento del partido',
  SUBTITULO: 'Encontrá las mejores fotografías de tu club, tu equipo y tu gente.',
  // REEMPLAZAR por tu WhatsApp real. Ejemplo Argentina: 5491123456789.
  // Sin +, espacios, guiones ni el 15.
  WHATSAPP: '5491168472009',
  EMAIL: 'agustinveluz5@.com',
  INSTAGRAM: '@agustin__veliz',
  INSTAGRAM_URL: 'https://instagram.com/agustin__veliz',
  LOGO_TEXTO: 'EJ',
  MARCA_DE_AGUA: {
    texto: 'ENFOQUE DE JUEGO',
    posicion: 'center', // center, bottom-right, bottom-left, top-right, top-left
    tamano: 0.045, // Proporción del ancho de la previsualización.
    opacidad: 0.45
  },
  // Usá solamente la Project URL. No agregues /rest/v1/ al final.
  SUPABASE_URL: 'https://bumbixxljkitjtkygyjb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_YMA6410KHqfrHW9WsE6khw_8vgVwR_S'
};

/*
 * PRECIOS GENERALES DE RESPALDO. La fuente de verdad en producción son los
 * precios de cada foto en Supabase. Estos valores se usan al cargar fotos si
 * todavía no se definió un precio para ese evento.
 */
window.PRECIOS = {
  FOTO_INDIVIDUAL: 1500,
  PACK_5_FOTOS: 5000,
  PACK_10_FOTOS: 10000
};
