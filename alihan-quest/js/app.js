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
    const toast = ref('');

    const showReflect = ref(false);
    const showImport = ref(false);
    const importReplace = ref(false);
    const swipe = ref({ id: null, startX: 0, deltaX: 0 });
    const showKpiEdit = ref(false);
    const showAddQuest = ref(false);
    const showEditQuest = ref(false);
    const showGoalEdit = ref(false);
    const showGoalAdd = ref(false);
    const showQuestDetail = ref(false);

    const activeQuest = ref(null);
    const detailQuest = ref(null);
    const importJson = ref('');
    const reflection = ref(emptyReflection());

    const kpiForm = ref({});
    const questForm = ref({ title: '', stat_key: 'discipline', xp_reward: 30, due_time: '' });

    const displayProfile = computed(() => ensureProfile(profile.value));
    const goalForm = ref({ title: '', description: '', current_value: 0, target_value: 0 });
    const savingsForm = ref({ home_savings: 0, home_goal: 0, car_savings: 0, car_goal: 0 });

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

    const statKeys = computed(() => QuestAPI.STAT_KEYS || []);

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

    function switchTab(name) {
      tab.value = name;
    }

    async function refresh() {
      const [p, q] = await Promise.all([
        QuestAPI.getProfile(),
        QuestAPI.getTodayQuests(),
      ]);
      apiOnline.value = Boolean(p?.online && q?.online);
      if (p?.online && p.data) profile.value = ensureProfile(p.data);
      else profile.value = ensureProfile(QuestAPI.cachedProfile());
      if (q?.online && q.data) questPack.value = q.data;
      else questPack.value = QuestAPI.cachedQuests();
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

    async function removeQuest(q, event) {
      if (event) event.stopPropagation();
      if (!q?.id) return;
      try {
        const pack = await QuestAPI.deleteQuest(q.id);
        if (pack) questPack.value = pack;
        showToast('Квест удалён');
      } catch {
        showToast('Нет связи с сервером');
      }
    }

    function openQuest(q) {
      if (q.status !== 'pending') return;
      activeQuest.value = q;
      reflection.value = emptyReflection();
      showReflect.value = true;
    }

    async function submitQuest() {
      if (!activeQuest.value?.id) return;
      const result = await QuestAPI.completeQuest(activeQuest.value.id, reflection.value);
      showReflect.value = false;
      if (result?.error) {
        showToast('Квест уже обработан');
        return;
      }
      showToast(`+${result.xp_gained} XP ⚡`);
      await refresh();
      if (selectedDate.value) await loadJournalDay(selectedDate.value);
      if (tab.value === 'journal') await loadCalendar();
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

    function onQuestTouchStart(q, e) {
      if (q.status !== 'pending') return;
      swipe.value = { id: q.id, startX: e.touches[0].clientX, deltaX: 0 };
    }

    function onQuestTouchMove(q, e) {
      if (swipe.value.id !== q.id) return;
      const delta = e.touches[0].clientX - swipe.value.startX;
      if (delta > 0) swipe.value = { ...swipe.value, deltaX: delta };
    }

    async function onQuestTouchEnd(q) {
      if (swipe.value.id !== q.id) return;
      const { deltaX } = swipe.value;
      swipe.value = { id: null, startX: 0, deltaX: 0 };
      if (deltaX >= 80) await deferQuestToTomorrow(q);
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

    function openGoalEdit() {
      const kpi = (profile.value || QuestAPI.cachedProfile()).kpi || {};
      savingsForm.value = {
        home_savings: kpi.home_savings || 0,
        home_goal: kpi.home_goal || 0,
        car_savings: kpi.car_savings || 0,
        car_goal: kpi.car_goal || 0,
      };
      showGoalEdit.value = true;
    }

    function openGoalAdd() {
      goalForm.value = { title: '', description: '', current_value: 0, target_value: 0 };
      showGoalAdd.value = true;
    }

    async function saveSavings() {
      const result = await QuestAPI.updateProfile({ kpi: { ...savingsForm.value } });
      profile.value = ensureProfile(pickData(result, QuestAPI.cachedProfile));
      showGoalEdit.value = false;
      showToast('Накопления сохранены ✓');
    }

    async function saveNewGoal() {
      if (!goalForm.value.title?.trim()) {
        showToast('Введите название цели');
        return;
      }
      const result = await QuestAPI.updateProfile({
        goals: [{
          title: goalForm.value.title.trim(),
          description: goalForm.value.description || '',
          category: 'custom',
          current_value: Number(goalForm.value.current_value) || 0,
          target_value: Number(goalForm.value.target_value) || 0,
        }],
      });
      profile.value = ensureProfile(pickData(result, QuestAPI.cachedProfile));
      showGoalAdd.value = false;
      showToast('Цель добавлена ✓');
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
      showQuestDetail.value = true;
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
      if (name === 'journal') await loadCalendar();
      if (name === 'quests' || name === 'home') await refresh();
    });

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
      tab, profile, displayProfile, questPack, apiOnline, toast, swipe,
      showReflect, showImport, importReplace, showKpiEdit, showAddQuest, showEditQuest,
      showGoalEdit, showGoalAdd, showQuestDetail,
      activeQuest, detailQuest, importJson, reflection,
      kpiForm, questForm, goalForm, savingsForm,
      calendarYear, calendarMonth, calendarData, selectedDate, journalQuests,
      xpPercent, questsByStat, pendingCount, statKeys,
      calendarCells, calendarTitle, detailReadOnly,
      STAT_LABELS, KPI_FIELDS, REFLECTION_FIELDS,
      QuestAPI,
      fmtMoney, fmtNum, fmtDueTime, pct, showToast, switchTab, refresh,
      openKpiEdit, saveKpi,
      openAddQuest, openEditQuest, saveNewQuest, saveEditedQuest, removeQuest, deferQuestToTomorrow,
      onQuestTouchStart, onQuestTouchMove, onQuestTouchEnd, questSwipeStyle,
      openQuest, submitQuest, openImport, openReplaceImport, doImport, loadSampleImport,
      openGoalEdit, openGoalAdd, saveSavings, saveNewGoal,
      loadCalendar, calDayClass, selectCalendarDay, loadJournalDay,
      openQuestDetail, prevMonth, nextMonth,
    };
  },
  template: `
    <div class="app-shell">
      <div class="app-bg"></div>

      <div v-if="toast" class="toast">{{ toast }}</div>

      <div v-if="!apiOnline" class="offline-banner">
        📡 Нет связи с сервером — показан кэш. Задачи из бота не видны, пока backend недоступен. Проверь cloudflared + Django.
      </div>

      <main class="main-content">
        <!-- HOME -->
        <section v-if="tab==='home'" class="screen">
          <div class="hero-card">
            <div class="hero-name">{{ displayProfile.display_name }}</div>
            <div class="hero-level">LEVEL {{ displayProfile.level }}</div>
            <div class="hero-title">«{{ displayProfile.title }}»</div>
            <div class="hero-level-hint">Среднее уровней 8 характеристик</div>
            <div class="xp-bar-wrap">
              <div class="xp-label"><span>⭐ XP</span><span>{{ fmtNum(displayProfile.xp_in_level) }} / {{ fmtNum(displayProfile.xp_needed) }}</span></div>
              <div class="xp-bar"><div class="xp-fill" :style="{width: xpPercent+'%'}"></div></div>
            </div>
            <div class="streak">🔥 ACTION STREAK · {{ displayProfile.action_streak }} дней</div>
          </div>

          <div v-if="displayProfile.season" class="season-banner">
            🏆 SEASON {{ String(displayProfile.season.number).padStart(2,'0') }} — <strong>{{ displayProfile.season.title }}</strong><br>
            🐉 Босс: {{ displayProfile.season.boss_name }}
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
            <div class="section-head">⚔️ Daily Quest</div>
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
              <div class="quest-group-title">{{ STAT_LABELS[statKey] || statKey }}</div>
              <div v-for="q in quests" :key="q.id"
                   class="quest-item quest-swipe-wrap" :class="{done: q.status==='done', failed: q.status==='failed', swiping: swipe.id===q.id}"
                   :style="questSwipeStyle(q)"
                   @touchstart.passive="onQuestTouchStart(q, $event)"
                   @touchmove.passive="onQuestTouchMove(q, $event)"
                   @touchend="onQuestTouchEnd(q)"
                   @click="openQuest(q)">
                <div v-if="q.status==='pending'" class="quest-swipe-hint">→ завтра</div>
                <div class="quest-check">{{ q.status==='done' ? '✓' : '' }}</div>
                <div class="quest-body">
                  <div class="quest-title">{{ q.title }}</div>
                  <div class="quest-xp">+{{ q.xp_reward }} XP · {{ STAT_LABELS[q.stat_key] || q.stat_key }}<span v-if="q.due_time" class="quest-due"> · до {{ fmtDueTime(q.due_time) }}</span></div>
                </div>
                <div v-if="q.status==='pending'" class="quest-actions" @click.stop>
                  <button type="button" class="edit-btn edit-btn-sm" @click="openEditQuest(q)">✏️</button>
                  <button type="button" class="edit-btn edit-btn-sm edit-btn-danger" @click="removeQuest(q, $event)">🗑</button>
                </div>
              </div>
            </template>

            <button type="button" class="btn btn-secondary quest-refresh" @click="openReplaceImport">↻ Заменить Quest Pack</button>
          </template>
        </section>

        <!-- STATS -->
        <section v-else-if="tab==='stats'" class="screen">
          <div class="section-head">📊 8 характеристик</div>
          <div class="stat-grid">
            <div v-for="key in statKeys" :key="key" class="stat-card">
              <div class="stat-card-head">
                <div class="icon">{{ (STAT_LABELS[key] || '⭐').split(' ')[0] }}</div>
                <span class="stat-level">LEVEL {{ displayProfile.stats_levels?.[key] ?? 0 }}</span>
              </div>
              <div class="name">{{ (STAT_LABELS[key] || key).replace(/^\\S+\\s/, '') }}</div>
              <div class="xp">{{ fmtNum(displayProfile.stats_xp?.[key] ?? 0) }} XP</div>
              <div class="stat-rule">{{ QuestAPI.STAT_LEVEL_RULES[key] || '' }}</div>
            </div>
          </div>
          <p class="rule-text">
            <strong>Уровень героя</strong> = среднее уровней 8 характеристик (округление). Сейчас: {{ displayProfile.level }}.
          </p>
          <p class="rule-text">
            <strong>XP квестов</strong> — за выполнение задач. Планирование не даёт XP.
          </p>
        </section>

        <!-- GOALS -->
        <section v-else-if="tab==='goals'" class="screen">
          <div class="section-head-row">
            <div class="section-head">🎯 Цели</div>
            <button type="button" class="edit-btn" @click="openGoalAdd">+ Цель</button>
          </div>

          <div class="goal-block">
            <div class="goal-block-head">
              <h4>🏠 Дом родителям</h4>
              <button type="button" class="edit-btn edit-btn-sm" @click="openGoalEdit">✏️</button>
            </div>
            <p class="goal-text">Накоплено: {{ fmtMoney(profile.kpi.home_savings) }} · Цель: {{ profile.kpi.home_goal ? fmtMoney(profile.kpi.home_goal) : '—' }}</p>
            <div v-if="profile.kpi.home_goal" class="progress-mini goal-progress">
              <div class="progress-mini-fill" :style="{width: pct(profile.kpi.home_savings, profile.kpi.home_goal)+'%'}"></div>
            </div>
          </div>

          <div class="goal-block">
            <div class="goal-block-head">
              <h4>🚘 Dream Car — Mercedes CLS / GLE 63</h4>
              <button type="button" class="edit-btn edit-btn-sm" @click="openGoalEdit">✏️</button>
            </div>
            <p class="goal-text">Накоплено: {{ fmtMoney(profile.kpi.car_savings) }} · Цель: {{ profile.kpi.car_goal ? fmtMoney(profile.kpi.car_goal) : '—' }}</p>
            <div v-if="profile.kpi.car_goal" class="progress-mini goal-progress">
              <div class="progress-mini-fill" :style="{width: pct(profile.kpi.car_savings, profile.kpi.car_goal)+'%'}"></div>
            </div>
          </div>

          <div class="goal-block">
            <h4>💪 Форма</h4>
            <p class="goal-text">Вес: {{ profile.kpi.weight_kg }} кг → {{ profile.kpi.weight_goal_kg }} кг</p>
            <div class="progress-mini goal-progress">
              <div class="progress-mini-fill" :style="{width: pct(profile.kpi.weight_kg, profile.kpi.weight_goal_kg)+'%'}"></div>
            </div>
          </div>

          <div v-if="profile.goals?.length" class="section-head" style="margin-top:20px">📌 Свои цели</div>
          <div v-for="g in profile.goals" :key="g.id || g.title" class="goal-block">
            <h4>{{ g.title }}</h4>
            <p v-if="g.description" class="goal-text">{{ g.description }}</p>
            <p class="goal-text">
              Прогресс: {{ fmtNum(g.current_value) }}
              <span v-if="g.target_value"> / {{ fmtNum(g.target_value) }}</span>
            </p>
            <div v-if="g.target_value" class="progress-mini goal-progress">
              <div class="progress-mini-fill" :style="{width: pct(g.current_value, g.target_value)+'%'}"></div>
            </div>
          </div>
        </section>

        <!-- JOURNAL -->
        <section v-else-if="tab==='journal'" class="screen">
          <div class="section-head">📅 Журнал</div>

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
                 class="quest-item" :class="{done: q.status==='done', failed: q.status==='failed'}"
                 @click="openQuestDetail(q)">
              <div class="quest-check">{{ q.status==='done' ? '✓' : q.status==='failed' ? '✗' : '' }}</div>
              <div class="quest-body">
                <div class="quest-title">{{ q.title }}</div>
                <div class="quest-xp">+{{ q.xp_reward }} XP · {{ STAT_LABELS[q.stat_key] || q.stat_key }}</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <nav class="bottom-nav">
        <button type="button" class="nav-item" :class="{active: tab==='home'}" @click="switchTab('home')"><span class="ico">🏠</span>HOME</button>
        <button type="button" class="nav-item" :class="{active: tab==='quests'}" @click="switchTab('quests')"><span class="ico">⚔️</span>QUESTS</button>
        <button type="button" class="nav-item" :class="{active: tab==='stats'}" @click="switchTab('stats')"><span class="ico">📊</span>STATS</button>
        <button type="button" class="nav-item" :class="{active: tab==='goals'}" @click="switchTab('goals')"><span class="ico">🎯</span>GOALS</button>
        <button type="button" class="nav-item" :class="{active: tab==='journal'}" @click="switchTab('journal')"><span class="ico">📅</span>JOURNAL</button>
      </nav>

      <!-- Reflection / Complete -->
      <div v-if="showReflect" class="modal-overlay" @click.self="showReflect=false">
        <div class="modal">
          <h3>📝 Разбор задачи</h3>
          <p class="modal-sub">{{ activeQuest?.title }}</p>
          <div v-for="f in REFLECTION_FIELDS" :key="f.key" class="field">
            <label>{{ f.label }}</label>
            <textarea v-model="reflection[f.key]"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showReflect=false">Отмена</button>
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
              <option v-for="k in statKeys" :key="k" :value="k">{{ STAT_LABELS[k] || k }}</option>
            </select>
          </div>
          <div class="field">
            <label>XP награда</label>
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
              <option v-for="k in statKeys" :key="k" :value="k">{{ STAT_LABELS[k] || k }}</option>
            </select>
          </div>
          <div class="field">
            <label>XP награда</label>
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

      <!-- Savings Edit -->
      <div v-if="showGoalEdit" class="modal-overlay" @click.self="showGoalEdit=false">
        <div class="modal">
          <h3>🏠 Накопления</h3>
          <div class="form-grid">
            <div class="field">
              <label>Дом — накоплено (₽)</label>
              <input v-model.number="savingsForm.home_savings" type="number">
            </div>
            <div class="field">
              <label>Дом — цель (₽)</label>
              <input v-model.number="savingsForm.home_goal" type="number">
            </div>
            <div class="field">
              <label>Машина — накоплено (₽)</label>
              <input v-model.number="savingsForm.car_savings" type="number">
            </div>
            <div class="field">
              <label>Машина — цель (₽)</label>
              <input v-model.number="savingsForm.car_goal" type="number">
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showGoalEdit=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveSavings">Сохранить</button>
          </div>
        </div>
      </div>

      <!-- Add Goal -->
      <div v-if="showGoalAdd" class="modal-overlay" @click.self="showGoalAdd=false">
        <div class="modal">
          <h3>➕ Новая цель</h3>
          <div class="field">
            <label>Название</label>
            <input v-model="goalForm.title" type="text" placeholder="Моя цель">
          </div>
          <div class="field">
            <label>Описание</label>
            <textarea v-model="goalForm.description" placeholder="Детали..."></textarea>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Текущее значение</label>
              <input v-model.number="goalForm.current_value" type="number">
            </div>
            <div class="field">
              <label>Целевое значение</label>
              <input v-model.number="goalForm.target_value" type="number">
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showGoalAdd=false">Отмена</button>
            <button type="button" class="btn btn-primary" @click="saveNewGoal">Добавить</button>
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
            <button v-if="detailQuest?.status==='pending' && detailQuest?.date===questPack.date"
                    type="button" class="btn btn-primary"
                    @click="showQuestDetail=false; openQuest(detailQuest)">
              Выполнить
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
}).mount('#app');
