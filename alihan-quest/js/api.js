const STORAGE_KEY = 'alihan_quest_v3';
const SERVER_ID_MAX = 100000000; // id из БД — маленькие числа; локальный фейк — timestamp

function isServerQuestId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 && n < SERVER_ID_MAX;
}

function filterServerQuests(quests) {
  if (!Array.isArray(quests)) return [];
  return quests.filter((q) => isServerQuestId(q?.id));
}

const STAT_KEYS = ['capital', 'entrepreneur', 'mastery', 'mabibip', 'media', 'form', 'network', 'discipline'];

const STAT_LEVEL_RULES = {
  capital: '₽10 000 = 1 ур.',
  media: '1 000 подписчиков = 1 ур.',
  entrepreneur: '5 проектов = 1 ур.',
  mastery: '1 навык = 1 ур.',
  mabibip: '100 пользователей = 1 ур.',
  form: '1 разминка = +1 ур.',
  network: '10 контактов = 1 ур.',
  discipline: '7 дней подряд все задачи = 1 ур.',
};

function computeStatLevelsFromDefinitions(definitions) {
  const out = {};
  (definitions || []).forEach((d) => {
    const val = Number(d.current_value || 0);
    if (d.rule_type === 'direct') out[d.key] = Math.max(0, Math.floor(val));
    else if (d.rule_type === 'streak_week') out[d.key] = Math.max(0, Math.floor(val));
    else {
      const div = Math.max(1, Number(d.rule_value || 1));
      out[d.key] = Math.floor(val / div);
    }
  });
  return out;
}

function computeStatLevels(kpi, definitions) {
  if (definitions?.length) return computeStatLevelsFromDefinitions(definitions);
  const k = kpi || {};
  return {
    capital: Math.floor(Number(k.capital_season || 0) / 10000),
    media: Math.floor(Number(k.instagram_followers || 0) / 1000),
    entrepreneur: Math.floor(Number(k.business_projects || 0) / 5),
    mastery: Number(k.skills_count || 0),
    mabibip: Math.floor(Number(k.mabibip_users || 0) / 100),
    form: Number(k.form_sessions || 0),
    network: Math.floor(Number(k.contacts_count || 0) / 10),
    discipline: Number(k.discipline_perfect_weeks || 0),
  };
}

function computeHeroLevel(statLevels) {
  const vals = Object.values(statLevels || {});
  if (!vals.length) return 1;
  const sum = vals.reduce((a, b) => a + Number(b), 0);
  if (sum === 0) return 1;
  return Math.max(1, Math.round(sum / vals.length));
}

const LEVEL_TITLES = [
  [1, 4, 'ПЕРВЫЙ ШАГ'],
  [5, 9, 'ЧЕЛОВЕК ДЕЙСТВИЯ'],
  [10, 14, 'СТРОИТЕЛЬ'],
  [15, 19, 'СТРОИТЕЛЬ БУДУЩЕГО'],
  [20, 24, 'ИГРОК БИЗНЕСА'],
  [25, 29, 'СОЗДАТЕЛЬ'],
  [30, 34, 'РУКОВОДИТЕЛЬ'],
  [35, 39, 'СТРАТЕГ'],
  [40, 44, 'БИЗНЕСМЕН'],
  [45, 49, 'МАСТЕР ИГРЫ'],
  [50, 999, 'АРХИТЕКТОР СОБСТВЕННОЙ ЖИЗНИ'],
];

function titleForLevel(level) {
  const lv = Number(level) || 1;
  for (const [low, high, title] of LEVEL_TITLES) {
    if (lv >= low && lv <= high) return title;
  }
  return 'АЛИХАН';
}

const DEFAULT_KPI = {
  capital_season: 215000,
  capital_goal: 1000000,
  mabibip_users: 520,
  mabibip_goal: 1200,
  mabibip_masters: 175,
  mabibip_masters_goal: 300,
  instagram_followers: 5198,
  instagram_goal: 10000,
  business_projects: 10,
  weight_kg: 80,
  weight_goal_kg: 88,
  home_savings: 0,
  home_goal: 0,
  car_savings: 0,
  car_goal: 0,
  skills_count: 12,
  contacts_count: 0,
  form_sessions: 0,
  discipline_perfect_weeks: 0,
  discipline_streak_days: 0,
};

const DEFAULT_PROFILE = (() => {
  const stats_levels = computeStatLevels(DEFAULT_KPI);
  const level = computeHeroLevel(stats_levels);
  return {
    display_name: 'АЛИХАН',
    level,
    title: 'ПЕРВЫЙ ШАГ',
    total_xp: 0,
    xp_in_level: 0,
    xp_needed: 1000,
    action_streak: 0,
    kpi: { ...DEFAULT_KPI },
    stats_xp: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    stats_levels,
    goals: [],
    season: { number: 1, title: 'ВОЗВРАЩЕНИЕ', boss_name: 'ФИНАНСОВАЯ НЕСТАБИЛЬНОСТЬ', boss_defeated: false },
  };
})();

const DEMO_QUESTS = {
  date: new Date().toISOString().slice(0, 10),
  main_mission: '',
  quests: [],
};

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const ver = window.QUEST_CONFIG?.CACHE_VERSION || 1;
    if (raw._cacheVersion !== ver) return { _cacheVersion: ver };
    return raw;
  } catch { return {}; }
}

function saveLocal(data) {
  const ver = window.QUEST_CONFIG?.CACHE_VERSION || 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _cacheVersion: ver }));
  // Удалить старый кэш с фейковыми задачами
  try { localStorage.removeItem('alihan_quest_local'); } catch { /* ignore */ }
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const tg = window.Telegram?.WebApp?.initData;
  if (tg) h['X-Telegram-Init-Data'] = tg;
  // Всегда demo-token — fallback на тот же профиль в БД (MVP single-user)
  h['X-Demo-Token'] = window.QUEST_CONFIG?.DEMO_TOKEN || 'demo-alihan-quest';
  return h;
}

function getApiBase() {
  // config.js — источник правды; localStorage только если явно задан вручную
  const fromConfig = (window.QUEST_CONFIG?.API_BASE || '').replace(/\/$/, '');
  if (fromConfig) return fromConfig;
  return (localStorage.getItem('quest_api_base') || '').replace(/\/$/, '');
}

function normalizeProfile(data) {
  const src = data && typeof data === 'object' ? data : {};
  const kpi = { ...DEFAULT_KPI, ...(src.kpi || {}) };
  const statDefinitions = Array.isArray(src.stat_definitions) ? src.stat_definitions : [];
  const stats_levels = computeStatLevels(kpi, statDefinitions);
  const level = computeHeroLevel(stats_levels);
  const title = titleForLevel(level);
  const statLabels = src.stat_labels && typeof src.stat_labels === 'object' ? src.stat_labels : null;
  return {
    ...DEFAULT_PROFILE,
    ...src,
    level,
    title,
    kpi,
    stats_xp: { ...DEFAULT_PROFILE.stats_xp, ...(src.stats_xp || {}) },
    stats_levels,
    stat_definitions: statDefinitions,
    stat_labels: statLabels,
    habits: Array.isArray(src.habits) ? src.habits : [],
    onboarding: src.onboarding || { completed: true, step: 'complete' },
    goals: Array.isArray(src.goals) ? src.goals : [],
    season: src.season ?? DEFAULT_PROFILE.season,
    gamification: src.gamification || null,
    season_v2: src.season_v2 || null,
    league: src.league || null,
    clan: src.clan || null,
  };
}

function normalizeQuestPack(data) {
  const src = data && typeof data === 'object' ? data : {};
  return {
    date: src.date || new Date().toISOString().slice(0, 10),
    main_mission: src.main_mission || '',
    quests: filterServerQuests(src.quests),
    sync: src.sync || null,
  };
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text || text.trim().startsWith('<')) throw new Error('html response');
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('invalid json');
  return data;
}

async function apiFetch(path, options = {}) {
  const base = getApiBase();
  if (!base) throw new Error('offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${base}/api/v1${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...getHeaders(), ...options.headers },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return parseJsonResponse(res);
  } finally {
    clearTimeout(timer);
  }
}

function cachedProfile() {
  return normalizeProfile(loadLocal().profile || DEFAULT_PROFILE);
}

function cachedQuests() {
  const local = loadLocal();
  if (local.quests) return normalizeQuestPack(local.quests);
  return normalizeQuestPack(DEMO_QUESTS);
}

window.QuestAPI = {
  STAT_KEYS,
  STAT_LEVEL_RULES,
  cachedProfile,
  cachedQuests,
  computeStatLevels,
  computeHeroLevel,
  normalizeProfile,
  titleForLevel,
  getApiBase,

  async getProfile() {
    try {
      const data = normalizeProfile(await apiFetch('/me/'));
      const local = loadLocal();
      local.profile = data;
      saveLocal(local);
      return { data, online: true };
    } catch {
      return { data: cachedProfile(), online: false };
    }
  },

  async updateProfile(payload) {
    const data = normalizeProfile(await apiFetch('/me/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }));
    const local = loadLocal();
    local.profile = data;
    saveLocal(local);
    return { data, online: true };
  },

  async getTodayQuests() {
    try {
      const raw = await apiFetch('/quests/today/');
      const data = normalizeQuestPack(raw);
      const local = loadLocal();
      local.quests = data;
      local.lastSync = Date.now();
      saveLocal(local);
      return { data, online: true, sync: raw.sync || null };
    } catch (err) {
      return { data: { date: new Date().toISOString().slice(0, 10), main_mission: '', quests: [], sync: null }, online: false, error: String(err) };
    }
  },

  async importQuests(payload, replace = false) {
    const body = { ...(payload || {}), replace: Boolean(replace) };
    await apiFetch('/quests/import/', { method: 'POST', body: JSON.stringify(body) });
    return this.getTodayQuests();
  },

  async addQuest(payload) {
    await apiFetch('/quests/manual/', { method: 'POST', body: JSON.stringify(payload) });
    return (await this.getTodayQuests()).data;
  },

  async patchQuest(id, payload) {
    return await apiFetch(`/quests/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  async updateQuest(id, payload) {
    await this.patchQuest(id, payload);
    return (await this.getTodayQuests()).data;
  },

  async deferQuest(id) {
    await apiFetch(`/quests/${id}/defer/`, { method: 'POST', body: '{}' });
    return (await this.getTodayQuests()).data;
  },

  async deleteQuest(id) {
    await apiFetch(`/quests/${id}/`, { method: 'DELETE' });
    return (await this.getTodayQuests()).data;
  },

  async getQuestDetail(id) {
    try {
      return await apiFetch(`/quests/${id}/`);
    } catch {
      const pack = cachedQuests();
      const q = pack.quests.find((x) => x.id === id);
      return q ? { ...q, reflection: {} } : null;
    }
  },

  async getCalendar(year, month) {
    try {
      return await apiFetch(`/quests/calendar/?year=${year}&month=${month}`);
    } catch {
      return { year, month, days: {} };
    }
  },

  async getQuestsByDate(dateStr) {
    try {
      return await apiFetch(`/quests/by-date/?date=${dateStr}`);
    } catch {
      if (cachedQuests().date === dateStr) return cachedQuests();
      return { date: dateStr, main_mission: '', quests: [] };
    }
  },

  async completeQuest(questId, reflection) {
    return await apiFetch(`/quests/${questId}/complete/`, {
      method: 'POST', body: JSON.stringify({ reflection }),
    });
  },

  async getChests() {
    return await apiFetch('/gamification/chests/');
  },

  async openChest(chestId) {
    return await apiFetch(`/gamification/chests/${chestId}/open/`, { method: 'POST', body: '{}' });
  },

  async claimMorningChest() {
    return await apiFetch('/gamification/daily/morning/', { method: 'POST', body: '{}' });
  },

  async claimEveningChest(reflectionSummary) {
    return await apiFetch('/gamification/daily/evening/', {
      method: 'POST',
      body: JSON.stringify({ reflection_summary: reflectionSummary }),
    });
  },

  async getLeague() {
    return await apiFetch('/gamification/league/');
  },

  async getGrowthPaths() {
    return await apiFetch('/gamification/growth/paths/');
  },

  async getGrowthPath(statKey) {
    return await apiFetch(`/gamification/growth/paths/${statKey}/`);
  },

  async startGrowthNode(nodeId) {
    return await apiFetch(`/gamification/growth/nodes/${nodeId}/start/`, { method: 'POST', body: '{}' });
  },

  async completeGrowthNode(nodeId, reflection) {
    return await apiFetch(`/gamification/growth/nodes/${nodeId}/complete/`, {
      method: 'POST',
      body: JSON.stringify({ reflection: reflection || {} }),
    });
  },

  async getClan() {
    return await apiFetch('/clans/me/');
  },

  async createClan(name, statFocus = '') {
    return await apiFetch('/clans/', {
      method: 'POST',
      body: JSON.stringify({ name, stat_focus: statFocus }),
    });
  },

  async joinClan(inviteCode) {
    return await apiFetch('/clans/join/', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  },

  async leaveClan() {
    return await apiFetch('/clans/leave/', { method: 'POST', body: '{}' });
  },

  async getShopThemes() {
    return await apiFetch('/gamification/shop/themes/');
  },

  async activateTheme(code) {
    return await apiFetch(`/gamification/shop/themes/${code}/activate/`, { method: 'POST', body: '{}' });
  },

  async getSubscription() {
    return await apiFetch('/gamification/subscription/');
  },

  async checkoutPro(planCode = 'quest_pro_monthly') {
    return await apiFetch('/gamification/subscription/checkout/', {
      method: 'POST',
      body: JSON.stringify({ plan_code: planCode }),
    });
  },

  async useStreakGrace() {
    return await apiFetch('/gamification/streak/grace/', { method: 'POST', body: '{}' });
  },

  async getOnboarding() {
    return await apiFetch('/onboarding/');
  },

  async saveOnboardingStep(step, payload) {
    return await apiFetch('/onboarding/', {
      method: 'POST',
      body: JSON.stringify({ step, payload }),
    });
  },

  async getAnalytics() {
    return await apiFetch('/analytics/progress/');
  },

  async updateStatConfig(stats) {
    return await apiFetch('/stats/config/', {
      method: 'PATCH',
      body: JSON.stringify({ stats }),
    });
  },

  async updateHabits(habits) {
    return await apiFetch('/habits/', {
      method: 'PATCH',
      body: JSON.stringify({ habits }),
    });
  },
};
