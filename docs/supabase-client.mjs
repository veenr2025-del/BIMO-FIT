import { normalizeState, parseMemberQrPayload, pointRules, rewardCatalog } from "./core.mjs";

export const SUPABASE_TABLES = {
  members: "bimo_members",
  memberCodes: "bimo_member_codes",
  qrScans: "bimo_qr_scans",
  adminAwards: "bimo_admin_awards",
  challenges: "bimo_challenge_progress",
  rewardClaims: "bimo_reward_claims"
};

const PLACEHOLDER_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

export function getSupabaseConfig(source = globalThis) {
  const config = source?.BIMO_SUPABASE || {};
  return {
    enabled: config.enabled !== false,
    url: normalizeSupabaseUrl(config.url || ""),
    publishableKey: String(config.publishableKey || "").trim()
  };
}

export function isSupabaseConfigured(config = getSupabaseConfig()) {
  return Boolean(
    config.enabled &&
    config.url.startsWith("https://") &&
    config.url.includes(".supabase.co") &&
    isPublishableKey(config.publishableKey)
  );
}

export async function getSupabaseStatus(config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (!config.enabled) {
    return {
      ok: false,
      connected: false,
      configured: false,
      code: "DISABLED",
      message: "Supabase staat uit. De app gebruikt lokale demo-opslag."
    };
  }

  if (!isSupabaseConfigured(config)) {
    return {
      ok: false,
      connected: false,
      configured: false,
      code: "MISSING_CONFIG",
      message: "Supabase is nog niet compleet ingesteld. Vul de publishable key in."
    };
  }

  try {
    await supabaseRequest(`${SUPABASE_TABLES.members}?select=member_code&limit=1`, {
      method: "GET"
    }, config, fetcher);

    return {
      ok: true,
      connected: true,
      configured: true,
      code: "CONNECTED",
      message: "Supabase is verbonden. Nieuwe scans en punten worden online opgeslagen."
    };
  } catch (error) {
    return {
      ok: false,
      connected: false,
      configured: true,
      code: error.code || "CONNECTION_ERROR",
      status: error.status,
      message: humanizeSupabaseError(error)
    };
  }
}

export async function pushStateToSupabase(state, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (!isSupabaseConfigured(config)) {
    return {
      ok: false,
      synced: false,
      skipped: true,
      message: "Lokale opslag actief. Supabase-config is nog niet compleet."
    };
  }

  const currentState = normalizeState(state);
  if (!currentState.member) {
    return {
      ok: true,
      synced: false,
      skipped: true,
      message: "Geen member om te synchroniseren."
    };
  }

  try {
    await upsertRows(SUPABASE_TABLES.members, toMemberRow(currentState.member, currentState.points), "member_code", config, fetcher);

    await Promise.all([
      upsertMany(SUPABASE_TABLES.qrScans, currentState.qrScans.map((scan) => toQrScanRow(scan)), "scan_id", config, fetcher),
      upsertMany(SUPABASE_TABLES.adminAwards, currentState.adminAwards.map((award) => toAdminAwardRow(award, currentState.member.id)), "award_id", config, fetcher),
      upsertMany(SUPABASE_TABLES.challenges, toChallengeRows(currentState), "member_code,challenge_id", config, fetcher),
      upsertMany(SUPABASE_TABLES.rewardClaims, toRewardClaimRows(currentState), "member_code,reward_id", config, fetcher)
    ]);

    return {
      ok: true,
      synced: true,
      skipped: false,
      message: "Supabase sync gelukt."
    };
  } catch (error) {
    return {
      ok: false,
      synced: false,
      skipped: false,
      code: error.code || "SYNC_ERROR",
      status: error.status,
      message: humanizeSupabaseError(error)
    };
  }
}

export async function fetchRemoteLeaderboard(config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (!isSupabaseConfigured(config)) return [];

  const rows = await supabaseRequest(
    `${SUPABASE_TABLES.members}?select=member_code,name,points,updated_at&order=points.desc&limit=20`,
    { method: "GET" },
    config,
    fetcher
  );

  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    rank: index + 1,
    id: row.member_code,
    name: row.name || "Member",
    points: Number(row.points) || 0,
    badge: getBadge(Number(row.points) || 0),
    current: false,
    source: "supabase"
  }));
}

export function stateFromCodeLogin(result) {
  const memberRow = result?.member || null;
  const member = memberRow ? toMemberFromRow(memberRow) : null;
  const nextState = normalizeState({
    member,
    points: Number(memberRow?.points) || 0,
    qrScans: rowsFromJson(result?.qrScans || result?.qr_scans).map(toQrScanFromRow),
    adminAwards: rowsFromJson(result?.adminAwards || result?.admin_awards).map(toAdminAwardFromRow),
    challenges: rowsFromJson(result?.challenges).map(toChallengeFromRow),
    claimedRewards: rowsFromJson(result?.rewardClaims || result?.reward_claims).map((row) => row.reward_id || row.rewardId).filter(Boolean)
  });

  nextState.activities = nextState.adminAwards.map((award) => ({
    id: award.id,
    activityId: award.ruleId,
    title: award.title,
    points: award.points,
    periodKey: award.periodKey,
    createdAt: award.createdAt,
    source: "admin",
    proofCode: award.proofCode
  }));

  return nextState;
}

export async function scanMemberQrInSupabase(payload, options = {}, config = getSupabaseConfig(), fetcher = globalThis.fetch, now = new Date()) {
  if (!isSupabaseConfigured(config)) {
    return {
      ok: false,
      connected: false,
      message: "Supabase is niet verbonden. Gebruik tijdelijk handmatige scan op hetzelfde toestel."
    };
  }

  const parsed = parseMemberQrPayload(payload);
  const memberRow = await fetchMemberRow(parsed.memberId, config, fetcher);
  if (!memberRow) {
    return {
      ok: false,
      connected: true,
      notFound: true,
      memberId: parsed.memberId,
      message: "Member bestaat nog niet online. Laat het lid eerst Profiel opslaan."
    };
  }

  const member = toMemberFromRow(memberRow);
  const periodKey = now.toISOString().slice(0, 10);
  const duplicate = await hasRemoteCheckin(member.id, periodKey, config, fetcher);
  if (duplicate) {
    return {
      ok: true,
      connected: true,
      duplicate: true,
      member,
      points: Number(memberRow.points) || 0,
      message: `${member.name} is vandaag al ingecheckt.`
    };
  }

  const checkinRule = pointRules.find((rule) => rule.id === "qr-checkin");
  const points = checkinRule?.points || 10;
  const proofCode = createProofCode(member.id, now);
  const scan = {
    id: `scan-${now.getTime()}-${member.id}`,
    memberId: member.id,
    memberName: member.name,
    proofCode,
    status: "Goedgekeurd",
    periodKey,
    createdAt: now.toISOString(),
    scannedBy: options.adminName || "Admin"
  };
  const award = {
    id: `award-${now.getTime()}-qr-checkin-${member.id}`,
    ruleId: "qr-checkin",
    title: checkinRule?.title || "QR check-in aanwezigheid",
    points,
    category: checkinRule?.category || "Aanwezigheid",
    note: `Camera scan bewijs ${proofCode}`,
    metricValue: "",
    proofCode,
    memberVisible: true,
    periodKey,
    createdAt: scan.createdAt,
    awardedBy: scan.scannedBy
  };
  const nextPoints = (Number(memberRow.points) || 0) + points;

  await upsertRows(SUPABASE_TABLES.members, toMemberRow(member, nextPoints), "member_code", config, fetcher);
  await Promise.all([
    upsertRows(SUPABASE_TABLES.qrScans, toQrScanRow(scan), "scan_id", config, fetcher),
    upsertRows(SUPABASE_TABLES.adminAwards, toAdminAwardRow(award, member.id), "award_id", config, fetcher)
  ]);

  return {
    ok: true,
    connected: true,
    duplicate: false,
    member,
    points: nextPoints,
    scan,
    award,
    message: `QR check-in gelukt voor ${member.name}. Bewijs: ${proofCode}.`
  };
}

export function toMemberRow(member, points = 0) {
  return cleanRow({
    member_code: member.id,
    auth_user_id: member.authUserId || null,
    email: member.email || null,
    qr_code: member.qrCode || `BIMO-CHECKIN:${member.id}`,
    name: member.name,
    age: numberOrNull(member.age),
    height_cm: numberOrNull(member.heightCm),
    weight_kg: numberOrNull(member.weightKg),
    target_weight_kg: numberOrNull(member.targetWeightKg),
    body_fat: numberOrNull(member.bodyFat),
    blood_pressure: member.bloodPressure || null,
    goal: member.goal || "weight_loss",
    program: member.program || "metcon",
    level: member.level || "starter",
    points: Number(points) || 0,
    joined_at: member.joinedAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

export function toMemberFromRow(row) {
  return {
    id: row.member_code,
    authUserId: row.auth_user_id || "",
    email: row.email || "",
    qrCode: row.qr_code || `BIMO-CHECKIN:${row.member_code}`,
    name: row.name || "Member",
    age: numberOrNull(row.age) || 18,
    heightCm: numberOrNull(row.height_cm) || 170,
    weightKg: numberOrNull(row.weight_kg) || 80,
    targetWeightKg: numberOrNull(row.target_weight_kg) || numberOrNull(row.weight_kg) || 80,
    bodyFat: numberOrNull(row.body_fat) || "",
    bloodPressure: row.blood_pressure || "",
    goal: row.goal || "weight_loss",
    program: row.program || "metcon",
    level: row.level || "starter",
    joinedAt: row.joined_at || new Date().toISOString()
  };
}

export function toQrScanRow(scan) {
  return cleanRow({
    scan_id: scan.id,
    member_code: scan.memberId,
    member_name: scan.memberName || null,
    proof_code: scan.proofCode,
    status: scan.status || "Goedgekeurd",
    period_key: scan.periodKey || null,
    scanned_by: scan.scannedBy || "Admin",
    created_at: scan.createdAt || new Date().toISOString()
  });
}

export function toQrScanFromRow(row) {
  return {
    id: row.scan_id,
    memberId: row.member_code,
    memberName: row.member_name || "",
    proofCode: row.proof_code || "",
    status: row.status || "Goedgekeurd",
    periodKey: row.period_key || "",
    createdAt: row.created_at || new Date().toISOString(),
    scannedBy: row.scanned_by || "Admin"
  };
}

export function toAdminAwardRow(award, memberCode) {
  return cleanRow({
    award_id: award.id,
    member_code: memberCode,
    rule_id: award.ruleId,
    title: award.title,
    points: Number(award.points) || 0,
    category: award.category || null,
    note: award.note || null,
    metric_value: award.metricValue || null,
    proof_code: award.proofCode || null,
    member_visible: award.memberVisible !== false,
    period_key: award.periodKey || null,
    awarded_by: award.awardedBy || "Admin",
    created_at: award.createdAt || new Date().toISOString()
  });
}

export function toAdminAwardFromRow(row) {
  return {
    id: row.award_id,
    ruleId: row.rule_id,
    title: row.title || "Admin punten",
    points: Number(row.points) || 0,
    category: row.category || "",
    note: row.note || "",
    metricValue: row.metric_value || "",
    proofCode: row.proof_code || "",
    memberVisible: row.member_visible !== false,
    periodKey: row.period_key || "",
    createdAt: row.created_at || new Date().toISOString(),
    awardedBy: row.awarded_by || "Admin"
  };
}

export function toChallengeRows(state) {
  const currentState = normalizeState(state);
  if (!currentState.member) return [];

  return currentState.challenges.map((challenge) => cleanRow({
    member_code: currentState.member.id,
    challenge_id: challenge.id,
    progress: Number(challenge.progress) || 0,
    completed: Boolean(challenge.completed),
    updated_at: new Date().toISOString()
  }));
}

export function toRewardClaimRows(state) {
  const currentState = normalizeState(state);
  if (!currentState.member) return [];

  return currentState.claimedRewards.map((rewardId) => {
    const reward = rewardCatalog.find((item) => item.id === rewardId);
    return cleanRow({
      member_code: currentState.member.id,
      reward_id: rewardId,
      title: reward?.title || rewardId,
      threshold: reward?.threshold || 0,
      reward_type: reward?.type || null,
      created_at: new Date().toISOString()
    });
  });
}

export function toChallengeFromRow(row) {
  return {
    id: row.challenge_id,
    progress: Number(row.progress) || 0,
    completed: Boolean(row.completed)
  };
}

async function upsertMany(tableName, rows, conflictTarget, config, fetcher) {
  if (!rows.length) return null;
  return upsertRows(tableName, rows, conflictTarget, config, fetcher);
}

async function upsertRows(tableName, rows, conflictTarget, config, fetcher) {
  const path = `${tableName}?on_conflict=${encodeURIComponent(conflictTarget)}`;
  return supabaseRequest(path, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: rows
  }, config, fetcher);
}

async function fetchMemberRow(memberCode, config, fetcher) {
  const rows = await supabaseRequest(
    `${SUPABASE_TABLES.members}?select=*&member_code=eq.${encodeURIComponent(memberCode)}&limit=1`,
    { method: "GET" },
    config,
    fetcher
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function hasRemoteCheckin(memberCode, periodKey, config, fetcher) {
  const rows = await supabaseRequest(
    `${SUPABASE_TABLES.qrScans}?select=scan_id&member_code=eq.${encodeURIComponent(memberCode)}&period_key=eq.${encodeURIComponent(periodKey)}&limit=1`,
    { method: "GET" },
    config,
    fetcher
  );
  return Array.isArray(rows) && rows.length > 0;
}

export async function supabaseRequest(path, options = {}, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (typeof fetcher !== "function") {
    throw new SupabaseClientError("Fetch is niet beschikbaar in deze browser.", 0, "FETCH_MISSING");
  }

  const response = await fetcher(`${config.url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${options.accessToken || config.publishableKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const parsed = parseJson(text);

  if (!response.ok) {
    throw new SupabaseClientError(
      parsed?.message || parsed?.error_description || text || `Supabase fout ${response.status}`,
      response.status,
      parsed?.code || response.statusText || "SUPABASE_ERROR"
    );
  }

  return parsed;
}

export async function supabaseRpc(functionName, args = {}, options = {}, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (!isSupabaseConfigured(config)) {
    throw new SupabaseClientError("Supabase is nog niet verbonden.", 0, "MISSING_CONFIG");
  }

  return supabaseRequest(`rpc/${encodeURIComponent(functionName)}`, {
    method: "POST",
    headers: options.headers || {},
    body: args
  }, config, fetcher);
}

function normalizeSupabaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isPublishableKey(value) {
  const key = String(value || "").trim();
  if (!key || key === PLACEHOLDER_KEY) return false;
  return key.startsWith("sb_publishable_") || key.startsWith("eyJ");
}

function humanizeSupabaseError(error) {
  if (error.status === 401 || error.code === "401") {
    return "Supabase weigert de API key. Kopieer de volledige publishable key opnieuw uit Project Settings > API.";
  }

  if (error.status === 404 || /does not exist|schema cache|relation/i.test(error.message || "")) {
    return "Supabase is bereikbaar, maar de BIMO-tabellen ontbreken nog. Voer eerst supabase-schema.sql uit in de SQL Editor.";
  }

  if (error.status === 403) {
    return "Supabase blokkeert deze actie door RLS/policies. Controleer het SQL-schema en de policies.";
  }

  return error.message || "Supabase kon niet worden bereikt. De app blijft lokaal werken.";
}

function createProofCode(seed, date) {
  const compactDate = date.toISOString().slice(0, 10).replaceAll("-", "");
  const compactSeed = String(seed).replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase();
  return `BIMO-${compactDate}-${compactSeed}`;
}

function getBadge(points) {
  if (points >= 700) return "Gold";
  if (points >= 450) return "Silver";
  if (points >= 250) return "Bronze";
  return "Starter";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined)
  );
}

function rowsFromJson(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed = parseJson(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

class SupabaseClientError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "SupabaseClientError";
    this.status = status;
    this.code = code;
  }
}
