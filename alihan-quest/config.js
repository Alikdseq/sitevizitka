// API backend URL. При перезапуске cloudflared URL меняется — обнови здесь или:
// localStorage.setItem('quest_api_base', 'https://новый-url.trycloudflare.com')
window.QUEST_CONFIG = {
  API_BASE: localStorage.getItem('quest_api_base') || '',
  DEMO_TOKEN: 'demo-alihan-quest',
};
