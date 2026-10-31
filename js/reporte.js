/* js/reporte.js
 * Funciones puras: reciben el contexto de datos (ver datos.js) y devuelven el reporte del profesor.
 * No tocan el DOM ni la red, por eso funcionan igual con CSV locales o con Supabase.
 * El análisis de aspectos (NLP) vive en aspectos_logica.js (Aspectos.calcularAspectos); aquí solo se invoca.
 */
const ORDEN_CALIFICACIONES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const ETIQUETAS_FLAGS = {
  tough_grader: "Calificador exigente", gives_good_feedback: "Da buena retroalimentación", respected: "Respetado",
  skip_class: "Faltar a clase no conviene", caring: "Atento", get_ready_to_read: "Mucha lectura",
  participation_matters: "La participación cuenta", clear_grading_criteria: "Criterios de calificación claros",
  lecture_heavy: "Clases expositivas", lots_of_homework: "Mucha tarea", amazing_lectures: "Clases excelentes",
  inspirational: "Inspirador", hilarious: "Divertido", accessible_outside_class: "Accesible fuera de clase",
  extra_credit: "Puntos extra", graded_by_few_things: "Pocas cosas califican", test_heavy: "Muchos exámenes",
  group_projects: "Proyectos en equipo", so_many_papers: "Muchos ensayos", beware_of_pop_quizzes: "Quizzes sorpresa"
};

function media(valores) {
  const v = valores.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function semaforo(n) {
  if (n < CONFIG.N_ROJO) return { nivel: "rojo", etiqueta: "Evidencia insuficiente", nota: `Hay ${n} evaluaciones (mínimo ${CONFIG.N_ROJO}). Solo se muestran el conteo y las fechas; no se emiten juicios.` };
  if (n < CONFIG.N_VERDE) return { nivel: "amarillo", etiqueta: "Evidencia media", nota: `Hay ${n} evaluaciones. Muestra pequeña: interpreta los resultados con cautela.` };
  return { nivel: "verde", etiqueta: "Evidencia alta", nota: `Hay ${n} evaluaciones. Reporte completo.` };
}

function recortar(texto, max) {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.lastIndexOf(" ", max - 1);
  return t.slice(0, corte > max * 0.6 ? corte : max - 1) + "…";
}

function distribucionEstrellas(reviews) {
  const niveles = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  return niveles.map((nivel) => ({ nivel, n: reviews.filter((r) => r.student_star === nivel).length }));
}

function evolucionAnual(reviews) {
  const porAnio = {};
  reviews.forEach((r) => {
    if (!r.post_date || r.student_star === null) return;
    const a = r.post_date.slice(0, 4);
    (porAnio[a] = porAnio[a] || []).push(r.student_star);
  });
  return Object.keys(porAnio).sort().map((a) => ({ anio: a, n: porAnio[a].length, media: media(porAnio[a]) }));
}

function porMateria(reviews, materias) {
  const grupos = {};
  reviews.forEach((r) => {
    const codigo = r.materia_id !== null ? (materias[r.materia_id] || "Sin código") : "Sin código";
    (grupos[codigo] = grupos[codigo] || []).push(r);
  });
  return Object.entries(grupos).map(([codigo, rs]) => ({
    codigo, n: rs.length,
    mediaStar: media(rs.map((r) => r.student_star)),
    mediaDif: media(rs.map((r) => r.student_difficult))
  })).sort((a, b) => b.n - a.n);
}

function porCalificacion(reviews) {
  const reportadas = reviews.filter((r) => ORDEN_CALIFICACIONES.includes(r.calificacion));
  const filas = ORDEN_CALIFICACIONES.map((g) => {
    const rs = reportadas.filter((r) => r.calificacion === g);
    return { calificacion: g, n: rs.length, media: media(rs.map((r) => r.student_star)) };
  }).filter((f) => f.n > 0);
  return { totalReportadas: reportadas.length, mostrar: reportadas.length >= 5, filas };
}

function tagsDelProfesor(profesor) {
  // tag_professor viene como "Hilarious (2)  GROUP PROJECTS (2)  Gives good feedback (1)"
  const tags = [];
  const re = /([^()]+?)\s*\((\d+)\)/g;
  let m;
  while ((m = re.exec(profesor.tag_professor || "")) !== null) {
    tags.push({ tag: m[1].trim(), n: Number(m[2]) });
  }
  tags.sort((a, b) => b.n - a.n);
  const flagsActivos = Object.keys(ETIQUETAS_FLAGS).filter((k) => profesor[k] === 1).map((k) => ETIQUETAS_FLAGS[k]);
  return { tags, flagsActivos };
}

function comparativoDepto(reviewsDepto) {
  const conteo = {};
  reviewsDepto.forEach((r) => { conteo[r.profesor_id] = (conteo[r.profesor_id] || 0) + 1; });
  const validos = reviewsDepto.filter((r) => conteo[r.profesor_id] >= CONFIG.MIN_EVAL_PROF_EN_DEPTO);
  return {
    n: validos.length,
    nProfesores: new Set(validos.map((r) => r.profesor_id)).size,
    mediaStar: media(validos.map((r) => r.student_star)),
    mediaDif: media(validos.map((r) => r.student_difficult)),
    disponible: validos.length >= CONFIG.MIN_EVAL_DEPTO
  };
}

function seleccionarCitas(reviews, materias) {
  // Ejemplos reales según la estrella (no según aspectos); los aspectos y sus citas salen de Aspectos.calcularAspectos.
  const conTexto = reviews.filter((r) => r.comentario.trim() !== "" && r.student_star !== null);
  const orden = (a, b) => (b.help_useful || 0) - (a.help_useful || 0) || (b.post_date || "").localeCompare(a.post_date || "");
  const altas = conTexto.filter((r) => r.student_star >= 4).sort(orden).slice(0, 2);
  const bajas = conTexto.filter((r) => r.student_star <= 2).sort(orden).slice(0, 2);
  const medias = conTexto.filter((r) => r.student_star > 2 && r.student_star < 4).sort(orden).slice(0, 1);
  const armar = (r, grupo) => ({
    grupo, estrellas: r.student_star, fecha: r.post_date,
    materia: r.materia_id !== null ? (materias[r.materia_id] || null) : null,
    texto: recortar(r.comentario, CONFIG.MAX_CITA)
  });
  return [
    ...altas.map((r) => armar(r, "Evaluación alta")),
    ...bajas.map((r) => armar(r, "Evaluación baja")),
    ...medias.map((r) => armar(r, "Evaluación intermedia"))
  ];
}

function calcularReporte(ctx) {
  const { profesor, reviews, materias, reviewsDepto } = ctx;
  const n = reviews.length;
  const fechas = reviews.map((r) => r.post_date).filter(Boolean).sort();
  const respuestas = reviews.filter((r) => r.volveria_a_tomar === "Yes" || r.volveria_a_tomar === "No");
  const si = respuestas.filter((r) => r.volveria_a_tomar === "Yes").length;
  return {
    n,
    nComentarios: reviews.filter((r) => r.comentario.trim() !== "").length,
    periodo: { min: fechas[0] || null, max: fechas[fechas.length - 1] || null },
    semaforo: semaforo(n),
    mediaStar: media(reviews.map((r) => r.student_star)),
    mediaDif: media(reviews.map((r) => r.student_difficult)),
    nStar: reviews.filter((r) => r.student_star !== null).length,
    volveria: respuestas.length ? { pct: si / respuestas.length, n: respuestas.length } : null,
    takeAgainHistorico: profesor.take_again,
    depto: comparativoDepto(reviewsDepto),
    distribucion: distribucionEstrellas(reviews),
    evolucion: evolucionAnual(reviews),
    materias: porMateria(reviews, materias),
    calificaciones: porCalificacion(reviews),
    ...tagsDelProfesor(profesor),
    citas: seleccionarCitas(reviews, materias),
    // Fortalezas / oportunidades (ABSA). `typeof` evita romper este archivo cuando se usa desde Node sin cargar aspectos_logica.js.
    aspectos: (typeof Aspectos !== "undefined") ? Aspectos.calcularAspectos(reviews, ctx.aspectos, ctx.modelo) : null
  };
}

if (typeof module !== "undefined") module.exports = { calcularReporte, media, semaforo, recortar, tagsDelProfesor };
