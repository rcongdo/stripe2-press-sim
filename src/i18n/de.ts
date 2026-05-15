import type { Locale } from "./types";

export const de: Locale = {
  appTitle: "Flexodruck-Simulator",
  pressTypes: { ci: "CI Breitbahn", inline: "Inline Schmalbahn" },
  inkTypes: { waterBased: "Wasserbasiert", solvent: "Lösemittel", uv: "UV" },
  eyebrow: (p, i) =>
    `${p === "ci" ? "CI Breitbahn" : "Inline Schmalbahn"} · ${
      i === "uv" ? "UV" : i === "solvent" ? "Lösemittel" : "Wasserbasiert"
    }`,

  actions: {
    resetJob: "Auftrag zurücksetzen",
    makePerfect: "Perfekt einstellen",
    finishRun: "Drucklauf beenden",
    continueTuning: "Weiter einstellen",
    practice: "Üben",
    showHints: "Hinweise anzeigen",
    operate: "Bedienen",
    learn: "Lernen",
    cancel: "Abbrechen",
    customPdf: "PDF hochladen…",
  },

  tabs: { printedOutput: "Druckbild", pressModel: "Maschinenmodell" },

  metrics: {
    setupQuality: "Einstellqualität",
    waste: "Ausschuss",
    dryingRisk: "Trocknungsrisiko",
    register: "Register",
    job: "Auftrag",
    density: "Dichte",
    sctv: "SCTV",
    registerStatus: { good: "Gut", ok: "OK", bad: "Schlecht" },
  },

  pressSettings: {
    webTension: {
      label: "Bahnspannung",
      tip: "Steuert, wie straff das Substrat durch die Presse gezogen wird. Zu locker verursacht Schlingern und Registerabweichungen; zu straff riskiert Dehnung oder Riss, was das Druckbild verzerrt.",
    },
    dryerTemperature: {
      label: "Trockentemperatur",
      tip: "Legt die Temperatur des Heißlufttrockners fest, der die Farbe zwischen den Stationen härtet. Zu niedrig lässt die Farbe nass und verursacht Schmieren; zu hoch kann das Substrat schrumpfen oder delaminieren.",
    },
    pressSpeed: {
      label: "Druckgeschwindigkeit",
      tip: "Gibt an, wie schnell die Bahn die Presse in Fuß pro Minute durchläuft. Höhere Geschwindigkeiten steigern den Durchsatz, geben der Farbe aber weniger Zeit zum Übertragen und Trocknen, erhöhen das Trocknungsrisiko und verringern oft die Dichte.",
    },
    uvPower: { label: "UV-Leistung" },
  },

  channelSettings: {
    aniloxRoll: "Rasterwalze",
    inkColor: "Farbe",
    labels: {
      aniloxVolume: "Rasterwalze",
      viscosity: "Viskosität",
      impression: "Anpressdruck",
      strength: "Farbstärke",
    },
    tips: {
      aniloxRoll: "Die Rasterwalze dosiert ein präzises Farbvolumen. Eine feinere Gravur (niedrigerer BCM-Wert) trägt weniger Farbe für Feinarbeit auf; eine gröbere Gravur fördert mehr Farbe für Volltondeckung.",
      viscosity: "Die Farbviskosität steuert den Farbfluss. Niederviskose Farben übertragen besser und verlaufen gleichmäßig, was die Punktschärfe verbessert. Hochviskose Farben fließen weniger und erhalten scharfe Details bei feinen Rastern.",
      strength: "Pigmentkonzentration. Höhere Farbstärke ergibt satten Farbauftrag bei geringerem Farbgewicht; niedrigere Farbstärke ergibt blassere Ergebnisse, die möglicherweise höhere Farbauflagen erfordern, um Dichtezielvorgaben zu erreichen.",
      impression: "Anpressdruck der Druckform auf das Substrat. Zu gering führt zu schwacher, unvollständiger Übertragung; zu hoch quetscht Punkte (Tonwertzunahme), schließt Lichter und beschleunigt den Druckformverschleiß.",
      registration: "Richtet jede Farbdruckform aus, damit alle Kanäle korrekt übereinander drucken. Passerfehler zeigen sich als Farbfransen an Kanten. Ausgewählten Kanal 0,1 mil pro Schritt verschieben; alle Kanäle innerhalb ±0,5 mil anstreben.",
    },
  },

  stationLabels: {
    anilox: "Rasterwalze",
    viscosity: "Viskosität",
    impression: "Anpressdruck",
    strength: "Farbstärke",
    plate: "Druckform",
  },

  coach: {
    title: "Coaching",
    guidedSetup: "Geführte Einrichtung",
    practiceMode: "Übungsmodus",
    noWarningsGuided: "Keine aktiven Warnungen. Weiter auf das Zielfenster hin einstellen.",
    noWarningsPractice: "Hinweise ausgeblendet. Messwerte und Druckverhalten werden weiterhin aktualisiert.",
  },

  score: {
    runSummary: "Laufzusammenfassung",
    quality: "Qualität",
    waste: "Ausschuss",
    stability: "Stabilität",
    grades: { pressReady: "Druckbereit", gettingClose: "Fast druckbereit", needsWork: "Nachbesserung nötig" },
  },

  coachingMessages: {
    "impression-heavy": "Anpressdruck zu hoch; Tonwertzunahme, Schmierflecken und Kantenquetschung beobachten.",
    "impression-light": "Anpressdruck zu gering; schwache Farbübertragung, Aussetzer oder Pinholes zu erwarten.",
    "drying-risk": "Das Trocknungsrisiko steigt; Geschwindigkeit oder Farbmenge reduzieren oder Trockentemperatur erhöhen.",
    "registration-offset": "Das Register ist sichtbar außerhalb des Ziels. Farbabweichungen näher an null bringen.",
    "press-ready": "Die Einstellung liegt im druckbereiten Fenster.",
  },

  education: {
    ciDrum: {
      name: "Zentralzylinder",
      description: "Ein großer, präzisionsgefertigter Stahlzylinder, gegen den alle Druckstationen drucken. Die Bahn umschlingt ihn, sodass jede Farbe auf einer perfekt gestützten Fläche mit derselben Anpressreferenz druckt — der Hauptvorteil von CI-Pressen gegenüber Stapeldruckmaschinen.",
    },
    aniloxRoll: {
      name: "Rasterwalze",
      description: "Eine gravierte Keramik- oder Chromwalze mit Milliarden winziger Zellen. Jede Zelle hält ein präzises Farbvolumen in BCM (Milliarden Kubik-Mikrometer pro Quadratzoll) und überträgt es auf die Druckform. Die Rasterwalze ist die primäre Steuerung für die Farbmenge, die das Substrat erreicht.",
    },
    doctorBlade: {
      name: "Abstreifrakel",
      description: "Eine dünne Stahl- oder Polymerrakel, die im Schleppwinkel gegen die Rasterwalze gedrückt wird. Sie wischt überschüssige Farbe von der Walzenoberfläche, sodass nur die Farbe in den gravierten Zellen verbleibt. Material, Winkel und Kontaktdruck beeinflussen die Dosiergenauigkeit.",
    },
    containmentBlade: {
      name: "Gegenmesser",
      description: "Die vordere Rakel des Kammerrakelsystems. Sie dichtet die Vorderseite der Farbkammer gegen die Rasterwalze ab, um ein Auslaufen der Farbe zu verhindern. Zusammen mit der Abstreifrakel bildet sie den vollständig geschlossenen Farbvorratsbehälter.",
    },
    inkChamber: {
      name: "Farbkammer",
      description: "Ein geschlossener Behälter, der die Rasterwalze unter kontrolliertem Druck mit Farbe versorgt. Die Farbe wird kontinuierlich eingepumpt und umgewälzt, um gleichmäßige Viskosität und Temperatur zu gewährleisten. Kammerrakelsysteme reduzieren Farbabfall und Lösemittelverdampfung im Vergleich zu offenen Farbbehältern.",
    },
    plateCylinder: {
      name: "Formzylinder",
      description: "Trägt die Fotopolymer-Druckform. Erhabene Bildbereiche nehmen Farbe von der Rasterwalze auf und übertragen sie am Druckspalt mit dem Zentralzylinder auf das Substrat. Der Anpressdruck ist eine kritische Einstellung: zu gering gibt schwache Übertragung, zu stark verursacht Tonwertzunahme und beschleunigten Druckformverschleiß.",
    },
    web: {
      name: "Bedruckstoff (Bahn)",
      description: "Die kontinuierliche Rolle aus Folie, Verbundmaterial oder Papier, die bedruckt wird. Bei einer CI-Presse umschlingt die Bahn den Zentralzylinder eng, sodass jede Farbstation auf einer dimensionsstabilen, gut gestützten Fläche druckt — was CI-Pressen eine außergewöhnliche Registergenauigkeit über alle Farben hinweg gibt.",
    },
    inlinePress: {
      name: "Inline-Schmalbahnpresse",
      description: "Druckstationen sind in einer horizontalen Linie angeordnet, jede mit eigenem Gegendruckzylinder. Die Bahn läuft sequenziell durch jede Station, statt einen gemeinsamen Zentralzylinder zu umschlingen. Registerfehler können sich von Station zu Station akkumulieren, was eine präzise mechanische Einrichtung noch wichtiger macht als bei CI-Pressen.",
    },
    impressionCylinder: {
      name: "Gegendruckzylinder",
      description: "Bei einer Inline-Presse hat jede Station einen eigenen Gegendruckzylinder, der das Substrat am Druckspalt stützt. Der Anpressdruck wird stationsunabhängig eingestellt, was mehr Flexibilität bietet, aber eine individuelle Kalibrierung erfordert.",
    },
    fountainRoll: {
      name: "Tauchwalze",
      description: "Eine gummibeschichtete Walze, die teilweise in die Farbe eingetaucht rotiert. Sie nimmt einen Farbfilm auf und überträgt ihn auf die Rasterwalze. Die Drehzahl der Tauchwalze relativ zur Rasterwalze beeinflusst die dem System zugeführte Farbmenge.",
    },
    interStationDryer: {
      name: "Zwischentrockner / UV-Lampe",
      description: "Bei einer Inline-Presse läuft die Bahn zwischen jeder Druckstation durch eine Trocknungs- oder Härtungseinheit. Dies ermöglicht das Abbinden der Farbe, bevor die nächste Farbe aufgebracht wird, was Trapping-Probleme verringert und den Rückdruck auf klarer Folie ermöglicht. UV-Lampen härten Farbe sofort ohne Wärme; Heißlufttrockner verdampfen Lösemittel oder Wasser.",
    },
  },

  readingPdf: "PDF wird gelesen…",
  languageLabel: "Sprache",
  languageNames: { en: "English", es: "Español", de: "Deutsch", it: "Italiano" },
};
