// node test_aspectos.js   (sin dependencias)
const assert = require('assert');
const { calcularAspectos, esTextoValido, f1DeAspecto } = require('./aspectos_logica.js');

let n = 0;
function t(nombre, fn) { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n      ', e.message); process.exitCode = 1; } }

// ---- generadores de datos de prueba (sintéticos; solo validan la lógica) ----
const mkReviews = (k, extra) => Array.from({ length: k }, (_, i) =>
  Object.assign({ review_id: i + 1, comentario: 'comentario de prueba número ' + (i + 1), post_date: '2017-01-' + String((i % 28) + 1).padStart(2, '0'), student_star: 4, help_useful: 0 }, extra && extra(i)));
let idAsp = 0;
const mkAsp = (rid, aspecto, polaridad, ev) => ({ review_aspecto_id: ++idAsp, review_id: rid, aspecto, polaridad,
  evidencia: ev || ('Evidencia suficientemente larga para el aspecto ' + aspecto + ' en review ' + rid) });
// n filas de un aspecto repartidas desde la review 1
const filasDe = (aspecto, pos, neg, mix, desde) => {
  const out = []; let r = desde || 1;
  for (let i = 0; i < pos; i++) out.push(mkAsp(r++, aspecto, 'positivo'));
  for (let i = 0; i < neg; i++) out.push(mkAsp(r++, aspecto, 'negativo'));
  for (let i = 0; i < mix; i++) out.push(mkAsp(r++, aspecto, 'mixto_neutro'));
  return out;
};
const modeloOk = { version_modelo: 'v', estado: 'validado', f1_micro: 0.9, f1_por_aspecto: null };

console.log('Reglas de agregación (PRD §9.2)');
t('Ejemplo del PRD: 20 comentarios, umbral 4; Carga=oportunidad, Claridad=fortaleza, Clima (2) ausente', () => {
  const rev = mkReviews(20);
  const asp = [].concat(filasDe('Carga de trabajo', 2, 7, 0), filasDe('Claridad de evaluación', 5, 1, 0), filasDe('Clima de aula', 2, 0, 0));
  const r = calcularAspectos(rev, asp, modeloOk);
  assert.strictEqual(r.umbral, 4);
  assert.deepStrictEqual(r.oportunidades.map(x => x.aspecto), ['Carga de trabajo']);
  assert.deepStrictEqual(r.fortalezas.map(x => x.aspecto), ['Claridad de evaluación']);
  const carga = r.oportunidades[0];
  assert.deepStrictEqual([carga.n_menciones, carga.n_pos, carga.n_neg], [9, 2, 7]);
  const cla = r.fortalezas[0];
  assert.deepStrictEqual([cla.n_menciones, cla.n_pos, cla.n_neg], [6, 5, 1]);
  assert.ok(!r.detalle.find(x => x.aspecto === 'Clima de aula').cumple_umbral);   // sigue visible en detalle
});
t('Umbral: 0.20 × 15 = 3 (no 4 por error de coma flotante)', () => {
  assert.strictEqual(calcularAspectos(mkReviews(15), filasDe('Clima de aula', 3, 0, 0), modeloOk).umbral, 3);
});
t('Umbral: mínimo MIN_MENCIONES cuando 20% es menor', () => {
  assert.strictEqual(calcularAspectos(mkReviews(5), filasDe('Clima de aula', 3, 0, 0), modeloOk).umbral, 3);
});
t('Aspecto solo neutro que cumple umbral: ni fortaleza ni oportunidad', () => {
  const r = calcularAspectos(mkReviews(10), filasDe('Rigor de calificación', 0, 0, 5), modeloOk);
  assert.strictEqual(r.estado, 'sin_aspectos_suficientes');
  assert.strictEqual(r.detalle[0].clasificacion, null);
});
t('Empate n_pos == n_neg (≥1) cuenta como fortaleza (I1.3: n_pos ≥ n_neg)', () => {
  const r = calcularAspectos(mkReviews(10), filasDe('Clima de aula', 3, 3, 0), modeloOk);
  assert.strictEqual(r.fortalezas.length, 1);
});
t('Orden: por n_pos desc; empate por menciones desc; luego nombre', () => {
  const asp = [].concat(filasDe('Calidad de clase', 5, 0, 0, 1), filasDe('Clima de aula', 5, 0, 2, 1), filasDe('Accesibilidad y trato', 5, 0, 0, 1), filasDe('Carga de trabajo', 6, 0, 0, 1));
  const r = calcularAspectos(mkReviews(20), asp, modeloOk);
  assert.deepStrictEqual(r.fortalezas.map(x => x.aspecto), ['Carga de trabajo', 'Clima de aula', 'Accesibilidad y trato']);
});
t('TOP_N: máximo 3 por lista', () => {
  const asp = [].concat(['Calidad de clase', 'Clima de aula', 'Accesibilidad y trato', 'Claridad de evaluación', 'Retroalimentación'].flatMap(a => filasDe(a, 4, 0, 0, 1)));
  assert.strictEqual(calcularAspectos(mkReviews(20), asp, modeloOk).fortalezas.length, 3);
});
t('"No Comments" y vacíos no cuentan en el denominador del umbral', () => {
  const rev = mkReviews(20, i => (i < 10 ? { comentario: i < 5 ? 'No Comments' : '' } : {}));
  const r = calcularAspectos(rev, filasDe('Clima de aula', 3, 0, 0, 11), modeloOk);
  assert.strictEqual(r.cobertura.con_texto, 10);
  assert.strictEqual(r.umbral, 3);                                  // max(3, ceil(2)) = 3, no max(3, 4)
  assert.ok(!esTextoValido('no comments.') && !esTextoValido('  ') && esTextoValido('Great'));
});
t('Filtro de fechas: filas de reviews fuera del filtro no cuentan', () => {
  const rev = mkReviews(10).slice(0, 5);                              // solo reviews 1..5 dentro del filtro
  const asp = filasDe('Clima de aula', 8, 0, 0);                      // reviews 1..8
  assert.strictEqual(calcularAspectos(rev, asp, modeloOk).detalle[0].n_menciones, 5);
});

t('MIN_N_DIRECCION=2: una sola mención negativa deja de ser oportunidad (por defecto =1, regla del PRD)', () => {
  const asp = [].concat(filasDe('Rigor de calificación', 0, 1, 5, 1));
  assert.strictEqual(calcularAspectos(mkReviews(10), asp, modeloOk).oportunidades.length, 1);
  assert.strictEqual(calcularAspectos(mkReviews(10), asp, modeloOk, { MIN_N_DIRECCION: 2 }).oportunidades.length, 0);
});

console.log('Piso de F1 por aspecto (M3.3 / I1.5)');
t('F1 < 0.60 sale del top pero sigue en detalle; F1 nulo no se filtra', () => {
  const asp = [].concat(filasDe('Clima de aula', 5, 0, 0, 1), filasDe('Calidad de clase', 5, 0, 0, 1), filasDe('Accesibilidad y trato', 5, 0, 0, 1));
  const modelo = { estado: 'validado', f1_micro: .9, f1_por_aspecto: { 'Clima de aula': { f1_pol: 0.5, f1_det: 0.9 }, 'Calidad de clase': 0.8 } };
  const r = calcularAspectos(mkReviews(20), asp, modelo);
  assert.deepStrictEqual(r.fortalezas.map(x => x.aspecto).sort(), ['Accesibilidad y trato', 'Calidad de clase']);
  assert.strictEqual(r.detalle.find(x => x.aspecto === 'Clima de aula').en_top_permitido, false);
});
t('f1_por_aspecto como texto JSON (modo CSV local) y formas {f1_pol}/{f1_det}/número', () => {
  assert.strictEqual(f1DeAspecto({ f1_por_aspecto: '{"A":{"f1_pol":0.7}}' }, 'A'), 0.7);
  assert.strictEqual(f1DeAspecto({ f1_por_aspecto: { A: { f1_det: 0.6 } } }, 'A'), 0.6);
  assert.strictEqual(f1DeAspecto({ f1_por_aspecto: { A: 0.4 } }, 'A'), 0.4);
  assert.strictEqual(f1DeAspecto({ f1_por_aspecto: null }, 'A'), null);
  assert.strictEqual(f1DeAspecto({ f1_por_aspecto: 'no es json' }, 'A'), null);
});

console.log('Estados de la franja (PRD §9.3)');
t('sin_modelo: no hay filas de review_aspecto', () => {
  assert.strictEqual(calcularAspectos(mkReviews(10), [], modeloOk).estado, 'sin_modelo');
  assert.strictEqual(calcularAspectos(mkReviews(10), undefined, null).estado, 'sin_modelo');
});
t('con filas pero filtro de fechas sin coincidencias: sin_aspectos_suficientes (no sin_modelo)', () => {
  assert.strictEqual(calcularAspectos([], filasDe('Clima de aula', 5, 0, 0), modeloOk).estado, 'sin_aspectos_suficientes');
});
t('en_calibracion con F1 nulo (como la fila actual de Supabase): insignia "F1 sin medir", sin errores', () => {
  const r = calcularAspectos(mkReviews(10), filasDe('Clima de aula', 4, 0, 0), { estado: 'en_calibracion', f1_micro: null, f1_por_aspecto: null, n_gold: 0 });
  assert.strictEqual(r.estado, 'en_calibracion');
  assert.strictEqual(r.insignia, 'Modelo en calibración (F1 sin medir)');
});
t('en_calibracion con F1 medido: insignia con 2 decimales', () => {
  const r = calcularAspectos(mkReviews(10), filasDe('Clima de aula', 4, 0, 0), { estado: 'en_calibracion', f1_micro: 0.7234 });
  assert.strictEqual(r.insignia, 'Modelo en calibración (F1 = 0.72)');
});
t('validado: sin insignia', () => {
  const r = calcularAspectos(mkReviews(10), filasDe('Clima de aula', 4, 0, 0), modeloOk);
  assert.strictEqual(r.estado, 'validado'); assert.strictEqual(r.insignia, null);
});
t('modelo null con filas: se trata como en_calibracion (no revienta)', () => {
  assert.strictEqual(calcularAspectos(mkReviews(10), filasDe('Clima de aula', 4, 0, 0), null).estado, 'en_calibracion');
});

console.log('Citas y acciones (I1.6, I1.7)');
t('Cita: misma polaridad que la tarjeta; prefiere help_useful>0, luego más reciente', () => {
  const rev = mkReviews(10, i => ({ post_date: '2017-01-0' + (i + 1), help_useful: i === 1 ? 3 : 0 }));
  const asp = filasDe('Clima de aula', 5, 1, 0);                      // reviews 1-5 pos, 6 neg
  const c = calcularAspectos(rev, asp, modeloOk).fortalezas[0].cita;
  assert.ok(c.texto.includes('review 2'));                             // la de help_useful>0
  const rev2 = mkReviews(10, i => ({ post_date: '2017-01-0' + (i + 1) }));
  assert.ok(calcularAspectos(rev2, asp, modeloOk).fortalezas[0].cita.texto.includes('review 5'));   // la más reciente
});
t('Cita: prefiere longitud 40–280; si ninguna cumple, usa la que haya', () => {
  const rev = mkReviews(10, i => ({ post_date: '2017-01-0' + (i + 1) }));
  const asp = [mkAsp(5, 'Clima de aula', 'positivo', 'Corta'), mkAsp(4, 'Clima de aula', 'positivo', 'x'.repeat(60)), mkAsp(3, 'Clima de aula', 'positivo'), mkAsp(2, 'Clima de aula', 'positivo')];
  assert.strictEqual(calcularAspectos(rev, asp, modeloOk).fortalezas[0].cita.texto, 'x'.repeat(60));
  const solo = [1, 2, 3].map(r => mkAsp(r, 'Clima de aula', 'positivo', 'Corta ' + r));
  assert.strictEqual(calcularAspectos(rev, solo, modeloOk).fortalezas[0].cita.texto, 'Corta 3');
});
t('Acción sugerida: solo en oportunidades; Asistencia / formato sin acción', () => {
  const asp = [].concat(filasDe('Carga de trabajo', 0, 5, 0, 1), filasDe('Asistencia / formato', 0, 5, 0, 1), filasDe('Clima de aula', 5, 0, 0, 1));
  const r = calcularAspectos(mkReviews(20), asp, modeloOk);
  assert.strictEqual(r.fortalezas[0].accion, null);
  assert.strictEqual(r.oportunidades.find(x => x.aspecto === 'Carga de trabajo').accion, 'Publicar calendario de carga y recortar solapes');
  assert.strictEqual(r.oportunidades.find(x => x.aspecto === 'Asistencia / formato').accion, null);
});

console.log('Compuerta C: acierto por signo (I1.5 v1.5)');
const modeloC = { estado: 'en_calibracion', f1_micro: 0.65, f1_por_aspecto: {
  'Calidad de clase': { f1_pol: 0.77, prec_pos: 0.87, n_pred_pos: 97, prec_neg: 0.88, n_pred_neg: 83 },
  'Rigor de calificación': { f1_pol: 0.64, prec_pos: 0.25, n_pred_pos: 8, prec_neg: 0.0, n_pred_neg: 3 },
  'Carga de trabajo': { f1_pol: 0.40, prec_pos: 0.67, n_pred_pos: 3, prec_neg: 0.67, n_pred_neg: 15 },
  'Clima de aula': { f1_pol: 0.66, prec_pos: 0.81, n_pred_pos: 37, prec_neg: null, n_pred_neg: 0 } } };
t('Rigor no entra a tarjetas aunque su F1 (0.64) pase el piso anterior', () => {
  const r = calcularAspectos(mkReviews(20), [].concat(filasDe('Rigor de calificación', 5, 0, 0, 1), filasDe('Rigor de calificación', 0, 0, 0)), modeloC);
  assert.strictEqual(r.fortalezas.length, 0);
  assert.strictEqual(r.detalle[0].en_top_permitido, false);           // sigue en detalle
});
t('Carga: oportunidad visible (prec − 0.67, n 15) aunque su F1 (0.40) sea bajo; como fortaleza no (n+ = 3 < 10)', () => {
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Carga de trabajo', 0, 5, 0, 1), modeloC).oportunidades.length, 1);
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Carga de trabajo', 5, 0, 0, 1), modeloC).fortalezas.length, 0);
});
t('Clima: fortaleza sí (0.81), oportunidad no (el modelo nunca marcó −)', () => {
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Clima de aula', 5, 0, 0, 1), modeloC).fortalezas.length, 1);
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Clima de aula', 0, 5, 0, 1), modeloC).oportunidades.length, 0);
});
t('Umbrales configurables y f1_por_aspecto como texto JSON', () => {
  const m = Object.assign({}, modeloC, { f1_por_aspecto: JSON.stringify(modeloC.f1_por_aspecto) });
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Carga de trabajo', 0, 5, 0, 1), m).oportunidades.length, 1);
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Carga de trabajo', 0, 5, 0, 1), m, { PREC_MIN_VISIBLE: 0.7 }).oportunidades.length, 0);
});
t('Respaldo: modelo sin precisión por signo usa el piso de F1 (comportamiento anterior)', () => {
  const m = { estado: 'en_calibracion', f1_micro: 0.5, f1_por_aspecto: { 'Rigor de calificación': { f1_pol: 0.64 } } };
  assert.strictEqual(calcularAspectos(mkReviews(20), filasDe('Rigor de calificación', 5, 0, 0, 1), m).fortalezas.length, 1);
});

console.log('Diagnóstico por subtema (I1.7 v1.5)');
const { diagnosticar, CATALOGO } = require('./catalogo.js');
t('Carga: gana el subtema con más citas negativas; la cita mostrada lo respalda; conteos reales', () => {
  const rev = mkReviews(10, i => ({ post_date: '2017-01-0' + (i + 1) }));
  const asp = [
    mkAsp(1, 'Carga de trabajo', 'negativo', 'Way too much reading, three chapters every single week of the course.'),
    mkAsp(2, 'Carga de trabajo', 'negativo', 'The reading load is insane and the books are long and dense to get through.'),
    mkAsp(3, 'Carga de trabajo', 'negativo', 'Homework is due every night and it never ends during the whole semester.'),
    mkAsp(4, 'Carga de trabajo', 'negativo', 'Too much work for a general education class, honestly it is overwhelming.')];
  const o = calcularAspectos(rev, asp, modeloOk).oportunidades[0];
  assert.strictEqual(o.accion_id, 'CAR-lectura');
  assert.strictEqual(o.subtema, 'Volumen de lectura');
  assert.deepStrictEqual(o.diagnostico_n, { coinciden: 2, total: 4 });
  assert.ok(/reading/i.test(o.cita.texto));                              // la cita respalda el diagnóstico
});
t('Sin palabras clave: acción general y sin diagnóstico', () => {
  const o = calcularAspectos(mkReviews(20), filasDe('Carga de trabajo', 0, 5, 0, 1), modeloOk).oportunidades[0];
  assert.strictEqual(o.subtema, null);
  assert.strictEqual(o.accion, 'Publicar calendario de carga y recortar solapes');
});
t('Empate entre subtemas: gana el primero del catálogo', () => {
  assert.strictEqual(diagnosticar('Carga de trabajo', ['Lots of reading.', 'Lots of homework.']).id, 'CAR-lectura');
});
t('Palabras clave del catálogo con frases realistas', () => {
  const casos = [
    ['Calidad de clase', 'He just reads off the slides the whole class.', 'CAL-diapositivas'],
    ['Calidad de clase', 'Very confusing lectures, I was lost all semester.', 'CAL-explicacion'],
    ['Calidad de clase', 'She talks so fast that nobody can keep up.', 'CAL-ritmo'],
    ['Calidad de clase', 'So boring, half the class falls asleep.', 'CAL-interes'],
    ['Calidad de clase', 'He has no idea what he is talking about.', 'CAL-dominio'],
    ['Accesibilidad y trato', 'Never responds to emails.', 'ACC-correos'],
    ['Accesibilidad y trato', 'Never available during office hours.', 'ACC-horario'],
    ['Accesibilidad y trato', 'She is rude and condescending to students.', 'ACC-trato'],
    ['Accesibilidad y trato', 'He refuses to help if you ask a question.', 'ACC-ayuda'],
    ['Organización / proyectos', 'The group project was a nightmare.', 'ORG-equipo'],
    ['Organización / proyectos', 'He changed the due dates three times.', 'ORG-cambios'],
    ['Organización / proyectos', 'Very disorganized, lectures are all over the place.', 'ORG-desorden'],
    ['Organización / proyectos', 'Grades are never posted on Blackboard.', 'ORG-plataforma'],
    ['Claridad de evaluación', 'The exams are nothing like the homework.', 'CLA-desalineado'],
    ['Claridad de evaluación', 'No rubric, you never know what she wants.', 'CLA-criterios'],
    ['Claridad de evaluación', 'The study guide did not help at all.', 'CLA-guias'],
    ['Claridad de evaluación', 'Grading is random and unfair.', 'CLA-arbitrario'],
    ['Retroalimentación', 'Took forever to get our papers back.', 'RET-tarde'],
    ['Retroalimentación', 'You just get a grade with no comments.', 'RET-sin-comentarios'],
    ['Clima de aula', 'He yells at students and it is intimidating.', 'CLI-hostil'],
    ['Carga de trabajo', 'Two essays and a research paper due the same week.', 'CAR-escritura'],
    ['Carga de trabajo', 'A quiz every class and three exams.', 'CAR-estudio']];
  const malos = casos.filter(([a, txt, id]) => (diagnosticar(a, [txt]) || {}).id !== id).map(([a, txt, id]) => id + ' <- ' + txt + ' (obtuvo ' + (diagnosticar(a, [txt]) || {}).id + ')');
  assert.deepStrictEqual(malos, []);
});
t('«I mean» no cuenta como trato grosero; «she is mean» sí', () => {
  assert.strictEqual(diagnosticar('Accesibilidad y trato', ['I mean, the class was fine but whatever.']).subtema, null);
  assert.strictEqual(diagnosticar('Accesibilidad y trato', ['She is mean to everyone.']).id, 'ACC-trato');
});
t('Asistencia / formato sigue sin acción; Rigor solo tiene acción general', () => {
  assert.strictEqual(diagnosticar('Asistencia / formato', ['pop quizzes']), null);
  assert.strictEqual(diagnosticar('Rigor de calificación', ['unfair grading']).subtema, null);
  assert.ok(Object.values(CATALOGO).every(e => !e || e.subtemas.every(s => s.accion && !/\d+ ?%/.test(s.accion)))); // sin cifras inventadas
});

console.log('Vista');
const { htmlFranjaAspectos } = require('./aspectos_vista.js');
t('La tarjeta de oportunidad muestra diagnóstico con conteos y escapa el texto', () => {
  const html = htmlFranjaAspectos({ estado: 'en_calibracion', umbral: 3, insignia: null, fortalezas: [],
    oportunidades: [{ aspecto: 'Carga de trabajo', n_menciones: 4, n_pos: 0, n_neg: 4, cita: { texto: '<b>reading</b>', fecha: null, estrellas: 2 },
      subtema: 'Volumen de lectura', diagnostico_n: { coinciden: 2, total: 4 }, accion: 'Hacer X' }] });
  assert.ok(html.includes('Diagnóstico:') && html.includes('Volumen de lectura') && html.includes('2 de 4 menciones negativas'));
  assert.ok(html.includes('&lt;b&gt;reading') && !html.includes('<b>reading'));
});

console.log('\n' + n + ' pruebas ejecutadas' + (process.exitCode ? ' — CON FALLAS' : ' — todas pasan'));
