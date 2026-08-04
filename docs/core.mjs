export const STORAGE_KEY = "bimo-fit-challenge-state-v2";
export const ADMIN_PIN = "2468";

export const pointRules = [
  {
    id: "qr-checkin",
    title: "QR check-in aanwezigheid",
    points: 10,
    repeat: "daily",
    category: "Aanwezigheid",
    memberVisible: true,
    description: "Admin scant de QR-code van het lid bij binnenkomst."
  },
  {
    id: "bring-friend",
    title: "Bring a friend",
    points: 75,
    repeat: "always",
    category: "Nieuwe inschrijving",
    memberVisible: true,
    description: "Bonus wanneer een vriend(in) zich inschrijft via het lid."
  },
  {
    id: "on-time-payment",
    title: "Op tijd betalen",
    points: 40,
    repeat: "monthly",
    category: "Betaling",
    memberVisible: true,
    description: "Maandelijkse beloning voor tijdige betaling van het abonnement."
  },
  {
    id: "frequent-attendance",
    title: "Frequent aanwezig",
    points: 50,
    repeat: "weekly",
    category: "Discipline",
    memberVisible: true,
    description: "Bonus voor minimaal vijf trainingsmomenten in een week."
  },
  {
    id: "weight-loss",
    title: "Gewicht afname",
    points: 100,
    repeat: "monthly",
    category: "Progressie",
    memberVisible: true,
    description: "Admin bevestigt gewichtsafname op basis van meting."
  },
  {
    id: "body-fat",
    title: "Vetpercentage verbeterd",
    points: 80,
    repeat: "monthly",
    category: "Gezondheid",
    memberVisible: true,
    description: "Bonus voor daling in vetpercentage."
  },
  {
    id: "blood-pressure",
    title: "Bloeddruk verbeterd",
    points: 70,
    repeat: "monthly",
    category: "Gezondheid",
    memberVisible: true,
    description: "Bonus wanneer bloeddrukmeting positief verbetert."
  },
  {
    id: "event-participation",
    title: "Participatie aan events",
    points: 60,
    repeat: "always",
    category: "Community",
    memberVisible: true,
    description: "Punten voor deelname aan BIMO events of challenges."
  }
];

export const activities = pointRules;

export const challengeCatalog = [
  {
    id: "attendance",
    title: "12 QR check-ins deze maand",
    target: 12,
    unit: "scans",
    bonus: 120,
    theme: "Presentie"
  },
  {
    id: "frequent",
    title: "4 weken frequent aanwezig",
    target: 4,
    unit: "weken",
    bonus: 100,
    theme: "Discipline"
  },
  {
    id: "body-goal",
    title: "3 kg gewicht afname",
    target: 3,
    unit: "kg",
    bonus: 100,
    theme: "Progressie"
  },
  {
    id: "health",
    title: "2 gezondheidsmetingen verbeterd",
    target: 2,
    unit: "metingen",
    bonus: 90,
    theme: "Gezondheid"
  },
  {
    id: "community",
    title: "1 bring-a-friend inschrijving",
    target: 1,
    unit: "inschrijving",
    bonus: 75,
    theme: "Community"
  },
  {
    id: "events",
    title: "2 BIMO events meedoen",
    target: 2,
    unit: "events",
    bonus: 80,
    theme: "Events"
  }
];

export const rewardCatalog = [
  {
    id: "subscription-discount",
    title: "Korting abonnement",
    threshold: 250,
    type: "Abonnement",
    description: "Gebruik punten voor korting op een maandabonnement."
  },
  {
    id: "voucher",
    title: "Waardebon",
    threshold: 450,
    type: "Voucher",
    description: "Waardebon voor BIMO services, events of partnerdeals."
  },
  {
    id: "merch-basic",
    title: "BIMO merchandise",
    threshold: 650,
    type: "Merchandise",
    description: "Claim merchandise zoals handdoek, shirt of shaker."
  },
  {
    id: "merch-premium",
    title: "Premium merch pakket",
    threshold: 900,
    type: "Merchandise",
    description: "Extra beloning voor leden met topconsistentie."
  }
];

export const trainingPrograms = {
  metcon: {
    name: "METCON",
    focus: "Conditie, vetverbranding en metabolische kracht",
    sessions: ["METCON interval", "Core stability", "Zone 2 cardio", "Full-body circuit"]
  },
  muscle_lab: {
    name: "Muscle Lab",
    focus: "Spieropbouw, techniek en gecontroleerde krachttraining",
    sessions: ["Lower body strength", "Upper body push/pull", "Glutes and abs", "Mobility reset"]
  },
  gallab: {
    name: "GALLAB",
    focus: "Glutes, abs en legs met resultaatgerichte begeleiding",
    sessions: ["Glutes activation", "Leg strength", "Abs finisher", "Conditioning block"]
  },
  online: {
    name: "METCON Online",
    focus: "Thuis trainen met korte, haalbare sessies",
    sessions: ["Online HIIT", "Bodyweight strength", "Core and stretch", "Recovery walk"]
  }
};

const goalLabels = {
  weight_loss: "Afvallen",
  strength: "Sterker worden",
  health: "Gezonder leven"
};

const sampleParticipants = [
  { name: "Audrey", points: 720, badge: "Gold" },
  { name: "Peggy", points: 610, badge: "Silver" },
  { name: "Ryan", points: 455, badge: "Bronze" },
  { name: "Mirella", points: 330, badge: "Starter" }
];

export function defaultState() {
  return {
    member: null,
    points: 0,
    activities: [],
    qrScans: [],
    adminAwards: [],
    challenges: challengeCatalog.map((challenge) => ({
      id: challenge.id,
      progress: 0,
      completed: false
    })),
    claimedRewards: []
  };
}

export function normalizeState(rawState) {
  const base = defaultState();
  const state = { ...base, ...(rawState || {}) };
  state.activities = Array.isArray(state.activities) ? state.activities : [];
  state.qrScans = Array.isArray(state.qrScans) ? state.qrScans : [];
  state.adminAwards = Array.isArray(state.adminAwards) ? state.adminAwards : [];
  state.claimedRewards = Array.isArray(state.claimedRewards) ? state.claimedRewards : [];
  state.challenges = mergeChallengeState(state.challenges);
  state.points = Number(state.points) || 0;
  return state;
}

export function createMember(input, now = new Date()) {
  const name = String(input.name || "").trim();
  const heightCm = Number(input.heightCm);
  const weightKg = Number(input.weightKg);
  const targetWeightKg = Number(input.targetWeightKg || weightKg);

  if (name.length < 2) {
    throw new Error("Vul een naam in van minimaal 2 tekens.");
  }

  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) {
    throw new Error("Lengte moet tussen 120 en 230 cm zijn.");
  }

  if (!Number.isFinite(weightKg) || weightKg < 35 || weightKg > 250) {
    throw new Error("Gewicht moet tussen 35 en 250 kg zijn.");
  }

  const id = input.id || `BIMO-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`;

  return {
    id,
    qrCode: `BIMO-CHECKIN:${id}`,
    name,
    age: clamp(Number(input.age) || 18, 12, 90),
    heightCm,
    weightKg,
    targetWeightKg,
    bodyFat: optionalNumber(input.bodyFat),
    bloodPressure: String(input.bloodPressure || "").trim(),
    goal: input.goal || "weight_loss",
    program: input.program || "metcon",
    level: input.level || "starter",
    joinedAt: now.toISOString()
  };
}

export function validateAdminPin(pin) {
  return String(pin || "").trim() === ADMIN_PIN;
}

export function getMemberQrPayload(member) {
  if (!member) return "";
  return JSON.stringify({
    app: "BIMO-FIT",
    type: "member-checkin",
    memberId: member.id,
    memberName: member.name
  });
}

export function parseMemberQrPayload(payload) {
  const raw = String(payload || "").trim();
  if (!raw) throw new Error("Geen QR-code ontvangen.");

  if (raw.startsWith("BIMO-CHECKIN:")) {
    return { memberId: raw.replace("BIMO-CHECKIN:", ""), memberName: "" };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.app !== "BIMO-FIT" || parsed.type !== "member-checkin" || !parsed.memberId) {
      throw new Error("QR-code hoort niet bij BIMO Fit.");
    }
    return parsed;
  } catch (error) {
    if (error.message === "QR-code hoort niet bij BIMO Fit.") throw error;
    throw new Error("QR-code kon niet gelezen worden.");
  }
}

export function scanMemberQr(state, payload, options = {}, now = new Date()) {
  if (!options.adminVerified && !validateAdminPin(options.adminPin)) {
    return {
      state: normalizeState(state),
      awarded: 0,
      scan: null,
      message: "Alleen admin kan QR-scans bevestigen."
    };
  }

  const nextState = normalizeState(cloneState(state));
  if (!nextState.member) {
    throw new Error("Registreer eerst een lid voordat je kunt scannen.");
  }

  const parsed = parseMemberQrPayload(payload);
  if (parsed.memberId !== nextState.member.id) {
    return {
      state: nextState,
      awarded: 0,
      scan: null,
      message: "QR-code hoort niet bij dit lid."
    };
  }

  const periodKey = getPeriodKey("daily", now);
  const duplicate = nextState.qrScans.some((scan) => scan.memberId === parsed.memberId && scan.periodKey === periodKey);
  if (duplicate) {
    return {
      state: nextState,
      awarded: 0,
      scan: null,
      message: "Dit lid is vandaag al ingecheckt."
    };
  }

  const scan = {
    id: `scan-${now.getTime()}`,
    memberId: parsed.memberId,
    memberName: nextState.member.name,
    proofCode: createProofCode(parsed.memberId, now),
    status: "Goedgekeurd",
    periodKey,
    createdAt: now.toISOString(),
    scannedBy: options.adminName || "Admin"
  };

  nextState.qrScans.unshift(scan);
  const result = awardAdminPoints(nextState, "qr-checkin", {
    adminVerified: true,
    adminName: scan.scannedBy,
    note: `QR scan bewijs ${scan.proofCode}`,
    proofCode: scan.proofCode
  }, now);

  return {
    state: result.state,
    awarded: result.awarded,
    scan,
    message: `QR check-in gelukt. Bewijs: ${scan.proofCode}.`
  };
}

export function awardAdminPoints(state, ruleId, details = {}, now = new Date()) {
  const nextState = normalizeState(cloneState(state));
  const rule = pointRules.find((item) => item.id === ruleId);
  if (!rule) throw new Error("Onbekende puntenregel.");

  if (!details.adminVerified && !validateAdminPin(details.adminPin)) {
    return {
      state: nextState,
      awarded: 0,
      award: null,
      message: "Alleen admin kan punten zetten."
    };
  }

  const periodKey = getPeriodKey(rule.repeat, now);
  if (periodKey && nextState.adminAwards.some((award) => award.ruleId === ruleId && award.periodKey === periodKey)) {
    return {
      state: nextState,
      awarded: 0,
      award: null,
      message: `${rule.title} is al toegekend voor deze periode.`
    };
  }

  const metricValue = String(details.metricValue || "").trim();
  const award = {
    id: `award-${now.getTime()}-${ruleId}`,
    ruleId,
    title: rule.title,
    points: rule.points,
    category: rule.category,
    note: String(details.note || "").trim(),
    metricValue,
    proofCode: details.proofCode || createProofCode(ruleId, now),
    memberVisible: rule.memberVisible,
    periodKey,
    createdAt: now.toISOString(),
    awardedBy: details.adminName || "Admin"
  };

  nextState.points += rule.points;
  nextState.adminAwards.unshift(award);
  nextState.activities.unshift({
    id: award.id,
    activityId: rule.id,
    title: rule.title,
    points: rule.points,
    periodKey,
    createdAt: award.createdAt,
    source: "admin",
    proofCode: award.proofCode
  });

  syncChallengeFromRule(nextState, rule.id, metricValue);

  return {
    state: nextState,
    awarded: rule.points,
    award,
    message: `${rule.points} punten toegekend voor ${rule.title}.`
  };
}

export function addActivity(state, activityId, now = new Date()) {
  return awardAdminPoints(state, activityId, { adminVerified: true }, now);
}

export function updateChallengeProgress(state, challengeId, progress, options = {}, now = new Date()) {
  if (!options.adminVerified && !validateAdminPin(options.adminPin)) {
    return normalizeState(state);
  }

  const challenge = challengeCatalog.find((item) => item.id === challengeId);
  if (!challenge) throw new Error("Onbekende challenge.");

  const nextState = normalizeState(cloneState(state));
  const entry = nextState.challenges.find((item) => item.id === challengeId);
  entry.progress = clamp(Number(progress) || 0, 0, challenge.target);

  if (!entry.completed && entry.progress >= challenge.target) {
    entry.completed = true;
    nextState.points += challenge.bonus;
    nextState.activities.unshift({
      id: `challenge-${now.getTime()}-${challengeId}`,
      activityId: `challenge-${challengeId}`,
      title: `Challenge voltooid: ${challenge.title}`,
      points: challenge.bonus,
      periodKey: getMonthKey(now),
      createdAt: now.toISOString(),
      source: "admin",
      proofCode: createProofCode(challengeId, now)
    });
  }

  return nextState;
}

export function claimReward(state, rewardId) {
  const reward = rewardCatalog.find((item) => item.id === rewardId);
  if (!reward) throw new Error("Onbekende beloning.");

  const nextState = normalizeState(cloneState(state));
  if ((nextState.points || 0) < reward.threshold) {
    return {
      state: nextState,
      claimed: false,
      message: "Nog niet genoeg punten voor deze beloning."
    };
  }

  if (nextState.claimedRewards.includes(rewardId)) {
    return {
      state: nextState,
      claimed: false,
      message: "Deze beloning is al geclaimd."
    };
  }

  nextState.claimedRewards.push(rewardId);
  return {
    state: nextState,
    claimed: true,
    message: `${reward.title} is geclaimd.`
  };
}

export function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const height = Number(heightCm) / 100;

  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
    throw new Error("BMI kan alleen berekend worden met geldige lengte en gewicht.");
  }

  const value = weight / (height * height);

  return {
    value: round(value, 1),
    category: classifyBmi(value),
    advice: getBmiAdvice(value)
  };
}

export function classifyBmi(value) {
  if (value < 18.5) return "Ondergewicht";
  if (value < 25) return "Gezond gewicht";
  if (value < 30) return "Overgewicht";
  return "Obesitas";
}

export function getBmiAdvice(value) {
  if (value < 18.5) return "Focus op spieropbouw, herstel en voldoende voeding.";
  if (value < 25) return "Behoud je ritme met kracht, cardio en goede slaap.";
  if (value < 30) return "Combineer METCON met krachttraining en meet wekelijks.";
  return "Start rustig, train consistent en laat voortgang begeleiden.";
}

export function generateWeeklyPlan(member) {
  if (!member) return [];

  const program = trainingPrograms[member.program] || trainingPrograms.metcon;
  const goal = goalLabels[member.goal] || goalLabels.weight_loss;
  const days = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
  const intensity = {
    starter: ["Rustig", "Basis", "Rust", "Basis", "Actief", "Herstel"],
    active: ["Kracht", "METCON", "Rust", "Kracht", "METCON", "Mobiliteit"],
    advanced: ["Kracht", "METCON", "Hypertrofie", "METCON", "Kracht", "Actief herstel"]
  }[member.level] || ["Basis", "Rust", "Basis", "Rust", "Basis", "Herstel"];

  return days.map((day, index) => {
    const restDay = intensity[index] === "Rust";
    return {
      day,
      title: restDay ? "Herstel en stappen" : program.sessions[index % program.sessions.length],
      focus: restDay ? "Slaap, water en 7000+ stappen" : `${program.focus} - doel: ${goal}`,
      duration: restDay ? "20-30 min" : member.level === "starter" ? "35-45 min" : "45-60 min",
      intensity: intensity[index]
    };
  });
}

export function getLeaderboard(state) {
  const currentState = normalizeState(state);
  const memberName = currentState.member?.name || "Jij";
  const current = {
    name: memberName,
    points: currentState.points || 0,
    badge: getBadge(currentState.points || 0),
    current: true
  };

  return [...sampleParticipants, current]
    .sort((a, b) => b.points - a.points)
    .map((participant, index) => ({ ...participant, rank: index + 1 }));
}

export function getStats(state) {
  const currentState = normalizeState(state);
  const totalCheckins = currentState.qrScans.length || currentState.activities.filter((entry) => entry.activityId === "qr-checkin").length;
  const completedChallenges = currentState.challenges.filter((challenge) => challenge.completed).length;
  const nextReward = rewardCatalog.find((reward) => !currentState.claimedRewards.includes(reward.id) && reward.threshold > currentState.points);

  return {
    totalCheckins,
    completedChallenges,
    totalChallenges: challengeCatalog.length,
    adminAwards: currentState.adminAwards.length,
    badge: getBadge(currentState.points || 0),
    lastScan: currentState.qrScans[0] || null,
    nextReward,
    rewardProgress: nextReward ? round(((currentState.points || 0) / nextReward.threshold) * 100, 0) : 100
  };
}

export function getMemberProofs(state) {
  const currentState = normalizeState(state);
  const scanProofs = currentState.qrScans.map((scan) => ({
    id: scan.id,
    title: "QR check-in bevestigd",
    detail: `Scan bewijs ${scan.proofCode}`,
    points: pointRules.find((rule) => rule.id === "qr-checkin")?.points || 0,
    createdAt: scan.createdAt,
    status: scan.status
  }));

  const awardProofs = currentState.adminAwards
    .filter((award) => award.memberVisible && award.ruleId !== "qr-checkin")
    .map((award) => ({
      id: award.id,
      title: award.title,
      detail: award.note || award.metricValue || award.category,
      points: award.points,
      createdAt: award.createdAt,
      status: "Toegekend"
    }));

  return [...scanProofs, ...awardProofs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getBadge(points) {
  if (points >= 700) return "Gold";
  if (points >= 450) return "Silver";
  if (points >= 250) return "Bronze";
  return "Starter";
}

function syncChallengeFromRule(state, ruleId, metricValue) {
  if (ruleId === "qr-checkin") {
    updateEntryProgress(state, "attendance", 1);
  }

  if (ruleId === "frequent-attendance") {
    updateEntryProgress(state, "frequent", 1);
  }

  if (ruleId === "weight-loss") {
    const kg = Number.parseFloat(metricValue);
    updateEntryProgress(state, "body-goal", Number.isFinite(kg) && kg > 0 ? kg : 1);
  }

  if (ruleId === "body-fat" || ruleId === "blood-pressure") {
    updateEntryProgress(state, "health", 1);
  }

  if (ruleId === "bring-friend") {
    updateEntryProgress(state, "community", 1);
  }

  if (ruleId === "event-participation") {
    updateEntryProgress(state, "events", 1);
  }
}

function updateEntryProgress(state, challengeId, add) {
  const entry = state.challenges.find((challenge) => challenge.id === challengeId);
  if (!entry || entry.completed) return;
  const challenge = challengeCatalog.find((item) => item.id === entry.id);
  entry.progress = clamp(entry.progress + add, 0, challenge.target);

  if (entry.progress >= challenge.target) {
    entry.completed = true;
    state.points += challenge.bonus;
    state.activities.unshift({
      id: `challenge-${Date.now()}-${entry.id}`,
      activityId: `challenge-${entry.id}`,
      title: `Challenge voltooid: ${challenge.title}`,
      points: challenge.bonus,
      periodKey: getMonthKey(new Date()),
      createdAt: new Date().toISOString(),
      source: "admin",
      proofCode: createProofCode(entry.id, new Date())
    });
  }
}

function mergeChallengeState(challenges) {
  const existing = Array.isArray(challenges) ? challenges : [];
  return challengeCatalog.map((challenge) => {
    const entry = existing.find((item) => item.id === challenge.id);
    return {
      id: challenge.id,
      progress: Number(entry?.progress) || 0,
      completed: Boolean(entry?.completed)
    };
  });
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state || defaultState()));
}

function createProofCode(seed, date) {
  const compactDate = date.toISOString().slice(0, 10).replaceAll("-", "");
  const compactSeed = String(seed).replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase();
  return `BIMO-${compactDate}-${compactSeed}`;
}

function getPeriodKey(repeat, date) {
  if (repeat === "always") return "";
  if (repeat === "daily") return date.toISOString().slice(0, 10);
  if (repeat === "weekly") return getWeekKey(date);
  if (repeat === "monthly") return getMonthKey(date);
  return "";
}

function getMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

function getWeekKey(date) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function optionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
