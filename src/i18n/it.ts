import type { Locale } from "./types";

export const it: Locale = {
  appTitle: "Simulatore di Stampa Flessografica",
  pressTypes: { ci: "CI Larga", inline: "Inline Stretta" },
  inkTypes: { waterBased: "Base acqua", solvent: "Solvente", uv: "UV" },
  eyebrow: (p, i) =>
    `${p === "ci" ? "CI larga" : "Inline stretta"} · ${
      i === "uv" ? "UV" : i === "solvent" ? "Solvente" : "Base acqua"
    }`,

  actions: {
    resetJob: "Reimposta lavoro",
    makePerfect: "Impostazione perfetta",
    finishRun: "Termina tiratura",
    continueTuning: "Continua la regolazione",
    practice: "Pratica",
    showHints: "Mostra suggerimenti",
    operate: "Operare",
    learn: "Apprendere",
    cancel: "Annulla",
    customPdf: "PDF personalizzato…",
  },

  tabs: { printedOutput: "Stampa", pressModel: "Modello pressa" },

  metrics: {
    setupQuality: "Qualità di impostazione",
    waste: "Scarto",
    dryingRisk: "Rischio essiccazione",
    register: "Registro",
    job: "Lavoro",
    density: "Densità",
    sctv: "SCTV",
    registerStatus: { good: "Buono", ok: "OK", bad: "Scarso" },
  },

  pressSettings: {
    webTension: {
      label: "Tensione nastro",
      tip: "Controlla quanto strettamente il substrato viene trainato attraverso la pressa. Troppo lento causa oscillazione e deriva del registro; troppo teso rischia di allungare o strappare il substrato, distorcendo l'immagine stampata.",
    },
    dryerTemperature: {
      label: "Temperatura essiccatore",
      tip: "Imposta la temperatura dell'essiccatore ad aria calda che polimerizza l'inchiostro tra le stazioni. Troppo bassa lascia l'inchiostro umido causando sbavature; troppo alta può restringere o delaminare il substrato.",
    },
    pressSpeed: {
      label: "Velocità pressa",
      tip: "La velocità con cui il nastro scorre attraverso la pressa in piedi al minuto. Velocità più alte aumentano la produzione ma danno all'inchiostro meno tempo per trasferirsi ed essiccarsi, aumentando il rischio di essiccazione e spesso riducendo la densità.",
    },
    uvPower: { label: "Potenza UV" },
  },

  channelSettings: {
    aniloxRoll: "Cilindro anilox",
    inkColor: "Colore inchiostro",
    labels: {
      aniloxVolume: "Anilox",
      viscosity: "Viscosità",
      impression: "Impressione",
      strength: "Concentrazione",
    },
    tips: {
      aniloxRoll: "L'anilox è un cilindro inciso che dosifica un preciso volume di inchiostro. Una cella più fine (BCM inferiore) deposita meno inchiostro per lavori di dettaglio; una cella più grande fornisce più inchiostro per coperture piatte.",
      viscosity: "La viscosità dell'inchiostro controlla il flusso. Inchiostri a bassa viscosità si trasferiscono più facilmente e si livellano, migliorando la nitidezza del punto. Inchiostri ad alta viscosità mantengono l'inchiostro in posizione, preservando i dettagli su retini fini.",
      strength: "Concentrazione del pigmento. Maggiore concentrazione dà colore ricco con film più leggeri; minore concentrazione produce risultati più pallidi che potrebbero richiedere depositi di inchiostro più pesanti per raggiungere gli obiettivi di densità.",
      impression: "Quanto la lastra preme nel substrato. Troppo poco dà un trasferimento debole e incompleto; troppo comprime i punti (aumento di punto), chiude le alte luci e accelera l'usura della lastra.",
      registration: "Allinea ogni lastra di colore in modo che tutti i canali si sovrappongano correttamente. Il fuori registro appare come frange di colore lungo i bordi. Sposta il canale selezionato di 0,1 mil per tocco; punta ad avere tutti i canali entro ±0,5 mil.",
    },
  },

  stationLabels: {
    anilox: "Anilox",
    viscosity: "Viscosità",
    impression: "Impressione",
    strength: "Concentrazione",
    plate: "Lastra",
  },

  coach: {
    title: "Coaching",
    guidedSetup: "Impostazione guidata",
    practiceMode: "Modalità pratica",
    noWarningsGuided: "Nessun avviso attivo. Continua a regolare verso la finestra obiettivo.",
    noWarningsPractice: "I suggerimenti sono nascosti. Le metriche e il comportamento di stampa continuano ad aggiornarsi.",
  },

  score: {
    runSummary: "Riepilogo tiratura",
    quality: "Qualità",
    waste: "Scarto",
    stability: "Stabilità",
    grades: { pressReady: "Pronto per la stampa", gettingClose: "Quasi pronto", needsWork: "Da migliorare" },
  },

  coachingMessages: {
    "impression-heavy": "La pressione di impressione è eccessiva; attenzione all'aumento di punto, stampa sporca e schiacciamento dei bordi.",
    "impression-light": "La pressione di impressione è insufficiente; ci si aspetta un trasferimento debole, salti o pinholes.",
    "drying-risk": "Il rischio di essiccazione sta aumentando; ridurre la velocità o il carico di inchiostro, oppure aumentare la temperatura dell'essiccatore.",
    "registration-offset": "Il registro è visibilmente fuori target. Avvicinare gli offset di colore a zero.",
    "press-ready": "L'impostazione è all'interno della finestra di pronto per la stampa.",
  },

  education: {
    ciDrum: {
      name: "Cilindro Centrale di Pressione",
      description: "Un grande cilindro in acciaio lavorato con precisione contro cui stampano tutte le stazioni. Il nastro lo avvolge così che ogni colore stampa su una superficie perfettamente supportata con lo stesso riferimento di pressione — il principale vantaggio delle presse CI rispetto ai disegni a torre in linea.",
    },
    aniloxRoll: {
      name: "Cilindro Anilox",
      description: "Un cilindro ceramico o cromato inciso con miliardi di minuscole celle. Ogni cella contiene un volume preciso di inchiostro misurato in BCM (miliardi di micrometri cubici per pollice quadrato) e lo trasferisce alla lastra. Il cilindro anilox è il controllo principale della quantità di inchiostro che raggiunge il substrato.",
    },
    doctorBlade: {
      name: "Racla",
      description: "Una lama sottile in acciaio o polimero premuta contro il cilindro anilox in angolo di strascico. Rimuove l'inchiostro in eccesso dalla superficie del cilindro, lasciando solo l'inchiostro nelle celle incise. Il materiale della lama, l'angolo e la pressione di contatto influenzano la precisione della dosatura.",
    },
    containmentBlade: {
      name: "Lama di Contenimento",
      description: "La lama anteriore del sistema a camera inchiostro. Sigilla la parte frontale della camera dell'inchiostro contro il cilindro anilox per evitare fuoriuscite. Insieme alla racla forma il serbatoio dell'inchiostro completamente chiuso.",
    },
    inkChamber: {
      name: "Camera dell'Inchiostro",
      description: "Un serbatoio chiuso che fornisce inchiostro al cilindro anilox sotto pressione controllata. L'inchiostro viene pompato continuamente e ricircolato per mantenere viscosità e temperatura costanti. I sistemi a camera riducono lo spreco di inchiostro e l'evaporazione del solvente rispetto alle vasche aperte.",
    },
    plateCylinder: {
      name: "Cilindro Portalastra",
      description: "Porta la lastra di stampa fotopolimerica. Le aree in rilievo della lastra raccolgono l'inchiostro dall'anilox e lo trasferiscono al substrato nel punto di contatto con il cilindro CI. La pressione lastra-substrato è un'impostazione critica: troppo leggera dà un trasferimento debole, troppo pesante provoca aumento di punto e usura accelerata della lastra.",
    },
    web: {
      name: "Nastro (Substrato)",
      description: "Il rotolo continuo di film, lamina o carta da stampare. Su una pressa CI il nastro avvolge strettamente il cilindro centrale così che ogni stazione di colore stampa su una superficie dimensionalmente stabile e ben supportata, conferendo alle presse CI un registro eccezionale su tutti i colori.",
    },
    inlinePress: {
      name: "Pressa Inline Stretta",
      description: "Le stazioni sono disposte in fila orizzontale e ognuna ha il proprio cilindro di pressione. Il nastro attraversa ogni stazione in sequenza anziché avvolgere un cilindro centrale condiviso. Gli errori di registro possono accumularsi da stazione a stazione, rendendo la configurazione meccanica precisa ancora più critica che su una pressa CI.",
    },
    impressionCylinder: {
      name: "Cilindro di Pressione",
      description: "Su una pressa inline ogni stazione ha il proprio cilindro di pressione che supporta il substrato al punto di stampa. La pressione di impressione viene impostata indipendentemente per stazione, offrendo maggiore flessibilità ma richiedendo calibrazione individuale.",
    },
    fountainRoll: {
      name: "Cilindro Fontana",
      description: "Un cilindro rivestito in gomma che ruota parzialmente immerso nella vasca dell'inchiostro. Raccoglie un film di inchiostro e lo trasferisce al cilindro anilox. La velocità del cilindro fontana rispetto all'anilox influenza la quantità di inchiostro fornita al sistema.",
    },
    interStationDryer: {
      name: "Essiccatore / Lampada UV Interstation",
      description: "Su una pressa inline il nastro passa attraverso un'unità di essiccazione o indurimento tra ogni stazione di stampa. Ciò consente all'inchiostro di assestarsi prima che venga applicato il colore successivo, riducendo i problemi di trapping e consentendo la stampa in senso inverso su film trasparente. Le lampade UV polimerizzano istantaneamente l'inchiostro senza calore; gli essiccatori ad aria calda evaporano il solvente o l'acqua.",
    },
  },

  readingPdf: "Lettura PDF…",
  languageLabel: "Lingua",
  languageNames: { en: "English", es: "Español", de: "Deutsch", it: "Italiano" },
};
