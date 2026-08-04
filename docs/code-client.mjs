import {
  getSupabaseConfig,
  isSupabaseConfigured,
  stateFromCodeLogin,
  supabaseRpc
} from "./supabase-client.mjs?v=20260804-code1";

export const CODE_SESSION_STORAGE_KEY = "bimo-fit-member-code-session-v1";

export function validateAccessCode(value) {
  const code = String(value || "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(code)) {
    throw new Error("Vul je 4-cijfer membercode in.");
  }
  return code;
}

export function getMemberCodeId(code) {
  return `BIMO-${validateAccessCode(code)}`;
}

export function loadCodeSession(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(CODE_SESSION_STORAGE_KEY);
    return normalizeCodeSession(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultCodeSession();
  }
}

export function saveCodeSession(session, storage = globalThis.localStorage) {
  const nextSession = normalizeCodeSession(session);
  storage?.setItem(CODE_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  return nextSession;
}

export function clearCodeSession(storage = globalThis.localStorage) {
  storage?.removeItem(CODE_SESSION_STORAGE_KEY);
  return defaultCodeSession();
}

export async function loginWithAccessCode(accessCode, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  const code = validateAccessCode(accessCode);
  if (!isSupabaseConfigured(config)) {
    throw new Error("Supabase is nog niet verbonden. Code-login werkt alleen online.");
  }

  const result = await supabaseRpc("bimo_login_with_code", { p_code: code }, {}, config, fetcher);
  if (!result?.ok) {
    throw new Error(result?.message || "Membercode is niet geldig.");
  }

  const memberCode = result.memberCode || result.member_code || getMemberCodeId(code);
  return {
    session: normalizeCodeSession({
      code,
      memberCode,
      lastLoginAt: new Date().toISOString()
    }),
    state: stateFromCodeLogin(result),
    isNew: !result.member,
    message: result.message || "Je bent ingelogd."
  };
}

export function defaultCodeSession() {
  return {
    active: false,
    code: "",
    memberCode: "",
    lastLoginAt: ""
  };
}

export function normalizeCodeSession(session) {
  const code = String(session?.code || "").replace(/\D/g, "");
  const memberCode = String(session?.memberCode || session?.member_code || "").trim();
  if (!/^\d{4}$/.test(code) || !memberCode) return defaultCodeSession();

  return {
    active: true,
    code,
    memberCode,
    lastLoginAt: session?.lastLoginAt || session?.last_login_at || new Date().toISOString()
  };
}
