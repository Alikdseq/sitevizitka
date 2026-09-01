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
    const showAddQuest = ref(false);
    const questAddTargetDate = ref('');
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
    const wizardScreen = ref('welcome_name');
    const onboardingName = ref('');
    const onboardingStats = ref([]);
    const onboardingHabits = ref([]);
    const wizardDraftStat = ref({ emoji: '⭐', label: '', xp_per_level: 1000, key: '' });
    const wizardDraftHabit = ref({ title: '', stat_key: '', xp_reward: 40 });
    const statPresets = ref([]);

    const playerHabits = ref([]);
    const gameHabits = ref([]);
    const showHabitSheet = ref(false);
    const habitForm = ref({ title: '', stat_key: '', xp_reward: 40, generates_daily_quest: true });
    const editingHabitId = ref(null);

    const showStatSheet = ref(false);
    const statSheetForm = ref({});
    const statSheetOriginalKey = ref('');

    const analyticsData = ref(null);

    const leagueData = ref(null);

    const clanData = ref(null);
    const clanForm = ref({ name: '', invite_code: '', stat_focus: 'discipline' });
    const shopThemes = ref([]);
    const subscription = ref(null);
    const shopCourses = ref([]);
    const referralInfo = ref(null);
    const adminDashboard = ref(null);
    const adminPlayers = ref([]);
    const showAdmin = ref(false);
    const adminEditForm = ref({ display_name: '', free_course_credits: 0, is_active: true });
    const editingAdminPlayerId = ref(null);

    const activeQuest = ref(null);
    const detailQuest = ref(null);
    const importJson = ref('');
    const reflection = ref(emptyReflection());
    const progressNotes = ref('');

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
      const quests = regularQuests.value;
      if (!Array.isArray(quests)) return {};
      const groups = {};
      quests.forEach((q) => {
        const key = q.stat_key || 'discipline';
        if (!groups[key]) groups[key] = [];
        groups[key].push(q);
      });
      return groups;
    });

    const habitQuests = computed(() =>
      (questPack.value?.quests || []).filter((q) => q.source === 'habit')
    );

    const gameHabitQuests = computed(() =>
      (questPack.value?.quests || []).filter((q) => q.source === 'game_habit')
    );

    const regularQuests = computed(() =>
      (questPack.value?.quests || []).filter((q) => !['habit', 'game_habit'].includes(q.source))
    );

    const isAdmin = computed(() => Boolean(displayProfile.value?.is_admin));

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
        const [themes, sub, courses, ref] = await Promise.all([
          QuestAPI.getShopThemes(),
          QuestAPI.getSubscription(),
          QuestAPI.getShopCourses(),
          QuestAPI.getReferral(),
        ]);
        shopThemes.value = themes?.themes || [];
        subscription.value = sub;
        shopCourses.value = courses?.courses || [];
        referralInfo.value = ref || displayProfile.value?.referral || null;
      } catch {
        shopThemes.value = [];
        shopCourses.value = [];
      }
    }

    async function purchaseCourseAction(course, useCredit = false) {
      try {
        const r = await QuestAPI.purchaseCourse(course.id, useCredit);
        if (r?.error === 'payment_required') {
          showToast(r.message || 'Оплата скоро — используй бесплатный кредит');
          return;
        }
        if (r?.error) {
          showToast(r.error === 'already_owned' ? 'Курс уже куплен' : 'Не удалось купить');
          return;
        }
        showToast('Курс получен ✓');
        await loadShop();
        await refresh();
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    function shareReferralLink() {
      const ref = referralInfo.value || displayProfile.value?.referral;
      if (!ref?.referral_link) return;
      const text = `${ref.share_text || 'Присоединяйся к ALIHAN QUEST!'}\n${ref.referral_link}`;
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(ref.referral_link)}&text=${encodeURIComponent(ref.share_text || 'ALIHAN QUEST')}`);
        return;
      }
      if (navigator.share) {
        navigator.share({ title: ref.share_title, text: ref.share_text, url: ref.referral_link }).catch(() => {});
        return;
      }
      navigator.clipboard?.writeText(text);
      showToast('Ссылка скопирована');
    }

    async function loadAdmin() {
      if (!isAdmin.value) return;
      try {
        const [dash, players] = await Promise.all([
          QuestAPI.getAdminDashboard(),
          QuestAPI.getAdminPlayers(),
        ]);
        adminDashboard.value = dash;
        adminPlayers.value = players?.players || [];
      } catch {
        adminDashboard.value = null;
        adminPlayers.value = [];
      }
    }

    function openAdminPlayer(p) {
      editingAdminPlayerId.value = p.id;
      adminEditForm.value = {
        display_name: p.display_name,
        free_course_credits: p.free_course_credits || 0,
        is_active: p.is_active !== false,
      };
    }

    async function saveAdminPlayer() {
      if (!editingAdminPlayerId.value) return;
      try {
        await QuestAPI.updateAdminPlayer(editingAdminPlayerId.value, adminEditForm.value);
        showToast('Игрок обновлён ✓');
        editingAdminPlayerId.value = null;
        await loadAdmin();
      } catch {
        showToast('Ошибка сохранения');
      }
    }

    async function deleteAdminPlayerAction(p) {
      if (!window.confirm(`Деактивировать игрока «${p.display_name}»?`)) return;
      try {
        await QuestAPI.deleteAdminPlayer(p.id);
        showToast('Игрок деактивирован');
        await loadAdmin();
      } catch {
        showToast('Ошибка');
      }
    }

    async function tryApplyReferralFromTelegram() {
      const tg = window.Telegram?.WebApp;
      const startParam = tg?.initDataUnsafe?.start_param || '';
      if (!startParam) return;
      const code = startParam.startsWith('ref_') ? startParam.slice(4) : startParam;
      try {
        await QuestAPI.applyReferral(code);
      } catch { /* already referred or invalid */ }
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

    function switchTab(name) {
      tab.value = name;
    }

    const WIZARD_PROGRESS = {
      welcome_name: 8, welcome_intro: 16, stats_intro: 24, stats_list: 32,
      stat_emoji: 36, stat_label: 40, stat_confirm: 44,
      stats_done: 50, habits_intro: 58, habits_list: 66,
      habit_title: 72, habit_stat: 78, habit_xp: 84, habit_confirm: 90,
    };

    const wizardProgressPct = computed(() => WIZARD_PROGRESS[wizardScreen.value] || 10);

    async function initOnboarding() {
      try {
        const data = await QuestAPI.getOnboarding();
        statPresets.value = data.presets || [];
        if (!data.completed) {
          wizardScreen.value = data.step === 'stats' ? 'stats_intro'
            : data.step === 'habits' ? 'habits_intro'
            : 'welcome_name';
          onboardingName.value = displayProfile.value.display_name || '';
          onboardingStats.value = data.stats?.length ? data.stats.map((s) => ({ ...s })) : [];
          onboardingHabits.value = data.habits?.length ? data.habits.map((h) => ({ ...h })) : [];
          showOnboarding.value = true;
        }
      } catch { /* offline */ }
    }

    function wizardBack() {
      const back = {
        welcome_intro: 'welcome_name',
        stats_intro: 'welcome_intro',
        stats_list: 'stats_intro',
        stat_emoji: 'stats_list',
        stat_label: 'stat_emoji',
        stat_confirm: 'stat_label',
        stats_done: 'stats_list',
        habits_intro: 'stats_done',
        habits_list: 'habits_intro',
        habit_title: 'habits_list',
        habit_stat: 'habit_title',
        habit_xp: 'habit_stat',
        habit_confirm: 'habit_xp',
      };
      if (back[wizardScreen.value]) wizardScreen.value = back[wizardScreen.value];
    }

    function startWizardAddStat(preset) {
      const item = preset
        ? { emoji: preset.emoji, label: preset.label, xp_per_level: preset.xp_per_level || 1000, key: preset.key }
        : { emoji: '⭐', label: '', xp_per_level: 1000, key: `custom_${Date.now()}` };
      wizardDraftStat.value = { ...item };
      wizardScreen.value = preset ? 'stat_confirm' : 'stat_emoji';
    }

    function confirmWizardStat() {
      const d = wizardDraftStat.value;
      if (!d.label?.trim()) { showToast('Введите название'); return; }
      const entry = {
        emoji: d.emoji || '⭐',
        label: d.label.trim(),
        xp_per_level: d.xp_per_level || 1000,
        key: d.key || slugifyStatKey(d.label),
      };
      onboardingStats.value.push(entry);
      wizardScreen.value = 'stats_list';
    }

    function slugifyStatKey(label) {
      return (label || 'stat').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 28) || `custom_${Date.now()}`;
    }

    function removeWizardStat(idx) {
      onboardingStats.value.splice(idx, 1);
    }

    function startWizardAddHabit() {
      wizardDraftHabit.value = {
        title: '',
        stat_key: onboardingStats.value[0]?.key || statKeys.value[0] || 'discipline',
        xp_reward: 40,
      };
      wizardScreen.value = 'habit_title';
    }

    function confirmWizardHabit() {
      const d = wizardDraftHabit.value;
      if (!d.title?.trim()) { showToast('Введите название привычки'); return; }
      onboardingHabits.value.push({
        title: d.title.trim(),
        stat_key: d.stat_key,
        xp_reward: Number(d.xp_reward) || 40,
        generates_daily_quest: true,
      });
      wizardScreen.value = 'habits_list';
    }

    async function saveWizardStatsBatch() {
      if (!onboardingStats.value.length) { showToast('Добавь хотя бы одну характеристику'); return false; }
      try {
        await QuestAPI.saveOnboardingStep('stats', { stats: onboardingStats.value });
        return true;
      } catch {
        showToast('Ошибка сохранения');
        return false;
      }
    }

    async function saveWizardHabitsBatch(skip = false) {
      try {
        await QuestAPI.saveOnboardingStep('habits', skip ? { skip: true, habits: [] } : { habits: onboardingHabits.value });
        return true;
      } catch {
        showToast('Ошибка сохранения');
        return false;
      }
    }

    async function finishWizard() {
      try {
        await QuestAPI.saveOnboardingStep('complete', {});
        showOnboarding.value = false;
        await refresh();
        showToast('Добро пожаловать в игру! 🎮');
      } catch {
        showToast('Ошибка завершения');
      }
    }

    async function wizardPrimaryAction() {
      const s = wizardScreen.value;
      if (s === 'welcome_name') {
        if (!onboardingName.value.trim()) { showToast('Введите имя героя'); return; }
        await QuestAPI.saveOnboardingStep('welcome', { display_name: onboardingName.value.trim() });
        wizardScreen.value = 'welcome_intro';
      } else if (s === 'welcome_intro') {
        wizardScreen.value = 'stats_intro';
      } else if (s === 'stats_intro') {
        wizardScreen.value = 'stats_list';
      } else if (s === 'stats_list') {
        if (await saveWizardStatsBatch()) wizardScreen.value = 'stats_done';
      } else if (s === 'stats_done') {
        wizardScreen.value = 'habits_intro';
      } else if (s === 'habits_intro') {
        wizardScreen.value = 'habits_list';
      } else if (s === 'habits_list') {
        if (await saveWizardHabitsBatch(false)) await finishWizard();
      } else if (s === 'stat_emoji') {
        wizardScreen.value = 'stat_label';
      } else if (s === 'stat_label') {
        if (!wizardDraftStat.value.label?.trim()) { showToast('Введите название'); return; }
        wizardScreen.value = 'stat_confirm';
      } else if (s === 'stat_confirm') {
        confirmWizardStat();
      } else if (s === 'habit_title') {
        if (!wizardDraftHabit.value.title?.trim()) { showToast('Введите название'); return; }
        wizardDraftHabit.value.stat_key = onboardingStats.value[0]?.key || statKeys.value[0] || 'discipline';
        wizardScreen.value = 'habit_stat';
      } else if (s === 'habit_stat') {
        wizardScreen.value = 'habit_xp';
      } else if (s === 'habit_xp') {
        wizardScreen.value = 'habit_confirm';
      } else if (s === 'habit_confirm') {
        confirmWizardHabit();
      }
    }

    async function skipWizardHabits() {
      if (await saveWizardHabitsBatch(true)) await finishWizard();
    }

    async function loadHabits() {
      try {
        const [h, g] = await Promise.all([
          QuestAPI.getHabits(),
          QuestAPI.getGameHabitsToday(),
        ]);
        playerHabits.value = h?.habits || [];
        gameHabits.value = g?.game_habits || [];
      } catch {
        playerHabits.value = displayProfile.value?.habits || [];
        gameHabits.value = [];
      }
    }

    function openHabitAdd() {
      editingHabitId.value = null;
      habitForm.value = {
        title: '',
        stat_key: statKeys.value[0] || 'discipline',
        xp_reward: 40,
        generates_daily_quest: true,
      };
      showHabitSheet.value = true;
    }

    function openHabitEdit(h) {
      editingHabitId.value = h.id;
      habitForm.value = {
        title: h.title || '',
        stat_key: h.stat_key || statKeys.value[0],
        xp_reward: Number(h.xp_reward) || 40,
        generates_daily_quest: h.generates_daily_quest !== false,
      };
      showHabitSheet.value = true;
    }

    async function saveHabitSheet() {
      if (!habitForm.value.title?.trim()) { showToast('Введите название'); return; }
      const payload = {
        title: habitForm.value.title.trim(),
        stat_key: habitForm.value.stat_key,
        xp_reward: Number(habitForm.value.xp_reward) || 40,
        generates_daily_quest: Boolean(habitForm.value.generates_daily_quest),
      };
      try {
        if (editingHabitId.value) {
          await QuestAPI.updateHabit(editingHabitId.value, payload);
        } else {
          await QuestAPI.createHabit(payload);
        }
        showHabitSheet.value = false;
        await loadHabits();
        await refresh();
        showToast('Привычка сохранена ✓');
      } catch {
        showToast('Не удалось сохранить');
      }
    }

    async function deleteHabitAction() {
      if (!editingHabitId.value) return;
      try {
        await QuestAPI.deleteHabit(editingHabitId.value);
        showHabitSheet.value = false;
        await loadHabits();
        showToast('Привычка удалена');
      } catch {
        showToast('Не удалось удалить');
      }
    }

    function openStatCard(key) {
      const def = (displayProfile.value.stat_definitions || []).find((d) => d.key === key);
      if (!def) return;
      statSheetOriginalKey.value = key;
      statSheetForm.value = {
        key: def.key,
        emoji: def.emoji || '⭐',
        label: def.label || '',
        xp_per_level: def.xp_per_level || 1000,
      };
      showStatSheet.value = true;
    }

    async function saveStatSheet() {
      if (!statSheetForm.value.label?.trim()) { showToast('Введите название'); return; }
      const stats = (displayProfile.value.stat_definitions || []).map((s) => (
        s.key === statSheetOriginalKey.value
          ? { ...s, ...statSheetForm.value, label: statSheetForm.value.label.trim() }
          : { ...s }
      ));
      try {
        const result = await QuestAPI.updateStatConfig(stats);
        if (result.profile) profile.value = ensureProfile(result.profile);
        else await refresh();
        showStatSheet.value = false;
        showToast('Сохранено ✓');
      } catch {
        showToast('Не удалось сохранить');
      }
    }

    async function deleteStatSheet() {
      const stats = (displayProfile.value.stat_definitions || [])
        .filter((s) => s.key !== statSheetOriginalKey.value)
        .map((s) => ({ ...s }));
      if (!window.confirm('Удалить эту характеристику? XP сохранится на сервере.')) return;
      try {
        const result = await QuestAPI.updateStatConfig(stats);
        if (result.profile) profile.value = ensureProfile(result.profile);
        else await refresh();
        showStatSheet.value = false;
        showToast('Удалено');
      } catch {
        showToast('Не удалось удалить');
      }
    }

    function openStatAdd() {
      statSheetOriginalKey.value = '';
      statSheetForm.value = { key: `custom_${Date.now()}`, emoji: '⭐', label: '', xp_per_level: 1000 };
      showStatSheet.value = true;
    }

    async function saveNewStatSheet() {
      if (!statSheetForm.value.label?.trim()) { showToast('Введите название'); return; }
      const entry = {
        key: statSheetForm.value.key || slugifyStatKey(statSheetForm.value.label),
        emoji: statSheetForm.value.emoji || '⭐',
        label: statSheetForm.value.label.trim(),
        xp_per_level: Number(statSheetForm.value.xp_per_level) || 1000,
      };
      const stats = [...(displayProfile.value.stat_definitions || []).map((s) => ({ ...s })), entry];
      try {
        const result = await QuestAPI.updateStatConfig(stats);
        if (result.profile) profile.value = ensureProfile(result.profile);
        else await refresh();
        showStatSheet.value = false;
        showToast('Добавлено ✓');
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
      questAddTargetDate.value = '';
      questForm.value = { title: '', stat_key: statKeys.value[0] || 'discipline', xp_reward: 30, due_time: '' };
      showAddQuest.value = true;
    }

    function openAddQuestForJournal() {
      if (!selectedDate.value) {
        showToast('Сначала выбери день в календаре');
        return;
      }
      questAddTargetDate.value = selectedDate.value;
      questForm.value = { title: '', stat_key: statKeys.value[0] || 'discipline', xp_reward: 30, due_time: '' };
      showAddQuest.value = true;
    }

    function closeAddQuestModal() {
      showAddQuest.value = false;
      questAddTargetDate.value = '';
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
      const targetDate = questAddTargetDate.value || '';
      try {
        await QuestAPI.addQuest(questPayloadFromForm(), targetDate ? { date: targetDate } : {});
        closeAddQuestModal();
        if (targetDate) {
          await loadJournalDay(targetDate);
          await loadCalendar();
          if (targetDate === todayStr()) {
            const q = await QuestAPI.getTodayQuests();
            if (q.online && q.data) questPack.value = q.data;
          }
          showToast(`Задача добавлена на ${targetDate} ✓`);
        } else {
          const q = await QuestAPI.getTodayQuests();
          if (q.online && q.data) questPack.value = q.data;
          showToast('Квест добавлен ✓');
        }
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
      if (name === 'habits') await loadHabits();
      if (name === 'clan') await loadClan();
      if (name === 'shop') await loadShop();
      if (name === 'admin') await loadAdmin();
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
        await tryApplyReferralFromTelegram();
        await refresh();
      } catch {
        profile.value = QuestAPI.cachedProfile();
        questPack.value = QuestAPI.cachedQuests();
        apiOnline.value = false;
      }
    });

    return {
      tab, profile, displayProfile, questPack, apiOnline, authError, toast, swipe, syncInfo,
      showReflect, showImport, importReplace, showAddQuest, showEditQuest,
      showGoalAdd, showQuestDetail, showChestLoot, showEveningChest,
      celebrationFx, celebrationPayload,
      showOnboarding, wizardScreen, onboardingName, onboardingStats, onboardingHabits,
      wizardDraftStat, wizardDraftHabit, wizardProgressPct, statPresets,
      playerHabits, gameHabits, showHabitSheet, habitForm, editingHabitId,
      showStatSheet, statSheetForm, statSheetOriginalKey,
      analyticsData,
      leagueData,
      clanData, clanForm, shopThemes, subscription, shopCourses, referralInfo, isAdmin,
      adminDashboard, adminPlayers, adminEditForm, editingAdminPlayerId,
      habitQuests, gameHabitQuests, regularQuests,
      chestSummary, victoryProgressPct, readyChests,
      activeQuest, detailQuest, importJson, reflection, progressNotes,
      questForm, goalForm, editingGoalId,
      calendarYear, calendarMonth, calendarData, selectedDate, journalQuests,
      xpPercent, questsByStat, pendingCount, statKeys,
      statLabel, statRule,
      calendarCells, calendarTitle, detailReadOnly,
      STAT_LABELS, KPI_FIELDS, REFLECTION_FIELDS,
      QuestAPI,
      fmtMoney, fmtNum, fmtDueTime, pct, showToast, switchTab, refresh,
      playCelebration, openReadyChest, claimMorning, openEveningChestModal, submitEveningChest,
      loadLeague, loadJournalInsights, loadHabits,
      initOnboarding, wizardBack, wizardPrimaryAction, skipWizardHabits,
      startWizardAddStat, removeWizardStat, startWizardAddHabit,
      openStatCard, saveStatSheet, deleteStatSheet, openStatAdd, saveNewStatSheet,
      openHabitAdd, openHabitEdit, saveHabitSheet, deleteHabitAction,
      openGoalAdd, openGoalEditGoal, saveGoalForm, deleteGoalAction, goalProgressLabel, statProgress,
      loadClan, loadShop, loadAdmin, purchaseCourseAction, shareReferralLink,
      createClanAction, joinClanAction, leaveClanAction,
      openAdminPlayer, saveAdminPlayer, deleteAdminPlayerAction,
      activateThemeAction, checkoutProAction, useGraceAction,
      openAddQuest, openAddQuestForJournal, closeAddQuestModal, questAddTargetDate,
      openEditQuest, saveNewQuest, saveEditedQuest, removeQuest, deferQuestToTomorrow,
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
        📡 Нет связи с сервером ({{ QuestAPI.getApiBase() || 'API не задан' }}). Запусти start-alihan-quest.bat и не закрывай окно Tunnel.
      </div>
      <div v-else-if="syncInfo" class="sync-banner">
        🗄 БД · player #{{ syncInfo.player_id }} · {{ syncInfo.quest_count }} задач ({{ syncInfo.manual_count || 0 }} вручную) · бот видит то же
      </div>

      <header v-if="tab !== 'journal'" class="app-top-bar">
        <button type="button" class="top-bar-btn" @click="switchTab('journal')">📅 Журнал</button>
      </header>

      <main class="main-content">
        <!-- HOME -->
        <section v-if="tab==='home'" class="screen screen-home">
          <div class="home-side-dock home-side-left">
            <button type="button" class="side-btn" title="Магазин" @click="switchTab('shop')">🛒</button>
          </div>
          <div class="home-side-dock home-side-right">
            <button type="button" class="side-btn" title="Лига" @click="switchTab('league')">🥇</button>
            <button type="button" class="side-btn" title="Клан" @click="switchTab('clan')">⚔️</button>
          </div>
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

          <div v-if="displayProfile.goals?.length" class="section-head" style="margin-top:16px">🎯 Ближайшие цели</div>
          <div v-for="g in (displayProfile.goals || []).slice(0, 3)" :key="g.id" class="goal-block" @click="switchTab('goals')">
            <div class="goal-block-head">
              <h4>{{ g.emoji || '🎯' }} {{ g.title }}</h4>
            </div>
            <p class="goal-text">{{ goalProgressLabel(g) }}</p>
            <div v-if="g.target_value" class="progress-mini goal-progress">
              <div class="progress-mini-fill" :style="{width: pct(g.current_value, g.target_value)+'%'}"></div>
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

          <div v-if="!questPack.quests.length && !habitQuests.length && !gameHabitQuests.length" class="empty-state">
            <p>⚔️ Задания на сегодня не созданы</p>
            <button type="button" class="btn btn-primary" @click="openImport(false)">Импортировать Quest Pack →</button>
          </div>

          <template v-else>
            <div v-if="questPack.main_mission" class="quest-mission">
              🔥 <strong>Главная миссия:</strong> {{ questPack.main_mission }}
            </div>
            <p class="quest-meta">{{ pendingCount }} активных · {{ questPack.date }}</p>

            <div v-if="habitQuests.length" class="habit-block">
              <div class="section-head progress-subhead">⚡ Мои привычки</div>
              <div v-for="q in habitQuests" :key="'h-'+q.id"
                   class="quest-item"
                   :class="{done: q.status==='done', failed: q.status==='failed'}"
                   @click="openQuest(q)">
                <div class="quest-check">{{ q.status==='done' ? '✓' : '' }}</div>
                <div class="quest-body">
                  <div class="quest-title">{{ q.title }}</div>
                  <div class="quest-xp">+{{ q.xp_reward }} XP · {{ statLabel(q.stat_key) }} · привычка</div>
                </div>
              </div>
            </div>

            <div v-if="gameHabitQuests.length" class="habit-block">
              <div class="section-head progress-subhead">🎲 Привычки от игры</div>
              <div v-for="q in gameHabitQuests" :key="'g-'+q.id"
                   class="quest-item"
                   :class="{done: q.status==='done', failed: q.status==='failed'}"
                   @click="openQuest(q)">
                <div class="quest-check">{{ q.status==='done' ? '✓' : '' }}</div>
                <div class="quest-body">
                  <div class="quest-title">{{ q.title }}</div>
                  <div class="quest-xp">+{{ q.xp_reward }} XP · {{ statLabel(q.stat_key) }} · <span class="habit-badge">ИГРА</span></div>
                </div>
              </div>
            </div>

            <div v-if="regularQuests.length">
              <div class="section-head progress-subhead">📋 Задачи</div>
            </div>
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

            <button v-if="regularQuests.length" type="button" class="btn btn-secondary quest-refresh" @click="openReplaceImport">↻ Заменить Quest Pack</button>
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

        <!-- HABITS -->
        <section v-else-if="tab==='habits'" class="screen">
          <div class="section-head">🌱 Привычки</div>
          <p class="rule-text">Свои ежедневные привычки + сюрпризы от игры каждый день.</p>

          <div class="habit-block">
            <div class="section-head-row">
              <div class="section-head progress-subhead">⚡ Мои привычки</div>
              <button type="button" class="edit-btn" @click="openHabitAdd">+ Добавить</button>
            </div>
            <div v-if="!playerHabits.length" class="empty-state">
              <p>Добавь привычки — из них создадутся ежедневные квесты.</p>
            </div>
            <div v-for="h in playerHabits" :key="h.id" class="habit-card" @click="openHabitEdit(h)">
              <span class="habit-emoji">⚡</span>
              <div class="habit-body">
                <div class="habit-title">{{ h.title }}</div>
                <div class="habit-meta">+{{ h.xp_reward }} XP · {{ statLabel(h.stat_key) }}</div>
              </div>
            </div>
          </div>

          <div class="habit-block">
            <div class="section-head progress-subhead">🎲 Привычки от игры</div>
            <p class="rule-text">Каждый день — что-то новое. Выполняй как обычный квест.</p>
            <div v-if="!gameHabits.length" class="empty-state"><p>Загрузка...</p></div>
            <div v-for="gh in gameHabits" :key="gh.id" class="habit-card game-habit">
              <span class="habit-emoji">{{ gh.emoji || '🎲' }}</span>
              <div class="habit-body">
                <div class="habit-title">{{ gh.title }}</div>
                <div class="habit-meta">+{{ gh.xp_reward }} XP · {{ statLabel(gh.stat_key) }}</div>
              </div>
              <span class="habit-badge">ИГРА</span>
            </div>
          </div>
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
          <div class="section-head-row">
            <div class="section-head">🛒 Магазин</div>
            <button v-if="isAdmin" type="button" class="edit-btn" @click="switchTab('admin')">⚙️ Админ</button>
          </div>

          <div class="invite-card card">
            <div class="invite-card-visual">⚔️</div>
            <h3 class="invite-card-title">{{ (referralInfo || displayProfile.referral)?.share_title || 'ALIHAN QUEST' }}</h3>
            <p class="invite-card-desc">Пригласи друга в Telegram — когда он пройдёт онбординг, ты получишь <strong>1 бесплатный курс</strong> в магазине.</p>
            <p v-if="referralInfo || displayProfile.referral" class="invite-stats">
              Приглашено: {{ (referralInfo || displayProfile.referral).invited_count }}
              · Бонусов: {{ (referralInfo || displayProfile.referral).free_course_credits }}
            </p>
            <button type="button" class="btn btn-primary" @click="shareReferralLink">📨 Пригласить друга</button>
          </div>

          <div class="section-head progress-subhead">📚 Курсы</div>
          <div v-for="c in shopCourses" :key="c.id" class="card course-card">
            <div class="course-head">
              <span class="course-emoji">{{ c.emoji }}</span>
              <div>
                <div class="course-title">{{ c.title }}</div>
                <div class="course-price">{{ c.owned ? '✓ Куплено' : c.price_rub + ' ₽' }}</div>
              </div>
            </div>
            <p class="modal-sub">{{ c.description }}</p>
            <div v-if="c.owned && c.file_url" class="course-link">
              <a :href="c.file_url" target="_blank" rel="noopener">Скачать материал →</a>
            </div>
            <div v-else-if="!c.owned" class="course-actions">
              <button
                v-if="(referralInfo || displayProfile.referral)?.free_course_credits > 0"
                type="button"
                class="btn btn-primary btn-sm"
                @click="purchaseCourseAction(c, true)"
              >🎁 Бесплатно (бонус)</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="purchaseCourseAction(c, false)">Купить</button>
            </div>
          </div>

          <div class="section-head progress-subhead" style="margin-top:20px">✨ Квест Про</div>
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

        <!-- ADMIN -->
        <section v-else-if="tab==='admin' && isAdmin" class="screen">
          <div class="section-head-row">
            <div class="section-head">⚙️ Админка</div>
            <button type="button" class="edit-btn" @click="switchTab('shop')">← Назад</button>
          </div>
          <div v-if="adminDashboard" class="admin-stats card">
            <div class="admin-stat"><span class="n">{{ adminDashboard.total_players }}</span><span class="l">игроков</span></div>
            <div class="admin-stat"><span class="n">{{ adminDashboard.active_today }}</span><span class="l">сегодня онлайн</span></div>
            <div class="admin-stat"><span class="n">{{ adminDashboard.onboarded }}</span><span class="l">онбординг ✓</span></div>
            <div class="admin-stat"><span class="n">{{ adminDashboard.new_today }}</span><span class="l">новых сегодня</span></div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" style="margin-bottom:12px" @click="loadAdmin">↻ Обновить</button>
          <div v-for="p in adminPlayers" :key="p.id" class="card admin-player-row">
            <div class="admin-player-head">
              <strong>{{ p.display_name }}</strong>
              <span v-if="!p.is_active" class="habit-badge">OFF</span>
            </div>
            <p class="modal-sub">#{{ p.id }} · TG {{ p.telegram_id || '—' }} · {{ p.total_xp }} XP · {{ p.last_seen_at ? p.last_seen_at.slice(0,10) : 'нет входа' }}</p>
            <div class="admin-player-actions">
              <button type="button" class="edit-btn edit-btn-sm" @click="openAdminPlayer(p)">✏️</button>
              <button type="button" class="edit-btn edit-btn-sm edit-btn-danger" @click="deleteAdminPlayerAction(p)">🗑</button>
            </div>
          </div>
        </section>

        <!-- STATS -->
        <section v-else-if="tab==='stats'" class="screen">
          <div class="section-head-row">
            <div class="section-head">📊 Характеристики</div>
            <button type="button" class="edit-btn" @click="openStatAdd">+ Добавить</button>
          </div>
          <div class="stat-grid stat-grid-full">
            <div v-for="key in statKeys" :key="key" class="stat-card stat-card-tap" @click="openStatCard(key)">
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
            <div class="section-head-row">
              <div class="section-head">📋 {{ selectedDate }}</div>
              <button type="button" class="edit-btn" @click="openAddQuestForJournal">+ Добавить</button>
            </div>
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

      <nav class="bottom-nav-cr">
        <button type="button" class="nav-cr-side" :class="{active: tab==='quests'}" @click="switchTab('quests')"><span class="ico">⚔️</span>Квесты</button>
        <button type="button" class="nav-cr-side" :class="{active: tab==='stats'}" @click="switchTab('stats')"><span class="ico">📊</span>Статы</button>
        <button type="button" class="nav-cr-center" :class="{active: tab==='home'}" @click="switchTab('home')"><span class="ico">🏠</span>Главная</button>
        <button type="button" class="nav-cr-side" :class="{active: tab==='habits'}" @click="switchTab('habits')"><span class="ico">🌱</span>Привычки</button>
        <button type="button" class="nav-cr-side" :class="{active: tab==='goals'}" @click="switchTab('goals')"><span class="ico">🎯</span>Цели</button>
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

      <!-- Add Quest -->
      <div v-if="showAddQuest" class="modal-overlay" @click.self="closeAddQuestModal">
        <div class="modal">
          <h3>➕ Новый квест</h3>
          <p v-if="questAddTargetDate" class="modal-sub">📅 День: <strong>{{ questAddTargetDate }}</strong></p>
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
            <button type="button" class="btn btn-secondary" @click="closeAddQuestModal">Отмена</button>
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

      <!-- Onboarding wizard (Duolingo-style) -->
      <div v-if="showOnboarding" class="wizard-screen">
        <div class="wizard-progress"><div class="wizard-progress-fill" :style="{width: wizardProgressPct+'%'}"></div></div>
        <button v-if="wizardScreen !== 'welcome_name'" type="button" class="wizard-back" @click="wizardBack">← Назад</button>

        <div class="wizard-body">
          <template v-if="wizardScreen === 'welcome_name'">
            <div class="wizard-title">Как тебя называть?</div>
            <div class="wizard-sub">Это имя героя в игре жизни.</div>
            <input v-model="onboardingName" class="wizard-input" maxlength="64" placeholder="Твоё имя" autofocus>
          </template>
          <template v-else-if="wizardScreen === 'welcome_intro'">
            <div class="wizard-title">🎮 Добро пожаловать!</div>
            <div class="wizard-sub">Построй свою игру: характеристики, привычки, квесты и прогресс каждый день.</div>
          </template>
          <template v-else-if="wizardScreen === 'stats_intro'">
            <div class="wizard-title">📊 Области роста</div>
            <div class="wizard-sub">Выбери, в чём хочешь расти. Уровень каждой области растёт от XP за квесты.</div>
          </template>
          <template v-else-if="wizardScreen === 'stats_list'">
            <div class="wizard-title">Твои характеристики</div>
            <div class="wizard-sub">Минимум одна. Можно добавить свою или из списка.</div>
            <div class="wizard-stat-list">
              <div v-for="(s, idx) in onboardingStats" :key="idx" class="wizard-stat-card">
                <span class="emoji">{{ s.emoji }}</span>
                <div class="info"><div class="name">{{ s.label }}</div><div class="hint">1000 XP = 1 ур.</div></div>
                <button type="button" class="edit-btn edit-btn-danger" @click="removeWizardStat(idx)">✕</button>
              </div>
            </div>
            <div class="wizard-presets">
              <button v-for="p in statPresets" :key="p.key" type="button" class="wizard-preset-btn" @click="startWizardAddStat(p)">+ {{ p.emoji }} {{ p.label }}</button>
            </div>
            <button type="button" class="btn btn-secondary" style="margin-top:12px" @click="startWizardAddStat()">+ Своя характеристика</button>
          </template>
          <template v-else-if="wizardScreen === 'stat_emoji'">
            <div class="wizard-title">Emoji для характеристики</div>
            <input v-model="wizardDraftStat.emoji" class="wizard-input" maxlength="4" placeholder="⭐">
          </template>
          <template v-else-if="wizardScreen === 'stat_label'">
            <div class="wizard-title">Как назвать область?</div>
            <input v-model="wizardDraftStat.label" class="wizard-input" placeholder="Например: Здоровье">
          </template>
          <template v-else-if="wizardScreen === 'stat_confirm'">
            <div class="wizard-title">Добавить характеристику?</div>
            <div class="wizard-stat-card">
              <span class="emoji">{{ wizardDraftStat.emoji }}</span>
              <div class="info"><div class="name">{{ wizardDraftStat.label || '...' }}</div><div class="hint">1000 XP = 1 ур.</div></div>
            </div>
          </template>
          <template v-else-if="wizardScreen === 'stats_done'">
            <div class="wizard-title">Отлично! {{ onboardingStats.length }} характеристик</div>
            <div class="wizard-sub">Теперь настроим ежедневные привычки.</div>
          </template>
          <template v-else-if="wizardScreen === 'habits_intro'">
            <div class="wizard-title">⚡ Ежедневные привычки</div>
            <div class="wizard-sub">Что будешь делать каждый день? Из них создадутся квесты. Можно пропустить.</div>
          </template>
          <template v-else-if="wizardScreen === 'habits_list'">
            <div class="wizard-title">Твои привычки</div>
            <div class="wizard-stat-list">
              <div v-for="(h, idx) in onboardingHabits" :key="idx" class="wizard-stat-card">
                <span class="emoji">⚡</span>
                <div class="info"><div class="name">{{ h.title }}</div><div class="hint">+{{ h.xp_reward }} XP</div></div>
              </div>
            </div>
            <button type="button" class="btn btn-secondary" style="margin-top:12px" @click="startWizardAddHabit">+ Добавить привычку</button>
          </template>
          <template v-else-if="wizardScreen === 'habit_title'">
            <div class="wizard-title">Что будешь делать?</div>
            <input v-model="wizardDraftHabit.title" class="wizard-input" placeholder="100 отжиманий">
          </template>
          <template v-else-if="wizardScreen === 'habit_stat'">
            <div class="wizard-title">К какой характеристике?</div>
            <select v-model="wizardDraftHabit.stat_key" class="wizard-input">
              <option v-for="s in onboardingStats" :key="s.key" :value="s.key">{{ s.emoji }} {{ s.label }}</option>
            </select>
          </template>
          <template v-else-if="wizardScreen === 'habit_xp'">
            <div class="wizard-title">Сколько XP за выполнение?</div>
            <input v-model.number="wizardDraftHabit.xp_reward" type="number" min="1" class="wizard-input">
          </template>
          <template v-else-if="wizardScreen === 'habit_confirm'">
            <div class="wizard-title">Добавить привычку?</div>
            <div class="wizard-stat-card">
              <span class="emoji">⚡</span>
              <div class="info"><div class="name">{{ wizardDraftHabit.title }}</div><div class="hint">+{{ wizardDraftHabit.xp_reward }} XP</div></div>
            </div>
          </template>
        </div>

        <div class="wizard-footer">
          <button type="button" class="btn btn-primary" @click="wizardPrimaryAction">
            {{ wizardScreen === 'habits_list' ? 'Начать игру 🚀' : 'Далее →' }}
          </button>
          <button v-if="wizardScreen === 'habits_intro' || wizardScreen === 'habits_list'" type="button" class="btn btn-secondary" @click="skipWizardHabits">Пропустить</button>
        </div>
      </div>

      <!-- Stat edit sheet -->
      <div v-if="showStatSheet" class="sheet-overlay" @click.self="showStatSheet=false">
        <div class="sheet-panel">
          <div class="sheet-title">{{ statSheetOriginalKey ? '✏️ Характеристика' : '➕ Новая характеристика' }}</div>
          <div class="field"><label>Emoji</label><input v-model="statSheetForm.emoji" maxlength="4"></div>
          <div class="field"><label>Название</label><input v-model="statSheetForm.label"></div>
          <div class="field"><label>XP за уровень</label><input v-model.number="statSheetForm.xp_per_level" type="number" min="100" step="100"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showStatSheet=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="statSheetOriginalKey ? saveStatSheet() : saveNewStatSheet()">Сохранить</button>
          </div>
          <button v-if="statSheetOriginalKey" type="button" class="btn-danger-text" @click="deleteStatSheet">Удалить характеристику</button>
        </div>
      </div>

      <!-- Habit edit sheet -->
      <div v-if="showHabitSheet" class="sheet-overlay" @click.self="showHabitSheet=false">
        <div class="sheet-panel">
          <div class="sheet-title">{{ editingHabitId ? '✏️ Привычка' : '➕ Новая привычка' }}</div>
          <div class="field"><label>Название</label><input v-model="habitForm.title" placeholder="100 отжиманий"></div>
          <div class="field"><label>Характеристика</label>
            <select v-model="habitForm.stat_key">
              <option v-for="k in statKeys" :key="k" :value="k">{{ statLabel(k) }}</option>
            </select>
          </div>
          <div class="field"><label>XP за выполнение</label><input v-model.number="habitForm.xp_reward" type="number" min="1"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showHabitSheet=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveHabitSheet">Сохранить</button>
          </div>
          <button v-if="editingHabitId" type="button" class="btn-danger-text" @click="deleteHabitAction">Удалить привычку</button>
        </div>
      </div>

      <!-- Admin player edit -->
      <div v-if="editingAdminPlayerId" class="sheet-overlay" @click.self="editingAdminPlayerId=null">
        <div class="sheet-panel">
          <div class="sheet-title">✏️ Игрок #{{ editingAdminPlayerId }}</div>
          <div class="field"><label>Имя</label><input v-model="adminEditForm.display_name"></div>
          <div class="field"><label>Бонусов на курсы</label><input v-model.number="adminEditForm.free_course_credits" type="number" min="0"></div>
          <label class="checkbox-row">
            <input v-model="adminEditForm.is_active" type="checkbox"> Активен
          </label>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="editingAdminPlayerId=null">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveAdminPlayer">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  `,
}).mount('#app');
