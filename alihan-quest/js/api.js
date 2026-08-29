const STORAGE_KEY = 'alihan_quest_local';

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

function computeStatLevels(kpi) {
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
  main_mission: 'Получить новую бизнес-возможность',
  quests: [],
};

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const tg = window.Telegram?.WebApp?.initData;
  if (tg) h['X-Telegram-Init-Data'] = tg;
  else h['X-Demo-Token'] = window.QUEST_CONFIG?.DEMO_TOKEN || 'demo-alihan-quest';
  return h;
}

function normalizeProfile(data) {
  const src = data && typeof data === 'object' ? data : {};
  const kpi = { ...DEFAULT_KPI, ...(src.kpi || {}) };
  const stats_levels = computeStatLevels(kpi);
  const level = computeHeroLevel(stats_levels);
  const title = titleForLevel(level);
  return {
    ...DEFAULT_PROFILE,
    ...src,
    level,
    title,
    kpi,
    stats_xp: { ...DEFAULT_PROFILE.stats_xp, ...(src.stats_xp || {}) },
    stats_levels,
    goals: Array.isArray(src.goals) ? src.goals : [],
    season: src.season ?? DEFAULT_PROFILE.season,
  };
}

function normalizeQuestPack(data) {
  const src = data && typeof data === 'object' ? data : {};
  return {
    date: src.date || new Date().toISOString().slice(0, 10),
    main_mission: src.main_mission || '',
    quests: Array.isArray(src.quests) ? src.quests : [],
  };
}

function getApiBase() {
  return (localStorage.getItem('quest_api_base')
    || window.QUEST_CONFIG?.API_BASE
    || '').replace(/\/$/, '');
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
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/v1${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...getHeaders(), ...options.headers },
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
  return normalizeQuestPack(loadLocal().quests || DEMO_QUESTS);
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
    try {
      const data = normalizeProfile(await apiFetch('/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }));
      const local = loadLocal();
      local.profile = data;
      saveLocal(local);
      return { data, online: true };
    } catch {
      const local = loadLocal();
      const profile = normalizeProfile({ ...cachedProfile(), ...payload, kpi: { ...cachedProfile().kpi, ...(payload.kpi || {}) } });
      local.profile = profile;
      saveLocal(local);
      return { data: profile, online: false };
    }
  },

  async getTodayQuests() {
    try {
      const data = normalizeQuestPack(await apiFetch('/quests/today/'));
      const local = loadLocal();
      local.quests = data;
      saveLocal(local);
      return { data, online: true };
    } catch {
      return { data: cachedQuests(), online: false };
    }
  },

  async importQuests(payload, replace = false) {
    try {
      const body = { ...(payload || {}), replace: Boolean(replace) };
      await apiFetch('/quests/import/', { method: 'POST', body: JSON.stringify(body) });
      return this.getTodayQuests();
    } catch {
      return { data: cachedQuests(), online: false };
    }
  },

  async addQuest(payload) {
    try {
      const q = await apiFetch('/quests/manual/', { method: 'POST', body: JSON.stringify(payload) });
      return (await this.getTodayQuests()).data;
    } catch {
      const local = loadLocal();
      const pack = normalizeQuestPack(local.quests || DEMO_QUESTS);
      const id = Date.now();
      pack.quests.push({ id, ...payload, status: 'pending', source: 'manual' });
      local.quests = pack;
      saveLocal(local);
      return pack;
    }
  },

  async updateQuest(id, payload) {
    try {
      await apiFetch(`/quests/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
      return (await this.getTodayQuests()).data;
    } catch {
      const local = loadLocal();
      const pack = normalizeQuestPack(local.quests || DEMO_QUESTS);
      const q = pack.quests.find((x) => x.id === id);
      if (q) Object.assign(q, payload);
      local.quests = pack;
      saveLocal(local);
      return pack;
    }
  },

  async deferQuest(id) {
    try {
      await apiFetch(`/quests/${id}/defer/`, { method: 'POST', body: '{}' });
      return (await this.getTodayQuests()).data;
    } catch {
      const local = loadLocal();
      const pack = normalizeQuestPack(local.quests || DEMO_QUESTS);
      const q = pack.quests.find((x) => x.id === id);
      if (q) pack.quests = pack.quests.filter((x) => x.id !== id);
      local.quests = pack;
      saveLocal(local);
      return pack;
    }
  },

  async deleteQuest(id) {
    try {
      await apiFetch(`/quests/${id}/`, { method: 'DELETE' });
      return (await this.getTodayQuests()).data;
    } catch {
      const local = loadLocal();
      const pack = normalizeQuestPack(local.quests || DEMO_QUESTS);
      pack.quests = pack.quests.filter((x) => x.id !== id);
      local.quests = pack;
      saveLocal(local);
      return pack;
    }
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
    try {
      return await apiFetch(`/quests/${questId}/complete/`, {
        method: 'POST', body: JSON.stringify({ reflection }),
      });
    } catch {
      const local = loadLocal();
      const profile = normalizeProfile(local.profile || DEFAULT_PROFILE);
      const pack = normalizeQuestPack(local.quests || DEMO_QUESTS);
      const quest = pack.quests.find((q) => q.id === questId);
      if (!quest || quest.status !== 'pending') return { error: 'already_processed' };
      quest.status = 'done';
      profile.total_xp += quest.xp_reward;
      profile.stats_xp[quest.stat_key] = (profile.stats_xp[quest.stat_key] || 0) + quest.xp_reward;
      profile.action_streak = (profile.action_streak || 0) + 1;
      profile.xp_in_level = profile.total_xp % 1000;
      local.profile = profile;
      local.quests = pack;
      saveLocal(local);
      return { xp_gained: quest.xp_reward, total_xp: profile.total_xp, level: profile.level, streak: profile.action_streak };
    }
  },
};
