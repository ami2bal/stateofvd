/**
 * Presentation meta for Mode Parcours (TASK-097).
 * Overlay ONLY — does not modify flows. Maps step ids → legal + activity icon.
 * Bases légales indicatives (LGC / LOCE) pour la pédagogie.
 */

/** @type {Record<string, { legal: string, activity: string, roomId?: string, prose: string }>} */
export const STEP_META = {
  // S1 petit-credit
  "step-1-adopte-ce": {
    legal: "Séance du Conseil d'État — collège (LOCE)",
    activity: "college",
    roomId: "college-ce",
    prose:
      "Le collège des 7 adopte le projet d'EMPD. C'est la décision collégiale de l'exécutif.",
  },
  "step-2-saisine": {
    legal: "Transmission / navette — saisine du Grand Conseil",
    activity: "handover",
    roomId: "sgc",
    prose:
      "La Chancellerie transmet le dossier au Secrétariat général du Grand Conseil (navette).",
  },
  "step-3-rapports": {
    legal: "Examen en commission — LGC (commissions)",
    activity: "commission",
    roomId: "commission",
    prose:
      "La commission examine l'objet et dépose son rapport (préavis avant plénum).",
  },
  "step-4-eem": {
    legal: "Entrée en matière — art. 94 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le plénum vote l'entrée en matière : le Grand Conseil accepte de traiter l'objet.",
  },
  "step-5-debats": {
    legal: "Débats en plénum — LGC (séance)",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Les débats s'ouvrent à l'hémicycle : discussion de l'objet en séance.",
  },
  "step-6-vote-final": {
    legal: "Mise au vote — LGC (scrutin)",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Les débats se closent ; le dossier est mis au vote final.",
  },
  "step-7-adopte-gc": {
    legal: "Scrutin final — art. 101 LGC (majorité simple)",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Scrutin final du Grand Conseil. Choisissez l'issue : adoption (suite du parcours) ou refus (fin de branche).",
  },
  "step-8-publication": {
    legal: "Publication FAO — Cst-VD art. 84 / délai référendaire",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "La Chancellerie publie le texte (FAO). Le délai référendaire commence à courir.",
  },
  "step-9-promulgue": {
    legal: "Promulgation de l'acte — Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose: "L'acte est promulgué par la Chancellerie. Le circuit du tutoriel s'achève.",
  },
  // S2 credit-qui-fache (ids from credit-qui-fache.js)
  "s2-1-adopte-ce": {
    legal: "Séance du Conseil d'État — collège (LOCE)",
    activity: "college",
    roomId: "college-ce",
    prose: "Le collège adopte le crédit d'ouvrage (montant élevé).",
  },
  "s2-2-saisine": {
    legal: "Transmission / navette — saisine du Grand Conseil",
    activity: "handover",
    roomId: "sgc",
    prose: "Navette vers le Grand Conseil pour un crédit d'ouvrage > 2 mio.",
  },
  "s2-3-rapports": {
    legal: "Rapports majorité + minorité — LGC",
    activity: "commission",
    roomId: "commission",
    prose:
      "La commission dépose les rapports de majorité et de minorité (conflit).",
  },
  "s2-4-eem": {
    legal: "Entrée en matière — art. 94 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Vote d'entrée en matière sur le crédit d'ouvrage.",
  },
  "s2-5-debats": {
    legal: "Débats — LGC (2e lecture)",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Débats en plénum sur le crédit (lecture de conflit).",
  },
  "s2-6-vote-final": {
    legal: "Mise au vote — LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Clôture des débats et mise au scrutin final.",
  },
  "s2-7-scrutin": {
    legal: "Majorité absolue — art. 102 LGC (≥ 76/150)",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Scrutin final : crédit d'ouvrage soumis à la majorité absolue des membres.",
  },
  "s2-8-publication": {
    legal: "Publication FAO — Cst-VD art. 84 / délai référendaire",
    activity: "publish",
    roomId: "chancellerie",
    prose: "La Chancellerie publie l'acte (FAO) et ouvre le délai référendaire.",
  },
  "s2-9-promulgue": {
    legal: "Promulgation de l'acte — Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose: "Promulgation : fin du parcours S2 (branche adoptée).",
  },
  // S3 motion (TASK-103)
  "s3-1-depot": {
    legal: "Dépôt de motion — art. 120 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Un·e député·e dépose une motion motivée exposant la législation souhaitée.",
  },
  "s3-2-renvoi": {
    legal: "Inscription / renvoi commission — art. 106/120 LGC",
    activity: "commission",
    roomId: "bureau-gc",
    prose:
      "Le Bureau inscrit la motion ; examen préalable possible en commission.",
  },
  "s3-3-prise-en-consideration": {
    legal: "★ Prise en considération — art. 125 LGC (fusible)",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le plénum peut prendre en considération (totalement/partiellement), refuser, ou fixer un délai particulier. Ce n'est pas l'entrée en matière.",
  },
  "s3-4-renvoi-ce": {
    legal: "Mandat au CE — art. 120 al. 1 LGC",
    activity: "handover",
    roomId: "college-ce",
    prose:
      "Le GC charge le Conseil d'État de présenter un projet de loi ou de décret.",
  },
  "s3-5-delai": {
    legal: "Délai de réponse du CE — art. 111 LGC",
    activity: "college",
    roomId: "csg",
    prose:
      "Le CE répond dans le délai (rapport intermédiaire à 1 an au moins sauf disposition contraire).",
  },
  "s3-6-projet-ce": {
    legal: "Présentation du projet — circuit législatif",
    activity: "handover",
    roomId: "bureau-gc",
    prose:
      "Le CE présente un EMPD/EMPL : le dossier rejoint le circuit législatif au GC.",
  },
  // S4 interpellation (TASK-104) — contrôle, 0 acte
  "s4-1-depot": {
    legal: "Dépôt d'interpellation — art. 115 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Un·e député·e adresse au CE une demande d'explications sur un fait du gouvernement ou de l'administration.",
  },
  "s4-2-developpement": {
    legal: "Développement en plénum — art. 115 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "L'interpellateur·rice développe sa demande à l'hémicycle.",
  },
  "s4-3-preparation-ce": {
    legal: "CE représenté — art. 137 LGC",
    activity: "college",
    roomId: "college-ce",
    prose:
      "Le Conseil d'État prépare sa réponse ; il doit être représenté (art. 137).",
  },
  "s4-4-reponse-ce": {
    legal: "Réponse du CE — art. 115 / délai art. 111",
    activity: "handover",
    roomId: "plenum-gc",
    prose: "Réponse orale ou écrite du CE en plénum.",
  },
  "s4-5-satisfaction": {
    legal: "Satisfaction — art. 115 LGC (★ 0 acte)",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Déclaration de satisfaction ou non. Aucun vote contraignant, aucune publication.",
  },
  "s4-6-resolution-optionnelle": {
    legal: "Résolution optionnelle — art. 136 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "L'assemblée peut exprimer un vœu par résolution si 20 députés la soutiennent — hors acte législatif.",
  },
  // S5 pétition (TASK-105) — post-107 départ SGC
  "s5-1-depot": {
    legal: "Dépôt / réception SGC — art. 105 LGC · art. 31 Cst-VD",
    activity: "citizen",
    roomId: "sgc",
    prose:
      "Un·e citoyen·ne dépose une pétition adressée au GC ; le SGC la reçoit (art. 27-31).",
  },
  "s5-2-renvoi-commission": {
    legal: "Renvoi commission des pétitions — art. 105/106 LGC",
    activity: "commission",
    roomId: "commission",
    prose: "Le Bureau renvoie la pétition à la Commission des pétitions.",
  },
  "s5-3-examen": {
    legal: "Examen en commission — art. 105 LGC",
    activity: "commission",
    roomId: "commission",
    prose:
      "La commission examine et rapporte (prise en considération, renvoi CE ou classement).",
  },
  "s5-4-gc-statue": {
    legal: "★ Obligation de réponse — art. 105 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le GC statue. Dans toutes les issues, il est tenu de répondre au pétitionnaire.",
  },
  "s5-5-reponse-ce": {
    legal: "Réponse du CE — art. 111 LGC",
    activity: "college",
    roomId: "college-ce",
    prose: "Si renvoi au CE : étude et réponse dans le délai.",
  },
  "s5-6-reponse-petitionnaire": {
    legal: "Notification au pétitionnaire — art. 105 LGC",
    activity: "handover",
    roomId: "sgc",
    prose: "La réponse est notifiée via le SGC — obligation art. 105 clôturée.",
  },
  // S11 résolution (V1)
  "res-1-depot": {
    legal: "Dépôt de résolution — art. 136 LGC (20 soutiens)",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Des député·e·s déposent une résolution avec 20 soutiens : déclaration ou vœu sans effet contraignant.",
  },
  "res-2-inscription": {
    legal: "Inscription à l'ordre du jour — art. 136 LGC",
    activity: "handover",
    roomId: "bureau-gc",
    prose: "Le Bureau inscrit la résolution ; le SGC prépare la séance.",
  },
  "res-3-vote": {
    legal: "Vote de la résolution — art. 136 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le plénum débat et vote. ★ Ce n'est pas un projet d'acte : pas de FAO.",
  },
  "res-4-suivi": {
    legal: "Suivi du vœu — pratique (≈ 3 mois)",
    activity: "college",
    roomId: "college-ce",
    prose: "Le CE suit le vœu exprimé (délai indicatif ≈ 3 mois).",
  },
  // S12 détermination (V1) — suite d'interpellation
  "det-1-contexte": {
    legal: "Suite d'interpellation — art. 117 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Après la réponse du CE à une interpellation (S4), un·e député·e peut déposer une détermination.",
  },
  "det-2-depot": {
    legal: "Dépôt de détermination — art. 117 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Détermination déposée : déclaration ou vœu lié à l'objet de l'interpellation.",
  },
  "det-3-vote": {
    legal: "Adoption de la détermination — art. 117 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le plénum adopte (ou rejette) la détermination. Suivi du vœu ≈ 3 mois. ★ Pas d'acte.",
  },
  // S13 initiative (V1)
  "ini-1-depot": {
    legal: "Dépôt d'initiative — art. 127 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Dépôt d'un projet déjà rédigé (≠ motion, qui invite seulement à légiférer).",
  },
  "ini-2-preavis": {
    legal: "Préavis du CE — art. 127+ LGC",
    activity: "college",
    roomId: "college-ce",
    prose: "Le CE rend un préavis dans le délai fixé par le GC.",
  },
  "ini-3-comm": {
    legal: "Examen en commission — LGC",
    activity: "commission",
    roomId: "commission",
    prose: "La commission examine l'initiative après préavis et dépose un rapport.",
  },
  "ini-4-plenum": {
    legal: "Débat plénier — art. 127–135 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le plénum statue : adoption (→ circuit d'acte), rejet, ou transformation…",
  },
  "ini-5-suite": {
    legal: "Circuit projet d'acte (renvoi pédagogique)",
    activity: "handover",
    roomId: "sgc",
    prose:
      "Si le texte est retenu, suite = circuit projet d'acte (voir S1/S6). Fin pédagogique S13.",
  },
  // S14 demande de grâce (V1 + préambule hors carte)
  "gr-0-preambule": {
    legal: "Parcours préalable — hors plateau (cadrage produit)",
    activity: "citizen",
    roomId: "sgc",
    prose:
      "Préambule : la requête est préparée hors institutions cartographiées. Le flux jouable démarre à la réception SGC.",
  },
  "gr-1-depot": {
    legal: "Réception SGC — art. 103 LGC",
    activity: "handover",
    roomId: "sgc",
    prose:
      "Le Secrétariat général du Grand Conseil reçoit la demande de grâce (point d'entrée institutionnel).",
  },
  "gr-2-rapport": {
    legal: "Rapport ≥ 5 jours avant — art. 104 LGC",
    activity: "commission",
    roomId: "commission",
    prose: "Le rapport est distribué au moins cinq jours avant le scrutin.",
  },
  "gr-3-scrutin": {
    legal: "★ Scrutin secret sans discussion — art. 104 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Vote secret, sans discussion. UI du secret encore simplifiée (vote générique).",
  },
  // S15 séance GC (V2) — rituel journée
  "ss15-1-odj": {
    legal: "Bureau — ordre du jour (LGC attributions)",
    activity: "handover",
    roomId: "bureau-gc",
    prose:
      "Le Bureau arrête l'ordre du jour : objets, temps, priorités de la séance.",
  },
  "ss15-2-convocation": {
    legal: "SGC — convocation et dossiers",
    activity: "handover",
    roomId: "sgc",
    prose:
      "Le Secrétariat général convoque, distribue les rapports et prépare la séance.",
  },
  "ss15-3-ouverture": {
    legal: "Ouverture de séance — plénum (mardi)",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Ouverture en hémicycle : quorum, communications, séance ouverte.",
  },
  "ss15-4-debat": {
    legal: "Débat en plénum — objet à l'ODJ",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Débat sur l'objet appelé. Le type d'objet change les règles de fond (voir instruments S1–S14).",
  },
  "ss15-5-vote": {
    legal: "Scrutin — art. 101/102/104 LGC (selon objet)",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Mise au vote. Majorité simple, qualifiée ou secrète selon l'objet — ici vote pédagogique générique.",
  },
  "ss15-6-cloture": {
    legal: "Clôture / procès-verbal — SGC",
    activity: "handover",
    roomId: "sgc",
    prose:
      "Clôture de séance et procès-verbal. Les objets poursuivent leur cycle propre.",
  },
  // S20 non-entrée en matière (B4-4)
  "s20-1-adopte-ce": {
    legal: "Adoption collège — LOCE",
    activity: "college",
    roomId: "college-ce",
    prose:
      "Le collège adopte l'EMPD. Le dossier part vers le GC — l'issue n'est pas garantie.",
  },
  "s20-2-saisine": {
    legal: "Navette → Grand Conseil",
    activity: "handover",
    roomId: "sgc",
    prose: "Transmission au SGC / saisine pour examen en commission.",
  },
  "s20-3-rapports": {
    legal: "Rapport de commission — LGC",
    activity: "commission",
    roomId: "commission",
    prose:
      "Préavis défavorable : le climat politique prépare un refus d'entrée en matière.",
  },
  "s20-4-non-eem": {
    legal: "Non-entrée en matière — art. 94 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le plénum refuse d'entrer en matière : projet classé, pas de débats de fond. Fin ✕.",
  },
  // S21 Bureau ODJ (B4-5)
  "s21-1-bureau": {
    legal: "Bureau — ordre du jour (LGC attributions)",
    activity: "handover",
    roomId: "bureau-gc",
    prose:
      "Le Bureau arrête le projet d'ODJ : objets, ordre, temps — décision d'agenda.",
  },
  "s21-2-sgc": {
    legal: "SGC — convocation et dossiers",
    activity: "handover",
    roomId: "sgc",
    prose:
      "Le Secrétariat général convoque et prépare les dossiers selon l'ODJ du Bureau.",
  },
  "s21-3-plenum": {
    legal: "Plénum — ouverture / ODJ acté (mardi)",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "En hémicycle, l'ordre du jour est acté. Les objets pourront être appelés.",
  },
  "s21-4-fin": {
    legal: "Agenda de séance figé — SGC",
    activity: "handover",
    roomId: "sgc",
    prose:
      "L'ODJ est figé pour la séance. Mini-parcours spatial Bureau → SGC → plénum terminé.",
  },
  // S22 délai référendaire (B4-1)
  "s22-1-adopte": {
    legal: "Texte adopté — GC (repère pédagogique)",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "L'acte est adopté. Ce n'est pas la fin du circuit : la publication ouvre le délai référendaire.",
  },
  "s22-2-fao": {
    legal: "Publication FAO — Cst-VD art. 84",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "La Chancellerie publie à la FAO : le délai référendaire commence. Ancrage spatial = Chancellerie.",
  },
  "s22-3-horloge": {
    legal: "Délai en cours — art. 84 (hors carte pour le peuple)",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "Le délai court. Signatures éventuelles hors plateau. Sur la carte : institution + horloge, pas d'urne.",
  },
  "s22-4-silence": {
    legal: "Fin de délai sans aboutissement → promulgation",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "Silence du corps électoral : promulgation. (Aboutissement + votation → S17.)",
  },
  // S23 urgence (B4-3)
  "s23-1-ce": {
    legal: "Adoption collège en urgence — LOCE",
    activity: "college",
    roomId: "college-ce",
    prose: "Tag urgence : le collège adopte hors rythme « confortable » (contraste S1).",
  },
  "s23-2-navette": {
    legal: "Saisine prioritaire du GC",
    activity: "handover",
    roomId: "sgc",
    prose: "Navette accélérée vers le Secrétariat du Grand Conseil.",
  },
  "s23-3-commission": {
    legal: "Commission — examen express",
    activity: "commission",
    roomId: "commission",
    prose: "Moins d'étapes commission : un rapport en délai court.",
  },
  "s23-4-plenum": {
    legal: "Entrée en matière (urgence) — art. 94 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "EEM en procédure accélérée.",
  },
  "s23-5-vote": {
    legal: "Débat court + vote final",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Débat compressé et scrutin — cycle court vs S1.",
  },
  "s23-6-promulgue": {
    legal: "Promulgation — Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose: "Acte promulgué. Fin du parcours urgence S23.",
  },
  // S24 navette CE↔GC monisme (B4-2)
  "s24-1-ce": {
    legal: "Adoption EMPL — collège CE",
    activity: "college",
    roomId: "college-ce",
    prose: "Le CE initie le projet. Monisme : pas une 2e chambre législative.",
  },
  "s24-2-navette1": {
    legal: "1re navette → Grand Conseil",
    activity: "handover",
    roomId: "sgc",
    prose: "Première traversée Place du Château → Parlement.",
  },
  "s24-3-commission": {
    legal: "Rapport / préavis d'amendement",
    activity: "commission",
    roomId: "commission",
    prose: "La commission prépare des amendements.",
  },
  "s24-4-eem": {
    legal: "Entrée en matière — art. 94 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Le plénum accepte d'entrer en matière.",
  },
  "s24-5-amende": {
    legal: "Amendement en plénum — GC législatif",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Le GC amende le texte (seul législatif).",
  },
  "s24-6-retour-ce": {
    legal: "Navette retour — texte amendé au CE",
    activity: "handover",
    roomId: "chancellerie",
    prose: "Retour au Château : le CE examine le texte amendé (pas co-législateur).",
  },
  "s24-7-ce2": {
    legal: "Position du collège sur le texte amendé",
    activity: "college",
    roomId: "college-ce",
    prose: "Le collège se positionne ; la décision finale reste au GC.",
  },
  "s24-8-navette2": {
    legal: "2e navette → Grand Conseil",
    activity: "handover",
    roomId: "sgc",
    prose: "Deuxième traversée vers le législatif.",
  },
  "s24-9-vote": {
    legal: "Vote final de la loi — plénum GC",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Scrutin final au seul législatif cantonal.",
  },
  "s24-10-fin": {
    legal: "Formalisation Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose: "Fin S24 — navette sous monisme cantonal.",
  },
  // S16 séance CE (V2) — rituel collège
  "ss16-1-csg": {
    legal: "CSG — préparation agenda collège (pratique)",
    activity: "handover",
    roomId: "csg",
    prose:
      "La Conférence des secrétaires généraux coordonne et prépare l'agenda du collège.",
  },
  "ss16-2-dossiers": {
    legal: "Finalisation des dossiers collège",
    activity: "handover",
    roomId: "chancellerie",
    prose:
      "Dossiers finalisés (notes, projets) avant la séance collégiale du mercredi.",
  },
  "ss16-3-college": {
    legal: "Séance collégiale — LOCE (mercredi)",
    activity: "college",
    roomId: "college-ce",
    prose:
      "Les 7 membres du CE délibèrent et décident collégialement.",
  },
  "ss16-4-suite": {
    legal: "Formalisation Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "La Chancellerie formalise et transmet. Si projet d'acte pour le GC : navette vers le SGC.",
  },
  // S6 EMPL loi
  "loi-1-ce": {
    legal: "Adoption collège — EMPL",
    activity: "college",
    roomId: "college-ce",
    prose: "Le collège adopte l'EMPL (exposé des motifs et projet de loi).",
  },
  "loi-2-saisine": {
    legal: "Navette → Grand Conseil",
    activity: "handover",
    roomId: "sgc",
    prose: "Transmission du projet de loi au SGC / saisine du GC.",
  },
  "loi-3-commission": {
    legal: "Rapport de commission",
    activity: "commission",
    roomId: "commission",
    prose: "La commission examine et dépose son rapport.",
  },
  "loi-4-eem": {
    legal: "Entrée en matière — art. 94 LGC",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Le plénum vote l'entrée en matière sur le projet de loi.",
  },
  "loi-5-debats": {
    legal: "Débats — lectures",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Débats en plénum (lectures).",
  },
  "loi-6-vote": {
    legal: "Vote final de la loi",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Scrutin final et mise au point du texte.",
  },
  "loi-7-pub": {
    legal: "Publication FAO — délai référendaire art. 84",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "Publication à la Feuille des avis officiels ; ouverture du délai référendaire facultatif.",
  },
  "loi-8-promulgue": {
    legal: "Promulgation",
    activity: "publish",
    roomId: "chancellerie",
    prose: "Promulgation après échéance du délai (ou sans référendum).",
  },
  // S8 postulat
  "post-1-depot": {
    legal: "Dépôt de postulat — art. 118 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Dépôt d'un postulat : mandat d'étude, pas un projet d'acte.",
  },
  "post-2-prise": {
    legal: "Prise en considération",
    activity: "vote",
    roomId: "plenum-gc",
    prose: "Le GC prend en considération et charge le CE d'étudier.",
  },
  "post-3-ce": {
    legal: "Transmission au CE — art. 111",
    activity: "handover",
    roomId: "college-ce",
    prose: "Le CE est saisi pour étude et rapport.",
  },
  "post-4-rapport": {
    legal: "Rapport d'étude du CE",
    activity: "handover",
    roomId: "bureau-gc",
    prose: "Le CE dépose un rapport (pas forcément un EMPD).",
  },
  "post-5-cloture": {
    legal: "Prise d'acte du rapport",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Le GC prend acte — clôture du cycle postulat.",
  },
  // S9 simple question
  "sq-1-depot": {
    legal: "Dépôt — art. 113 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Simple question écrite : demande de renseignement au CE.",
  },
  "sq-2-ce": {
    legal: "Préparation réponse — art. 114 (4 semaines)",
    activity: "college",
    roomId: "college-ce",
    prose: "Le CE prépare une réponse écrite.",
  },
  "sq-3-reponse": {
    legal: "Remise de la réponse écrite",
    activity: "handover",
    roomId: "sgc",
    prose: "Réponse écrite sans discussion en plénum.",
  },
  // S10 question orale
  "qo-1-depot": {
    legal: "Dépôt 1er mardi — art. 112 LGC",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Question orale d'actualité déposée le 1er mardi du mois.",
  },
  "qo-2-reponse": {
    legal: "Réponse orale 2e mardi — art. 112",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Réponse orale du CE en plénum le 2e mardi.",
  },
  // S7 budget annuel (enrichi)
  "bud-1-dfa": {
    legal: "Instruction DFA — projet de budget",
    activity: "handover",
    roomId: "dep-dfa-cabinet",
    prose:
      "Le DFA (Finances et agriculture) instruit le projet de budget en amont de l'année (automne).",
  },
  "bud-2-csg": {
    legal: "CSG — agenda collège",
    activity: "handover",
    roomId: "csg",
    prose:
      "La CSG coordonne et inscrit le dossier à l'agenda du collège.",
  },
  "bud-3-college": {
    legal: "Adoption collège — mercredi CE",
    activity: "college",
    roomId: "college-ce",
    prose: "Le collège adopte l'EMPD budgétaire porté par le DFA.",
  },
  "bud-4-saisine": {
    legal: "Navette Chancellerie → SGC",
    activity: "handover",
    roomId: "sgc",
    prose: "Saisine du Grand Conseil pour l'examen budgétaire.",
  },
  "bud-5-comm": {
    legal: "Commission des finances",
    activity: "commission",
    roomId: "commission",
    prose: "Examen et rapport avant le débat en plénum.",
  },
  "bud-6-debats": {
    legal: "Livrable 1 — budget de fonctionnement",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Débats sur le budget de fonctionnement (hémicycle).",
  },
  "bud-6b-invest": {
    legal: "Livrable 2 — crédits d'investissement",
    activity: "debate",
    roomId: "plenum-gc",
    prose:
      "Débats sur le programme d'investissement / crédits liés (même session).",
  },
  "bud-7-vote": {
    legal: "Vote paquet budgétaire — art. 84 al. 2 b (pas de réf. facultatif)",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Scrutins sur les décrets budgétaires. Hors référendum facultatif.",
  },
  "bud-7b-comptes": {
    legal: "Livrable 3 — comptes (prise d'acte)",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Prise d'acte des comptes — toujours hors référendum facultatif.",
  },
  "bud-8-promulgue": {
    legal: "Promulgation — Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "Formalisation et promulgation sans ouverture de délai référendaire facultatif.",
  },
  // S19 révision constitutionnelle partielle
  "rev-1-dpt": {
    legal: "Instruction — révision partielle (Cst-VD art. 174)",
    activity: "handover",
    roomId: "dep-dits-cabinet",
    prose:
      "Le département élabore un projet de révision partielle (dispositions liées).",
  },
  "rev-2-college": {
    legal: "Adoption collège CE",
    activity: "college",
    roomId: "college-ce",
    prose: "Le collège adopte le projet et le transmet au GC.",
  },
  "rev-3-saisine": {
    legal: "Saisine GC — SGC",
    activity: "handover",
    roomId: "sgc",
    prose: "Navette vers le Secrétariat général du Grand Conseil.",
  },
  "rev-4-comm": {
    legal: "Commission — examen",
    activity: "commission",
    roomId: "commission",
    prose: "Rapport avant les débats (au moins deux débats LGC).",
  },
  "rev-5-debats": {
    legal: "Débats plénum — 2 débats min.",
    activity: "debate",
    roomId: "plenum-gc",
    prose: "Débats en hémicycle sur le projet de révision partielle.",
  },
  "rev-6-vote": {
    legal: "Adoption GC — suite art. 83 a",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Adoption du projet. Suite : votation populaire obligatoire (≠ art. 84 facultatif).",
  },
  "rev-7-preambule-votation": {
    legal: "Votation obligatoire — Cst-VD art. 83 a (hors carte)",
    activity: "citizen",
    roomId: "chancellerie",
    prose:
      "Préambule : le corps électoral se prononce. Aucun site urne sur le plateau.",
  },
  "rev-8-formalise": {
    legal: "Formalisation Chancellerie",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "Résultat de la votation formalisé (entrée en vigueur ou caducité).",
  },
  // S17 référendum facultatif (V3)
  "ref-0-preambule": {
    legal: "Délai référendaire — Cst-VD art. 84 (préambule hors carte)",
    activity: "citizen",
    roomId: "chancellerie",
    prose:
      "Préambule : le corps électoral peut récolter des signatures pendant le délai. Hors plateau géospatial.",
  },
  "ref-1-publication": {
    legal: "Publication FAO — Cst-VD art. 84",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "La Chancellerie publie l'acte et ouvre le délai référendaire (point d'entrée institutionnel).",
  },
  "ref-2-constat": {
    legal: "Constat d'issue du délai — Chancellerie",
    activity: "handover",
    roomId: "chancellerie",
    prose:
      "Fin de délai : promulgation si pas d'aboutissement, ou suite référendaire si signatures suffisantes.",
  },
  "ref-3-preambule-votation": {
    legal: "Votation populaire — hors plateau",
    activity: "citizen",
    roomId: "chancellerie",
    prose:
      "Préambule : votation du corps électoral hors carte ; le résultat revient à l'institution.",
  },
  "ref-4-suite": {
    legal: "Formalisation du résultat",
    activity: "publish",
    roomId: "chancellerie",
    prose:
      "Résultat formalisé côté État (promulgation ou non-entrée en vigueur).",
  },
  // S18 initiative populaire (V3)
  "ip-0-preambule": {
    legal: "Parcours préalable — hors plateau (cadrage produit)",
    activity: "citizen",
    roomId: "sgc",
    prose:
      "Préambule : comité, signatures, formalités hors institutions cartographiées.",
  },
  "ip-1-depot": {
    legal: "Réception SGC — dépôt d'initiative",
    activity: "handover",
    roomId: "sgc",
    prose:
      "Le SGC reçoit le dépôt : point d'entrée institutionnel du parcours.",
  },
  "ip-2-preavis": {
    legal: "Préavis du CE",
    activity: "college",
    roomId: "college-ce",
    prose: "Le CE rend un préavis sur l'initiative populaire (simplifié).",
  },
  "ip-3-examen": {
    legal: "Examen institutionnel (commission / Bureau)",
    activity: "commission",
    roomId: "commission",
    prose: "Examen et rapport avant débat en plénum.",
  },
  "ip-4-plenum": {
    legal: "Statuer en plénum — mardi GC",
    activity: "vote",
    roomId: "plenum-gc",
    prose:
      "Le GC statue (adoption, contre-projet, rejet…). Fin pédagogique S18.",
  },
};

/** Fallback by step.by type when id unknown. */
export function metaForStep(step) {
  if (!step) {
    return {
      legal: "—",
      activity: "generic",
      prose: "Étape du processus.",
    };
  }
  if (STEP_META[step.id]) return STEP_META[step.id];
  if (step.by === "handover") {
    return {
      legal: "Transmission (navette)",
      activity: "handover",
      prose: step.successLesson || step.actLabel || "Transmission entre organes.",
    };
  }
  if (step.decisionType === "adopte" || step.by === "decision") {
    return {
      legal: step.weekdayTag === "gc" ? "art. 101 LGC" : "Décision collégiale (CE)",
      activity: step.weekdayTag === "gc" ? "vote" : "college",
      prose: step.successLesson || step.actLabel || "Décision institutionnelle.",
    };
  }
  return {
    legal: "—",
    activity: "generic",
    prose: step.successLesson || step.actLabel || "Étape du processus.",
  };
}

export const ACTIVITY_LABEL = {
  college: "Décision collégiale",
  handover: "Transmission",
  commission: "Commission",
  vote: "Vote / scrutin",
  debate: "Débat",
  publish: "Publication",
  generic: "Acte",
  citizen: "Dépôt citoyen",
};
