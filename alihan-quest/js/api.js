const STORAGE_KEY = 'alihan_quest_local';

const DEFAULT_PROFILE = {
  display_name: 'АЛИХАН',
  level: 17,
  title: 'СТРОИТЕЛЬ БУДУЩЕГО',
  total_xp: 12450,
  xp_in_level: 12450,
  xp_needed: 15300,
  action_streak: 7,
  kpi: {
    capital_season: 215000,
    capital_goal: 1000000,
    mabibip_users: 520,
    mabibip_goal: 1200,
    mabibip_masters: 175,
    mabibip_masters_goal: 300,
    instagram_followers: 5198,
    instagram_goal: 10000,
    business_projects: 4,
    weight_kg: 80,
    weight_goal_kg: 88,
    home_savings: 0,
    home_goal: 0,
    car_savings: 0,
    car_goal: 0,
  },
  stats_xp: {
    capital: 3200, entrepreneur: 2100, mastery: 1800, mabibip: 1500,
    media: 900, form: 600, network: 1100, discipline: 1250,
  },
  season: { number: 1, title: 'ВОЗВРАЩЕНИЕ', boss_name: 'ФИНАНСОВАЯ НЕСТАБИЛЬНОСТЬ', boss_defeated: false },
};

const DEMO_QUESTS = {
  date: new Date().toISOString().slice(0, 10),
  main_mission: 'Получить новую бизнес-возможность',
  quests: [
    { id: 1, stat_key: 'capital', stat_label: '💰 Капитал', title: 'Связаться с клиентом по оплате', xp_reward: 40, status: 'pending' },
    { id: 2, stat_key: 'capital', stat_label: '💰 Капитал', title: 'Получить конкретную дату оплаты', xp_reward: 80, status: 'pending' },
    { id: 3, stat_key: 'entrepreneur', stat_label: '💼 Предприниматель', title: 'Позвонить 4 предпринимателям', xp_reward: 80, status: 'pending' },
    { id: 4, stat_key: 'mabibip', stat_label: '🚀 МаБибип', title: 'Исправить критическую функцию', xp_reward: 100, status: 'pending' },
    { id: 5, stat_key: 'media', stat_label: '🎥 Медийность', title: 'Опубликовать Reels', xp_reward: 60, status: 'pending' },
    { id: 6, stat_key: 'discipline', stat_label: '⚡ Дисциплина', title: 'Подъём до 07:00', xp_reward: 30, status: 'pending' },
  ],
};

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const tg = window.Telegram?.WebApp?.initData;
  if (tg) h['X-Telegram-Init-Data'] = tg;
  else h['X-Demo-Token'] = window.QUEST_CONFIG?.DEMO_TOKEN || 'demo-alihan-quest';
  return h;
}

async function apiFetch(path, options = {}) {
  const base = window.QUEST_CONFIG?.API_BASE || '';
  if (!base) throw new Error('offline');
  const res = await fetch(`${base.replace(/\/$/, '')}/api/v1${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function xpForNextLevel(level) {
  return Math.max(1000, level * 900);
}

function recalcLevel(profile) {
  let level = 1;
  let remaining = profile.total_xp;
  while (remaining >= xpForNextLevel(level) && level < 99) {
    remaining -= xpForNextLevel(level);
    level++;
  }
  profile.level = level;
  profile.xp_in_level = remaining;
  profile.xp_needed = xpForNextLevel(level);
  const titles = [
    [1,4,'ПЕРВЫЙ ШАГ'],[5,9,'ЧЕЛОВЕК ДЕЙСТВИЯ'],[10,14,'СТРОИТЕЛЬ'],
    [15,19,'СТРОИТЕЛЬ БУДУЩЕГО'],[20,24,'ИГРОК БИЗНЕСА'],[25,29,'СОЗДАТЕЛЬ'],
    [30,34,'РУКОВОДИТЕЛЬ'],[35,39,'СТРАТЕГ'],[40,44,'БИЗНЕСМЕН'],
    [45,49,'МАСТЕР ИГРЫ'],[50,999,'АРХИТЕКТОР СОБСТВЕННОЙ ЖИЗНИ'],
  ];
  profile.title = titles.find(([a,b]) => level >= a && level <= b)?.[2] || 'АЛИХАН';
}

window.QuestAPI = {
  async getProfile() {
    try {
      return await apiFetch('/me/');
    } catch {
      const local = loadLocal();
      return local.profile || { ...DEFAULT_PROFILE };
    }
  },

  async getTodayQuests() {
    try {
      return await apiFetch('/quests/today/');
    } catch {
      const local = loadLocal();
      return local.quests || DEMO_QUESTS;
    }
  },

  async importQuests(payload) {
    try {
      await apiFetch('/quests/import/', { method: 'POST', body: JSON.stringify(payload) });
      return this.getTodayQuests();
    } catch {
      const local = loadLocal();
      let id = 1;
      const quests = [];
      (payload.blocks || []).forEach((block) => {
        const labels = {
          capital: '💰 Капитал', entrepreneur: '💼 Предприниматель', mastery: '🧠 Мастерство',
          mabibip: '🚀 МаБибип', media: '🎥 Медийность', form: '💪 Форма',
          network: '🤝 Связи', discipline: '⚡ Дисциплина',
        };
        (block.quests || []).forEach((q) => {
          quests.push({
            id: id++, stat_key: block.stat, stat_label: labels[block.stat] || block.stat,
            title: q.title, xp_reward: q.xp || 40, status: 'pending',
          });
        });
      });
      local.quests = { date: new Date().toISOString().slice(0,10), main_mission: payload.main_mission || '', quests };
      saveLocal(local);
      return local.quests;
    }
  },

  async completeQuest(questId, reflection) {
    try {
      return await apiFetch(`/quests/${questId}/complete/`, {
        method: 'POST', body: JSON.stringify({ reflection }),
      });
    } catch {
      const local = loadLocal();
      const profile = local.profile || { ...DEFAULT_PROFILE };
      const pack = local.quests || DEMO_QUESTS;
      const quest = pack.quests.find((q) => q.id === questId);
      if (!quest || quest.status !== 'pending') return { error: 'already_processed' };
      quest.status = 'done';
      profile.total_xp += quest.xp_reward;
      profile.stats_xp[quest.stat_key] = (profile.stats_xp[quest.stat_key] || 0) + quest.xp_reward;
      profile.action_streak = (profile.action_streak || 0) + 1;
      recalcLevel(profile);
      local.profile = profile;
      local.quests = pack;
      saveLocal(local);
      return { xp_gained: quest.xp_reward, total_xp: profile.total_xp, level: profile.level, title: profile.title, streak: profile.action_streak };
    }
  },
};

