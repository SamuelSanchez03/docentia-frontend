/* js/datos.js
 * Capa de acceso a datos. Las tres fuentes exponen EXACTAMENTE la misma interfaz:
 *   listarEscuelas()                 -> [{escuela_id, nombre, n_reviews}]
 *   listarProfesores(escuelaId)      -> [{profesor_id, nombre, departamento, n_reviews}]
 *   cargarContextoProfesor(profId)   -> {profesor, escuela, departamento, reviews, materias, reviewsDepto}
 * La vista solo usa `fuente`; para cambiar de local a Supabase basta con editar CONFIG.FUENTE.
 * Requiere: PapaParse (solo para la fuente "local").
 */
const CONFIG = {
  FUENTE: "supabase",                        // "local" | "supabase" | "api"
  RUTA_CSV: "data/",                      // carpeta con los CSV generados por separar_tablas.py
  SUPABASE_URL: "https://ugrdtvfakfavywfcvunt.supabase.co",   // PLACEHOLDER
  SUPABASE_ANON_KEY: "sb_publishable_YXjwn7lEc3rowyD-HTWDiQ_gLjoDYng",                  // PLACEHOLDER (clave pública, solo lectura con RLS)
  API_BASE: "/api",                                  // PLACEHOLDER (funciones de Vercel, fase de hosteo)
  ESCUELA_DEMO: "Volunteer State Community College",
  // reglas de producto (PRD §7.2 y §7.1)
  N_ROJO: 5,            // N < 5  -> evidencia insuficiente
  N_VERDE: 10,          // N >= 10 -> evidencia alta
  MIN_EVAL_DEPTO: 10,   // comparativo de departamento oculto si tiene menos evaluaciones
  MIN_EVAL_PROF_EN_DEPTO: 5, // solo docentes con N >= 5 entran a la media del departamento (PRD §7.4)
  MAX_CITA: 280
};

const num = (v) => (v === "" || v === null || v === undefined) ? null : Number(v);

function tipificarReview(r) {
  return {
    review_id: Number(r.review_id),
    profesor_id: Number(r.profesor_id),
    materia_id: num(r.materia_id),
    post_date: r.post_date || null,
    is_online: num(r.is_online),
    student_star: num(r.student_star),
    student_difficult: num(r.student_difficult),
    asistencia: r.asistencia || "No reportado",
    para_creditos: r.para_creditos || "No reportado",
    volveria_a_tomar: r.volveria_a_tomar || "No reportado",
    calificacion: r.calificacion || "No reportado",
    help_useful: num(r.help_useful),
    comentario: r.comentario || ""
  };
}

function tipificarProfesor(p) {
  const out = {
    profesor_id: Number(p.profesor_id), escuela_id: Number(p.escuela_id),
    departamento_id: Number(p.departamento_id), nombre: p.nombre,
    year_since_first_review: num(p.year_since_first_review), num_student: num(p.num_student),
    star_rating: num(p.star_rating), diff_index: num(p.diff_index),
    take_again: num(p.take_again), tag_professor: p.tag_professor || ""
  };
  Object.keys(p).forEach((k) => { if (!(k in out)) out[k] = num(p[k]); }); // los 20 flags
  return out;
}

/* ============================ FUENTE LOCAL (CSV) ============================ */
const FuenteLocal = (() => {
  const cache = {};
  async function csv(nombre) {
    if (cache[nombre]) return cache[nombre];
    const r = await fetch(CONFIG.RUTA_CSV + nombre + ".csv");
    if (!r.ok) {
      throw new Error("No se pudo leer " + nombre + ".csv (" + r.status + "). " +
        "Abre la página con un servidor local (python -m http.server 8000), no con doble clic.");
    }
    const res = Papa.parse(await r.text(), { header: true, skipEmptyLines: true });
    cache[nombre] = res.data;
    return res.data;
  }
  const tablas = async () => {
    const [esc, dep, prof, mat, rev] = await Promise.all(
      ["escuela", "departamento", "profesor", "materia", "review"].map(csv));
    if (!tablas.listo) {
      tablas.listo = {
        esc, dep, mat,
        prof: prof.map(tipificarProfesor),
        rev: rev.map(tipificarReview)
      };
    }
    return tablas.listo;
  };

  return {
    async listarEscuelas() {
      const t = await tablas();
      const porProf = {};
      t.rev.forEach((r) => { porProf[r.profesor_id] = (porProf[r.profesor_id] || 0) + 1; });
      const porEsc = {};
      t.prof.forEach((p) => { porEsc[p.escuela_id] = (porEsc[p.escuela_id] || 0) + (porProf[p.profesor_id] || 0); });
      return t.esc.map((e) => ({ escuela_id: Number(e.escuela_id), nombre: e.nombre, n_reviews: porEsc[e.escuela_id] || 0 }))
        .sort((a, b) => b.n_reviews - a.n_reviews);
    },
    async listarProfesores(escuelaId) {
      const t = await tablas();
      const dep = Object.fromEntries(t.dep.map((d) => [d.departamento_id, d.nombre]));
      const n = {};
      t.rev.forEach((r) => { n[r.profesor_id] = (n[r.profesor_id] || 0) + 1; });
      return t.prof.filter((p) => p.escuela_id === Number(escuelaId))
        .map((p) => ({ profesor_id: p.profesor_id, nombre: p.nombre, departamento: dep[p.departamento_id], n_reviews: n[p.profesor_id] || 0 }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    async cargarContextoProfesor(profesorId) {
      const t = await tablas();
      const profesor = t.prof.find((p) => p.profesor_id === Number(profesorId));
      if (!profesor) throw new Error("Profesor no encontrado: " + profesorId);
      const escuela = t.esc.find((e) => Number(e.escuela_id) === profesor.escuela_id);
      const departamento = t.dep.find((d) => Number(d.departamento_id) === profesor.departamento_id);
      const idsDepto = new Set(t.prof.filter((p) => p.departamento_id === profesor.departamento_id).map((p) => p.profesor_id));
      const materias = Object.fromEntries(t.mat.filter((m) => Number(m.escuela_id) === profesor.escuela_id).map((m) => [m.materia_id, m.codigo]));
      return {
        profesor, escuela, departamento, materias,
        reviews: t.rev.filter((r) => r.profesor_id === profesor.profesor_id),
        reviewsDepto: t.rev.filter((r) => idsDepto.has(r.profesor_id))
      };
    }
  };
})();

/* ===================== FUENTE SUPABASE (REST automática, PLACEHOLDER) ===================== */
/* Supabase ya expone una API REST por cada tabla (PostgREST): no hay que programar un servidor.
 * Requiere crear las tablas, importar los CSV y activar RLS con política de solo lectura (SELECT). */
const FuenteSupabase = (() => {
  async function pedir(tabla, consulta) {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${tabla}?${consulta}`;
    const PASO = 1000;                       // Supabase devuelve máx. 1000 filas por petición
    const filas = [];
    for (let desde = 0; ; desde += PASO) {
      const r = await fetch(url, { headers: {
        apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        "Range-Unit": "items", Range: `${desde}-${desde + PASO - 1}`
      }});
      if (!r.ok) throw new Error(`Supabase ${tabla}: ${r.status} ${await r.text()}`);
      const parte = await r.json();
      filas.push(...parte);
      if (parte.length < PASO) break;
    }
    return filas;
  }
  return {
    async listarEscuelas() {
      return (await pedir("escuela", "select=escuela_id,nombre&order=nombre")).map((e) => ({ ...e, n_reviews: null }));
    },
    async listarProfesores(escuelaId) {
      const [prof, dep] = await Promise.all([
        pedir("profesor", `select=profesor_id,nombre,departamento_id&escuela_id=eq.${escuelaId}&order=nombre`),
        pedir("departamento", `select=departamento_id,nombre&escuela_id=eq.${escuelaId}`)
      ]);
      const d = Object.fromEntries(dep.map((x) => [x.departamento_id, x.nombre]));
      return prof.map((p) => ({ profesor_id: p.profesor_id, nombre: p.nombre, departamento: d[p.departamento_id], n_reviews: null }));
    },
    async cargarContextoProfesor(profesorId) {
      const [profesor] = (await pedir("profesor", `select=*&profesor_id=eq.${profesorId}`)).map(tipificarProfesor);
      if (!profesor) throw new Error("Profesor no encontrado: " + profesorId);
      const [escuela] = await pedir("escuela", `select=*&escuela_id=eq.${profesor.escuela_id}`);
      const [departamento] = await pedir("departamento", `select=*&departamento_id=eq.${profesor.departamento_id}`);
      const profsDepto = await pedir("profesor", `select=profesor_id&departamento_id=eq.${profesor.departamento_id}`);
      const ids = profsDepto.map((p) => p.profesor_id).join(",");
      const cols = "review_id,profesor_id,materia_id,post_date,is_online,student_star,student_difficult,asistencia,para_creditos,volveria_a_tomar,calificacion,help_useful,comentario";
      const todas = (await pedir("review", `select=${cols}&profesor_id=in.(${ids})&order=review_id`)).map(tipificarReview);
      const mats = await pedir("materia", `select=materia_id,codigo&escuela_id=eq.${profesor.escuela_id}`);
      return {
        profesor, escuela, departamento,
        materias: Object.fromEntries(mats.map((m) => [m.materia_id, m.codigo])),
        reviews: todas.filter((r) => r.profesor_id === profesor.profesor_id),
        reviewsDepto: todas
      };
    }
  };
})();

/* ===================== FUENTE API PROPIA (Vercel, PLACEHOLDER) ===================== */
/* Para la fase de hosteo: funciones en /api que consultan Supabase con una clave de servidor
 * (guardada como variable de entorno) y devuelven este mismo JSON. */
const FuenteApi = {
  async _get(ruta) {
    const r = await fetch(CONFIG.API_BASE + ruta);
    if (!r.ok) throw new Error("API " + ruta + ": " + r.status);
    return r.json();
  },
  listarEscuelas() { return this._get("/escuelas"); },
  listarProfesores(escuelaId) { return this._get("/profesores?escuela_id=" + encodeURIComponent(escuelaId)); },
  cargarContextoProfesor(profesorId) { return this._get("/profesor?id=" + encodeURIComponent(profesorId)); }
};

const fuente = { local: FuenteLocal, supabase: FuenteSupabase, api: FuenteApi }[CONFIG.FUENTE];
