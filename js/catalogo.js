/* catalogo.js — acciones sugeridas por aspecto y SUBTEMA (PRD base §7.5; PRD módulo IA I1.7 v1.5).
   Es texto de producto, NO datos del CSV: nunca afirma cifras sobre los alumnos.
   El subtema se elige con palabras clave (en inglés, como los comentarios) sobre las citas NEGATIVAS del profesor
   para ese aspecto: gana el subtema que aparece en más citas (empate: el primero de la lista). Si ninguno aparece,
   se usa la acción general del aspecto. "Asistencia / formato" no tiene acción asignada (I1.7).
   Borrador para revisión: ver docs/CATALOGO_ACCIONES.md.                                                         */
(function (root) {
  'use strict';

  const CATALOGO = {
    'Calidad de clase': {
      general: 'Grabar o publicar un esquema de cada sesión',
      subtemas: [
        { id: 'CAL-diapositivas', nombre: 'Clase leída de diapositivas o del libro',
          claves: ["\\breads?\\b.{0,25}\\b(slides?|power ?points?|ppts?|book|textbook|notes)\\b", "\\bread(s|ing)? (directly |straight |word for word )?(off|from|out of)\\b", "\\bpower ?points?\\b", "\\bslides?\\b"],
          accion: 'Usar las diapositivas solo como guía y dedicar parte de cada sesión a ejemplos resueltos y preguntas en vivo.' },
        { id: 'CAL-explicacion', nombre: 'Explicaciones poco claras',
          claves: ["\\bconfus(ing|ed)\\b", "\\b(can'?t|cannot|doesn'?t|does not|unable to|never) (really )?explain", "\\bhard to (understand|follow)\\b", "\\bunclear\\b", "\\blost\\b", "\\bmakes? no sense\\b"],
          accion: 'Comprobar la comprensión a mitad de clase con una pregunta o ejercicio breve y volver a explicar con otro ejemplo cuando haga falta.' },
        { id: 'CAL-ritmo', nombre: 'Ritmo de la clase',
          claves: ["\\b(too|so|very|really) (fast|quick(ly)?)\\b", "\\btalks? (very |so |too )?fast\\b", "\\brush(es|ed|ing)?\\b", "\\bpace\\b", "\\bgoes? too slow"],
          accion: 'Fijar pocos objetivos por sesión, cerrar con un resumen y dejar el detalle adicional como material de consulta.' },
        { id: 'CAL-interes', nombre: 'Clase poco interesante',
          claves: ["\\bboring\\b", "\\bdull\\b", "\\bmonoton\\w*", "\\b(fall|fell|falling) asleep\\b", "\\bmundane\\b", "\\bdry\\b", "\\bsleep\\b"],
          accion: 'Abrir cada tema con un caso o problema real e incluir una actividad breve de participación en cada sesión.' },
        { id: 'CAL-dominio', nombre: 'Dominio del tema cuestionado',
          claves: ["\\b(doesn'?t|does not|don'?t) know\\b", "\\bno idea\\b", "\\b(under|un)-?qualified\\b", "\\bmistakes?\\b", "\\bwrong\\b", "\\buneducated\\b"],
          accion: 'Preparar notas de clase revisadas y aclarar en la sesión siguiente los errores que se detecten.' }
      ]
    },
    'Accesibilidad y trato': {
      general: 'Horario de oficina visible y canal asíncrono',
      subtemas: [
        { id: 'ACC-correos', nombre: 'Respuesta a correos y mensajes',
          claves: ["\\be-?mails?\\b", "\\bmessages?\\b", "\\b(respond|reply|replies|answer)s?\\b.{0,20}\\b(e-?mails?|messages?|questions?)\\b", "\\bnever (responds?|replies|answers?|gets? back)\\b"],
          accion: 'Comprometer un plazo de respuesta a correos y mensajes y publicarlo en el programa del curso.' },
        { id: 'ACC-horario', nombre: 'Disponibilidad fuera de clase',
          claves: ["\\boffice hours?\\b", "\\b(un)?availab(le|ility)\\b", "\\bhard to (find|reach|contact|get a hold of)\\b", "\\bappointments?\\b", "\\bnever (there|in (his|her) office)\\b"],
          accion: 'Publicar un horario de atención fijo y ofrecer una alternativa en línea o con cita previa.' },
        { id: 'ACC-trato', nombre: 'Trato hacia los estudiantes',
          claves: ["\\brude\\b", "\\b(is|was|so|very|really|pretty|kinda|kind of|just) mean\\b", "\\bcondescending\\b", "\\bdisrespect\\w*", "\\barrogant\\b", "\\byell(s|ed|ing)?\\b", "\\bbelittl\\w*", "\\binsult\\w*", "\\battitude\\b", "\\bdegrading\\b"],
          accion: 'Responder dudas sin descalificar, acordar normas de trato respetuoso y pedir retroalimentación anónima a mitad del curso.' },
        { id: 'ACC-ayuda', nombre: 'Poca disposición a ayudar',
          claves: ["\\b(not|never|won'?t|doesn'?t|does not|unwilling to|refuses? to) (really )?help\\w*", "\\bunhelpful\\b", "\\b(doesn'?t|does not|don'?t) care\\b", "\\bon your own\\b"],
          accion: 'Reservar tiempo al final de cada clase para dudas individuales y señalar los recursos de apoyo disponibles (asesorías, tutorías).' }
      ]
    },
    'Carga de trabajo': {
      general: 'Publicar calendario de carga y recortar solapes',
      subtemas: [
        { id: 'CAR-lectura', nombre: 'Volumen de lectura',
          claves: ["\\bread(ing|ings)?\\b", "\\bchapters?\\b", "\\bpages\\b", "\\bbooks?\\b", "\\barticles?\\b", "\\bnovels?\\b"],
          accion: 'Distinguir lecturas obligatorias de opcionales e indicar qué partes son esenciales para la evaluación.' },
        { id: 'CAR-tareas', nombre: 'Tareas frecuentes',
          claves: ["\\bhomework\\b", "\\bassignments?\\b", "\\bbusy ?work\\b", "\\bevery (single )?(night|day)\\b", "\\bworksheets?\\b", "\\bproblem sets?\\b"],
          accion: 'Revisar la frecuencia y extensión de las tareas, retirar las que no aportan a la evaluación y publicar el calendario de entregas al inicio.' },
        { id: 'CAR-escritura', nombre: 'Ensayos y trabajos escritos',
          claves: ["\\bpapers?\\b", "\\bessays?\\b", "\\bwriting\\b", "\\breports?\\b", "\\bprojects?\\b"],
          accion: 'Escalonar los trabajos escritos a lo largo del curso y dividir los extensos en entregas parciales con retroalimentación.' },
        { id: 'CAR-estudio', nombre: 'Exámenes y estudio',
          claves: ["\\btests?\\b", "\\bexams?\\b", "\\bquizz?(es)?\\b", "\\bmemoriz\\w*", "\\bstudy(ing)?\\b"],
          accion: 'Repartir la evaluación en más instancias de menor peso y entregar guías con el alcance de cada examen.' }
      ]
    },
    'Organización / proyectos': {
      general: 'Roles y hitos de equipo por escrito',
      subtemas: [
        { id: 'ORG-equipo', nombre: 'Proyectos en equipo',
          claves: ["\\bgroups?\\b", "\\bteams?\\b", "\\bpartners?\\b", "\\bgroup members?\\b"],
          accion: 'Definir por escrito roles, hitos y una coevaluación entre pares para los proyectos en equipo.' },
        { id: 'ORG-cambios', nombre: 'Cambios de fechas o reglas',
          claves: ["\\bchang(e|es|ed|ing)\\b.{0,25}\\b(dates?|deadlines?|syllabus|schedule|rules|due)\\b", "\\blast[- ]minute\\b", "\\b(moved|pushed|postponed)\\b", "\\bsyllabus\\b", "\\bdeadlines?\\b"],
          accion: 'Publicar el calendario completo al inicio y anunciar cualquier cambio por escrito y con anticipación.' },
        { id: 'ORG-desorden', nombre: 'Desorden en la clase',
          claves: ["\\b(dis|un)organi[sz]ed\\b", "\\ball over the place\\b", "\\bchaotic\\b", "\\bmess(y)?\\b", "\\bno (clear )?structure\\b", "\\bscattered\\b", "\\bunprepared\\b", "\\bnot (well )?prepared\\b"],
          accion: 'Compartir al inicio de cada sesión la agenda del día y mantener una estructura de clase constante.' },
        { id: 'ORG-plataforma', nombre: 'Materiales y plataforma del curso',
          claves: ["\\bblackboard\\b", "\\bcanvas\\b", "\\bmoodle\\b", "\\bwebsite\\b", "\\bposts?(ed)?\\b", "\\bonline\\b"],
          accion: 'Mantener la plataforma del curso al día con materiales, fechas y calificaciones en un solo lugar.' }
      ]
    },
    'Claridad de evaluación': {
      general: 'Publicar rúbrica y ejemplos de desempeño',
      subtemas: [
        { id: 'CLA-desalineado', nombre: 'Exámenes distintos a lo visto en clase',
          claves: ["\\bnothing like\\b", "\\b(not|never) (covered|taught|discussed|went over|gone over)\\b", "\\b(different|unlike) (from |than )?(what|the) ", "\\btested on\\b", "\\bwhat'?s on the (test|exam)\\b", "\\bnot (on|in) the (notes|lectures?|book)\\b"],
          accion: 'Alinear cada examen con objetivos publicados y mostrar ejemplos del tipo de preguntas que se evaluarán.' },
        { id: 'CLA-criterios', nombre: 'Criterios de calificación poco claros',
          claves: ["\\brubrics?\\b", "\\bcriteria\\b", "\\bgrading (scale|policy|system|criteria)\\b", "\\bexpectations?\\b", "\\bunclear\\b", "\\bvague\\b", "\\b(don'?t|never) know what (he|she|they) wants?\\b", "\\bwhy (you|i) (got|lost|get)\\b"],
          accion: 'Publicar la rúbrica de cada entrega con ejemplos de desempeño y explicar cómo se asignan los puntos.' },
        { id: 'CLA-guias', nombre: 'Guías de estudio y repasos',
          claves: ["\\bstudy guides?\\b", "\\breview (sheets?|sessions?|guides?)\\b", "\\bpractice (tests?|exams?|problems|questions)\\b"],
          accion: 'Entregar guías de estudio que reflejen el alcance y el tipo de preguntas del examen.' },
        { id: 'CLA-arbitrario', nombre: 'Calificación percibida como arbitraria',
          claves: ["\\bunfair(ly)?\\b", "\\brandom\\b", "\\barbitrar\\w*", "\\binconsistent\\b", "\\bfavorites?\\b", "\\bbias(ed)?\\b"],
          accion: 'Calificar con la rúbrica a la vista, justificar cada descuento al devolver la evaluación y ofrecer un canal de revisión.' }
      ]
    },
    'Retroalimentación': {
      general: 'Devolver comentarios escritos en un plazo fijo por entrega',
      subtemas: [
        { id: 'RET-tarde', nombre: 'Devolución tardía',
          claves: ["\\blate\\b", "\\bslow(ly)?\\b", "\\b(takes?|took) (forever|weeks|months|a long time)\\b", "\\bnever (got|get|returned?|gave)\\b", "\\bstill (waiting|haven'?t)\\b"],
          accion: 'Comprometer un plazo fijo de devolución de trabajos y comunicarlo al recibir cada entrega.' },
        { id: 'RET-sin-comentarios', nombre: 'Calificaciones sin comentarios',
          claves: ["\\bno (feedback|comments?|explanation)\\b", "\\bwithout (any )?(feedback|comments?|explanation)\\b", "\\b(just|only) (a )?(grade|number|score|letter)\\b"],
          accion: 'Acompañar cada calificación con al menos un comentario sobre qué mejorar y otro sobre qué funcionó.' },
        { id: 'RET-tono', nombre: 'Retroalimentación poco constructiva',
          claves: ["\\bharsh\\b", "\\bsarcas\\w*", "\\brude\\b", "\\bcondescending\\b", "\\b(is|was|so|very|really|pretty|kinda|kind of|just) mean\\b", "\\bbelittl\\w*"],
          accion: 'Redactar los comentarios en términos de criterios y del siguiente paso, sin juicios sobre la persona.' }
      ]
    },
    'Clima de aula': {
      general: 'Normas de respeto y participación explícitas',
      subtemas: [
        { id: 'CLI-hostil', nombre: 'Ambiente tenso u hostil',
          claves: ["\\bhostile\\b", "\\bintimidat\\w*", "\\byell(s|ed|ing)?\\b", "\\bscary\\b", "\\bafraid\\b", "\\bembarrass\\w*", "\\bhumiliat\\w*", "\\bcalls? (you|students|people) out\\b"],
          accion: 'Establecer normas explícitas de participación y respeto, y corregir errores sin exponer a los estudiantes frente al grupo.' },
        { id: 'CLI-entusiasmo', nombre: 'Poco entusiasmo',
          claves: ["\\b(no|not much|lack of|without|little) (enthusiasm|energy|passion|interest)\\b", "\\bmonoton\\w*", "\\bunenthusiastic\\b", "\\bdisinterested\\b"],
          accion: 'Conectar cada tema con su utilidad o con casos actuales y variar la dinámica de la sesión.' },
        { id: 'CLI-sarcasmo', nombre: 'Comentarios sarcásticos o fuera de lugar',
          claves: ["\\bsarcas\\w*", "\\binappropriate\\b", "\\boffensive\\b", "\\bjokes?\\b"],
          accion: 'Evitar el sarcasmo dirigido a estudiantes y mantener el humor en temas del curso.' }
      ]
    },
    'Rigor de calificación': {
      general: 'Separar exigencia de claridad: exámenes alineados a lo enseñado',
      subtemas: []
    },
    'Asistencia / formato': null
  };

  // Compila las expresiones una sola vez.
  Object.keys(CATALOGO).forEach(function (a) {
    const e = CATALOGO[a];
    if (e) e.subtemas.forEach(function (s) { s.rx = s.claves.map(function (k) { return new RegExp(k, 'i'); }); });
  });

  function coincide(subtema, texto) {
    return subtema.rx.some(function (r) { return r.test(String(texto || '')); });
  }

  // Compatibilidad: acción general del aspecto (o null).
  function accionPara(aspecto) {
    const e = CATALOGO[aspecto];
    return e ? e.general : null;
  }

  /* diagnosticar(aspecto, textosNegativos) ->
       null si el aspecto no tiene acción;
       { id, subtema, accion, n_coinciden, n_total, coincide(texto) } con subtema = null si ninguna palabra clave aparece. */
  function diagnosticar(aspecto, textos) {
    const e = CATALOGO[aspecto];
    if (!e) return null;
    textos = (textos || []).filter(function (t) { return t; });
    let mejor = null;
    e.subtemas.forEach(function (s) {
      const n = textos.filter(function (t) { return coincide(s, t); }).length;
      if (n > 0 && (!mejor || n > mejor.n)) mejor = { s: s, n: n };
    });
    if (!mejor) return { id: null, subtema: null, accion: e.general, n_coinciden: 0, n_total: textos.length, coincide: null };
    return { id: mejor.s.id, subtema: mejor.s.nombre, accion: mejor.s.accion, n_coinciden: mejor.n, n_total: textos.length,
             coincide: function (t) { return coincide(mejor.s, t); } };
  }

  const api = { CATALOGO: CATALOGO, accionPara: accionPara, diagnosticar: diagnosticar,
                CATALOGO_ACCIONES: Object.fromEntries(Object.keys(CATALOGO).map(function (a) { return [a, accionPara(a)]; })) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Catalogo = api;
})(typeof window !== 'undefined' ? window : globalThis);
