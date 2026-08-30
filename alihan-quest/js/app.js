const { createApp, ref, computed, watch, onMounted } = Vue;

const STAT_LABELS = {
  capital: '💰 Капитал', entrepreneur: '💼 Предприниматель', mastery: '🧠 Мастерство',
  mabibip: '🚀 МаБибип', media: '🎥 Медийность', form: '💪 Форма',
  network: '🤝 Связи', discipline: '⚡ Дисциплина',
};

const REFLECTION_FIELDS = [
  { key: 'what', label: 'Что произошло?' },
  { key: 'good', label: 'Что получилось хорошо?' },
  { key: 'better', label: 'Что можно было лучше?' },
  { key: 'mistake', label: 'Где я ошибся?' },
  { key: 'next', label: 'Что в следующий раз сделаю иначе?' },
  { key: 'summary', label: 'Итог' },
];

const KPI_FIELDS = [
  { key: 'capital_season', label: 'Капитал сезона (₽)', type: 'number' },
  { key: 'capital_goal', label: 'Цель капитала (₽)', type: 'number' },
  { key: 'mabibip_users', label: 'Пользователи МаБибип', type: 'number' },
  { key: 'mabibip_goal', label: 'Цель МаБибип', type: 'number' },
  { key: 'mabibip_masters', label: 'Мастера МаБибип', type: 'number' },
  { key: 'mabibip_masters_goal', label: 'Цель мастеров', type: 'number' },
  { key: 'instagram_followers', label: 'Подписчики Instagram', type: 'number' },
  { key: 'instagram_goal', label: 'Цель Instagram', type: 'number' },
  { key: 'business_projects', label: 'Бизнес-проекты', type: 'number' },
  { key: 'skills_count', label: 'Навыки', type: 'number' },
  { key: 'contacts_count', label: 'Контакты', type: 'number' },
  { key: 'form_sessions', label: 'Разминки / форма', type: 'number' },
  { key: 'weight_kg', label: 'Вес (кг)', type: 'number', step: '0.1' },
  { key: 'weight_goal_kg', label: 'Цель веса (кг)', type: 'number', step: '0.1' },
  { key: 'discipline_perfect_weeks', label: 'Идеальные недели', type: 'number' },
  { key: 'discipline_streak_days', label: 'Стрик дисциплины (дней)', type: 'number' },
];

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const THEME_CLASSES = {
  default: '',
  royal: 'theme-royal',
  neon: 'theme-neon',
  forest: 'theme-forest',
};

function applyThemeCode(code) {
  Object.values(THEME_CLASSES).forEach((c) => { if (c) document.body.classList.remove(c); });
  const cls = THEME_CLASSES[code] || '';
  if (cls) document.body.classList.add(cls);
}

function setupTelegramViewport() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  const apply = () => {
    const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight;
    document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
  };

  tg.ready();
  tg.expand();
  apply();

  if (typeof tg.onEvent === 'function') {
    tg.onEvent('viewportChanged', apply);
  }

  try { tg.setHeaderColor('#0a0e18'); } catch { /* old Telegram clients */ }
  try { tg.setBackgroundColor('#0a0e18'); } catch { /* old Telegram clients */ }
}

function pickData(result, fallback) {
  if (result?.data && typeof result.data === 'object') return result.data;
  if (result && typeof result === 'object' && !Array.isArray(result)) return result;
  return fallback();
}

function ensureProfile(p) {
  if (!p || typeof p !== 'object') return QuestAPI.cachedProfile();
  return QuestAPI.normalizeProfile(p);
}

function emptyReflection() {
  return { what: '', good: '', better: '', mistake: '', next: '', summary: '' };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

createApp({
  setup() {
    const tab = ref('home');
    const profile = ref(QuestAPI.cachedProfile());
    const questPack = ref(QuestAPI.cachedQuests());
    const apiOnline = ref(false);
    const authError = ref(false);
    const toast = ref('');

    const showReflect = ref(false);
    const showImport = ref(false);
    const importReplace = ref(false);
    const swipe = ref({ id: null, startX: 0, startY: 0, deltaX: 0 });
    const syncInfo = ref(null);
    const showKpiEdit = ref(false);
    const showAddQuest = ref(false);
    const showEditQuest = ref(false);
    const showGoalAdd = ref(false);
    const editingGoalId = ref(null);
    const showQuestDetail = ref(false);
    const showChestLoot = ref(false);
    const chestLoot = ref(null);
    const showEveningChest = ref(false);
    const eveningReflection = ref('');
    const celebrationFx = ref([]);
    const celebrationPayload = ref(null);

    const showOnboarding = ref(false);
    const onboardingStep = ref('welcome');
    const onboardingName = ref('');
    const onboardingStats = ref([]);
    const onboardingHabits = ref([]);
    const statPresets = ref([]);

    const analyticsData = ref(null);
    const showStatEdit = ref(false);
    const statEditForm = ref([]);

    const leagueData = ref(null);
    const growthPath = ref(null);
    const showGrowthNode = ref(false);
    const activeGrowthNode = ref(null);
    const growthReflection = ref({ summary: '' });

    const clanData = ref(null);
    const clanForm = ref({ name: '', invite_code: '', stat_focus: 'discipline' });
    const shopThemes = ref([]);
    const subscription = ref(null);

    const activeQuest = ref(null);
    const detailQuest = ref(null);
    const importJson = ref('');
    const reflection = ref(emptyReflection());
    const progressNotes = ref('');

    const kpiForm = ref({});
    const questForm = ref({ title: '', stat_key: 'discipline', xp_reward: 30, due_time: '' });

    const displayProfile = computed(() => ensureProfile(profile.value));
    const goalForm = ref({ title: '', description: '', emoji: '🎯', metric_unit: '', current_value: 0, target_value: 0 });

    const calendarYear = ref(new Date().getFullYear());
    const calendarMonth = ref(new Date().getMonth() + 1);
    const calendarData = ref({ days: {} });
    const selectedDate = ref('');
    const journalQuests = ref({ date: '', main_mission: '', quests: [] });

    const xpPercent = computed(() => {
      const p = profile.value || QuestAPI.cachedProfile();
      if (!p?.xp_needed) return 0;
      return Math.min(100, (Number(p.xp_in_level) / Number(p.xp_needed)) * 100);
    });

    const questsByStat = computed(() => {
      const quests = questPack.value?.quests;
      if (!Array.isArray(quests)) return {};
      const groups = {};
      quests.forEach((q) => {
        const key = q.stat_key || 'discipline';
        if (!groups[key]) groups[key] = [];
        groups[key].push(q);
      });
      return groups;
    });

    const pendingCount = computed(() =>
      questPack.value?.quests?.filter((q) => q.status === 'pending').length || 0
    );

    const chestSummary = computed(() => displayProfile.value?.gamification?.chests || null);

    const victoryProgressPct = computed(() => {
      const vp = chestSummary.value?.victory_progress;
      if (!vp?.required) return 0;
      return Math.min(100, Math.round((vp.completed / vp.required) * 100));
    });

    const readyChests = computed(() =>
      (chestSummary.value?.items || []).filter((c) => c.status === 'ready')
    );

    const statKeys = computed(() => {
      const defs = displayProfile.value?.stat_definitions;
      if (defs?.length) return defs.map((d) => d.key);
      return QuestAPI.STAT_KEYS || [];
    });

    function statLabel(key) {
      const labels = displayProfile.value?.stat_labels;
      if (labels?.[key]) return labels[key];
      return STAT_LABELS[key] || key;
    }

    function statRule(key) {
      const def = displayProfile.value?.stat_definitions?.find((d) => d.key === key);
      if (def?.rule_label) return def.rule_label;
      if (def?.xp_per_level) return `${def.xp_per_level} XP = 1 ур.`;
      return QuestAPI.STAT_LEVEL_RULES[key] || '';
    }

    function statProgress(key) {
      const def = displayProfile.value?.stat_definitions?.find((d) => d.key === key);
      if (def?.progress) return def.progress;
      const xp = displayProfile.value?.stats_xp?.[key] ?? 0;
      const need = def?.xp_per_level || 1000;
      return { current: xp % need, needed: need, level: Math.floor(xp / need) };
    }

    const calendarCells = computed(() => {
      const year = calendarYear.value;
      const month = calendarMonth.value;
      const firstDay = new Date(year, month - 1, 1);
      const daysInMonth = new Date(year, month, 0).getDate();
      const startOffset = (firstDay.getDay() + 6) % 7;
      const cells = [];
      for (let i = 0; i < startOffset; i += 1) cells.push({ empty: true, key: `e-${i}` });
      for (let d = 1; d <= daysInMonth; d += 1) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const data = calendarData.value?.days?.[dateStr] || null;
        cells.push({ empty: false, day: d, dateStr, data, key: dateStr });
      }
      return cells;
    });

    const calendarTitle = computed(() =>
      `${MONTH_NAMES[calendarMonth.value - 1]} ${calendarYear.value}`
    );

    const detailReadOnly = computed(() =>
      detailQuest.value?.status === 'done' || detailQuest.value?.status === 'failed'
    );

    function fmtMoney(n) {
      return new Intl.NumberFormat('ru-RU').format(Number(n) || 0) + ' ₽';
    }

    function fmtNum(n) {
      return Number(n || 0).toLocaleString('ru');
    }

    function pct(current, goal) {
      if (!goal) return 0;
      return Math.min(100, Math.round((Number(current) / Number(goal)) * 100));
    }

    function showToast(msg, ms = 2500) {
      toast.value = msg;
      setTimeout(() => { toast.value = ''; }, ms);
    }

    function playCelebration(animations, payload) {
      if (payload) celebrationPayload.value = payload;
      if (!Array.isArray(animations) || !animations.length) return;
      celebrationFx.value = animations;
      setTimeout(() => {
        celebrationFx.value = [];
        celebrationPayload.value = null;
      }, 2800);
      const tg = window.Telegram?.WebApp?.HapticFeedback;
      if (!tg) return;
      if (animations.includes('level_up') || animations.includes('chest_drop')) {
        tg.notificationOccurred('success');
      } else if (animations.includes('xp_burst')) {
        tg.impactOccurred('medium');
      }
    }

    function handleQuestCompleteCelebration(result) {
      const cel = result?.celebration;
      playCelebration(cel?.animations || ['xp_burst', 'confetti'], cel);
      let msg = cel?.message || `+${result.xp_gained} XP ⚡`;
      if (result.coins_gained) msg += ` · +${result.coins_gained} 🪙`;
      if (cel?.level_up) msg += ` · 🎉 ${cel.level_up.stat_label} ур. ${cel.level_up.new}!`;
      if (cel?.chest_earned) msg += ' · 🏆 Сундук победы!';
      showToast(msg, 3500);
    }

    function showChestLootModal(loot, title = 'Сундук открыт!') {
      chestLoot.value = { title, loot };
      showChestLoot.value = true;
    }

    async function openReadyChest(chest) {
      if (!chest?.id) return;
      try {
        const result = await QuestAPI.openChest(chest.id);
        playCelebration(result?.celebration?.animations || ['chest_drop']);
        showChestLootModal(result?.loot, chest.title || 'Сундук');
        await refresh();
      } catch {
        showToast('Не удалось открыть сундук');
      }
    }

    async function claimMorning() {
      try {
        const result = await QuestAPI.claimMorningChest();
        if (result?.error) {
          showToast(result.error === 'already_claimed' ? 'Утренний сундук уже получен' : 'Ошибка');
          return;
        }
        playCelebration(result?.celebration?.animations || ['chest_drop']);
        showChestLootModal(result?.loot, chest.title || 'Сундук');
        await refresh();
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    function openEveningChestModal() {
      eveningReflection.value = '';
      showEveningChest.value = true;
    }

    async function submitEveningChest() {
      const text = eveningReflection.value.trim();
      if (text.length < 10) {
        showToast('Напиши итог дня (мин. 10 символов)');
        return;
      }
      try {
        const result = await QuestAPI.claimEveningChest(text);
        if (result?.error) {
          showToast(result.error === 'already_claimed' ? 'Вечерний сундук уже получен' : 'Нужна рефлексия');
          return;
        }
        showEveningChest.value = false;
        playCelebration(result?.celebration?.animations || ['chest_drop']);
        showChestLootModal(result?.loot, '🌙 Вечерний сундук');
        await refresh();
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    async function loadJournalInsights() {
      try {
        analyticsData.value = await QuestAPI.getAnalytics();
      } catch {
        analyticsData.value = { insights: [], summary: {} };
      }
    }

    async function loadLeague() {
      try {
        leagueData.value = await QuestAPI.getLeague();
      } catch {
        leagueData.value = displayProfile.value?.league || null;
      }
    }

    async function loadGrowth() {
      try {
        growthPath.value = await QuestAPI.getGrowthPath('discipline');
      } catch {
        growthPath.value = null;
      }
    }

    async function loadClan() {
      try {
        const data = await QuestAPI.getClan();
        clanData.value = data?.clan || null;
      } catch {
        clanData.value = displayProfile.value?.clan || null;
      }
    }

    async function loadShop() {
      try {
        const [themes, sub] = await Promise.all([
          QuestAPI.getShopThemes(),
          QuestAPI.getSubscription(),
        ]);
        shopThemes.value = themes?.themes || [];
        subscription.value = sub;
      } catch {
        shopThemes.value = [];
      }
    }

    async function createClanAction() {
      if (!clanForm.value.name?.trim()) {
        showToast('Введите название клана');
        return;
      }
      try {
        const r = await QuestAPI.createClan(clanForm.value.name, clanForm.value.stat_focus);
        if (r?.error) { showToast(r.error); return; }
        clanData.value = r.clan;
        showToast('Клан создан ✓');
        await refresh();
      } catch { showToast('Ошибка создания'); }
    }

    async function joinClanAction() {
      try {
        const r = await QuestAPI.joinClan(clanForm.value.invite_code);
        if (r?.error) { showToast(r.error === 'invalid_code' ? 'Неверный код' : r.error); return; }
        clanData.value = r.clan;
        showToast('Вы в клане ✓');
        await refresh();
      } catch { showToast('Ошибка входа'); }
    }

    async function leaveClanAction() {
      if (!window.confirm('Покинуть клан?')) return;
      try {
        await QuestAPI.leaveClan();
        clanData.value = null;
        showToast('Вы вышли из клана');
        await refresh();
      } catch { showToast('Ошибка'); }
    }

    async function activateThemeAction(code) {
      try {
        const r = await QuestAPI.activateTheme(code);
        if (r?.error) { showToast(r.error === 'pro_required' ? 'Нужен Quest Pro' : r.error); return; }
        applyThemeCode(code);
        showToast('Тема применена ✓');
        await refresh();
        await loadShop();
      } catch { showToast('Ошибка'); }
    }

    async function checkoutProAction() {
      try {
        const r = await QuestAPI.checkoutPro();
        if (r?.confirmation_url) {
          window.open(r.confirmation_url, '_blank');
          showToast('Переход к оплате...');
        } else {
          showToast(r?.message || 'Оплата в stub-режиме — Pro через admin');
        }
      } catch { showToast('Ошибка checkout'); }
    }

    async function useGraceAction() {
      try {
        const r = await QuestAPI.useStreakGrace();
        if (r?.error) { showToast('Grace уже использован'); return; }
        showToast('Streak grace применён ✓');
        await refresh();
      } catch { showToast('Ошибка'); }
    }

    function growthNodeIcon(node) {
      if (node.node_type === 'boss') return '👹';
      if (node.node_type === 'milestone') return '🏁';
      return '📘';
    }

    function growthNodeClass(node) {
      return {
        'growth-node-done': node.status === 'completed',
        'growth-node-active': node.status === 'available' || node.status === 'in_progress',
        'growth-node-locked': node.status === 'locked',
      };
    }

    async function openGrowthNode(node) {
      if (node.status === 'locked' || node.status === 'completed') return;
      activeGrowthNode.value = node;
      growthReflection.value = { summary: '' };
      if (node.status === 'available') {
        try { await QuestAPI.startGrowthNode(node.id); } catch { /* offline */ }
      }
      showGrowthNode.value = true;
    }

    async function submitGrowthNode() {
      if (!activeGrowthNode.value?.id) return;
      if ((growthReflection.value.summary || '').trim().length < 10) {
        showToast('Итог от 10 символов');
        return;
      }
      try {
        const result = await QuestAPI.completeGrowthNode(activeGrowthNode.value.id, growthReflection.value);
        showGrowthNode.value = false;
        playCelebration(result?.celebration?.animations || ['xp_burst']);
        showToast(`+${result.xp_gained} XP · Путь роста`);
        await Promise.all([refresh(), loadGrowth()]);
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    function switchTab(name) {
      tab.value = name;
    }

    async function initOnboarding() {
      try {
        const data = await QuestAPI.getOnboarding();
        statPresets.value = data.presets || [];
        if (!data.completed) {
          onboardingStep.value = data.step || 'welcome';
          onboardingName.value = displayProfile.value.display_name || '';
          onboardingStats.value = (data.stats?.length ? data.stats : statPresets.value.slice(0, 4)).map((s) => ({ ...s }));
          onboardingHabits.value = data.habits?.length ? [...data.habits] : [];
          showOnboarding.value = true;
        }
      } catch { /* offline */ }
    }

    function addOnboardingStat(preset) {
      const item = preset || { emoji: '⭐', label: 'Новая', key: `custom_${Date.now()}`, xp_per_level: 1000 };
      onboardingStats.value.push({ ...item, key: item.key || `custom_${onboardingStats.value.length}` });
    }

    function removeOnboardingStat(idx) {
      onboardingStats.value.splice(idx, 1);
    }

    function addOnboardingHabit() {
      const key = onboardingStats.value[0]?.key || 'discipline';
      onboardingHabits.value.push({ title: '', stat_key: key, xp_reward: 40, generates_daily_quest: true });
    }

    async function submitOnboardingStep() {
      try {
        let payload = {};
        if (onboardingStep.value === 'welcome') {
          if (!onboardingName.value.trim()) { showToast('Введите имя героя'); return; }
          payload = { display_name: onboardingName.value.trim() };
        } else if (onboardingStep.value === 'stats') {
          if (!onboardingStats.value.length) { showToast('Выберите хотя бы одну характеристику'); return; }
          payload = { stats: onboardingStats.value };
        } else if (onboardingStep.value === 'habits') {
          payload = { habits: onboardingHabits.value.filter((h) => h.title?.trim()) };
        }
        const data = await QuestAPI.saveOnboardingStep(onboardingStep.value, payload);
        onboardingStep.value = data.step || onboardingStep.value;
        if (onboardingStep.value === 'complete') {
          await QuestAPI.saveOnboardingStep('complete', {});
          showOnboarding.value = false;
          await refresh();
          showToast('Добро пожаловать в игру! 🎮');
          return;
        }
      } catch {
        showToast('Ошибка сохранения');
      }
    }

    function addStatRow() {
      statEditForm.value.push({ emoji: '⭐', label: 'Новая', key: `custom_${Date.now()}`, xp_per_level: 1000 });
    }

    function removeStatRow(idx) {
      statEditForm.value.splice(idx, 1);
    }

    function openStatEdit() {
      statEditForm.value = (displayProfile.value.stat_definitions || []).map((s) => ({ ...s }));
      showStatEdit.value = true;
    }

    async function saveStatEdit() {
      try {
        const result = await QuestAPI.updateStatConfig(statEditForm.value);
        if (result.profile) profile.value = ensureProfile(result.profile);
        else await refresh();
        showStatEdit.value = false;
        showToast('Характеристики сохранены ✓');
      } catch {
        showToast('Не удалось сохранить');
      }
    }

    async function refresh() {
      const [p, q] = await Promise.all([
        QuestAPI.getProfile(),
        QuestAPI.getTodayQuests(),
      ]);
      authError.value = Boolean(p?.authError || q?.authError);
      apiOnline.value = Boolean(p?.online && q?.online);
      syncInfo.value = q?.sync || p?.data?.sync || q?.data?.sync || null;
      if (p?.online && p.data) profile.value = ensureProfile(p.data);
      else profile.value = ensureProfile(QuestAPI.cachedProfile());
      if (q?.online && q.data) questPack.value = q.data;
      else questPack.value = { date: new Date().toISOString().slice(0, 10), main_mission: '', quests: [] };
      if (profile.value?.onboarding && !profile.value.onboarding.completed) {
        await initOnboarding();
      }
    }

    function openKpiEdit() {
      const kpi = (profile.value || QuestAPI.cachedProfile()).kpi || {};
      kpiForm.value = { ...kpi };
      showKpiEdit.value = true;
    }

    async function saveKpi() {
      try {
        const result = await QuestAPI.updateProfile({ kpi: { ...kpiForm.value } });
        profile.value = ensureProfile(result.data);
        showKpiEdit.value = false;
        showToast('KPI сохранены ✓');
      } catch {
        showToast('Нет связи с сервером — KPI не сохранены');
      }
    }

    function fmtDueTime(value) {
      if (!value) return '';
      return String(value).slice(0, 5);
    }

    function questPayloadFromForm() {
      const payload = {
        title: questForm.value.title.trim(),
        stat_key: questForm.value.stat_key,
        xp_reward: Number(questForm.value.xp_reward) || 30,
      };
      if (questForm.value.due_time) payload.due_time = questForm.value.due_time;
      else payload.due_time = null;
      return payload;
    }

    function openAddQuest() {
      questForm.value = { title: '', stat_key: 'discipline', xp_reward: 30, due_time: '' };
      showAddQuest.value = true;
    }

    function openEditQuest(q) {
      activeQuest.value = q;
      questForm.value = {
        title: q.title || '',
        stat_key: q.stat_key || 'discipline',
        xp_reward: Number(q.xp_reward) || 30,
        due_time: q.due_time || '',
      };
      showEditQuest.value = true;
    }

    async function saveNewQuest() {
      if (!questForm.value.title?.trim()) {
        showToast('Введите название');
        return;
      }
      try {
        const pack = await QuestAPI.addQuest(questPayloadFromForm());
        if (pack) questPack.value = pack;
        showAddQuest.value = false;
        showToast('Квест добавлен ✓');
      } catch {
        showToast('Нет связи с сервером — задача не сохранена');
      }
    }

    async function saveEditedQuest() {
      if (!activeQuest.value?.id || !questForm.value.title?.trim()) {
        showToast('Введите название');
        return;
      }
      try {
        const pack = await QuestAPI.updateQuest(activeQuest.value.id, questPayloadFromForm());
        if (pack) questPack.value = pack;
        showEditQuest.value = false;
        activeQuest.value = null;
        showToast('Квест обновлён ✓');
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    function syncQuestInLists(updated) {
      if (!updated?.id) return;
      if (questPack.value?.quests) {
        const i = questPack.value.quests.findIndex((x) => x.id === updated.id);
        if (i >= 0) questPack.value.quests[i] = { ...questPack.value.quests[i], ...updated };
      }
      if (journalQuests.value?.quests) {
        const j = journalQuests.value.quests.findIndex((x) => x.id === updated.id);
        if (j >= 0) journalQuests.value.quests[j] = { ...journalQuests.value.quests[j], ...updated };
      }
    }

    async function removeQuest(q, event, context = 'quests') {
      if (event) event.stopPropagation();
      if (!q?.id || q.status !== 'pending') return;
      if (!window.confirm(`Удалить задачу «${q.title}»?`)) return;
      try {
        await QuestAPI.deleteQuest(q.id);
        await afterQuestDeleted(context);
        showToast('Квест удалён');
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    async function afterQuestDeleted(context) {
      if (context === 'journal') {
        if (selectedDate.value) await loadJournalDay(selectedDate.value);
        await loadCalendar();
        const today = new Date().toISOString().slice(0, 10);
        if (selectedDate.value === today || questPack.value?.date === today) {
          const q = await QuestAPI.getTodayQuests();
          if (q.online && q.data) questPack.value = q.data;
        }
        return;
      }
      const q = await QuestAPI.getTodayQuests();
      if (q.online && q.data) questPack.value = q.data;
      if (tab.value === 'journal') {
        await loadJournalInsights();
        await loadCalendar();
      }
    }

    function resetSwipe() {
      swipe.value = { id: null, startX: 0, startY: 0, deltaX: 0 };
    }

    function onQuestTouchStart(q, e) {
      if (q.status !== 'pending') return;
      swipe.value = {
        id: q.id,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        deltaX: 0,
      };
    }

    function onQuestTouchMove(q, e) {
      if (swipe.value.id !== q.id) return;
      const dx = e.touches[0].clientX - swipe.value.startX;
      if (dx > 0) swipe.value = { ...swipe.value, deltaX: dx };
    }

    async function onQuestTouchEnd(q) {
      if (swipe.value.id !== q.id) return;
      const { deltaX } = swipe.value;
      resetSwipe();
      if (deltaX >= 80) await deferQuestToTomorrow(q);
    }

    async function openQuest(q) {
      if (q.status !== 'pending') return;
      activeQuest.value = q;
      progressNotes.value = q.progress_notes || '';
      reflection.value = emptyReflection();
      showReflect.value = true;
      try {
        const detail = await QuestAPI.getQuestDetail(q.id);
        if (detail) {
          activeQuest.value = { ...q, ...detail };
          progressNotes.value = detail.progress_notes || '';
          if (detail.reflection) {
            reflection.value = { ...emptyReflection(), ...detail.reflection };
          }
        }
      } catch {
        /* offline — локальные данные */
      }
    }

    async function saveQuestNotes() {
      if (!activeQuest.value?.id) return;
      try {
        const updated = await QuestAPI.patchQuest(activeQuest.value.id, {
          progress_notes: progressNotes.value,
          reflection: reflection.value,
        });
        syncQuestInLists(updated);
        activeQuest.value = { ...activeQuest.value, ...updated };
        showToast('Заметки сохранены ✓');
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    async function submitQuest() {
      if (!activeQuest.value?.id) return;
      try {
        await QuestAPI.patchQuest(activeQuest.value.id, {
          progress_notes: progressNotes.value,
          reflection: reflection.value,
        });
      } catch {
        /* продолжаем завершение */
      }
      const result = await QuestAPI.completeQuest(activeQuest.value.id, reflection.value);
      showReflect.value = false;
      if (result?.error) {
        showToast('Квест уже обработан');
        return;
      }
      handleQuestCompleteCelebration(result);
      await refresh();
      if (selectedDate.value) await loadJournalDay(selectedDate.value);
      if (tab.value === 'journal') await loadJournalInsights();
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }

    async function deferQuestToTomorrow(q, event) {
      if (event) event.stopPropagation();
      if (!q?.id || q.status !== 'pending') return;
      try {
        const pack = await QuestAPI.deferQuest(q.id);
        if (pack) questPack.value = pack;
        showToast('→ Завтра ✓');
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    function questSwipeStyle(q) {
      if (swipe.value.id !== q.id || !swipe.value.deltaX) return null;
      const dx = Math.min(swipe.value.deltaX, 100);
      return { transform: `translateX(${dx}px)` };
    }

    function openImport(replace = false) {
      importReplace.value = replace;
      showImport.value = true;
    }

    function openReplaceImport() {
      if (!window.confirm(
        'Заменить импортированные задачи на сегодня?\n\n'
        + 'Ручные задачи и выполненные квесты сохранятся.'
      )) return;
      openImport(true);
    }

    async function doImport() {
      try {
        const payload = JSON.parse(importJson.value);
        const wasReplace = importReplace.value;
        const result = await QuestAPI.importQuests(payload, wasReplace);
        const pack = pickData(result, QuestAPI.cachedQuests);
        if (pack) questPack.value = pack;
        showImport.value = false;
        importReplace.value = false;
        importJson.value = '';
        showToast(wasReplace ? 'Quest Pack заменён ✓' : 'Квесты добавлены ✓', 2000);
      } catch {
        showToast('Ошибка: нет связи или неверный JSON', 2000);
      }
    }

    function loadSampleImport() {
      importJson.value = JSON.stringify({
        main_mission: 'Получить новую бизнес-возможность',
        blocks: [
          { stat: 'capital', quests: [{ title: 'Связаться с клиентом по оплате', xp: 40 }] },
          { stat: 'discipline', quests: [{ title: 'Подъём до 07:00', xp: 30 }] },
        ],
      }, null, 2);
    }

    function openGoalAdd() {
      editingGoalId.value = null;
      goalForm.value = { title: '', description: '', emoji: '🎯', metric_unit: '', current_value: 0, target_value: 0 };
      showGoalAdd.value = true;
    }

    function openGoalEditGoal(g) {
      editingGoalId.value = g.id;
      goalForm.value = {
        title: g.title || '',
        description: g.description || '',
        emoji: g.emoji || '🎯',
        metric_unit: g.metric_unit || '',
        current_value: Number(g.current_value) || 0,
        target_value: Number(g.target_value) || 0,
      };
      showGoalAdd.value = true;
    }

    async function saveGoalForm() {
      if (!goalForm.value.title?.trim()) {
        showToast('Введите название цели');
        return;
      }
      try {
        const payload = {
          title: goalForm.value.title.trim(),
          description: goalForm.value.description || '',
          emoji: goalForm.value.emoji || '🎯',
          metric_unit: goalForm.value.metric_unit || '',
          current_value: Number(goalForm.value.current_value) || 0,
          target_value: Number(goalForm.value.target_value) || 0,
        };
        if (editingGoalId.value) {
          await QuestAPI.updateGoal(editingGoalId.value, payload);
          showToast('Цель обновлена ✓');
        } else {
          await QuestAPI.createGoal(payload);
          showToast('Цель добавлена ✓');
        }
        await refresh();
        showGoalAdd.value = false;
      } catch {
        showToast('Не удалось сохранить цель');
      }
    }

    async function deleteGoalAction(g) {
      if (!g?.id) return;
      try {
        await QuestAPI.deleteGoal(g.id);
        await refresh();
        showToast('Цель удалена');
      } catch {
        showToast('Не удалось удалить');
      }
    }

    function goalProgressLabel(g) {
      const unit = g.metric_unit ? ` ${g.metric_unit}` : '';
      return `${fmtNum(g.current_value)}${unit}${g.target_value ? ` / ${fmtNum(g.target_value)}${unit}` : ''}`;
    }

    async function loadCalendar() {
      const data = await QuestAPI.getCalendar(calendarYear.value, calendarMonth.value);
      calendarData.value = data && typeof data === 'object' ? data : { days: {} };
    }

    function calDayClass(cell) {
      if (cell.empty) return '';
      const classes = ['cal-day'];
      if (cell.data?.total) classes.push('cal-day-has-data');
      if (cell.dateStr === selectedDate.value) classes.push('cal-day-selected');
      if (cell.dateStr === todayStr()) classes.push('cal-day-today');
      if (cell.data?.total) {
        const ratio = cell.data.done / cell.data.total;
        if (ratio >= 1) classes.push('cal-day-full');
        else if (ratio > 0) classes.push('cal-day-partial');
        else classes.push('cal-day-none');
      }
      return classes.join(' ');
    }

    async function selectCalendarDay(cell) {
      if (cell.empty) return;
      selectedDate.value = cell.dateStr;
      await loadJournalDay(cell.dateStr);
    }

    async function loadJournalDay(dateStr) {
      const data = await QuestAPI.getQuestsByDate(dateStr);
      journalQuests.value = data && typeof data === 'object'
        ? data
        : { date: dateStr, main_mission: '', quests: [] };
    }

    async function openQuestDetail(q) {
      const detail = await QuestAPI.getQuestDetail(q.id);
      detailQuest.value = detail || { ...q, reflection: q.reflection || emptyReflection() };
      if (!detailQuest.value.reflection) {
        detailQuest.value.reflection = emptyReflection();
      }
      if (detailQuest.value.progress_notes == null) {
        detailQuest.value.progress_notes = q.progress_notes || '';
      }
      showQuestDetail.value = true;
    }

    function openJournalQuest(q) {
      if (q.status === 'pending') openQuest(q);
      else openQuestDetail(q);
    }

    async function prevMonth() {
      if (calendarMonth.value === 1) {
        calendarMonth.value = 12;
        calendarYear.value -= 1;
      } else {
        calendarMonth.value -= 1;
      }
      selectedDate.value = '';
      journalQuests.value = { date: '', main_mission: '', quests: [] };
      await loadCalendar();
    }

    async function nextMonth() {
      if (calendarMonth.value === 12) {
        calendarMonth.value = 1;
        calendarYear.value += 1;
      } else {
        calendarMonth.value += 1;
      }
      selectedDate.value = '';
      journalQuests.value = { date: '', main_mission: '', quests: [] };
      await loadCalendar();
    }

    watch(tab, async (name) => {
      if (name === 'quests' || name === 'home') await refresh();
      if (name === 'league') await loadLeague();
      if (name === 'growth') await loadGrowth();
      if (name === 'clan') await loadClan();
      if (name === 'shop') await loadShop();
      if (name === 'journal') {
        await Promise.all([loadCalendar(), loadJournalInsights()]);
      }
    });

    watch(
      () => displayProfile.value?.gamification?.active_theme,
      (code) => applyThemeCode(code || 'default'),
      { immediate: true },
    );

    onMounted(async () => {
      setupTelegramViewport();
      const tg = window.Telegram?.WebApp;
      if (tg && typeof tg.onEvent === 'function') {
        tg.onEvent('viewportChanged', () => refresh());
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refresh();
      });
      try {
        await refresh();
      } catch {
        profile.value = QuestAPI.cachedProfile();
        questPack.value = QuestAPI.cachedQuests();
        apiOnline.value = false;
      }
    });

    return {
      tab, profile, displayProfile, questPack, apiOnline, authError, toast, swipe, syncInfo,
      showReflect, showImport, importReplace, showKpiEdit, showAddQuest, showEditQuest,
      showGoalAdd, showQuestDetail, showChestLoot, showEveningChest,
      showGrowthNode, activeGrowthNode, growthReflection,
      celebrationFx, celebrationPayload,
      showOnboarding, onboardingStep, onboardingName, onboardingStats, onboardingHabits, statPresets,
      analyticsData, showStatEdit, statEditForm,
      leagueData, growthPath,
      clanData, clanForm, shopThemes, subscription,
      chestSummary, victoryProgressPct, readyChests,
      activeQuest, detailQuest, importJson, reflection, progressNotes,
      kpiForm, questForm, goalForm, editingGoalId,
      calendarYear, calendarMonth, calendarData, selectedDate, journalQuests,
      xpPercent, questsByStat, pendingCount, statKeys,
      statLabel, statRule,
      calendarCells, calendarTitle, detailReadOnly,
      STAT_LABELS, KPI_FIELDS, REFLECTION_FIELDS,
      QuestAPI,
      fmtMoney, fmtNum, fmtDueTime, pct, showToast, switchTab, refresh,
      playCelebration, openReadyChest, claimMorning, openEveningChestModal, submitEveningChest,
      loadLeague, loadGrowth, loadJournalInsights, growthNodeIcon, growthNodeClass, openGrowthNode, submitGrowthNode,
      initOnboarding, submitOnboardingStep, addOnboardingStat, removeOnboardingStat, addOnboardingHabit,
      openStatEdit, saveStatEdit, addStatRow, removeStatRow,
      openGoalAdd, openGoalEditGoal, saveGoalForm, deleteGoalAction, goalProgressLabel, statProgress,
      loadClan, loadShop, createClanAction, joinClanAction, leaveClanAction,
      activateThemeAction, checkoutProAction, useGraceAction,
      openKpiEdit, saveKpi,
      openAddQuest, openEditQuest, saveNewQuest, saveEditedQuest, removeQuest, deferQuestToTomorrow,
      onQuestTouchStart, onQuestTouchMove, onQuestTouchEnd, questSwipeStyle,
      openQuest, saveQuestNotes, submitQuest, openImport, openReplaceImport, doImport, loadSampleImport,
      loadCalendar, calDayClass, selectCalendarDay, loadJournalDay,
      openQuestDetail, openJournalQuest, prevMonth, nextMonth,
    };
  },
  template: `
    <div class="app-shell">
      <div class="app-bg"></div>

      <div v-if="toast" class="toast">{{ toast }}</div>

      <div v-if="celebrationFx.length || celebrationPayload" class="celebration-layer">
        <div v-if="celebrationPayload" class="celebration-card">
          <div class="celebration-confetti">🎉✨🏆⭐🔥</div>
          <p class="celebration-msg">{{ celebrationPayload.message || 'Отличная работа!' }}</p>
          <p class="celebration-xp">+{{ celebrationPayload.xp_gained || 0 }} XP</p>
          <p v-if="celebrationPayload.stat_label" class="celebration-stat">{{ celebrationPayload.stat_label }}</p>
          <p v-if="celebrationPayload.level_up" class="celebration-levelup">
            🎉 Новый уровень {{ celebrationPayload.level_up.stat_label }}: {{ celebrationPayload.level_up.new }}!
          </p>
        </div>
        <span v-if="celebrationFx.includes('xp_burst')" class="fx fx-xp">+{{ celebrationPayload?.xp_gained || '' }} XP</span>
        <span v-if="celebrationFx.includes('coin_spin')" class="fx fx-coin">🪙</span>
        <span v-if="celebrationFx.includes('streak_pulse')" class="fx fx-streak">🔥</span>
        <span v-if="celebrationFx.includes('chest_drop')" class="fx fx-chest">📦</span>
        <span v-if="celebrationFx.includes('level_up')" class="fx fx-levelup">⬆️</span>
      </div>

      <div v-if="authError" class="offline-banner">
        🔐 Не удалось войти через Telegram. Закрой Mini App полностью и открой снова через @game_alikhan_bot.
      </div>
      <div v-else-if="!apiOnline" class="offline-banner">
        📡 Нет связи с сервером — проверь, что Django и cloudflared запущены.
      </div>
      <div v-else-if="syncInfo" class="sync-banner">
        🗄 БД · player #{{ syncInfo.player_id }} · {{ syncInfo.quest_count }} задач ({{ syncInfo.manual_count || 0 }} вручную) · бот видит то же
      </div>

      <main class="main-content">
        <!-- HOME -->
        <section v-if="tab==='home'" class="screen">
          <div class="hero-card">
            <div class="hero-name">{{ displayProfile.display_name }}</div>
            <div class="hero-level">УРОВЕНЬ {{ displayProfile.level }}</div>
            <div class="hero-title">«{{ displayProfile.title }}»</div>
            <div class="hero-level-hint">Среднее уровней ваших характеристик</div>
            <div class="xp-bar-wrap">
              <div class="xp-label"><span>⭐ XP</span><span>{{ fmtNum(displayProfile.xp_in_level) }} / {{ fmtNum(displayProfile.xp_needed) }}</span></div>
              <div class="xp-bar"><div class="xp-fill" :style="{width: xpPercent+'%'}"></div></div>
            </div>
            <div class="streak">🔥 СЕРИЯ ДЕЙСТВИЙ · {{ displayProfile.action_streak }} дней</div>
            <div v-if="displayProfile.gamification" class="hero-meta-row">
              <span>🪙 {{ displayProfile.gamification.quest_coins }} монет</span>
              <span v-if="displayProfile.gamification.quest_pro" class="pro-badge">ПРО</span>
            </div>
          </div>

          <div v-if="displayProfile.season_v2" class="season-banner season-v2">
            🏆 {{ displayProfile.season_v2.title }}<br>
            ⚡ XP сезона: <strong>{{ fmtNum(displayProfile.season_v2.season_xp) }}</strong>
            · 🥇 {{ displayProfile.season_v2.league_tier }}
            · {{ displayProfile.season_v2.days_left }} дн. до конца
          </div>
          <div v-else-if="displayProfile.season" class="season-banner">
            🏆 SEASON {{ String(displayProfile.season.number).padStart(2,'0') }} — <strong>{{ displayProfile.season.title }}</strong><br>
            🐉 Босс: {{ displayProfile.season.boss_name }}
          </div>

          <div v-if="chestSummary" class="chest-panel card">
            <div class="section-head">📦 Ежедневные сундуки</div>
            <div class="chest-victory-row">
              <span>Сундук победы</span>
              <span>{{ chestSummary.victory_progress?.completed || 0 }}/{{ chestSummary.victory_progress?.required || 3 }} квестов</span>
            </div>
            <div class="progress-mini"><div class="progress-mini-fill gold" :style="{width: victoryProgressPct+'%'}"></div></div>
            <div class="chest-actions">
              <button type="button" class="btn btn-sm" :disabled="!chestSummary.morning_available" @click="claimMorning">
                🌅 Утро
              </button>
              <button type="button" class="btn btn-sm" :disabled="!chestSummary.evening_available" @click="openEveningChestModal">
                🌙 Вечер
              </button>
            </div>
            <div v-if="readyChests.length" class="chest-ready-list">
              <button
                v-for="c in readyChests"
                :key="c.id"
                type="button"
                class="chest-ready-btn"
                @click="openReadyChest(c)"
              >
                {{ c.icon || '📦' }} {{ c.title }} — открыть
              </button>
            </div>
          </div>

          <div v-if="displayProfile.league" class="league-mini card" @click="switchTab('league')">
            🥇 {{ displayProfile.league.tier }} · Место #{{ displayProfile.league.rank }}
            · {{ displayProfile.league.weekly_xp }} XP / неделя
            <span v-if="displayProfile.league.in_promotion_zone" class="zone-badge promote">↑</span>
            <span v-else-if="displayProfile.league.in_demotion_zone" class="zone-badge demote">↓</span>
          </div>

          <div class="section-head-row">
            <div class="section-head">📈 KPI</div>
            <button type="button" class="edit-btn" @click="openKpiEdit">✏️ Редактировать</button>
          </div>

          <div class="kpi-grid">
            <div class="kpi">
              <div class="kpi-icon">💰</div>
              <div class="kpi-label">Капитал</div>
              <div class="kpi-value">{{ fmtMoney(displayProfile.kpi.capital_season) }}</div>
              <div class="kpi-sub">цель {{ fmtMoney(displayProfile.kpi.capital_goal) }}</div>
              <div class="progress-mini"><div class="progress-mini-fill" :style="{width: pct(displayProfile.kpi.capital_season, displayProfile.kpi.capital_goal)+'%'}"></div></div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">🚀</div>
              <div class="kpi-label">МаБибип</div>
              <div class="kpi-value">{{ profile.kpi.mabibip_users }} / {{ profile.kpi.mabibip_goal }}</div>
              <div class="progress-mini"><div class="progress-mini-fill" :style="{width: pct(profile.kpi.mabibip_users, profile.kpi.mabibip_goal)+'%'}"></div></div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">🎥</div>
              <div class="kpi-label">Instagram</div>
              <div class="kpi-value">{{ fmtNum(profile.kpi.instagram_followers) }}</div>
              <div class="kpi-sub">/ {{ fmtNum(profile.kpi.instagram_goal) }}</div>
              <div class="progress-mini"><div class="progress-mini-fill" :style="{width: pct(profile.kpi.instagram_followers, profile.kpi.instagram_goal)+'%'}"></div></div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">💼</div>
              <div class="kpi-label">Бизнес</div>
              <div class="kpi-value">{{ profile.kpi.business_projects }} проектов</div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">🧠</div>
              <div class="kpi-label">Навыки</div>
              <div class="kpi-value">{{ profile.kpi.skills_count }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">🤝</div>
              <div class="kpi-label">Контакты</div>
              <div class="kpi-value">{{ profile.kpi.contacts_count }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">💪</div>
              <div class="kpi-label">Форма</div>
              <div class="kpi-value">{{ profile.kpi.form_sessions }} разминок</div>
            </div>
            <div class="kpi">
              <div class="kpi-icon">⚖️</div>
              <div class="kpi-label">Вес</div>
              <div class="kpi-value">{{ profile.kpi.weight_kg }} кг</div>
              <div class="kpi-sub">цель {{ profile.kpi.weight_goal_kg }} кг</div>
            </div>
          </div>
        </section>

        <!-- QUESTS -->
        <section v-else-if="tab==='quests'" class="screen">
          <div class="section-head-row">
            <div class="section-head">⚔️ Квесты дня</div>
            <button type="button" class="edit-btn" @click="openAddQuest">+ Добавить</button>
          </div>

          <div class="quest-actions-row">
            <button type="button" class="btn btn-secondary btn-sm" @click="openImport(false)">📥 Импорт JSON</button>
            <button type="button" class="btn btn-secondary btn-sm" @click="refresh">↻ Обновить</button>
          </div>

          <div v-if="!questPack.quests.length" class="empty-state">
            <p>⚔️ Задания на сегодня не созданы</p>
            <button type="button" class="btn btn-primary" @click="openImport(false)">Импортировать Quest Pack →</button>
          </div>

          <template v-else>
            <div v-if="questPack.main_mission" class="quest-mission">
              🔥 <strong>Главная миссия:</strong> {{ questPack.main_mission }}
            </div>
            <p class="quest-meta">{{ pendingCount }} активных · {{ questPack.date }} · смахни вправо → завтра</p>

            <template v-for="(quests, statKey) in questsByStat" :key="statKey">
              <div class="quest-group-title">{{ statLabel(statKey) }}</div>
              <div v-for="q in quests" :key="q.id"
                   class="quest-item quest-swipe-wrap"
                   :class="{done: q.status==='done', failed: q.status==='failed', swiping: swipe.id===q.id && swipe.deltaX}"
                   :style="questSwipeStyle(q)"
                   @touchstart.passive="onQuestTouchStart(q, $event)"
                   @touchmove.passive="onQuestTouchMove(q, $event)"
                   @touchend="onQuestTouchEnd(q)"
                   @click="openQuest(q)">
                <div v-if="q.status==='pending'" class="quest-swipe-hint">→ завтра</div>
                <div class="quest-check">{{ q.status==='done' ? '✓' : '' }}</div>
                <div class="quest-body">
                  <div class="quest-title">{{ q.title }}<span v-if="q.progress_notes" class="quest-has-notes" title="Есть заметки"> 📝</span></div>
                  <div class="quest-xp">+{{ q.xp_reward }} XP · {{ statLabel(q.stat_key) }}<span v-if="q.due_time" class="quest-due"> · до {{ fmtDueTime(q.due_time) }}</span></div>
                </div>
                <div v-if="q.status==='pending'" class="quest-actions" @click.stop>
                  <button type="button" class="edit-btn edit-btn-sm" @click="openEditQuest(q)">✏️</button>
                  <button type="button" class="edit-btn edit-btn-sm edit-btn-danger" @click="removeQuest(q, $event, 'quests')">🗑</button>
                </div>
              </div>
            </template>

            <button type="button" class="btn btn-secondary quest-refresh" @click="openReplaceImport">↻ Заменить Quest Pack</button>
          </template>
        </section>

        <!-- LEAGUE -->
        <section v-else-if="tab==='league'" class="screen">
          <div class="section-head">🥇 Недельная лига</div>
          <div v-if="!leagueData" class="empty-state"><p>Загрузка...</p></div>
          <template v-else>
            <div class="league-header card">
              <div class="league-tier">{{ leagueData.tier }}</div>
              <div class="league-meta">
                Место <strong>#{{ leagueData.rank }}</strong> / {{ leagueData.member_count }}
                · {{ leagueData.weekly_xp }} XP
                · {{ leagueData.days_left }} дн.
              </div>
              <div class="league-zones">
                <span class="zone-label promote">Топ {{ leagueData.promotion_zone }} → ↑</span>
                <span class="zone-label demote">Низ {{ leagueData.demotion_zone }} → ↓</span>
              </div>
            </div>
            <div class="league-list">
              <div
                v-for="m in leagueData.members"
                :key="m.rank + '-' + m.display_name"
                class="league-row"
                :class="{ 'is-you': m.is_you, promote: m.rank <= leagueData.promotion_zone, demote: m.rank > leagueData.member_count - leagueData.demotion_zone && leagueData.demotion_zone }"
              >
                <span class="league-rank">#{{ m.rank }}</span>
                <span class="league-name">{{ m.display_name }}</span>
                <span class="league-xp">{{ m.weekly_xp }} XP</span>
              </div>
            </div>
          </template>
        </section>

        <!-- GROWTH -->
        <section v-else-if="tab==='growth'" class="screen">
          <div class="section-head">🌱 Путь роста</div>
          <div v-if="!growthPath" class="empty-state"><p>Загрузка...</p></div>
          <template v-else>
            <div class="growth-intro card">
              <h3>{{ growthPath.title }}</h3>
              <p>{{ growthPath.description }}</p>
            </div>
            <div v-for="unit in growthPath.units" :key="unit.id" class="growth-unit card">
              <div class="growth-unit-title">{{ unit.title }}</div>
              <p class="growth-unit-desc">{{ unit.description }}</p>
              <div class="growth-nodes">
                <button
                  v-for="node in unit.nodes"
                  :key="node.id"
                  type="button"
                  class="growth-node"
                  :class="growthNodeClass(node)"
                  :disabled="node.status === 'locked'"
                  @click="openGrowthNode(node)"
                >
                  <span class="growth-node-icon">{{ growthNodeIcon(node) }}</span>
                  <span class="growth-node-title">{{ node.title }}</span>
                  <span class="growth-node-xp">+{{ node.xp_reward }} XP</span>
                </button>
              </div>
            </div>
          </template>
        </section>

        <!-- CLAN -->
        <section v-else-if="tab==='clan'" class="screen">
          <div class="section-head">⚔️ Клановый спринт</div>
          <div v-if="!clanData" class="card clan-create">
            <p class="modal-sub">Клан 5–10 человек. Sprint стартует от 5 участников.</p>
            <div class="field">
              <label>Название клана</label>
              <input v-model="clanForm.name" type="text" maxlength="32" placeholder="Мой отряд">
            </div>
            <button type="button" class="btn btn-primary" @click="createClanAction">Создать клан</button>
            <div class="field" style="margin-top:16px">
              <label>Или код приглашения</label>
              <input v-model="clanForm.invite_code" type="text" maxlength="8" placeholder="ABC12345">
            </div>
            <button type="button" class="btn btn-secondary" @click="joinClanAction">Вступить</button>
          </div>
          <template v-else>
            <div class="card clan-header">
              <h3>{{ clanData.name }}</h3>
              <p class="modal-sub">{{ clanData.member_count }}/{{ clanData.max_members }} · min {{ clanData.min_members }} для sprint</p>
              <p v-if="clanData.invite_code" class="invite-code">Код: <strong>{{ clanData.invite_code }}</strong></p>
              <div v-if="clanData.sprint" class="sprint-bar-wrap">
                <div class="chest-victory-row">
                  <span>Речной спринт</span>
                  <span>{{ clanData.sprint.total_xp }}/{{ clanData.sprint.goal_xp || '—' }} XP</span>
                </div>
                <div class="progress-mini"><div class="progress-mini-fill gold" :style="{width: clanData.sprint.progress_pct+'%'}"></div></div>
              </div>
              <ul class="clan-members">
                <li v-for="(m, i) in clanData.members" :key="i">
                  {{ m.display_name }} <span v-if="m.role==='leader'">👑</span>
                </li>
              </ul>
              <button type="button" class="btn btn-secondary" @click="leaveClanAction">Покинуть клан</button>
            </div>
          </template>
        </section>

        <!-- SHOP / PRO -->
        <section v-else-if="tab==='shop'" class="screen">
          <div class="section-head">🛒 Квест Про и темы</div>
          <div class="card pro-card">
            <div class="pro-title">Квест Про</div>
            <p class="modal-sub">Темы, +1 защита серии/мес, ранний доступ</p>
            <p v-if="subscription?.quest_pro" class="pro-active">✓ ПРО активен</p>
            <p v-else-if="subscription?.payments_mode==='stub'" class="modal-sub">Оплата: тестовый режим (ЮKassa на сервере)</p>
            <button v-if="!subscription?.quest_pro" type="button" class="btn btn-primary" @click="checkoutProAction">
              Подключить Pro · {{ subscription?.plans?.[0]?.price_rub || '299' }} ₽/мес
            </button>
            <button v-if="displayProfile.gamification?.streak_grace_available" type="button" class="btn btn-sm btn-secondary" style="margin-top:8px" @click="useGraceAction">
              🔥 Использовать streak grace
            </button>
          </div>
          <div class="theme-grid">
            <button
              v-for="t in shopThemes"
              :key="t.code"
              type="button"
              class="theme-card"
              :class="{ active: t.is_active, locked: !t.can_activate }"
              :style="{ borderColor: t.preview_color }"
              @click="activateThemeAction(t.code)"
            >
              <span class="theme-swatch" :style="{ background: t.preview_color }"></span>
              <span class="theme-name">{{ t.title }}</span>
              <span v-if="t.requires_pro" class="theme-badge">ПРО</span>
            </button>
          </div>
        </section>

        <!-- STATS -->
        <section v-else-if="tab==='stats'" class="screen">
          <div class="section-head-row">
            <div class="section-head">📊 Характеристики</div>
            <button type="button" class="edit-btn" @click="openStatEdit">✏️ Настроить</button>
          </div>
          <div class="stat-grid">
            <div v-for="key in statKeys" :key="key" class="stat-card">
              <div class="stat-card-head">
                <div class="icon">{{ (statLabel(key) || '⭐').split(' ')[0] }}</div>
                <span class="stat-level">УР. {{ displayProfile.stats_levels?.[key] ?? 0 }}</span>
              </div>
              <div class="name">{{ (statLabel(key) || key).replace(/^\\S+\\s/, '') }}</div>
              <div class="xp">{{ fmtNum(displayProfile.stats_xp?.[key] ?? 0) }} XP</div>
              <div class="progress-mini goal-progress" style="margin-top:8px">
                <div class="progress-mini-fill" :style="{width: pct(statProgress(key).current, statProgress(key).needed)+'%'}"></div>
              </div>
              <div class="stat-rule">{{ statProgress(key).current }} / {{ statProgress(key).needed }} XP · {{ statRule(key) }}</div>
            </div>
          </div>
          <p class="rule-text">
            <strong>Уровень героя</strong> = среднее уровней характеристик. Сейчас: {{ displayProfile.level }}.
          </p>
          <p class="rule-text">
            <strong>XP квестов</strong> копится по каждой характеристике отдельно. Цели вроде «10 000 подписчиков» — в разделе «Цели».
          </p>
        </section>

        <!-- JOURNAL -->
        <section v-else-if="tab==='journal'" class="screen">
          <div class="section-head">📅 Журнал</div>

          <div v-if="analyticsData?.insights?.length" class="insights-block">
            <div class="section-head progress-subhead">✨ Замеченный прогресс</div>
            <div
              v-for="ins in analyticsData.insights"
              :key="ins.id"
              class="card insight-card"
              :class="'insight-' + ins.type"
            >
              <p class="insight-message">{{ ins.message }}</p>
              <div v-if="ins.change_pct" class="insight-meta">+{{ ins.change_pct }}%</div>
            </div>
          </div>
          <div v-else-if="analyticsData" class="empty-state insight-empty">
            <p>📊 Выполняй квесты с числами в заметках — например «300 приседаний». Программа сама заметит рост.</p>
          </div>

          <div class="section-head progress-subhead" style="margin-top:16px">📅 Календарь</div>
          <div class="cal-nav">
            <button type="button" class="edit-btn" @click="prevMonth">←</button>
            <span class="cal-nav-title">{{ calendarTitle }}</span>
            <button type="button" class="edit-btn" @click="nextMonth">→</button>
          </div>
          <div class="cal-weekdays">
            <span v-for="d in ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']" :key="d">{{ d }}</span>
          </div>
          <div class="cal-grid">
            <template v-for="cell in calendarCells" :key="cell.key">
              <div v-if="cell.empty" class="cal-day cal-day-empty"></div>
              <button v-else type="button"
                      :class="calDayClass(cell)"
                      @click="selectCalendarDay(cell)">
                <span class="cal-day-num">{{ cell.day }}</span>
                <span v-if="cell.data?.total" class="cal-day-badge">{{ cell.data.done }}/{{ cell.data.total }}</span>
              </button>
            </template>
          </div>
          <div v-if="selectedDate" class="journal-day-panel">
            <div class="section-head">📋 {{ selectedDate }}</div>
            <div v-if="journalQuests.main_mission" class="quest-mission">
              🔥 {{ journalQuests.main_mission }}
            </div>
            <div v-if="!journalQuests.quests.length" class="empty-state">
              <p>Нет квестов на этот день</p>
            </div>
            <div v-for="q in journalQuests.quests" :key="q.id"
                 class="quest-item"
                 :class="{done: q.status==='done', failed: q.status==='failed'}"
                 @click="openJournalQuest(q)">
              <div class="quest-check">{{ q.status==='done' ? '✓' : q.status==='failed' ? '✗' : '' }}</div>
              <div class="quest-body">
                <div class="quest-title">{{ q.title }}<span v-if="q.progress_notes" class="quest-has-notes"> 📝</span></div>
                <div class="quest-xp">+{{ q.xp_reward }} XP · {{ statLabel(q.stat_key) }}<span v-if="q.due_time" class="quest-due"> · до {{ fmtDueTime(q.due_time) }}</span></div>
              </div>
              <div v-if="q.status==='pending'" class="quest-actions" @click.stop>
                <button type="button" class="edit-btn edit-btn-sm edit-btn-danger" @click="removeQuest(q, $event, 'journal')">🗑</button>
              </div>
            </div>
          </div>
        </section>

        <!-- GOALS -->
        <section v-else-if="tab==='goals'" class="screen">
          <div class="section-head-row">
            <div class="section-head">🎯 Цели</div>
            <button type="button" class="edit-btn" @click="openGoalAdd">+ Цель</button>
          </div>
          <p class="rule-text" style="margin-bottom:16px">Жизненные цели — подписчики, накопления, вес. Не влияют на уровень, только показывают прогресс.</p>
          <div v-if="!profile.goals?.length" class="empty-state">
            <p>Добавь первую цель — например «10 000 подписчиков» или «накопить на дом».</p>
          </div>
          <div v-for="g in profile.goals" :key="g.id || g.title" class="goal-block">
            <div class="goal-block-head">
              <h4>{{ g.emoji || '🎯' }} {{ g.title }}</h4>
              <div>
                <button type="button" class="edit-btn edit-btn-sm" @click="openGoalEditGoal(g)">✏️</button>
                <button type="button" class="edit-btn edit-btn-sm edit-btn-danger" @click="deleteGoalAction(g)">🗑</button>
              </div>
            </div>
            <p v-if="g.description" class="goal-text">{{ g.description }}</p>
            <p class="goal-text">Прогресс: {{ goalProgressLabel(g) }}</p>
            <div v-if="g.target_value" class="progress-mini goal-progress">
              <div class="progress-mini-fill" :style="{width: pct(g.current_value, g.target_value)+'%'}"></div>
            </div>
          </div>
        </section>

      </main>

      <nav class="bottom-nav bottom-nav-scroll">
        <button type="button" class="nav-item" :class="{active: tab==='home'}" @click="switchTab('home')"><span class="ico">🏠</span>Главная</button>
        <button type="button" class="nav-item" :class="{active: tab==='quests'}" @click="switchTab('quests')"><span class="ico">⚔️</span>Квесты</button>
        <button type="button" class="nav-item" :class="{active: tab==='journal'}" @click="switchTab('journal')"><span class="ico">📅</span>Журнал</button>
        <button type="button" class="nav-item" :class="{active: tab==='growth'}" @click="switchTab('growth')"><span class="ico">🌱</span>Рост</button>
        <button type="button" class="nav-item" :class="{active: tab==='league'}" @click="switchTab('league')"><span class="ico">🥇</span>Лига</button>
        <button type="button" class="nav-item" :class="{active: tab==='clan'}" @click="switchTab('clan')"><span class="ico">⚔️</span>Клан</button>
        <button type="button" class="nav-item" :class="{active: tab==='shop'}" @click="switchTab('shop')"><span class="ico">🛒</span>Магазин</button>
        <button type="button" class="nav-item" :class="{active: tab==='stats'}" @click="switchTab('stats')"><span class="ico">📊</span>Статы</button>
        <button type="button" class="nav-item" :class="{active: tab==='goals'}" @click="switchTab('goals')"><span class="ico">🎯</span>Цели</button>
      </nav>
      <!-- Work on quest / Complete -->
      <div v-if="showReflect" class="modal-overlay" @click.self="showReflect=false">
        <div class="modal modal-work">
          <h3>📋 {{ activeQuest?.title }}</h3>
          <p class="modal-sub">+{{ activeQuest?.xp_reward }} XP · {{ statLabel(activeQuest?.stat_key) }}</p>

          <div class="field field-notes">
            <label>Заметки в процессе</label>
            <textarea
              v-model="progressNotes"
              class="notes-area"
              rows="5"
              placeholder="Пиши здесь — сохранится на сервере. Можно закрыть и дополнять позже."
            ></textarea>
            <button type="button" class="btn btn-secondary btn-sm btn-save-notes" @click="saveQuestNotes">💾 Сохранить заметки</button>
          </div>

          <div class="work-divider">Разбор при завершении</div>
          <div v-for="f in REFLECTION_FIELDS" :key="f.key" class="field">
            <label>{{ f.label }}</label>
            <textarea v-model="reflection[f.key]"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showReflect=false">Закрыть</button>
            <button type="button" class="btn btn-primary" @click="submitQuest">☑ Выполнено +{{ activeQuest?.xp_reward }} XP</button>
          </div>
        </div>
      </div>

      <!-- Import -->
      <div v-if="showImport" class="modal-overlay" @click.self="showImport=false">
        <div class="modal">
          <h3>{{ importReplace ? '↻ Заменить Quest Pack' : '📥 Импорт Daily Quest Pack' }}</h3>
          <p class="modal-sub" v-if="importReplace">
            Импортированные задачи на сегодня будут заменены. Ручные задачи останутся.
          </p>
          <p class="modal-sub" v-else>
            Новые задачи добавятся к существующим (дубликаты по названию пропускаются).
          </p>
          <textarea class="import-area" v-model="importJson" placeholder='{"main_mission":"...","blocks":[...]}'></textarea>
          <div class="import-actions">
            <button type="button" class="btn btn-secondary btn-sm" @click="loadSampleImport">Пример</button>
            <button type="button" class="btn btn-primary" @click="doImport">Загрузить</button>
          </div>
        </div>
      </div>

      <!-- KPI Edit -->
      <div v-if="showKpiEdit" class="modal-overlay" @click.self="showKpiEdit=false">
        <div class="modal">
          <h3>✏️ Редактировать KPI</h3>
          <div class="form-grid">
            <div v-for="f in KPI_FIELDS" :key="f.key" class="field">
              <label>{{ f.label }}</label>
              <input v-model.number="kpiForm[f.key]" :type="f.type || 'number'" :step="f.step || '1'">
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showKpiEdit=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveKpi">Сохранить</button>
          </div>
        </div>
      </div>

      <!-- Add Quest -->
      <div v-if="showAddQuest" class="modal-overlay" @click.self="showAddQuest=false">
        <div class="modal">
          <h3>➕ Новый квест</h3>
          <div class="field">
            <label>Название</label>
            <input v-model="questForm.title" type="text" placeholder="Что нужно сделать?">
          </div>
          <div class="field">
            <label>Характеристика</label>
            <select v-model="questForm.stat_key">
              <option v-for="k in statKeys" :key="k" :value="k">{{ statLabel(k) }}</option>
            </select>
          </div>
          <div class="field">
            <label>Награда XP</label>
            <input v-model.number="questForm.xp_reward" type="number" min="1">
          </div>
          <div class="field">
            <label>Дедлайн (необязательно)</label>
            <input v-model="questForm.due_time" type="time">
            <p class="field-hint">Пусто = бессрочно. За 1 ч до дедлайна бот напомнит в Telegram.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showAddQuest=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveNewQuest">Добавить</button>
          </div>
        </div>
      </div>

      <!-- Edit Quest -->
      <div v-if="showEditQuest" class="modal-overlay" @click.self="showEditQuest=false">
        <div class="modal">
          <h3>✏️ Редактировать квест</h3>
          <div class="field">
            <label>Название</label>
            <input v-model="questForm.title" type="text">
          </div>
          <div class="field">
            <label>Характеристика</label>
            <select v-model="questForm.stat_key">
              <option v-for="k in statKeys" :key="k" :value="k">{{ statLabel(k) }}</option>
            </select>
          </div>
          <div class="field">
            <label>Награда XP</label>
            <input v-model.number="questForm.xp_reward" type="number" min="1">
          </div>
          <div class="field">
            <label>Дедлайн (необязательно)</label>
            <input v-model="questForm.due_time" type="time">
            <p class="field-hint">Очистите поле, чтобы сделать задачу бессрочной.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showEditQuest=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveEditedQuest">Сохранить</button>
          </div>
        </div>
      </div>

      <!-- Goal add/edit -->
      <div v-if="showGoalAdd" class="modal-overlay" @click.self="showGoalAdd=false">
        <div class="modal">
          <h3>{{ editingGoalId ? '✏️ Редактировать цель' : '➕ Новая цель' }}</h3>
          <div class="form-grid">
            <div class="field">
              <label>Эмодзи</label>
              <input v-model="goalForm.emoji" maxlength="4" class="stat-emoji-input">
            </div>
            <div class="field">
              <label>Название</label>
              <input v-model="goalForm.title" type="text" placeholder="10 000 подписчиков">
            </div>
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea v-model="goalForm.description" placeholder="Зачем эта цель..."></textarea>
          </div>
          <div class="field">
            <label>Единица (необяз.)</label>
            <input v-model="goalForm.metric_unit" type="text" placeholder="подп., ₽, кг">
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Сейчас</label>
              <input v-model.number="goalForm.current_value" type="number">
            </div>
            <div class="field">
              <label>Цель</label>
              <input v-model.number="goalForm.target_value" type="number">
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showGoalAdd=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveGoalForm">{{ editingGoalId ? 'Сохранить' : 'Добавить' }}</button>
          </div>
        </div>
      </div>

      <!-- Quest Detail (Journal) -->
      <div v-if="showQuestDetail" class="modal-overlay" @click.self="showQuestDetail=false">
        <div class="modal">
          <h3>{{ detailQuest?.status==='done' ? '✅' : detailQuest?.status==='failed' ? '❌' : '📋' }} {{ detailQuest?.title }}</h3>
          <p class="modal-sub">
            +{{ detailQuest?.xp_reward }} XP · {{ STAT_LABELS[detailQuest?.stat_key] || detailQuest?.stat_key }}
            · {{ detailQuest?.date || selectedDate }}
          </p>
          <div v-if="detailQuest?.progress_notes" class="field">
            <label>Заметки в процессе</label>
            <textarea
              v-model="detailQuest.progress_notes"
              readonly
              class="readonly"
            ></textarea>
          </div>
          <div v-for="f in REFLECTION_FIELDS" :key="f.key" class="field">
            <label>{{ f.label }}</label>
            <textarea
              v-model="detailQuest.reflection[f.key]"
              :readonly="detailReadOnly"
              :class="{readonly: detailReadOnly}"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showQuestDetail=false">Закрыть</button>
            <button v-if="detailQuest?.status==='pending'"
                    type="button" class="btn btn-primary"
                    @click="showQuestDetail=false; openQuest(detailQuest)">
              Открыть задачу
            </button>
          </div>
        </div>
      </div>

      <!-- Growth node complete -->
      <div v-if="showGrowthNode && activeGrowthNode" class="modal-overlay" @click.self="showGrowthNode=false">
        <div class="modal">
          <h3>{{ growthNodeIcon(activeGrowthNode) }} {{ activeGrowthNode.title }}</h3>
          <p class="modal-sub">+{{ activeGrowthNode.xp_reward }} XP · шаг пути роста</p>
          <div class="field">
            <label>Итог / рефлексия (мин. 10 символов)</label>
            <textarea v-model="growthReflection.summary" rows="4" placeholder="Что сделал по этому шагу пути?"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showGrowthNode=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="submitGrowthNode">Завершить шаг</button>
          </div>
        </div>
      </div>

      <!-- Chest loot reveal -->
      <div v-if="showChestLoot && chestLoot" class="modal-overlay" @click.self="showChestLoot=false">
        <div class="modal chest-loot-modal">
          <h3>{{ chestLoot.title }}</h3>
          <div class="chest-loot-shake">📦</div>
          <ul class="chest-loot-list">
            <li v-for="(item, idx) in (chestLoot.loot?.items || [])" :key="idx">
              {{ item.label }}
              <span v-if="item.text" class="chest-loot-tip">{{ item.text }}</span>
            </li>
          </ul>
          <div class="modal-actions">
            <button type="button" class="btn btn-primary" @click="showChestLoot=false">Забрать!</button>
          </div>
        </div>
      </div>

      <!-- Evening chest reflection -->
      <div v-if="showEveningChest" class="modal-overlay" @click.self="showEveningChest=false">
        <div class="modal">
          <h3>🌙 Вечерний сундук</h3>
          <p class="modal-sub">Краткий итог дня (мин. 10 символов) — и сундук твой.</p>
          <div class="field">
            <label>Итог дня</label>
            <textarea v-model="eveningReflection" rows="4" placeholder="Что сегодня было главным?"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showEveningChest=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="submitEveningChest">Получить сундук</button>
          </div>
        </div>
      </div>

      <!-- Onboarding -->
      <div v-if="showOnboarding" class="modal-overlay onboarding-overlay">
        <div class="modal onboarding-modal">
          <div v-if="onboardingStep==='welcome'" class="onboarding-step">
            <h2>🎮 Добро пожаловать!</h2>
            <p class="modal-sub">Построй свою игру жизни: характеристики, привычки, квесты и прогресс.</p>
            <div class="field">
              <label>Имя героя</label>
              <input v-model="onboardingName" type="text" maxlength="64" placeholder="Как тебя называть?">
            </div>
            <button type="button" class="btn btn-primary" @click="submitOnboardingStep">Далее →</button>
          </div>
          <div v-else-if="onboardingStep==='stats'" class="onboarding-step">
            <h2>📊 Характеристики</h2>
            <p class="modal-sub">Выбери области жизни. Уровень каждой растёт от XP за квесты по ней.</p>
            <div class="onboarding-presets">
              <button v-for="p in statPresets" :key="p.key" type="button" class="btn btn-sm btn-secondary" @click="addOnboardingStat(p)">+ {{ p.emoji }} {{ p.label }}</button>
            </div>
            <div v-for="(s, idx) in onboardingStats" :key="idx" class="onboarding-stat-row card">
              <input v-model="s.emoji" class="stat-emoji-input" maxlength="4">
              <input v-model="s.label" placeholder="Название" class="stat-label-input">
              <input v-model.number="s.xp_per_level" type="number" min="100" step="100" class="stat-rule-input" title="XP за уровень">
              <span class="stat-rule-hint">XP/ур.</span>
              <button type="button" class="edit-btn edit-btn-danger" @click="removeOnboardingStat(idx)">✕</button>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" @click="addOnboardingStat()">+ Своя характеристика</button>
            <button type="button" class="btn btn-primary" style="margin-top:12px" @click="submitOnboardingStep">Далее →</button>
          </div>
          <div v-else-if="onboardingStep==='habits'" class="onboarding-step">
            <h2>⚡ Ежедневные привычки</h2>
            <p class="modal-sub">Что будешь делать каждый день? Из них создадутся квесты.</p>
            <div v-for="(h, idx) in onboardingHabits" :key="idx" class="onboarding-habit-row">
              <input v-model="h.title" placeholder="Например: 100 отжиманий">
              <select v-model="h.stat_key">
                <option v-for="s in onboardingStats" :key="s.key" :value="s.key">{{ s.emoji }} {{ s.label }}</option>
              </select>
              <input v-model.number="h.xp_reward" type="number" min="1" class="stat-rule-input">
            </div>
            <button type="button" class="btn btn-secondary btn-sm" @click="addOnboardingHabit">+ Привычка</button>
            <button type="button" class="btn btn-primary" style="margin-top:12px" @click="submitOnboardingStep">Начать игру! 🚀</button>
          </div>
        </div>
      </div>

      <!-- Stat config edit -->
      <div v-if="showStatEdit" class="modal-overlay" @click.self="showStatEdit=false">
        <div class="modal">
          <h3>✏️ Характеристики</h3>
          <p class="modal-sub">Уровень = XP по этой характеристике ÷ «XP за уровень».</p>
          <div v-for="(s, idx) in statEditForm" :key="idx" class="onboarding-stat-row card">
            <input v-model="s.emoji" class="stat-emoji-input" maxlength="4">
            <input v-model="s.label" class="stat-label-input" placeholder="Название">
            <input v-model.number="s.xp_per_level" type="number" min="100" step="100" class="stat-rule-input" placeholder="1000">
            <span class="stat-rule-hint">XP/ур.</span>
            <button type="button" class="edit-btn edit-btn-danger" @click="removeStatRow(idx)">✕</button>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" @click="addStatRow">+ Добавить</button>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showStatEdit=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveStatEdit">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  `,
}).mount('#app');
