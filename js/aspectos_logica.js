/* aspectos_logica.js — PRD módulo IA §9.2. Función PURA: no toca el DOM ni la red.
   Pegar en reporte.js (o cargar como <script> antes de profesor.js).

   calcularAspectos(reviews, aspectos, modelo, cfg)
     reviews  : reviews del profesor DENTRO del filtro de fechas vigente
                (review_id, comentario, post_date, student_star, help_useful)
     aspectos : filas de review_aspecto del profesor para la versión activa (SIN filtrar por fecha;
                aquí se cruzan con `reviews`). Vacío/undefined => estado 'sin_modelo'.
     modelo   : fila de modelo_version activa {version_modelo, estado, f1_micro, f1_por_aspecto} o null
     cfg      : sobreescribe CONFIG_ASPECTOS (opcional)                                                  */
(function (root) {
  'use strict';

  const CONFIG_ASPECTOS = {
    MIN_MENCIONES: 3,        // hipótesis de producto, configurable
    MIN_PCT_MENCIONES: 0.20, // hipótesis de producto, configurable
    TOP_N: 3,
    F1_MIN_VISIBLE: 0.60,    // respaldo (M3.3) solo si el modelo no trae precisión por signo
    PREC_MIN_VISIBLE: 0.60,  // compuerta C (I1.5 v1.5): acierto mínimo cuando el modelo marca ese signo
    N_MIN_PREC: 10,          // predicciones mínimas de ese signo en la evaluación para confiar en la precisión
    MIN_N_DIRECCION: 1,      // menciones pos (fortaleza) / neg (oportunidad) mínimas. 1 = regla literal del PRD; 2 exige que no dependa de una sola mención
    MAX_CITA: 280,
    MIN_CITA: 40
  };

  // Mismo criterio que absa_baseline.py: vacío y "No Comments" no cuentan como texto real.
  const PLACEHOLDERS = ['no comments', 'no comment', 'n/a', 'na'];
  function esTextoValido(c) {
    if (typeof c !== 'string' || c.trim() === '') return false;
    return !PLACEHOLDERS.includes(c.trim().replace(/^[.! ]+|[.! ]+$/g, '').toLowerCase());
  }

  function getCatalogo() {
    if (root.Catalogo) return root.Catalogo;
    if (typeof require !== 'undefined') return require('./catalogo.js');
    return { accionPara: function () { return null; } };
  }

  // f1_por_aspecto puede venir como objeto, como texto JSON (modo CSV local) y con forma
  // {aspecto: número} o {aspecto: {f1_det, f1_pol, n_gold}} (lo que escribe `registrar`).
  function f1DeAspecto(modelo, aspecto) {
    if (!modelo || modelo.f1_por_aspecto == null) return null;
    let m = modelo.f1_por_aspecto;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return null; } }
    const v = m[aspecto];
    if (v == null) return null;
    const n = typeof v === 'number' ? v : (v.f1_pol != null ? v.f1_pol : v.f1_det);
    return Number.isFinite(n) ? n : null;
  }

  // Métricas por aspecto de modelo_version (objeto o texto JSON). Devuelve el objeto del aspecto o null.
  function metricasDeAspecto(modelo, aspecto) {
    if (!modelo || modelo.f1_por_aspecto == null) return null;
    let m = modelo.f1_por_aspecto;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return null; } }
    const v = m[aspecto];
    return (v != null && typeof v === 'object') ? v : null;
  }

  /* Compuerta de las tarjetas (I1.5 v1.5, compuerta C): una fortaleza se muestra si el modelo acierta al menos
     PREC_MIN_VISIBLE de las veces que marca ese aspecto como positivo (con N_MIN_PREC predicciones o más); una
     oportunidad, lo mismo con el negativo. Si el modelo no trae precisión por signo, se usa el piso de F1 anterior.
     Sin métricas (modelo sin medir) no se filtra. */
  function tarjetaPermitida(modelo, aspecto, tipo, cfg) {
    const m = metricasDeAspecto(modelo, aspecto);
    const clave = tipo === 'fortaleza' ? 'pos' : 'neg';
    if (m && ('prec_' + clave) in m) {
      const p = m['prec_' + clave], n = m['n_pred_' + clave] || 0;
      return Number.isFinite(p) && n >= cfg.N_MIN_PREC && p >= cfg.PREC_MIN_VISIBLE;
    }
    const f1 = f1DeAspecto(modelo, aspecto);
    return f1 == null || f1 >= cfg.F1_MIN_VISIBLE;
  }

  function elegirCita(aspecto, polaridad, filas, porId, cfg, filtro) {
    let cand = filas
      .filter(function (a) { return a.aspecto === aspecto && a.polaridad === polaridad && a.evidencia; })
      .map(function (a) { return { ev: a.evidencia, r: porId.get(a.review_id) }; });
    if (filtro) {                                              // cita que respalda el diagnóstico, si la hay
      const conDiag = cand.filter(function (c) { return filtro(c.ev); });
      if (conDiag.length) cand = conDiag;
    }
    const enRango = cand.filter(function (c) { return c.ev.length >= cfg.MIN_CITA && c.ev.length <= cfg.MAX_CITA; });
    if (enRango.length) cand = enRango;                        // I1.6: longitud 40–280 si existe
    cand.sort(function (x, y) {
      return ((y.r.help_useful > 0) - (x.r.help_useful > 0))   // 1º help_useful > 0
          || String(y.r.post_date || '').localeCompare(String(x.r.post_date || ''))  // 2º más reciente
          || (x.r.review_id - y.r.review_id);                  // desempate estable
    });
    const c = cand[0];
    return c ? { texto: c.ev, fecha: c.r.post_date || null, estrellas: c.r.student_star != null ? c.r.student_star : null } : null;
  }

  function calcularAspectos(reviews, aspectos, modelo, cfg) {
    cfg = Object.assign({}, CONFIG_ASPECTOS, cfg || {});
    const catalogo = getCatalogo();
    reviews = reviews || [];
    const porId = new Map(reviews.map(function (r) { return [r.review_id, r]; }));
    const nTexto = reviews.filter(function (r) { return esTextoValido(r.comentario); }).length;

    const vacio = { estado: 'sin_modelo', fortalezas: [], oportunidades: [], detalle: [], umbral: null,
                    insignia: null, cobertura: { con_aspecto: 0, con_texto: nTexto, analizados: null } };
    if (!aspectos || aspectos.length === 0) return vacio;      // 9.3 «Sin modelo»

    const filas = aspectos.filter(function (a) { return porId.has(a.review_id); });
    const umbral = Math.max(cfg.MIN_MENCIONES, Math.ceil(cfg.MIN_PCT_MENCIONES * nTexto - 1e-9)); // I1.2 (epsilon: 0.2*15 = 3.0000000000000004)

    const acum = new Map();
    filas.forEach(function (a) {
      const x = acum.get(a.aspecto) || { aspecto: a.aspecto, n_menciones: 0, n_pos: 0, n_neg: 0 };
      x.n_menciones++;                                          // I1.1: todas las polaridades
      if (a.polaridad === 'positivo') x.n_pos++;
      else if (a.polaridad === 'negativo') x.n_neg++;           // mixto_neutro no suma a pos/neg
      acum.set(a.aspecto, x);
    });

    const detalle = [];
    const fort = [], opor = [];
    acum.forEach(function (x) {
      const f1 = f1DeAspecto(modelo, x.aspecto);
      const cumple = x.n_menciones >= umbral;
      const tipo = !cumple ? null
        : (x.n_pos >= x.n_neg && x.n_pos >= cfg.MIN_N_DIRECCION) ? 'fortaleza'   // I1.3
        : (x.n_neg > x.n_pos && x.n_neg >= cfg.MIN_N_DIRECCION) ? 'oportunidad' : null; // todo neutro => ninguna de las dos
      const visible = tipo ? tarjetaPermitida(modelo, x.aspecto, tipo, cfg) : (f1 == null || f1 >= cfg.F1_MIN_VISIBLE); // I1.5
      const den = x.n_pos + x.n_neg;
      const item = Object.assign({}, x, { f1: f1, cumple_umbral: cumple, clasificacion: tipo, en_top_permitido: visible,
        pct_pos: den ? x.n_pos / den : 0, pct_neg: den ? x.n_neg / den : 0 });
      detalle.push(item);
      if (tipo && visible) (tipo === 'fortaleza' ? fort : opor).push(item);
    });

    const cmp = function (clave) {                              // I1.4
      return function (a, b) { return (b[clave] - a[clave]) || (b.n_menciones - a.n_menciones) || a.aspecto.localeCompare(b.aspecto, 'es'); };
    };
    fort.sort(cmp('n_pos')); opor.sort(cmp('n_neg'));
    detalle.sort(function (a, b) { return a.aspecto.localeCompare(b.aspecto, 'es'); });

    const fortalezas = fort.slice(0, cfg.TOP_N).map(function (x) {
      return Object.assign({}, x, { polaridad_tarjeta: 'positivo', cita: elegirCita(x.aspecto, 'positivo', filas, porId, cfg), accion: null });
    });
    const oportunidades = opor.slice(0, cfg.TOP_N).map(function (x) {
      // I1.7 v1.5: subtema elegido con palabras clave sobre TODAS las citas negativas del aspecto; la cita mostrada
      // respalda ese subtema. Sin catálogo por subtema (catálogo viejo) => acción general.
      const negativas = filas.filter(function (a) { return a.aspecto === x.aspecto && a.polaridad === 'negativo'; })
                             .map(function (a) { return a.evidencia; });
      const d = catalogo.diagnosticar ? catalogo.diagnosticar(x.aspecto, negativas) : null;
      const accion = d ? d.accion : catalogo.accionPara(x.aspecto);
      return Object.assign({}, x, { polaridad_tarjeta: 'negativo',
        cita: elegirCita(x.aspecto, 'negativo', filas, porId, cfg, d && d.coincide),
        accion: accion, subtema: d ? d.subtema : null, accion_id: d ? d.id : null,
        diagnostico_n: d && d.subtema ? { coinciden: d.n_coinciden, total: d.n_total } : null });
    });

    const calibrando = !modelo || modelo.estado !== 'validado';
    const f1m = modelo && Number.isFinite(modelo.f1_micro) ? modelo.f1_micro : null;
    return {
      estado: (fortalezas.length + oportunidades.length === 0) ? 'sin_aspectos_suficientes' : (calibrando ? 'en_calibracion' : 'validado'),
      fortalezas: fortalezas, oportunidades: oportunidades, detalle: detalle, umbral: umbral,
      insignia: calibrando ? 'Modelo en calibración (' + (f1m != null ? 'F1 = ' + f1m.toFixed(2) : 'F1 sin medir') + ')' : null,
      // OJO: review_aspecto no distingue "no analizado" de "sin aspecto" (M1.6). Hasta resolverlo,
      // `analizados` queda en null y la vista NO muestra «Análisis de X de Y».
      cobertura: { con_aspecto: new Set(filas.map(function (a) { return a.review_id; })).size, con_texto: nTexto, analizados: null }
    };
  }

  const api = { CONFIG_ASPECTOS: CONFIG_ASPECTOS, calcularAspectos: calcularAspectos, esTextoValido: esTextoValido, f1DeAspecto: f1DeAspecto,
                tarjetaPermitida: tarjetaPermitida };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Aspectos = api;
})(typeof window !== 'undefined' ? window : globalThis);
