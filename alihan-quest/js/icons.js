/** ALIHAN QUEST — icon assets (preload + safe URLs). */
(function () {
  const v = () => (window.QUEST_CONFIG && window.QUEST_CONFIG.CACHE_VERSION) || 1;
  const p = (rel) => `assets/icons/${rel}?v=${v()}`;

  const MAP = {
    'nav-home': p('01-navigation/nav-home.png'),
    'nav-quests': p('01-navigation/nav-quests.png'),
    'nav-stats': p('01-navigation/nav-stats.png'),
    'nav-clan': p('01-navigation/nav-clan.png'),
    'nav-profile': p('01-navigation/nav-profile.png'),

    'side-chests': p('02-side-buttons/side-chests.png'),
    'side-goals': p('02-side-buttons/side-goals.png'),
    'side-shop': p('02-side-buttons/side-shop.png'),
    'side-events': p('02-side-buttons/side-events.png'),
    'side-friends': p('02-side-buttons/side-friends.png'),

    'ico-achievements': p('03-extra-icons/ico-achievements.png'),
    'ico-mail': p('03-extra-icons/ico-mail.png'),
    'ico-gift': p('03-extra-icons/ico-gift.png'),
    'ico-tasks': p('03-extra-icons/ico-tasks.png'),
    'ico-journal': p('03-extra-icons/ico-journal.png'),
    'ico-settings': p('03-extra-icons/ico-settings.png'),
    'ico-rating': p('03-extra-icons/ico-rating.png'),
    'ico-streak': p('03-extra-icons/ico-streak.png'),
    'ico-calendar': p('03-extra-icons/ico-calendar.png'),
    'ico-help': p('03-extra-icons/ico-help.png'),
    'ico-exit': p('03-extra-icons/ico-exit.png'),

    'chest-strelok': p('04-chests/chest-strelok.png'),
    'chest-strazh': p('04-chests/chest-strazh.png'),
    'chest-ark': p('04-chests/chest-ark.png'),
    'chest-khaos': p('04-chests/chest-khaos.png'),
    'chest-inferno': p('04-chests/chest-inferno.png'),

    'res-xp': p('05-resources/res-xp.png'),
    'res-energy': p('05-resources/res-energy.png'),
    'res-life': p('05-resources/res-life.png'),
    'res-defense': p('05-resources/res-defense.png'),
    'res-mana': p('05-resources/res-mana.png'),
    'res-stamina': p('05-resources/res-stamina.png'),

    'league-bronze': p('06-leagues/league-bronze.png'),
    'league-silver': p('06-leagues/league-silver.png'),
    'league-gold': p('06-leagues/league-gold.png'),
    'league-platinum': p('06-leagues/league-platinum.png'),
    'league-diamond': p('06-leagues/league-diamond.png'),
    'league-master': p('06-leagues/league-master.png'),
    'league-champion': p('06-leagues/league-champion.png'),
    'league-legendary': p('06-leagues/league-legendary.png'),

    'arena-home': p('07-arena/arena-home.png'),
    'arena-goal': p('07-arena/arena-goal.png'),

    'boost-speed': p('08-boosters/boost-speed.png'),
    'boost-xp': p('08-boosters/boost-xp.png'),
    'boost-streak': p('08-boosters/boost-streak.png'),
    'boost-xp-shield': p('08-boosters/boost-xp-shield.png'),

    'coin-gold': p('09-currencies/coin-gold.png'),
    'coin-gem': p('09-currencies/coin-gem.png'),
    'coin-token': p('09-currencies/coin-token.png'),
    'coin-ruby': p('09-currencies/coin-ruby.png'),
    'coin-ticket': p('09-currencies/coin-ticket.png'),

    'reward-trophy': p('10-rewards/reward-trophy.png'),
    'reward-medal': p('10-rewards/reward-medal.png'),
    'reward-star': p('10-rewards/reward-star.png'),
    'reward-diamond-shield': p('10-rewards/reward-diamond-shield.png'),
    'reward-summit': p('10-rewards/reward-summit.png'),

    'char-male-portrait': p('11-characters/char-male-portrait.png'),
    'char-female-portrait': p('11-characters/char-female-portrait.png'),
    'char-male-full': p('11-characters/char-male-full.png'),
    'char-female-full': p('11-characters/char-female-full.png'),

    'btn-primary': p('12-ui-elements/btn-primary.png'),
    'btn-secondary': p('12-ui-elements/btn-secondary.png'),
    'btn-success': p('12-ui-elements/btn-success.png'),
    'btn-danger': p('12-ui-elements/btn-danger.png'),
    'ui-progress-bar': p('12-ui-elements/ui-progress-bar.png'),

    'misc-vip': p('13-misc/misc-vip.png'),
    'misc-day7': p('13-misc/misc-day7.png'),
    'misc-banner-league': p('13-misc/misc-banner-league.png'),
    'misc-banner-event': p('13-misc/misc-banner-event.png'),
    'misc-quest-scroll': p('13-misc/misc-quest-scroll.png'),
  };

  const STAT_TO_ICON = {
    capital: 'coin-gold',
    entrepreneur: 'reward-summit',
    mastery: 'res-mana',
    mabibip: 'res-energy',
    media: 'ico-gift',
    form: 'res-life',
    network: 'side-friends',
    discipline: 'res-stamina',
  };

  const CHEST_TYPE_TO_ICON = {
    wood: 'chest-strelok',
    silver: 'chest-strazh',
    gold: 'chest-ark',
    magic: 'chest-khaos',
    legendary: 'chest-inferno',
    locked: null,
  };

  const CRITICAL = [
    'nav-home', 'nav-quests', 'nav-stats', 'nav-clan', 'nav-profile',
    'side-chests', 'side-goals', 'side-shop', 'side-events', 'side-friends', 'league-gold',
    'coin-gold', 'coin-gem',
    'chest-strelok', 'chest-strazh', 'chest-ark', 'chest-inferno',
    'arena-home', 'char-male-full',
    'res-xp', 'res-stamina', 'res-life', 'res-defense', 'res-mana', 'res-energy',
    'ico-achievements', 'ico-journal', 'ico-settings', 'ico-exit',
  ];

  const loaded = new Set();
  let preloadPromise = null;

  function url(key) {
    return MAP[key] || '';
  }

  function preload(keys) {
    const list = keys || CRITICAL;
    const jobs = list.map((key) => {
      const src = url(key);
      if (!src || loaded.has(key)) return Promise.resolve();
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { loaded.add(key); resolve(); };
        img.onerror = () => resolve();
        img.src = src;
      });
    });
    return Promise.all(jobs);
  }

  function preloadCritical() {
    if (!preloadPromise) preloadPromise = preload(CRITICAL);
    return preloadPromise;
  }

  function statKey(stat) {
    return url(STAT_TO_ICON[stat] || 'res-xp');
  }

  function chestType(type) {
    const key = CHEST_TYPE_TO_ICON[type];
    return key ? url(key) : '';
  }

  window.QuestIcons = {
    MAP,
    url,
    get: url,
    statKey,
    chestType,
    preload,
    preloadCritical,
    isLoaded: (key) => loaded.has(key),
  };
})();
