/* js/profesor.js
 * Pinta la vista del profesor. Requiere (en este orden): PapaParse, Chart.js,
 * js/datos.js, js/reporte.js, js/catalogo.js, js/aspectos_logica.js, js/aspectos_vista.js y luego este archivo.
 * Espera los ids definidos en index.html.
 */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const f1 = (v) => (v === null || v === undefined) ? "s/d" : v.toFixed(1);
const pct = (v) => (v === null || v === undefined) ? "s/d" : Math.round(v * 100) + "%";
const COLOR = { ink: "#444444", azul: "#456aa3", verde: "#2b6451", teal: "#8ec2c2", hairline: "#d9d9d9" };
const SEMAFORO = {
  rojo: "bg-primary/10 text-primary", amarillo: "bg-ambar/15 text-ambar", verde: "bg-theme-forest/10 text-theme-forest"
};
const charts = [];

Chart.defaults.font.family = "Nunito, sans-serif";
Chart.defaults.color = COLOR.ink;

function grafica(idCanvas, config) {
  const c = $(idCanvas);
  if (c) charts.push(new Chart(c, config));
}

/* ---------- bloques de HTML ---------- */
function tarjeta(k) {
  return `<div class="border border-hairline rounded-3xl bg-surface-1/40 p-5 flex flex-col justify-between">
    <div class="flex items-center justify-between mb-3">
      <span class="font-label-sm text-xs text-ink-muted uppercase tracking-wider block">${esc(k.titulo)}</span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${k.badgeClase} font-label-sm text-[11px] font-semibold"><span class="material-symbols-outlined text-[13px]">${k.icono}</span> ${esc(k.badge)}</span>
    </div>
    <div class="flex items-baseline gap-1.5 mb-3">
      <span class="font-display-md text-3xl ${k.valorClase} font-medium">${k.valor}</span>
      <span class="text-sm text-ink-muted">${esc(k.unidad)}</span>
    </div>
    <div class="space-y-1.5">
      <div class="w-full bg-hairline rounded-full h-2 overflow-hidden"><div class="${k.barraClase} h-2 rounded-full" style="width:${Math.max(0, Math.min(100, k.pct))}%"></div></div>
      <div class="flex justify-between text-[11px] text-ink-muted"><span>${esc(k.izq)}</span><span class="${k.derClase} font-medium">${esc(k.der)}</span></div>
    </div>
  </div>`;
}

function marco(titulo, subtitulo, cuerpo) {
  return `<div>
    <h2 class="font-display text-2xl">${esc(titulo)}</h2>
    ${subtitulo ? `<p class="text-sm text-ink-muted mt-1 mb-5">${subtitulo}</p>` : `<div class="mb-5"></div>`}
    ${cuerpo}
  </div>`;
}

function htmlEncabezado(ctx, rep) {
  const per = rep.periodo.min ? `${rep.periodo.min} a ${rep.periodo.max}` : "sin fechas";
  return `<header>
    <h1 class="font-display text-4xl sm:text-5xl">${esc(ctx.profesor.nombre)}</h1>
    <p class="text-ink-muted mt-2">${esc(ctx.escuela.nombre)} · ${esc(ctx.departamento.nombre)}</p>
    <p class="text-ink-muted">Periodo ${esc(per)}</p>
    <p class="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${SEMAFORO[rep.semaforo.nivel]}">${esc(rep.semaforo.etiqueta)}</p>
    <p class="text-sm text-ink-muted mt-2">${esc(rep.semaforo.nota)}</p>
  </header>`;
}

function htmlKpis(rep) {
  const d = rep.depto;
  const izq = (m) => d.disponible ? `Media dpto: ${f1(m)}` : "Comparativo de dpto no disponible";
  const vs = (v, m) => (d.disponible && v !== null && m !== null) ? `${v >= m ? "+" : "−"}${Math.abs(v - m).toFixed(1)} vs dpto` : "";
  const v = rep.volveria;
  return `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    ${tarjeta({ titulo: "Calidad Media", icono: "star", badge: `n = ${rep.nStar}`, badgeClase: "bg-theme-forest/10 text-theme-forest",
      valor: f1(rep.mediaStar), valorClase: "text-ink", unidad: "/ 5.0", pct: ((rep.mediaStar || 0) / 5) * 100, barraClase: "bg-theme-forest",
      izq: izq(d.mediaStar), der: vs(rep.mediaStar, d.mediaStar), derClase: (d.disponible && rep.mediaStar >= d.mediaStar) ? "text-theme-forest" : "text-ink" })}
    ${tarjeta({ titulo: "Dificultad", icono: "tune", badge: `n = ${rep.nStar}`, badgeClase: "bg-ink/5 text-ink",
      valor: f1(rep.mediaDif), valorClase: "text-ink", unidad: "/ 5.0", pct: ((rep.mediaDif || 0) / 5) * 100, barraClase: "bg-ink/70",
      izq: izq(d.mediaDif), der: vs(rep.mediaDif, d.mediaDif), derClase: "text-ink" })}
    ${tarjeta({ titulo: "Retorno", icono: "thumb_up", badge: `n = ${v ? v.n : 0}`, badgeClase: "bg-primary/10 text-primary",
      valor: v ? pct(v.pct) : "s/d", valorClase: "text-primary", unidad: "de quienes respondieron", pct: v ? v.pct * 100 : 0, barraClase: "bg-primary",
      izq: v ? `${Math.round(v.pct * v.n)} de ${v.n} dijeron que sí volverían a tomarla` : "Sin respuestas",
      der: rep.takeAgainHistorico !== null ? `Histórico: ${pct(rep.takeAgainHistorico)}` : "", derClase: "text-primary" })}
  </div>`;
}

function htmlMaterias(rep) {
  const filas = rep.materias.map((m) => `<tr class="border-t border-hairline">
    <td class="py-2 pr-4 font-semibold">${esc(m.codigo)}</td>
    <td class="py-2 pr-4">${m.n}</td>
    <td class="py-2 pr-4 w-48"><div class="h-2 rounded-full bg-hairline overflow-hidden"><div class="h-2 bg-theme-forest" style="width:${((m.mediaStar || 0) / 5) * 100}%"></div></div></td>
    <td class="py-2 pr-4">${f1(m.mediaStar)}</td>
    <td class="py-2">${f1(m.mediaDif)}</td></tr>`).join("");
  return marco("Por materia", "Códigos reales de la base. «Sin código» agrupa evaluaciones sin materia válida.",
    `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="text-sm text-ink-muted">
      <th class="pb-2 pr-4 font-normal">Materia</th><th class="pb-2 pr-4 font-normal">Evaluaciones</th>
      <th class="pb-2 pr-4 font-normal">Calidad</th><th class="pb-2 pr-4 font-normal">Media</th><th class="pb-2 font-normal">Dificultad</th>
    </tr></thead><tbody>${filas}</tbody></table></div>`);
}

function htmlTags(rep) {
  if (rep.tags.length) return marco("Etiquetas de los alumnos", "Conteo de etiquetas del profesor en Rate My Professors.", `<div class="h-56"><canvas id="chTags"></canvas></div>`);
  if (rep.flagsActivos.length) return marco("Etiquetas de los alumnos", "Etiquetas del profesor en Rate My Professors.",
    `<div class="flex flex-wrap gap-2">${rep.flagsActivos.map((t) => `<span class="rounded-full border border-hairline bg-surface-1 px-3 py-1 text-sm">${esc(t)}</span>`).join("")}</div>`);
  return marco("Etiquetas de los alumnos", "", `<p class="text-ink-muted">Este profesor no tiene etiquetas.</p>`);
}

function htmlCalificaciones(rep) {
  const c = rep.calificaciones;
  if (!c.mostrar) return marco("Calidad según la calificación del alumno", "", `<p class="text-ink-muted">Solo ${c.totalReportadas} evaluaciones reportan la calificación obtenida (se necesitan 5 para mostrar esta gráfica).</p>`);
  return marco("Calidad según la calificación del alumno",
    `Media de la puntuación al profesor según la nota que reportó el alumno (${c.totalReportadas} evaluaciones). Sirve para detectar sesgo por el resultado final.`,
    `<div class="h-56"><canvas id="chGrades"></canvas></div>`);
}

function htmlCitas(rep) {
  if (!rep.citas.length) return marco("Comentarios de ejemplo", "", `<p class="text-ink-muted">No hay comentarios para mostrar.</p>`);
  const items = rep.citas.map((c) => `<figure class="border-t border-hairline pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
    <blockquote class="leading-relaxed">“${esc(c.texto)}”</blockquote>
    <figcaption class="text-sm text-ink-muted mt-1">${esc(c.grupo)} · ${f1(c.estrellas)} de 5${c.fecha ? " · " + esc(c.fecha) : ""}${c.materia ? " · " + esc(c.materia) : ""}</figcaption>
  </figure>`).join("");
  return marco("Comentarios de ejemplo", "Textos originales en inglés, sin traducir. Elegidos por su puntuación, no por tema; el análisis por tema está en «Lo que funciona» y «Qué conviene mejorar».", items);
}

/* Recuadros fantasma: solo se muestran cuando no hay modelo/aspectos (estado «sin_modelo» o sin permisos de lectura). */
function htmlFranjaNlp() {
  const fantasma = (titulo, color, texto) => `<section class="rounded-[40px] border-2 border-dashed border-hairline p-8">
    <h2 class="font-display text-3xl ${color}">${titulo}</h2>
    <p class="text-sm text-ink-muted mt-1 mb-5">${texto}</p>
    ${[0, 1, 2].map(() => `<div class="rounded-2xl border border-dashed border-hairline p-4 mb-3">
      <div class="h-3 w-1/2 rounded bg-surface-1"></div><div class="h-2 w-full rounded bg-surface-1 mt-3"></div><div class="h-2 w-4/5 rounded bg-surface-1 mt-2"></div></div>`).join("")}
  </section>`;
  return `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    ${fantasma("Lo que funciona", "text-theme-forest", "Tres fortalezas con su evidencia, extraídas de los comentarios. Disponible cuando el modelo esté listo.")}
    ${fantasma("Qué conviene mejorar", "text-ambar", "Tres áreas de oportunidad con una cita real y una acción sugerida. Disponible cuando el modelo esté listo.")}
  </div>`;
}

/* Franja de aspectos (ABSA): tarjetas reales si hay modelo; si no, los recuadros fantasma. */
function htmlFranjaAspectos(rep) {
  const html = (window.AspectosVista && AspectosVista.htmlFranjaAspectos(rep.aspectos)) || null;
  return html || htmlFranjaNlp();
}

const VISTAS = {
  dist: { nombre: "Distribución de puntuaciones", html: () => marco("Distribución de puntuaciones", "Número de evaluaciones por puntuación (student_star).", `<div class="h-56"><canvas id="chDist"></canvas></div>`) },
  evol: { nombre: "Evolución por año", html: () => marco("Evolución por año", "Media por año de publicación; el número en cada punto es el tamaño de muestra.", `<div class="h-56"><canvas id="chEvol"></canvas></div>`) },
  materias: { nombre: "Por materia", html: htmlMaterias },
  tags: { nombre: "Etiquetas de los alumnos", html: htmlTags },
  notas: { nombre: "Calidad según la calificación", html: htmlCalificaciones },
  citas: { nombre: "Comentarios de ejemplo", html: htmlCitas }
};
const panelVista = ["dist", "evol"]; // vista inicial de cada celda (2x1); se conserva al cambiar de profesor

function montarPaneles(rep) {
  const selector = (i) => `<select data-panel="${i}" class="rounded-lg border-hairline text-sm text-ink">${Object.entries(VISTAS).map(([k, v]) =>
    `<option value="${k}"${panelVista[i] === k ? " selected" : ""}>${esc(v.nombre)}</option>`).join("")}</select>`;
  charts.splice(0).forEach((c) => c.destroy());
  $("paneles").innerHTML = panelVista.map((k, i) => `<section class="flex flex-col h-[460px] rounded-[40px] border border-hairline px-8 pt-6 pb-8">
    <div class="flex justify-end mb-3 shrink-0">${selector(i)}</div>
    <div class="panel-scroll flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">${VISTAS[k].html(rep)}</div></section>`).join("");
  $("paneles").addEventListener("change", (e) => {
    const i = Number(e.target.dataset.panel), nueva = e.target.value, otro = 1 - i;
    if (panelVista[otro] === nueva) panelVista[otro] = panelVista[i]; // una vista no puede estar en dos celdas
    panelVista[i] = nueva;
    montarPaneles(rep);
  });
  dibujarGraficas(rep);
}

/* ---------- renderizado ---------- */
function cabecera(ctx, rep, conStats) {
  return `<div class="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 items-start mb-8">${htmlEncabezado(ctx, rep)}${conStats ? htmlKpis(rep) : ""}</div>`;
}

function mostrarReporte(ctx, rep) {
  charts.splice(0).forEach((c) => c.destroy());
  const cont = $("reporte");
  if (rep.semaforo.nivel === "rojo") {
    cont.innerHTML = cabecera(ctx, rep, false);
    return;
  }
  cont.innerHTML = cabecera(ctx, rep, true) + htmlFranjaAspectos(rep) + `<div id="paneles" class="grid grid-cols-1 lg:grid-cols-2 gap-6"></div>`;
  montarPaneles(rep);
}

function dibujarGraficas(rep) {

  grafica("chDist", { type: "bar",
    data: { labels: rep.distribucion.map((d) => d.nivel.toFixed(1)), datasets: [{ data: rep.distribucion.map((d) => d.n), backgroundColor: COLOR.azul, borderRadius: 6 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });

  grafica("chEvol", { type: "line",
    data: { labels: rep.evolucion.map((e) => e.anio), datasets: [{ data: rep.evolucion.map((e) => e.media), borderColor: COLOR.ink, backgroundColor: COLOR.ink, tension: 0.25, pointRadius: 4 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (c) => `Media ${c.parsed.y.toFixed(2)} (n = ${rep.evolucion[c.dataIndex].n})` } } },
      scales: { y: { min: 1, max: 5 } } } });

  grafica("chTags", { type: "bar",
    data: { labels: rep.tags.slice(0, 10).map((t) => t.tag), datasets: [{ data: rep.tags.slice(0, 10).map((t) => t.n), backgroundColor: COLOR.teal, borderRadius: 6 }] },
    options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });

  if (rep.calificaciones.mostrar) {
    grafica("chGrades", { type: "bar",
      data: { labels: rep.calificaciones.filas.map((f) => `${f.calificacion} (n=${f.n})`), datasets: [{ data: rep.calificaciones.filas.map((f) => f.media), backgroundColor: COLOR.verde, borderRadius: 6 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 1, max: 5 } } } });
  }
}

function mostrarError(e) {
  console.error(e);
  $("reporte").innerHTML = `<div class="rounded-2xl border border-primary/30 bg-primary/5 p-6">
    <p class="font-semibold">No se pudieron cargar los datos</p><p class="text-sm mt-1">${esc(e.message)}</p></div>`;
}

async function cargarProfesor(profesorId) {
  $("reporte").innerHTML = `<p class="text-ink-muted">Cargando…</p>`;
  try {
    const ctx = await fuente.cargarContextoProfesor(profesorId);
    mostrarReporte(ctx, calcularReporte(ctx));
    history.replaceState(null, "", "?prof=" + profesorId);
    $("fuenteDatos").textContent = CONFIG.FUENTE === "local" ? "CSV locales" : CONFIG.FUENTE;
  } catch (e) { mostrarError(e); }
}

async function llenarProfesores(escuelaId, profesorIdElegido) {
  const lista = await fuente.listarProfesores(escuelaId);
  $("selProfesor").innerHTML = lista.map((p) =>
    `<option value="${p.profesor_id}">${esc(p.nombre)} · ${esc(p.departamento)}${p.n_reviews !== null ? " (" + p.n_reviews + ")" : ""}</option>`).join("");
  const elegido = profesorIdElegido ?? [...lista].sort((a, b) => (b.n_reviews || 0) - (a.n_reviews || 0))[0]?.profesor_id ?? lista[0]?.profesor_id;
  if (elegido === undefined) { $("reporte").innerHTML = `<p class="text-ink-muted">Esta escuela no tiene profesores.</p>`; return; }
  $("selProfesor").value = String(elegido);
  await cargarProfesor(elegido);
}

async function iniciar() {
  try {
    const escuelas = await fuente.listarEscuelas();
    $("selEscuela").innerHTML = escuelas.map((e) => `<option value="${e.escuela_id}">${esc(e.nombre)}</option>`).join("");
    const profParam = new URLSearchParams(location.search).get("prof");
    let escuelaId = (escuelas.find((e) => e.nombre === CONFIG.ESCUELA_DEMO) || escuelas[0]).escuela_id;
    if (profParam) {
      const ctx = await fuente.cargarContextoProfesor(profParam);
      escuelaId = Number(ctx.escuela.escuela_id);
    }
    $("selEscuela").value = String(escuelaId);
    await llenarProfesores(escuelaId, profParam ? Number(profParam) : undefined);
    $("selEscuela").addEventListener("change", (e) => llenarProfesores(e.target.value));
    $("selProfesor").addEventListener("change", (e) => cargarProfesor(e.target.value));
  } catch (e) { mostrarError(e); }
}

document.addEventListener("DOMContentLoaded", iniciar);
