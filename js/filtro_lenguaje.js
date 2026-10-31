/* filtro_lenguaje.js — PRD alerta A6: citas con lenguaje ofensivo o comentarios sobre la persona no se muestran.
   Solo afecta a las CITAS que se muestran (tarjetas y «Comentarios de ejemplo»); los conteos de aspectos y estrellas
   no cambian. Patrones en inglés, como los comentarios. Categorías activables en CONFIG_FILTRO.
   «stupid» y «dumb» no se filtran: en este corpus se usan casi siempre sin insultar («no question is stupid»).      */
(function (root) {
  'use strict';

  const CATEGORIAS = {
    groserias:  { nombre: 'Groserías', claves: ["\\b(fuck\\w*|f\\*+k\\w*|shit\\w*|bullshit|bitch\\w*|asshole\\w*|bastard\\w*|dick(head)?s?|cunt\\w*|wtf|stfu)\\b"] },
    censurado:  { nombre: 'Groserías censuradas', claves: ["\\w\\*{2,}", "\\*{3,}"] },
    insultos:   { nombre: 'Insultos', claves: ["\\b(idiot\\w*|moron\\w*|imbecile\\w*|retard\\w*|loser\\w*|psycho\\w*|bafoon|buffoon)\\b"] },
    odio:       { nombre: 'Odio o discriminación', claves: ["\\b(fag\\w*|nigg\\w*|spics?|chinks?|tranny|dykes?|kikes?|hitler|nazis?)\\b"] },
    apariencia: { nombre: 'Apariencia o connotación sexual', claves: ["\\b(hot(tie|ness)?|sexy|cute|ugly|fat|whores?|sluts?|boobs?|eye candy|chili ?peppers?|gorgeous|attractive)\\b"] },
    origen:     { nombre: 'Acento u origen', claves: ["\\baccents?\\b", "\\bbroken english\\b", "\\benglish is (not|n'?t) (his|her|their) (first|native)", "\\bforeign(er)?\\b"] }
  };

  const CONFIG_FILTRO = { activas: Object.keys(CATEGORIAS) };

  Object.keys(CATEGORIAS).forEach(function (k) {
    CATEGORIAS[k].rx = CATEGORIAS[k].claves.map(function (c) { return new RegExp(c, 'i'); });
  });

  /* Devuelve la clave de la primera categoría que coincide, o null. */
  function motivoOfensivo(texto, activas) {
    const t = String(texto || '');
    const lista = activas || CONFIG_FILTRO.activas;
    for (let i = 0; i < lista.length; i++) {
      const cat = CATEGORIAS[lista[i]];
      if (cat && cat.rx.some(function (r) { return r.test(t); })) return lista[i];
    }
    return null;
  }

  function esOfensivo(texto, activas) { return motivoOfensivo(texto, activas) !== null; }

  const api = { CATEGORIAS: CATEGORIAS, CONFIG_FILTRO: CONFIG_FILTRO, motivoOfensivo: motivoOfensivo, esOfensivo: esOfensivo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FiltroLenguaje = api;
})(typeof window !== 'undefined' ? window : globalThis);
