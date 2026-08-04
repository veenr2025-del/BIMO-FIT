import {
  STORAGE_KEY,
  pointRules,
  challengeCatalog,
  rewardCatalog,
  trainingPrograms,
  awardAdminPoints,
  calculateBmi,
  claimReward,
  createMember,
  defaultState,
  generateWeeklyPlan,
  getLeaderboard,
  getMemberProofs,
  getMemberQrPayload,
  getStats,
  normalizeState,
  scanMemberQr,
  updateChallengeProgress,
  validateAdminPin
} from "./core.mjs?v=20260804-code1";
import {
  clearCodeSession,
  getMemberCodeId,
  loadCodeSession,
  loginWithAccessCode,
  saveCodeSession
} from "./code-client.mjs?v=20260804-code1";
import {
  fetchRemoteLeaderboard,
  getSupabaseStatus,
  pushStateToSupabase,
  scanMemberQrInSupabase
} from "./supabase-client.mjs?v=20260804-code1";

const LEGACY_STORAGE_KEY = "bimo-fit-challenge-state-v1";
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const navButtons = Array.from(document.querySelectorAll("[data-tab]"));
const installButton = document.querySelector("#installButton");
let deferredInstallPrompt = null;
let activeTab = "dashboard";
let adminUnlocked = sessionStorage.getItem("bimo-admin-unlocked") === "true";
let state = loadState();
let syncStatus = {
  connected: false,
  configured: false,
  label: "Lokale demo",
  detail: "Lokale opslag actief."
};
let remoteLeaderboard = [];
let syncTimer = null;
let codeSession = loadCodeSession();
let cameraScanner = {
  active: false,
  stream: null,
  detector: null,
  frameId: 0,
  canvas: null
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    showToast("Open deze app via Safari of Chrome en kies Toevoegen aan beginscherm.");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  if (form.id === "memberForm") {
    handleMemberSubmit(form);
  }

  if (form.id === "memberCodeForm") {
    await handleMemberCodeLogin(form);
  }

  if (form.id === "adminLoginForm") {
    handleAdminLogin(form);
  }

  if (form.id === "adminScanForm") {
    await handleAdminScan(form);
  }

  if (form.id === "adminAwardForm") {
    handleAdminAward(form);
  }

  if (form.dataset.challengeForm) {
    if (!adminUnlocked) {
      showToast("Alleen admin kan challenge voortgang aanpassen.");
      return;
    }

    const challengeId = form.dataset.challengeForm;
    const progress = form.querySelector("[name='progress']").value;
    state = updateChallengeProgress(state, challengeId, progress, { adminVerified: true });
    persist();
    render();
    showToast("Challenge voortgang bijgewerkt door admin.");
  }
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "claim-reward") {
    const result = claimReward(state, target.dataset.rewardId);
    state = result.state;
    persist();
    render();
    showToast(result.message);
  }

  if (action === "reset-demo") {
    const confirmed = window.confirm("Demo data wissen en opnieuw beginnen?");
    if (confirmed) {
      state = defaultState();
      codeSession = clearCodeSession();
      adminUnlocked = false;
      sessionStorage.removeItem("bimo-admin-unlocked");
      persist();
      render();
      showToast("Demo data is gewist.");
    }
  }

  if (action === "go-register") {
    setTab("profile");
  }

  if (action === "go-admin") {
    setTab("admin");
  }

  if (action === "admin-logout") {
    stopCameraScanner();
    adminUnlocked = false;
    sessionStorage.removeItem("bimo-admin-unlocked");
    render();
    showToast("Admin panel vergrendeld.");
  }

  if (action === "fill-current-qr") {
    const input = document.querySelector("[name='qrPayload']");
    if (input && state.member) {
      input.value = getMemberQrPayload(state.member);
      showToast("Huidige member QR klaar om te scannen.");
    }
  }

  if (action === "sync-now") {
    void syncStateNow({ showSuccessToast: true });
  }

  if (action === "member-logout") {
    void handleMemberLogout();
  }

  if (action === "start-camera-scan") {
    void startCameraScanner();
  }

  if (action === "stop-camera-scan") {
    stopCameraScanner();
    render();
    showToast("Camera scan gestopt.");
  }
});

if ("serviceWorker" in navigator) {
  let serviceWorkerRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (serviceWorkerRefreshing) return;
    serviceWorkerRefreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js?v=20260804-code1")
      .then((registration) => registration.update())
      .catch(() => {
        showToast("Offline installatie werkt via lokale of online server.");
      });
  });
}

render();
void initializeMemberCodeSession();
void initializeSupabase();

function setTab(tab) {
  if (activeTab === "admin" && tab !== "admin") {
    stopCameraScanner();
  }

  activeTab = tab;
  navButtons.forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleMemberSubmit(form) {
  try {
    if (!codeSession.active) {
      showToast("Log eerst in met je 4-cijfer membercode.");
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    state.member = createMember({
      id: codeSession.memberCode || getMemberCodeId(codeSession.code),
      name: data.name,
      age: data.age,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      targetWeightKg: data.targetWeightKg,
      bodyFat: data.bodyFat,
      bloodPressure: data.bloodPressure,
      goal: data.goal,
      program: data.program,
      level: data.level
    });
    persist();
    setTab("dashboard");
    showToast("Profiel opgeslagen. Je QR-pas is online gekoppeld aan je code.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleMemberCodeLogin(form) {
  try {
    const data = Object.fromEntries(new FormData(form));
    const result = await loginWithAccessCode(data.accessCode);
    codeSession = saveCodeSession(result.session);
    state = result.state;
    persist();
    setTab(result.state.member ? "dashboard" : "profile");
    showToast(result.isNew ? "Code actief. Vul nu je profiel in." : "Welkom terug. Je data is geladen.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleMemberLogout() {
  codeSession = clearCodeSession();
  state = defaultState();
  persist();
  setTab("profile");
  showToast("Je bent uitgelogd.");
}

function handleAdminLogin(form) {
  const data = Object.fromEntries(new FormData(form));
  if (!validateAdminPin(data.adminPin)) {
    showToast("Admin PIN klopt niet. Demo PIN is 2468.");
    return;
  }

  adminUnlocked = true;
  sessionStorage.setItem("bimo-admin-unlocked", "true");
  render();
  showToast("Admin panel geopend.");
}

async function handleAdminScan(form) {
  try {
    const data = Object.fromEntries(new FormData(form));
    await processAdminScanPayload(data.qrPayload, data.adminName || "Admin");
  } catch (error) {
    showToast(error.message);
  }
}

async function processAdminScanPayload(payload, adminName = "Admin") {
  if (!adminUnlocked) {
    showToast("Alleen admin kan QR-scans bevestigen.");
    return;
  }

  const onlineResult = await scanMemberQrInSupabase(payload, { adminName });
  if (onlineResult.ok) {
    state = applyOnlineScanResult(state, onlineResult);
    persist();
    render();
    showToast(onlineResult.message);
    return;
  }

  if (onlineResult.connected && onlineResult.notFound) {
    showToast(onlineResult.message);
    return;
  }

  const result = scanMemberQr(state, payload, {
    adminVerified: true,
    adminName
  });
  state = result.state;
  persist();
  render();
  showToast(result.message);
}

function applyOnlineScanResult(currentState, result) {
  const nextState = normalizeState({
    ...currentState,
    member: result.member || currentState.member,
    points: Number(result.points ?? currentState.points) || 0
  });

  if (result.scan && !nextState.qrScans.some((scan) => scan.id === result.scan.id)) {
    nextState.qrScans.unshift(result.scan);
  }

  if (result.award && !nextState.adminAwards.some((award) => award.id === result.award.id)) {
    nextState.adminAwards.unshift(result.award);
    nextState.activities.unshift({
      id: result.award.id,
      activityId: result.award.ruleId,
      title: result.award.title,
      points: result.award.points,
      periodKey: result.award.periodKey,
      createdAt: result.award.createdAt,
      source: "admin",
      proofCode: result.award.proofCode
    });
  }

  return nextState;
}

function handleAdminAward(form) {
  try {
    const data = Object.fromEntries(new FormData(form));
    const result = awardAdminPoints(state, data.ruleId, {
      adminVerified: adminUnlocked,
      adminName: data.adminName || "Admin",
      metricValue: data.metricValue,
      note: data.note
    });
    state = result.state;
    persist();
    render();
    showToast(result.message);
  } catch (error) {
    showToast(error.message);
  }
}

function render() {
  const views = {
    dashboard: renderDashboard,
    profile: renderProfile,
    plan: renderPlan,
    points: renderPoints,
    ranking: renderRanking,
    rewards: renderRewards,
    admin: renderAdmin
  };

  app.innerHTML = views[activeTab]();
  renderQrCodes();
}

function renderDashboard() {
  const member = state.member;
  const stats = getStats(state);
  const bmi = member ? calculateBmi(member.weightKg, member.heightCm) : null;
  const plan = member ? generateWeeklyPlan(member) : [];
  const nextSession = plan.find((item) => item.intensity !== "Rust") || plan[0];

  return `
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">BIMO Fit Challenge</p>
        <h1>${member ? `Welkom, ${escapeHtml(member.name)}` : "Maak je member account"}</h1>
        <p>${member ? "Laat je QR-code scannen bij binnenkomst en bewaar je bewijs in de app." : "Start direct met je 4-cijfer membercode. Daarna maak je jouw profiel en QR-pas."}</p>
        <div class="hero-actions">
          <button class="primary-action" data-action="${member ? "go-register" : "go-register"}">
            ${member ? "Toon QR-pas" : "Account maken"}
          </button>
          <button class="secondary-action" data-action="go-admin">Admin scan</button>
        </div>
      </div>
      <div class="phone-preview" aria-label="App preview">
        <div class="phone-bar"></div>
        <img src="./assets/metcon.webp" alt="BIMO training programma" />
        <div class="phone-stat">
          <span>${state.points}</span>
          <small>punten</small>
        </div>
      </div>
    </section>

    ${renderSyncNotice()}

    ${!member ? renderMemberAuthPanel() : ""}

    <section class="metric-grid" aria-label="Voortgang overzicht">
      ${metricCard("Punten", state.points, "Alleen admin kan punten zetten")}
      ${metricCard("Badge", stats.badge, "Huidig niveau")}
      ${metricCard("QR scans", stats.totalCheckins, "Bevestigde aanwezigheid")}
      ${metricCard("Challenges", `${stats.completedChallenges}/${stats.totalChallenges}`, "Maanddoelen voltooid")}
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">BMI</p>
            <h2>Gezondheidscheck</h2>
          </div>
        </div>
        ${bmi ? `
          <div class="bmi-result">
            <span>${bmi.value}</span>
            <div>
              <strong>${bmi.category}</strong>
              <p>${bmi.advice}</p>
            </div>
          </div>
          <dl class="health-list">
            <div><dt>Vetpercentage</dt><dd>${member.bodyFat ? `${member.bodyFat}%` : "Nog niet gemeten"}</dd></div>
            <div><dt>Bloeddruk</dt><dd>${member.bloodPressure || "Nog niet gemeten"}</dd></div>
          </dl>
        ` : emptyState("Nog geen BMI", "Maak eerst een profiel aan om je BMI te berekenen.")}
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Laatste scanbewijs</p>
            <h2>${stats.lastScan ? "QR scan bevestigd" : "Nog geen scan"}</h2>
          </div>
        </div>
        ${stats.lastScan ? `
          <div class="session-card proof-card">
            <strong>${stats.lastScan.proofCode}</strong>
            <p>${formatDateTime(stats.lastScan.createdAt)} door ${escapeHtml(stats.lastScan.scannedBy)}.</p>
            <span>${stats.lastScan.status}</span>
          </div>
        ` : emptyState("Geen bewijs", "Laat je member QR scannen bij de ingang. Daarna verschijnt hier je bewijs.")}
      </article>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Beloning</p>
          <h2>Volgende mijlpaal</h2>
        </div>
        <span class="pill">${stats.rewardProgress}%</span>
      </div>
      ${stats.nextReward ? `
        <div class="progress-row">
          <div class="progress-track"><span style="width:${Math.min(stats.rewardProgress, 100)}%"></span></div>
          <p>Nog ${Math.max(stats.nextReward.threshold - state.points, 0)} punten tot ${stats.nextReward.title}.</p>
        </div>
      ` : `<p>Alle beloningen zijn beschikbaar. Sterk werk.</p>`}
    </section>
  `;
}

function renderProfile() {
  const member = state.member || {};
  const isLoggedIn = Boolean(codeSession.active);
  const bmi = state.member ? calculateBmi(member.weightKg, member.heightCm) : null;
  const qrPayload = state.member ? getMemberQrPayload(state.member) : "";
  const proofs = getMemberProofs(state);

  return `
    <section class="page-heading">
      <p class="eyebrow">Member</p>
      <h1>Member account en QR-pas</h1>
      <p>Een member logt hier in met de 4-cijfer code van BIMO. Daarna blijft alle data online terugkomen op elk toestel.</p>
    </section>

    ${renderMemberAuthPanel()}

    <section class="form-layout">
      <form id="memberForm" class="panel form-panel">
        <label>Naam
          <input name="name" required minlength="2" value="${escapeAttribute(member.name || "")}" placeholder="Bijv. Shania" ${isLoggedIn ? "" : "disabled"}>
        </label>
        <div class="two-columns">
          <label>Leeftijd
            <input type="number" name="age" min="12" max="90" value="${member.age || 24}" ${isLoggedIn ? "" : "disabled"}>
          </label>
          <label>Level
            <select name="level" ${isLoggedIn ? "" : "disabled"}>
              ${option("starter", "Starter", member.level)}
              ${option("active", "Actief", member.level)}
              ${option("advanced", "Gevorderd", member.level)}
            </select>
          </label>
        </div>
        <div class="two-columns">
          <label>Lengte in cm
            <input type="number" name="heightCm" required min="120" max="230" value="${member.heightCm || 170}" ${isLoggedIn ? "" : "disabled"}>
          </label>
          <label>Gewicht in kg
            <input type="number" name="weightKg" required min="35" max="250" step="0.1" value="${member.weightKg || 80}" ${isLoggedIn ? "" : "disabled"}>
          </label>
        </div>
        <div class="two-columns">
          <label>Doelgewicht
            <input type="number" name="targetWeightKg" min="35" max="250" step="0.1" value="${member.targetWeightKg || 76}" ${isLoggedIn ? "" : "disabled"}>
          </label>
          <label>Vetpercentage
            <input type="number" name="bodyFat" min="3" max="70" step="0.1" value="${member.bodyFat || ""}" placeholder="Bijv. 28.5" ${isLoggedIn ? "" : "disabled"}>
          </label>
        </div>
        <div class="two-columns">
          <label>Bloeddruk
            <input name="bloodPressure" value="${escapeAttribute(member.bloodPressure || "")}" placeholder="Bijv. 120/80" ${isLoggedIn ? "" : "disabled"}>
          </label>
          <label>Hoofddoel
            <select name="goal" ${isLoggedIn ? "" : "disabled"}>
              ${option("weight_loss", "Afvallen", member.goal)}
              ${option("strength", "Sterker worden", member.goal)}
              ${option("health", "Gezonder leven", member.goal)}
            </select>
          </label>
        </div>
        <label>Voorkeursprogramma
          <select name="program" ${isLoggedIn ? "" : "disabled"}>
            ${Object.entries(trainingPrograms).map(([key, program]) => option(key, program.name, member.program)).join("")}
          </select>
        </label>
        <button class="primary-action" type="submit" ${isLoggedIn ? "" : "disabled"}>Profiel en QR opslaan</button>
      </form>

      <aside class="panel member-pass">
        <p class="eyebrow">Member QR</p>
        <h2>${state.member ? escapeHtml(state.member.name) : "Nog geen member"}</h2>
        ${state.member ? `
          <div class="qr-box" data-qr-payload="${escapeAttribute(qrPayload)}" aria-label="QR-code voor ${escapeAttribute(state.member.name)}"></div>
          <code>${escapeHtml(state.member.id)}</code>
          <p>Laat deze QR-code scannen bij de ingang voor presentie en puntenbewijs.</p>
        ` : `
          ${emptyState("QR nog niet actief", "Sla eerst een member account op.")}
        `}
        <div class="bmi-mini">
          <strong>BMI ${bmi ? bmi.value : "--"}</strong>
          <span>${bmi ? bmi.category : "Nog niet berekend"}</span>
        </div>
        <button class="secondary-action" type="button" data-action="reset-demo">Demo resetten</button>
      </aside>
    </section>

    <section class="panel proof-section">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Bewijs voor member</p>
          <h2>Scan- en puntenbewijs</h2>
        </div>
      </div>
      ${proofs.length ? renderProofList(proofs) : emptyState("Nog geen bewijs", "Na een admin scan of admin puntenactie ziet het lid hier de bevestiging.")}
    </section>
  `;
}

function renderPlan() {
  const plan = generateWeeklyPlan(state.member);
  const program = state.member ? trainingPrograms[state.member.program] : null;

  return `
    <section class="page-heading">
      <p class="eyebrow">Trainingsschema</p>
      <h1>${program ? program.name : "Persoonlijk weekplan"}</h1>
      <p>${program ? program.focus : "Registreer eerst een lid om een schema te genereren."}</p>
    </section>
    ${plan.length ? `
      <section class="plan-list">
        ${plan.map((item) => `
          <article class="plan-item">
            <div class="day-block">${item.day.slice(0, 2)}</div>
            <div>
              <h2>${item.day}</h2>
              <strong>${item.title}</strong>
              <p>${item.focus}</p>
            </div>
            <span>${item.duration}</span>
          </article>
        `).join("")}
      </section>
    ` : emptyState("Geen schema", "Vul registratie en BMI in om het schema te activeren.")}
  `;
}

function renderPoints() {
  const proofs = getMemberProofs(state);

  return `
    <section class="page-heading">
      <p class="eyebrow">Punten</p>
      <h1>Puntenoverzicht</h1>
      <p>Punten kunnen alleen door admin worden gezet. Members zien hier regels, status en bewijs.</p>
    </section>

    <section class="activity-grid">
      ${pointRules.map((rule) => `
        <article class="activity-card">
          <span class="points-chip">+${rule.points}</span>
          <h2>${rule.title}</h2>
          <p>${rule.description}</p>
          <small>${rule.category} - ${repeatLabel(rule.repeat)}</small>
        </article>
      `).join("")}
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Maandelijkse challenges</p>
            <h2>Voortgang</h2>
          </div>
        </div>
        <div class="challenge-list">
          ${challengeCatalog.map((challenge) => renderChallenge(challenge, false)).join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Member bewijs</p>
            <h2>Laatste bevestigingen</h2>
          </div>
        </div>
        ${proofs.length ? renderProofList(proofs.slice(0, 8)) : emptyState("Nog geen bewijs", "Wacht op een admin scan of puntentoekenning.")}
      </article>
    </section>
  `;
}

function renderRanking() {
  const localLeaderboard = getLeaderboard(state);
  const memberId = state.member?.id;
  const onlineLeaderboard = remoteLeaderboard.map((item) => ({
    ...item,
    current: item.id === memberId
  }));
  const leaderboard = onlineLeaderboard.length ? onlineLeaderboard : localLeaderboard;
  const sourceLabel = onlineLeaderboard.length
    ? "Online ranking uit Supabase. Zodra admin punten zet, wordt de ranking bijgewerkt."
    : "Ranking wordt gevoed door admin-bevestigde punten en QR-aanwezigheid.";

  return `
    <section class="page-heading">
      <p class="eyebrow">Ranking</p>
      <h1>Leaderboard deelnemers</h1>
      <p>${sourceLabel}</p>
    </section>
    <section class="leaderboard">
      ${leaderboard.map((item) => `
        <article class="leader-row ${item.current ? "is-current" : ""}">
          <span class="rank">#${item.rank}</span>
          <div>
            <h2>${escapeHtml(item.name)}</h2>
            <p>${item.badge} deelnemer</p>
          </div>
          <strong>${item.points} pt</strong>
        </article>
      `).join("")}
    </section>
  `;
}

function renderRewards() {
  return `
    <section class="page-heading">
      <p class="eyebrow">Rewards</p>
      <h1>Korting, waardebonnen en merchandise</h1>
      <p>Beloningen worden beschikbaar zodra de deelnemer genoeg admin-bevestigde punten heeft.</p>
    </section>
    <section class="reward-grid">
      ${rewardCatalog.map((reward) => {
        const claimed = state.claimedRewards.includes(reward.id);
        const locked = state.points < reward.threshold;
        return `
          <article class="reward-card ${claimed ? "is-claimed" : ""}">
            <span class="points-chip">${reward.threshold} pt</span>
            <small>${reward.type}</small>
            <h2>${reward.title}</h2>
            <p>${reward.description}</p>
            <button class="secondary-action" data-action="claim-reward" data-reward-id="${reward.id}" ${locked || claimed ? "disabled" : ""}>
              ${claimed ? "Geclaimd" : locked ? "Nog locked" : "Claim beloning"}
            </button>
          </article>
        `;
      }).join("")}
    </section>
  `;
}

function renderMemberAuthPanel() {
  if (codeSession.active) {
    return `
      <section class="panel auth-panel is-signed-in">
        <div>
          <p class="eyebrow">Membercode actief</p>
          <h2>${escapeHtml(codeSession.memberCode)}</h2>
          <p>${state.member ? "Je bent ingelogd. Je profiel, punten en scanbewijzen zijn geladen." : "Code is goedgekeurd. Vul nu je profiel in om je QR-pas te maken."}</p>
        </div>
        <button class="secondary-action compact-button" type="button" data-action="member-logout">Uitloggen</button>
      </section>
    `;
  }

  return `
    <section class="auth-grid single-auth-grid">
      <form id="memberCodeForm" class="panel form-panel auth-card code-login-card">
        <div>
          <p class="eyebrow">Member login</p>
          <h2>Log in met je 4-cijfer code</h2>
        </div>
        <label>Membercode
          <input class="code-input" name="accessCode" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{4}" maxlength="4" placeholder="1234">
        </label>
        <button class="primary-action" type="submit">Inloggen / account starten</button>
        <p class="auth-note">BIMO geeft deze code aan het lid. Met dezelfde code ziet het lid later opnieuw profiel, punten, QR-scans en rewards.</p>
      </form>
    </section>
  `;
}

function renderAdmin() {
  const stats = getStats(state);
  const qrPayload = state.member ? getMemberQrPayload(state.member) : "";

  if (!adminUnlocked) {
    return `
      <section class="page-heading">
        <p class="eyebrow">Admin</p>
        <h1>Admin panel</h1>
        <p>Alleen admin kan QR-scans bevestigen en punten zetten.</p>
      </section>
      <form id="adminLoginForm" class="panel admin-login">
        <label>Admin PIN
          <input type="password" name="adminPin" inputmode="numeric" autocomplete="off" placeholder="Demo PIN: 2468">
        </label>
        <button class="primary-action" type="submit">Admin openen</button>
      </form>
    `;
  }

  return `
    <section class="page-heading">
      <p class="eyebrow">Admin</p>
      <h1>Scan en puntenbeheer</h1>
      <p>Admin houdt presentie bij, scant QR-codes en kent punten toe voor betaling, gezondheid, events en referrals.</p>
    </section>

    ${renderSyncNotice(true)}

    <section class="metric-grid" aria-label="Admin samenvatting">
      ${metricCard("QR scans", stats.totalCheckins, "Aanwezigheid bevestigd")}
      ${metricCard("Puntenacties", stats.adminAwards, "Door admin gezet")}
      ${metricCard("Totaal", state.points, "Member score")}
      ${metricCard("Admin", "Open", "Panel is ontgrendeld")}
    </section>

    <section class="admin-grid">
      <form id="adminScanForm" class="panel form-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">QR scan</p>
            <h2>Member inchecken</h2>
          </div>
          <button class="secondary-action compact-button" type="button" data-action="fill-current-qr">Gebruik huidige QR</button>
        </div>
        <div class="camera-scanner" data-camera-scanner>
          <video id="qrVideo" class="camera-preview" playsinline muted hidden></video>
          <p id="cameraStatus">Admin kan op telefoon direct met de camera scannen. Werkt via HTTPS en vraagt eerst camera-toegang.</p>
          <div class="camera-actions">
            <button class="primary-action compact-button" type="button" data-action="start-camera-scan">Scan met camera</button>
            <button class="secondary-action compact-button" type="button" data-action="stop-camera-scan">Stop camera</button>
          </div>
        </div>
        <label>Scanner output / QR payload
          <textarea name="qrPayload" rows="5" placeholder="Scan hier de member QR-code">${escapeHtml(qrPayload)}</textarea>
        </label>
        <label>Admin naam
          <input name="adminName" value="Frontdesk">
        </label>
        <button class="primary-action" type="submit">QR scan bevestigen</button>
      </form>

      <form id="adminAwardForm" class="panel form-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Punten zetten</p>
            <h2>Admin-only punten</h2>
          </div>
        </div>
        <label>Puntenregel
          <select name="ruleId">
            ${pointRules.filter((rule) => rule.id !== "qr-checkin").map((rule) => `<option value="${rule.id}">${rule.title} (+${rule.points})</option>`).join("")}
          </select>
        </label>
        <label>Meting of waarde
          <input name="metricValue" placeholder="Bijv. 3 kg, -2% vet, 120/80 of eventnaam">
        </label>
        <label>Admin notitie
          <textarea name="note" rows="4" placeholder="Bijv. Nieuwe inschrijving bevestigd, betaling op tijd, bloeddruk verbeterd."></textarea>
        </label>
        <label>Admin naam
          <input name="adminName" value="Coach">
        </label>
        <button class="primary-action" type="submit" ${state.member ? "" : "disabled"}>Punten toekennen na scan</button>
      </form>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Challenge beheer</p>
            <h2>Admin voortgang</h2>
          </div>
        </div>
        <div class="challenge-list">
          ${challengeCatalog.map((challenge) => renderChallenge(challenge, true)).join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Admin log</p>
            <h2>Laatste acties</h2>
          </div>
          <button class="secondary-action compact-button" type="button" data-action="admin-logout">Lock</button>
        </div>
        ${state.activities.length ? `
          <ol class="activity-log">
            ${state.activities.slice(0, 10).map((entry) => `
              <li>
                <span>${entry.title}<small>${entry.proofCode ? `Bewijs ${entry.proofCode}` : "Admin actie"}</small></span>
                <strong>+${entry.points}</strong>
              </li>
            `).join("")}
          </ol>
        ` : emptyState("Nog geen admin acties", "Scan een QR-code of ken punten toe.")}
      </article>
    </section>
  `;
}

function renderChallenge(challenge, editable) {
  const entry = state.challenges.find((item) => item.id === challenge.id);
  const progress = entry?.progress || 0;
  const percent = Math.min(100, Math.round((progress / challenge.target) * 100));

  return `
    <form class="challenge-item" data-challenge-form="${challenge.id}">
      <div>
        <span class="pill">${challenge.theme}</span>
        <h3>${challenge.title}</h3>
        <div class="progress-track"><span style="width:${percent}%"></span></div>
        <p>${progress}/${challenge.target} ${challenge.unit} - bonus ${challenge.bonus} punten</p>
      </div>
      ${editable ? `
        <label class="compact-input">
          <span>Update</span>
          <input type="number" name="progress" min="0" max="${challenge.target}" step="1" value="${progress}">
        </label>
        <button class="secondary-action" type="submit" ${entry?.completed ? "disabled" : ""}>${entry?.completed ? "Voltooid" : "Opslaan"}</button>
      ` : `<span class="status-chip">${entry?.completed ? "Voltooid" : "Open"}</span>`}
    </form>
  `;
}

function renderProofList(proofs) {
  return `
    <ol class="proof-list">
      ${proofs.map((proof) => `
        <li>
          <div>
            <strong>${proof.title}</strong>
            <p>${escapeHtml(proof.detail)} - ${formatDateTime(proof.createdAt)}</p>
          </div>
          <span>+${proof.points}</span>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderQrCodes() {
  document.querySelectorAll("[data-qr-payload]").forEach((container) => {
    const payload = container.dataset.qrPayload;
    container.innerHTML = "";

    if (!payload || !window.qrcode) {
      container.textContent = "QR niet beschikbaar";
      return;
    }

    const qr = window.qrcode(0, "M");
    qr.addData(payload);
    qr.make();
    container.innerHTML = qr.createSvgTag(5, 2);
  });
}

async function startCameraScanner() {
  if (!adminUnlocked) {
    showToast("Open eerst het admin panel.");
    return;
  }

  const video = document.querySelector("#qrVideo");
  if (!(video instanceof HTMLVideoElement)) {
    showToast("Camera venster is niet beschikbaar.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraStatus("Deze browser ondersteunt camera toegang niet. Gebruik handmatige QR invoer.");
    return;
  }

  const scannerMode = await getScannerMode();
  if (scannerMode === "unsupported") {
    setCameraStatus("QR-camera scan wordt niet ondersteund op deze browser. Gebruik handmatige scan.");
    return;
  }

  stopCameraScanner();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    cameraScanner.stream = stream;
    cameraScanner.active = true;
    cameraScanner.canvas = cameraScanner.canvas || document.createElement("canvas");
    video.srcObject = stream;
    video.hidden = false;
    await video.play();
    setCameraStatus("Camera actief. Richt op de member QR-code.");
    scanCameraFrame(video, scannerMode);
  } catch (error) {
    stopCameraScanner();
    setCameraStatus(getCameraErrorMessage(error));
  }
}

function stopCameraScanner() {
  cameraScanner.active = false;
  if (cameraScanner.frameId) {
    window.cancelAnimationFrame(cameraScanner.frameId);
    cameraScanner.frameId = 0;
  }

  if (cameraScanner.stream) {
    cameraScanner.stream.getTracks().forEach((track) => track.stop());
    cameraScanner.stream = null;
  }

  const video = document.querySelector("#qrVideo");
  if (video instanceof HTMLVideoElement) {
    video.pause();
    video.srcObject = null;
    video.hidden = true;
  }
}

async function scanCameraFrame(video, scannerMode) {
  if (!cameraScanner.active) return;

  try {
    const qrValue = await detectQrValue(video, scannerMode);
    if (qrValue) {
      stopCameraScanner();
      const form = document.querySelector("#adminScanForm");
      const input = form?.querySelector("[name='qrPayload']");
      const adminName = form?.querySelector("[name='adminName']")?.value || "Admin";
      if (input) input.value = qrValue;
      setCameraStatus("QR-code gelezen. Check-in wordt verwerkt.");
      await processAdminScanPayload(qrValue, adminName);
      return;
    }
  } catch {
    setCameraStatus("QR kon nog niet gelezen worden. Houd de code stil in beeld.");
  }

  cameraScanner.frameId = window.requestAnimationFrame(() => {
    void scanCameraFrame(video, scannerMode);
  });
}

async function detectQrValue(video, scannerMode) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    return "";
  }

  if (scannerMode === "native") {
    const codes = await cameraScanner.detector.detect(video);
    return codes[0]?.rawValue || "";
  }

  const canvas = cameraScanner.canvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = window.jsQR(frame.data, frame.width, frame.height, {
    inversionAttempts: "dontInvert"
  });
  return result?.data || "";
}

async function getScannerMode() {
  if ("BarcodeDetector" in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes("qr_code")) {
        cameraScanner.detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        return "native";
      }
    } catch {
      cameraScanner.detector = null;
    }
  }

  return typeof window.jsQR === "function" ? "jsqr" : "unsupported";
}

function setCameraStatus(message) {
  const status = document.querySelector("#cameraStatus");
  if (status) status.textContent = message;
  showToast(message);
}

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") return "Camera toegang geweigerd. Sta camera toe in je browser.";
  if (error?.name === "NotFoundError") return "Geen camera gevonden op dit toestel.";
  if (error?.name === "NotReadableError") return "Camera is al in gebruik door een andere app.";
  if (!window.isSecureContext) return "Camera werkt alleen via HTTPS. Gebruik de GitHub Pages-link.";
  return "Camera kon niet worden gestart. Gebruik handmatige scan.";
}

function metricCard(label, value, description) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${description}</p>
    </article>
  `;
}

function renderSyncNotice(includeAction = false) {
  const statusClass = syncStatus.connected ? "is-online" : syncStatus.configured ? "is-warning" : "is-local";
  return `
    <section class="sync-banner ${statusClass}" aria-live="polite">
      <div>
        <strong>${escapeHtml(syncStatus.label)}</strong>
        <p>${escapeHtml(syncStatus.detail)}</p>
      </div>
      ${includeAction ? `<button class="secondary-action compact-button" type="button" data-action="sync-now">Nu synchroniseren</button>` : ""}
    </section>
  `;
}

function emptyState(title, body) {
  return `
    <div class="empty-state">
      <strong>${title}</strong>
      <p>${body}</p>
    </div>
  `;
}

function option(value, label, currentValue) {
  const selected = value === currentValue ? "selected" : "";
  return `<option value="${value}" ${selected}>${label}</option>`;
}

function repeatLabel(repeat) {
  return {
    daily: "max. 1x per dag",
    weekly: "max. 1x per week",
    monthly: "max. 1x per maand",
    always: "meerdere keren mogelijk"
  }[repeat] || "admin bepaalt";
}

async function initializeSupabase() {
  const status = await getSupabaseStatus();
  syncStatus = mapSyncStatus(status);

  if (status.connected) {
    await refreshRemoteLeaderboard();
    if (state.member) {
      await syncStateNow({ silent: true });
    }
  }

  render();
}

async function initializeMemberCodeSession() {
  if (!codeSession.active) return;
  await hydrateMemberFromCode();
  render();
}

async function hydrateMemberFromCode() {
  try {
    const result = await loginWithAccessCode(codeSession.code);
    codeSession = saveCodeSession(result.session);
    state = result.state;
    persist();
  } catch {
    codeSession = clearCodeSession();
    showToast("Membercode kon niet opnieuw geladen worden. Log opnieuw in.");
  }
}

function queueSupabaseSync() {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    void syncStateNow({ silent: true });
  }, 350);
}

async function syncStateNow(options = {}) {
  const result = await pushStateToSupabase(state);
  syncStatus = mapSyncStatus(result);

  if (result.ok && !result.skipped) {
    await refreshRemoteLeaderboard();
    if (options.showSuccessToast) {
      showToast("Supabase is bijgewerkt.");
    }
  } else if (!options.silent && options.showSuccessToast) {
    showToast(result.message);
  }

  render();
}

async function refreshRemoteLeaderboard() {
  try {
    remoteLeaderboard = await fetchRemoteLeaderboard();
  } catch {
    remoteLeaderboard = [];
  }
}

function mapSyncStatus(status) {
  if (status.connected || status.synced) {
    return {
      connected: true,
      configured: true,
      label: "Supabase online",
      detail: "Online opslag actief."
    };
  }

  if (status.configured && !status.skipped) {
    return {
      connected: false,
      configured: true,
      label: "Supabase aandacht nodig",
      detail: shortenStatusText(status.message || "Controleer key, tabellen of RLS policies.")
    };
  }

  return {
    connected: false,
    configured: false,
    label: "Lokale demo",
    detail: "Lokale opslag actief tot Supabase klaar is."
  };
}

function shortenStatusText(message) {
  const text = String(message || "").trim();
  if (!text) return "Controleer Supabase setup.";
  if (/tabellen ontbreken|schema|relation/i.test(text)) return "Database-tabellen ontbreken nog. Run supabase-schema.sql.";
  if (/api key|401|weigert/i.test(text)) return "API key controleren in Supabase settings.";
  if (/RLS|polic/i.test(text)) return "RLS policies controleren in Supabase.";
  return text.length > 78 ? `${text.slice(0, 75)}...` : text;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

function persist() {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueSupabaseSync();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
