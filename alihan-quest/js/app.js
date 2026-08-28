const { createApp, ref, computed, onMounted } = Vue;

const STAT_LABELS = {
  capital: '💰 Капитал', entrepreneur: '💼 Предприниматель', mastery: '🧠 Мастерство',
  mabibip: '🚀 МаБибип', media: '🎥 Медийность', form: '💪 Форма',
  network: '🤝 Связи', discipline: '⚡ Дисциплина',
};

createApp({
  setup() {
    const tab = ref('home');
    const profile = ref(null);
    const questPack = ref(null);
    const loading = ref(true);
    const toast = ref('');
    const showReflect = ref(false);
    const showImport = ref(false);
    const activeQuest = ref(null);
    const importJson = ref('');
    const reflection = ref({ what: '', good: '', better: '', mistake: '', next: '', summary: '' });

    const xpPercent = computed(() => {
      if (!profile.value) return 0;
      return Math.min(100, (profile.value.xp_in_level / profile.value.xp_needed) * 100);
    });

    const questsByStat = computed(() => {
      if (!questPack.value?.quests) return {};
      const groups = {};
      questPack.value.quests.forEach((q) => {
        const key = q.stat_key || 'discipline';
        if (!groups[key]) groups[key] = [];
        groups[key].push(q);
      });
      return groups;
    });

    const pendingCount = computed(() =>
      questPack.value?.quests?.filter((q) => q.status === 'pending').length || 0
    );

    function fmtMoney(n) {
      return new Intl.NumberFormat('ru-RU').format(n || 0) + ' ₽';
    }

    function pct(current, goal) {
      if (!goal) return 0;
      return Math.min(100, Math.round((current / goal) * 100));
    }

    async function refresh() {
      loading.value = true;
      profile.value = await QuestAPI.getProfile();
      questPack.value = await QuestAPI.getTodayQuests();
      loading.value = false;
    }

    function openQuest(q) {
      if (q.status !== 'pending') return;
      activeQuest.value = q;
      reflection.value = { what: '', good: '', better: '', mistake: '', next: '', summary: '' };
      showReflect.value = true;
    }

    async function submitQuest() {
      const result = await QuestAPI.completeQuest(activeQuest.value.id, reflection.value);
      showReflect.value = false;
      if (result.error) return;
      toast.value = `+${result.xp_gained} XP ⚡`;
      setTimeout(() => { toast.value = ''; }, 2500);
      await refresh();
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }

    async function doImport() {
      try {
        const payload = JSON.parse(importJson.value);
        questPack.value = await QuestAPI.importQuests(payload);
        showImport.value = false;
        importJson.value = '';
        toast.value = 'Квесты загружены ✓';
        setTimeout(() => { toast.value = ''; }, 2000);
      } catch {
        toast.value = 'Ошибка JSON';
        setTimeout(() => { toast.value = ''; }, 2000);
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

    onMounted(async () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0a0e18');
        tg.setBackgroundColor('#0a0e18');
      }
      await refresh();
    });

    return {
      tab, profile, questPack, loading, toast, showReflect, showImport, activeQuest,
      importJson, reflection, xpPercent, questsByStat, pendingCount, STAT_LABELS,
      fmtMoney, pct, openQuest, submitQuest, doImport, loadSampleImport,
    };
  },
  template: `
    <div class="app-bg"></div>
    <div v-if="toast" class="toast">{{ toast }}</div>

    <div v-if="loading" class="screen"><p style="text-align:center;color:var(--muted);padding:40px">Загрузка...</p></div>

    <!-- HOME -->
    <div v-else-if="tab==='home'" class="screen">
      <div class="hero-card">
        <div class="hero-name">{{ profile.display_name }}</div>
        <div class="hero-level">LEVEL {{ profile.level }}</div>
        <div class="hero-title">«{{ profile.title }}»</div>
        <div class="xp-bar-wrap">
          <div class="xp-label"><span>⭐ XP</span><span>{{ profile.xp_in_level.toLocaleString('ru') }} / {{ profile.xp_needed.toLocaleString('ru') }}</span></div>
          <div class="xp-bar"><div class="xp-fill" :style="{width: xpPercent+'%'}"></div></div>
        </div>
        <div class="streak">🔥 ACTION STREAK · {{ profile.action_streak }} дней</div>
      </div>

      <div v-if="profile.season" class="season-banner">
        🏆 SEASON {{ String(profile.season.number).padStart(2,'0') }} — <strong>{{ profile.season.title }}</strong><br>
        🐉 Босс: {{ profile.season.boss_name }}
      </div>

      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-icon">💰</div>
          <div class="kpi-label">Капитал</div>
          <div class="kpi-value">{{ fmtMoney(profile.kpi.capital_season) }}</div>
          <div class="kpi-sub">цель {{ fmtMoney(profile.kpi.capital_goal) }}</div>
          <div class="progress-mini"><div class="progress-mini-fill" :style="{width: pct(profile.kpi.capital_season, profile.kpi.capital_goal)+'%'}"></div></div>
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
          <div class="kpi-value">{{ profile.kpi.instagram_followers.toLocaleString('ru') }}</div>
          <div class="kpi-sub">/ {{ profile.kpi.instagram_goal.toLocaleString('ru') }}</div>
          <div class="progress-mini"><div class="progress-mini-fill" :style="{width: pct(profile.kpi.instagram_followers, profile.kpi.instagram_goal)+'%'}"></div></div>
        </div>
        <div class="kpi">
          <div class="kpi-icon">💼</div>
          <div class="kpi-label">Бизнес</div>
          <div class="kpi-value">{{ profile.kpi.business_projects }} проекта</div>
        </div>
      </div>
    </div>

    <!-- QUESTS -->
    <div v-else-if="tab==='quests'" class="screen">
      <div class="section-head">⚔️ Daily Quest</div>

      <div v-if="!questPack.quests?.length" class="empty-state">
        <p>⚔️ Задания на сегодня не созданы</p>
        <button class="btn btn-primary" @click="showImport=true">Импортировать Quest Pack →</button>
      </div>

      <template v-else>
        <div v-if="questPack.main_mission" class="quest-mission">
          🔥 <strong>Главная миссия:</strong> {{ questPack.main_mission }}
        </div>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:8px">{{ pendingCount }} активных · {{ questPack.date }}</p>

        <template v-for="(quests, statKey) in questsByStat" :key="statKey">
          <div class="quest-group-title">{{ STAT_LABELS[statKey] || statKey }}</div>
          <div v-for="q in quests" :key="q.id"
               class="quest-item" :class="{done: q.status==='done', failed: q.status==='failed'}"
               @click="openQuest(q)">
            <div class="quest-check">{{ q.status==='done' ? '✓' : '' }}</div>
            <div class="quest-body">
              <div class="quest-title">{{ q.title }}</div>
              <div class="quest-xp">+{{ q.xp_reward }} XP</div>
            </div>
          </div>
        </template>

        <button class="btn btn-secondary" style="margin-top:12px" @click="showImport=true">↻ Обновить Quest Pack</button>
      </template>
    </div>

    <!-- CHARACTER -->
    <div v-else-if="tab==='character'" class="screen">
      <div class="section-head">📊 8 характеристик</div>
      <div class="stat-grid">
        <div v-for="(xp, key) in profile.stats_xp" :key="key" class="stat-card">
          <div class="icon">{{ STAT_LABELS[key]?.split(' ')[0] || '⭐' }}</div>
          <div class="name">{{ STAT_LABELS[key]?.slice(2) || key }}</div>
          <div class="xp">{{ xp.toLocaleString('ru') }} XP</div>
        </div>
      </div>
      <p style="margin-top:16px;font-size:0.85rem;color:var(--muted);line-height:1.5">
        <strong style="color:var(--ink)">Правило:</strong> планирование не даёт XP. Действие даёт XP.
      </p>
    </div>

    <!-- GOALS -->
    <div v-else-if="tab==='goals'" class="screen">
      <div class="section-head">🎯 Цели</div>
      <div class="goal-block">
        <h4>🏠 Дом родителям</h4>
        <p style="color:var(--muted);font-size:0.9rem">Накоплено: {{ fmtMoney(profile.kpi.home_savings) }} · Цель: {{ fmtMoney(profile.kpi.home_goal) || '—' }}</p>
      </div>
      <div class="goal-block">
        <h4>🚘 Dream Car — Mercedes CLS / GLE 63</h4>
        <p style="color:var(--muted);font-size:0.9rem">Накоплено: {{ fmtMoney(profile.kpi.car_savings) }}</p>
      </div>
      <div class="goal-block">
        <h4>💪 Форма</h4>
        <p style="color:var(--muted);font-size:0.9rem">Вес: {{ profile.kpi.weight_kg }} кг → {{ profile.kpi.weight_goal_kg }} кг</p>
        <div class="progress-mini" style="margin-top:8px"><div class="progress-mini-fill" :style="{width: pct(profile.kpi.weight_kg, profile.kpi.weight_goal_kg)+'%'}"></div></div>
      </div>
    </div>

    <!-- Reflection modal -->
    <div v-if="showReflect" class="modal-overlay" @click.self="showReflect=false">
      <div class="modal">
        <h3>📝 Разбор задачи</h3>
        <p style="font-size:0.88rem;color:var(--muted);margin-bottom:12px">{{ activeQuest?.title }}</p>
        <div class="field"><label>Что произошло?</label><textarea v-model="reflection.what"></textarea></div>
        <div class="field"><label>Что получилось хорошо?</label><textarea v-model="reflection.good"></textarea></div>
        <div class="field"><label>Что можно было лучше?</label><textarea v-model="reflection.better"></textarea></div>
        <div class="field"><label>Где я ошибся?</label><textarea v-model="reflection.mistake"></textarea></div>
        <div class="field"><label>Что в следующий раз сделаю иначе?</label><textarea v-model="reflection.next"></textarea></div>
        <div class="field"><label>Итог</label><textarea v-model="reflection.summary"></textarea></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showReflect=false">Отмена</button>
          <button class="btn btn-primary" @click="submitQuest">☑ Выполнено +{{ activeQuest?.xp_reward }} XP</button>
        </div>
      </div>
    </div>

    <!-- Import modal -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport=false">
      <div class="modal">
        <h3>📥 Импорт Daily Quest Pack</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Вставь JSON от GPT или нажми «Пример»</p>
        <textarea class="import-area" v-model="importJson" placeholder='{"main_mission":"...","blocks":[...]}'></textarea>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-secondary btn-sm" @click="loadSampleImport">Пример</button>
          <button class="btn btn-primary" style="flex:1" @click="doImport">Загрузить</button>
        </div>
      </div>
    </div>

    <!-- Bottom nav -->
    <nav class="bottom-nav">
      <button class="nav-item" :class="{active: tab==='home'}" @click="tab='home'"><span class="ico">🏠</span>HOME</button>
      <button class="nav-item" :class="{active: tab==='quests'}" @click="tab='quests'"><span class="ico">⚔️</span>QUESTS</button>
      <button class="nav-item" :class="{active: tab==='character'}" @click="tab='character'"><span class="ico">📊</span>STATS</button>
      <button class="nav-item" :class="{active: tab==='goals'}" @click="tab='goals'"><span class="ico">🎯</span>GOALS</button>
    </nav>
  `,
}).mount('#app');
