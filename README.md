# Deploy on Vercel

1. Push this folder to GitHub (or connect the repo).
2. In [Vercel](https://vercel.com): **Add New Project** → import repo.
3. Set **Root Directory** to `resume/site`.
4. Framework Preset: **Other** (static HTML).
5. Deploy.

Local preview:

```bash
cd resume/site
python -m http.server 8080
```

Open http://localhost:8080

## Structure

```
resume/site/
  index.html          — визитка
  resume.html         — мобильное резюме
  presentation.html   — презентация (10 слайдов)
  css/style.css
  css/resume-mobile.css
  css/presentation.css
  js/main.js
  js/presentation.js
  assets/photo.png
  vercel.json
```

## Презентация

Откройте `presentation.html`:
- **← →** или **пробел** — листать слайды
- **Свайп** на телефоне
- **⛶ Полный экран** — для показа клиенту

## Contact links

| Button   | URL |
|----------|-----|
| Email    | mailto:alihanskaev@gmail.com |
| Phone    | tel:+79187020987 |
| Telegram | https://t.me/A_7l_i |
| WhatsApp | https://wa.me/79187020987 |
