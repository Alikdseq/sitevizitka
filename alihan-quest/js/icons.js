/** ALIHAN QUEST — extracted UI icons (transparent PNG). */
(function () {
  const BASE = 'assets/icons';

  const ICONS = {
    'nav-home': `${BASE}/nav-home.png`,
    'nav-quests': `${BASE}/nav-quests.png`,
    'nav-stats': `${BASE}/nav-stats.png`,
    'nav-clan': `${BASE}/nav-clan.png`,
    'nav-profile': `${BASE}/nav-profile.png`,
    'side-chests': `${BASE}/side-chests.png`,
    'side-goals': `${BASE}/side-goals.png`,
    'side-shop': `${BASE}/side-shop.png`,
    'side-events': `${BASE}/side-events.png`,
    'side-friends': `${BASE}/side-friends.png`,
    'ico-achievements': `${BASE}/ico-achievements.png`,
    'ico-mail': `${BASE}/ico-mail.png`,
    'ico-gift': `${BASE}/ico-gift.png`,
    'ico-tasks': `${BASE}/ico-tasks.png`,
    'ico-journal': `${BASE}/ico-journal.png`,
    'ico-settings': `${BASE}/ico-settings.png`,
    'ico-rating': `${BASE}/ico-rating.png`,
    'ico-streak': `${BASE}/ico-streak.png`,
    'ico-energy': `${BASE}/ico-energy.png`,
    'ico-calendar': `${BASE}/ico-calendar.png`,
    'ico-help': `${BASE}/ico-help.png`,
    'ico-exit': `${BASE}/ico-exit.png`,
    'chest-wood': `${BASE}/chest-wood.png`,
    'chest-silver': `${BASE}/chest-silver.png`,
    'chest-gold': `${BASE}/chest-gold.png`,
    'chest-magic': `${BASE}/chest-magic.png`,
    'chest-legendary': `${BASE}/chest-legendary.png`,
    'res-xp': `${BASE}/res-xp.png`,
    'res-energy': `${BASE}/res-energy.png`,
    'res-life': `${BASE}/res-life.png`,
    'res-shield': `${BASE}/res-shield.png`,
    'res-mana': `${BASE}/res-mana.png`,
    'res-stamina': `${BASE}/res-stamina.png`,
    'coin-gold': `${BASE}/coin-gold.png`,
    'coin-gem': `${BASE}/coin-gem.png`,
    'coin-token': `${BASE}/coin-token.png`,
    'coin-ruby': `${BASE}/coin-ruby.png`,
    'coin-ticket': `${BASE}/coin-ticket.png`,
    'arena-island': `${BASE}/arena-island.png`,
    'hero-male': `${BASE}/hero-male.png`,
    'hero-female': `${BASE}/hero-female.png`,
    'league-gold': `${BASE}/league-gold.png`,
    'league-diamond': `${BASE}/league-diamond.png`,
    'league-champion': `${BASE}/league-champion.png`,
  };

  const STAT_ICON_KEYS = {
    capital: 'coin-gold',
    entrepreneur: 'league-champion',
    mastery: 'res-xp',
    mabibip: 'res-shield',
    media: 'ico-energy',
    form: 'res-life',
    network: 'side-friends',
    discipline: 'res-stamina',
  };

  window.QuestIcons = {
    get(name) {
      return ICONS[name] || null;
    },
    statKey(statKey) {
      const key = STAT_ICON_KEYS[statKey] || 'res-xp';
      return ICONS[key] || null;
    },
    chestType(type) {
      const map = {
        gold: 'chest-gold',
        silver: 'chest-silver',
        wood: 'chest-wood',
        magic: 'chest-magic',
        legendary: 'chest-legendary',
        locked: 'chest-wood',
      };
      return ICONS[map[type] || 'chest-wood'] || null;
    },
  };
})();
