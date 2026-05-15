import type { Locale } from "./types";

export const es: Locale = {
  appTitle: "Simulador de Prensa Flexográfica",
  pressTypes: { ci: "CI Banda Ancha", inline: "Línea Estrecha" },
  inkTypes: { waterBased: "Base agua", solvent: "Solvente", uv: "UV" },
  eyebrow: (p, i) =>
    `${p === "ci" ? "CI banda ancha" : "Línea estrecha"} · ${
      i === "uv" ? "UV" : i === "solvent" ? "Solvente" : "Base agua"
    }`,

  actions: {
    resetJob: "Reiniciar trabajo",
    makePerfect: "Ajuste perfecto",
    finishRun: "Terminar tirada",
    continueTuning: "Seguir ajustando",
    practice: "Practicar",
    showHints: "Mostrar pistas",
    operate: "Operar",
    learn: "Aprender",
    cancel: "Cancelar",
    customPdf: "PDF personalizado…",
  },

  tabs: { printedOutput: "Impresión", pressModel: "Modelo de prensa" },

  metrics: {
    setupQuality: "Calidad de ajuste",
    waste: "Desperdicio",
    dryingRisk: "Riesgo de secado",
    register: "Registro",
    job: "Trabajo",
    density: "Densidad",
    sctv: "SCTV",
    registerStatus: { good: "Bien", ok: "Regular", bad: "Mal" },
  },

  pressSettings: {
    webTension: {
      label: "Tensión de banda",
      tip: "Controla qué tan tenso está el sustrato al pasar por la prensa. Muy flojo causa oscilación y desviación de registro; muy tenso puede estirar o rasgar el material, distorsionando la imagen impresa.",
    },
    dryerTemperature: {
      label: "Temperatura del secador",
      tip: "Establece la temperatura del secador de aire caliente que cura la tinta entre estaciones. Muy baja deja la tinta húmeda y causa manchas; muy alta puede encoger o delaminar el sustrato.",
    },
    pressSpeed: {
      label: "Velocidad de prensa",
      tip: "Velocidad a la que avanza la banda en pies por minuto. Mayor velocidad aumenta la producción pero da menos tiempo a la tinta para transferirse y secarse, elevando el riesgo de secado y reduciendo la densidad.",
    },
    uvPower: { label: "Potencia UV" },
  },

  channelSettings: {
    aniloxRoll: "Rodillo anilox",
    inkColor: "Color de tinta",
    labels: {
      aniloxVolume: "Anilox",
      viscosity: "Viscosidad",
      impression: "Impresión",
      strength: "Concentración",
    },
    tips: {
      aniloxRoll: "El anilox es un rodillo grabado que dosifica un volumen preciso de tinta. Una celda más fina (BCM menor) deposita menos tinta para trabajos de detalle; una celda más gruesa aplica más para coberturas sólidas.",
      viscosity: "La viscosidad controla el flujo de la tinta. Viscosidades bajas transfieren mejor y nivelan el punto, mejorando la suavidad. Viscosidades altas retienen la tinta y preservan el detalle en tramas finas.",
      strength: "Concentración de pigmento. Mayor concentración da color intenso con menos tinta; menor concentración produce resultados más pálidos que pueden requerir depósitos más pesados para alcanzar las densidades objetivo.",
      impression: "Presión de contacto entre la placa y el sustrato. Poca presión da transferencia débil e incompleta; demasiada aplasta los puntos (ganancia de punto), cierra altas luces y acelera el desgaste de la placa.",
      registration: "Alinea cada placa de color para que todos los canales sobreimpriman correctamente. El desregistro se ve como franjas de color en los bordes. Mueve el canal seleccionado 0,1 mil por toque; busca que todos los canales queden dentro de ±0,5 mil.",
    },
  },

  stationLabels: {
    anilox: "Anilox",
    viscosity: "Viscosidad",
    impression: "Impresión",
    strength: "Concentración",
    plate: "Plancha",
  },

  coach: {
    title: "Asistente",
    guidedSetup: "Ajuste guiado",
    practiceMode: "Modo práctica",
    noWarningsGuided: "Sin alertas activas. Sigue ajustando hacia la ventana objetivo.",
    noWarningsPractice: "Las pistas están ocultas. Las métricas y el comportamiento de impresión siguen actualizándose.",
  },

  score: {
    runSummary: "Resumen de tirada",
    quality: "Calidad",
    waste: "Desperdicio",
    stability: "Estabilidad",
    grades: { pressReady: "Listo para imprimir", gettingClose: "Casi listo", needsWork: "Necesita ajuste" },
  },

  coachingMessages: {
    "impression-heavy": "La impresión es excesiva; vigila la ganancia de punto, la impresión sucia y el aplastamiento de bordes.",
    "impression-light": "La impresión es insuficiente; espera transferencia débil, saltos o pinholes.",
    "drying-risk": "El riesgo de secado está subiendo; reduce la velocidad o la carga de tinta, o aumenta la temperatura del secador.",
    "registration-offset": "El registro está visiblemente fuera de objetivo. Acerca los desplazamientos de color a cero.",
    "press-ready": "El ajuste está dentro de la ventana de listo para imprimir.",
  },

  education: {
    ciDrum: {
      name: "Tambor de Impresión Central",
      description: "Gran cilindro de acero mecanizado con precisión contra el que imprimen todas las estaciones. La banda lo rodea para que cada color imprima sobre una superficie perfectamente soportada con la misma referencia de impresión — la ventaja clave de las prensas CI sobre los diseños de pilas en línea.",
    },
    aniloxRoll: {
      name: "Rodillo Anilox",
      description: "Rodillo cerámico o cromado grabado con miles de millones de celdas microscópicas. Cada celda retiene un volumen preciso de tinta en BCM (miles de millones de micrones cúbicos por pulgada cuadrada) y la transfiere a la placa. El anilox es el control principal de cuánta tinta llega al sustrato.",
    },
    doctorBlade: {
      name: "Rasqueta",
      description: "Lámina delgada de acero o polímero presionada contra el rodillo anilox en ángulo de arrastre. Raspa el exceso de tinta de la superficie, dejando solo la tinta retenida en las celdas grabadas. El material, el ángulo y la presión de contacto afectan la precisión del dosificado.",
    },
    containmentBlade: {
      name: "Rasqueta de Contención",
      description: "La rasqueta delantera del sistema de cámara de tinta. Sella la parte frontal de la cámara contra el rodillo anilox para evitar que la tinta escape. Junto con la rasqueta principal forma el depósito de tinta completamente cerrado.",
    },
    inkChamber: {
      name: "Cámara de Tinta",
      description: "Depósito cerrado que suministra tinta al rodillo anilox bajo presión controlada. La tinta se bombea continuamente y se recircula para mantener viscosidad y temperatura constantes. Los sistemas de cámara reducen el desperdicio de tinta y la evaporación de solvente en comparación con las bandejas abiertas.",
    },
    plateCylinder: {
      name: "Cilindro Portaplanchas",
      description: "Lleva la plancha de impresión fotopolimérica. Las áreas de imagen en relieve toman tinta del anilox y la transfieren al sustrato en el punto de contacto con el tambor CI. La presión plancha-sustrato es un ajuste crítico: muy poca da transferencia débil, demasiada causa ganancia de punto y desgaste acelerado de la plancha.",
    },
    web: {
      name: "Banda (Sustrato)",
      description: "El rollo continuo de película, foil o papel que se imprime. En una prensa CI la banda abraza firmemente el tambor central para que cada estación imprima sobre una superficie dimensionalmente estable y bien soportada, dando a las prensas CI un registro excepcional entre todos los colores.",
    },
    inlinePress: {
      name: "Prensa en Línea Banda Estrecha",
      description: "Las estaciones están dispuestas en línea horizontal y cada una tiene su propio cilindro de impresión. La banda pasa por cada estación secuencialmente en lugar de rodear un tambor central compartido. Los errores de registro pueden acumularse de estación en estación, lo que hace que la configuración mecánica precisa sea más crítica que en una prensa CI.",
    },
    impressionCylinder: {
      name: "Cilindro de Impresión",
      description: "En una prensa en línea cada estación tiene su propio cilindro de impresión que respalda el sustrato en el punto de contacto. La presión de impresión se ajusta de forma independiente por estación, lo que da más flexibilidad pero requiere calibración individual.",
    },
    fountainRoll: {
      name: "Rodillo de Fuente",
      description: "Rodillo recubierto de caucho que gira parcialmente sumergido en la bandeja de tinta. Recoge una película de tinta y la transfiere al rodillo anilox. La velocidad del rodillo de fuente relativa al anilox afecta la cantidad de tinta suministrada al sistema.",
    },
    interStationDryer: {
      name: "Secador / Lámpara UV Interestacional",
      description: "En una prensa en línea la banda pasa por una unidad de secado o curado entre cada estación de impresión. Esto permite que la tinta se fije antes de aplicar el siguiente color, reduciendo problemas de trampa y permitiendo la impresión inversa en película transparente. Las lámparas UV curan la tinta al instante sin calor; los secadores de aire caliente evaporan el solvente o el agua.",
    },
  },

  readingPdf: "Leyendo PDF…",
  languageLabel: "Idioma",
  languageNames: { en: "English", es: "Español", de: "Deutsch", it: "Italiano" },
};
