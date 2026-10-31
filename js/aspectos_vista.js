/* aspectos_vista.js — PRD módulo IA §9.3. Devuelve HTML (string) para la franja "Lo que funciona / Qué conviene mejorar".
   Usa las mismas clases Tailwind y tokens (theme-forest, ambar, hairline, surface-1, ink-muted) que profesor.js.
   Uso:  AspectosVista.htmlFranjaAspectos(rep.aspectos) || htmlFranjaNlp()
   Devuelve null en estado 'sin_modelo' para que se muestren los recuadros fantasma de siempre.                  */
(function (root) {
  'use strict';

  // Los comentarios vienen de un sitio público: TODO texto de usuario pasa por escHtml (evita XSS).
  // Nombre propio (no `esc`) para no chocar con la constante global de profesor.js.
  const escHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const pct = function (v, total) { return total > 0 ? Math.max(0, Math.min(100, (Number(v) / total) * 100)).toFixed(1) : '0'; };
  const plural = function (n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); };

  function tarjeta(c, tipo) {
    const esF = tipo === 'fortaleza';
    const neutras = c.n_menciones - c.n_pos - c.n_neg;
    const barra =
      '<div class="flex h-2 w-full overflow-hidden rounded-full bg-hairline" role="img" aria-label="' +
        plural(c.n_pos, 'positiva', 'positivas') + ', ' + plural(c.n_neg, 'negativa', 'negativas') + ', ' + plural(neutras, 'neutra', 'neutras') + '">' +
        '<div class="bg-theme-forest" style="width:' + pct(c.n_pos, c.n_menciones) + '%"></div>' +
        '<div class="bg-ambar" style="width:' + pct(c.n_neg, c.n_menciones) + '%"></div></div>';
    const cita = c.cita
      ? '<figure class="mt-3"><blockquote class="text-sm leading-relaxed">“' + escHtml(c.cita.texto) + '”</blockquote>' +
        '<figcaption class="text-xs text-ink-muted mt-1">' +
          (c.cita.estrellas != null ? Number(c.cita.estrellas).toFixed(1) + ' de 5' : '') +
          (c.cita.fecha ? ' · ' + escHtml(c.cita.fecha) : '') + '</figcaption></figure>'
      : '';
    const diag = (!esF && c.subtema)
      ? '<p class="mt-3 text-sm"><span class="font-semibold">Diagnóstico:</span> ' + escHtml(c.subtema) +
        (c.diagnostico_n ? ' <span class="text-xs text-ink-muted">(' + c.diagnostico_n.coinciden + ' de ' +
          plural(c.diagnostico_n.total, 'mención negativa', 'menciones negativas') + ')</span>' : '') + '</p>' : '';
    const accion = (!esF && c.accion)
      ? '<p class="' + (diag ? 'mt-1' : 'mt-3') + ' text-sm"><span class="font-semibold">Acción sugerida:</span> ' + escHtml(c.accion) + '</p>' : '';
    return '<article class="rounded-2xl border border-hairline bg-surface-1/40 p-4 mb-3 border-l-4 ' + (esF ? 'border-l-theme-forest' : 'border-l-ambar') + '">' +
      '<div class="flex items-baseline justify-between gap-3"><h3 class="font-semibold">' + escHtml(c.aspecto) + '</h3>' +
      '<span class="text-xs text-ink-muted whitespace-nowrap">' + c.n_pos + ' pos · ' + c.n_neg + ' neg · ' + plural(c.n_menciones, 'mención', 'menciones') + '</span></div>' +
      '<div class="mt-2">' + barra + '</div>' + cita + diag + accion + '</article>';
  }

  function seccion(titulo, color, subtitulo, items, tipo, vacio) {
    return '<section class="rounded-[40px] border border-hairline p-8">' +
      '<h2 class="font-display text-3xl ' + color + '">' + titulo + '</h2>' +
      '<p class="text-sm text-ink-muted mt-1 mb-5">' + subtitulo + '</p>' +
      (items.length ? items.map(function (c) { return tarjeta(c, tipo); }).join('')
                    : '<p class="text-sm text-ink-muted rounded-2xl border border-dashed border-hairline p-4">' + vacio + '</p>') +
      '</section>';
  }

  function htmlFranjaAspectos(res) {
    if (!res || res.estado === 'sin_modelo') return null;
    const umbral = res.umbral;
    const vacio = 'Ningún aspecto reúne evidencia suficiente en este periodo (se requieren al menos ' + umbral + ' menciones).';
    const insignia = res.insignia
      ? '<p class="mb-3"><span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-ambar/15 text-ambar">' + escHtml(res.insignia) + '</span></p>' : '';
    return '<div class="mb-8">' + insignia +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        seccion('Lo que funciona', 'text-theme-forest', 'Aspectos que los alumnos mencionan con más frecuencia de forma positiva.', res.fortalezas, 'fortaleza', vacio) +
        seccion('Qué conviene mejorar', 'text-ambar', 'Aspectos mencionados con más frecuencia de forma negativa, con una cita real y una acción sugerida.', res.oportunidades, 'oportunidad',
                'No hay áreas de mejora con evidencia suficiente en este periodo (se requieren al menos ' + umbral + ' menciones con predominio negativo).') +
      '</div>' +
      '<p class="text-xs text-ink-muted mt-3">Los aspectos salen del texto de los comentarios, no de las estrellas. Citas en inglés, tal como las escribió el alumno. ' +
      'Esto no es un dictamen laboral.</p></div>';
  }

  const api = { htmlFranjaAspectos: htmlFranjaAspectos, escHtml: escHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AspectosVista = api;
})(typeof window !== 'undefined' ? window : globalThis);
