import { getSupabaseConfig, isSupabaseConfigured, supabaseRequest, SUPABASE_TABLES, toMemberFromRow } from "./supabase-client.mjs";

export const AUTH_STORAGE_KEY = "bimo-fit-auth-session-v1";

export function validateAuthInput({ email, password, name = "" }, options = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  const normalizedName = String(name || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Vul een geldig e-mailadres in.");
  }

  if (normalizedPassword.length < 8) {
    throw new Error("Wachtwoord moet minimaal 8 tekens hebben.");
  }

  if (options.requireName && normalizedName.length < 2) {
    throw new Error("Vul je naam in.");
  }

  return {
    email: normalizedEmail,
    password: normalizedPassword,
    name: normalizedName
  };
}

export function loadAuthSession(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(AUTH_STORAGE_KEY);
    if (!raw) return defaultAuthState();
    return normalizeAuthSession(JSON.parse(raw));
  } catch {
    return defaultAuthState();
  }
}

export function saveAuthSession(session, storage = globalThis.localStorage) {
  const authState = normalizeAuthSession(session);
  storage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  return authState;
}

export function clearAuthSession(storage = globalThis.localStorage) {
  storage?.removeItem(AUTH_STORAGE_KEY);
  return defaultAuthState();
}

export async function signUpMemberAccount(input, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  const credentials = validateAuthInput(input, { requireName: true });
  ensureAuthReady(config);

  const response = await authRequest("/auth/v1/signup", {
    method: "POST",
    body: {
      email: credentials.email,
      password: credentials.password,
      data: {
        name: credentials.name,
        role: "member"
      }
    }
  }, config, fetcher);

  return {
    ...normalizeAuthResponse(response),
    email: credentials.email,
    name: credentials.name,
    needsEmailConfirmation: Boolean(response?.user && !response?.session && !response?.access_token)
  };
}

export async function signInMemberAccount(input, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  const credentials = validateAuthInput(input);
  ensureAuthReady(config);

  const response = await authRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: {
      email: credentials.email,
      password: credentials.password
    }
  }, config, fetcher);

  return normalizeAuthResponse(response);
}

export async function signOutMemberAccount(authState, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (!authState?.accessToken || !isSupabaseConfigured(config)) return { ok: true };

  await authRequest("/auth/v1/logout", {
    method: "POST",
    accessToken: authState.accessToken
  }, config, fetcher);

  return { ok: true };
}

export async function refreshMemberSession(authState, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  if (!authState?.refreshToken) return defaultAuthState();
  ensureAuthReady(config);

  const response = await authRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: {
      refresh_token: authState.refreshToken
    }
  }, config, fetcher);

  return normalizeAuthResponse(response);
}

export async function fetchMemberForAuth(authState, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  const userId = authState?.user?.id;
  if (!userId || !isSupabaseConfigured(config)) return null;

  const rows = await supabaseRequest(
    `${SUPABASE_TABLES.members}?select=*&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { method: "GET", accessToken: authState.accessToken },
    config,
    fetcher
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  return {
    member: toMemberFromRow(row),
    points: Number(row.points) || 0
  };
}

export function getAuthMemberId(authState) {
  const id = authState?.user?.id;
  return id ? `BIMO-${id}` : "";
}

export function normalizeAuthResponse(response, now = Date.now()) {
  const session = response?.session || response;
  const user = response?.user || session?.user || null;

  if (!session?.access_token && !session?.accessToken) {
    return {
      ...defaultAuthState(),
      user: user ? normalizeUser(user) : null
    };
  }

  return normalizeAuthSession({
    accessToken: session.access_token || session.accessToken,
    refreshToken: session.refresh_token || session.refreshToken || "",
    expiresAt: session.expires_at || Math.floor(now / 1000) + Number(session.expires_in || 3600),
    tokenType: session.token_type || "bearer",
    user: normalizeUser(user)
  });
}

export function normalizeAuthSession(value) {
  return {
    accessToken: String(value?.accessToken || ""),
    refreshToken: String(value?.refreshToken || ""),
    expiresAt: Number(value?.expiresAt) || 0,
    tokenType: value?.tokenType || "bearer",
    user: value?.user ? normalizeUser(value.user) : null
  };
}

export function defaultAuthState() {
  return {
    accessToken: "",
    refreshToken: "",
    expiresAt: 0,
    tokenType: "bearer",
    user: null
  };
}

async function authRequest(path, options = {}, config = getSupabaseConfig(), fetcher = globalThis.fetch) {
  const response = await fetcher(`${config.url}${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${options.accessToken || config.publishableKey}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const parsed = parseJson(text);

  if (!response.ok) {
    throw new Error(parsed?.msg || parsed?.message || parsed?.error_description || text || "Authenticatie mislukt.");
  }

  return parsed;
}

function ensureAuthReady(config) {
  if (!isSupabaseConfigured(config)) {
    throw new Error("Supabase Auth is nog niet ingesteld.");
  }
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.name || user.raw_user_meta_data?.name || user.name || ""
  };
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
