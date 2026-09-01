# Assets v7

Иконки из дизайн-пака: `icons/*.png` (прозрачный фон).

Регенерация из sprite-sheet:

```bash
python projects/alihan-quest/04-development/scripts/extract-ui-assets.py
```

| Папка / файл | Использование |
|--------------|----------------|
| `icons/nav-*.png` | Нижняя навигация |
| `icons/side-*.png` | Боковые кнопки главной |
| `icons/chest-*.png` | Слоты сундуков и модал награды |
| `icons/coin-*.png` | HUD: золото, гемы |
| `icons/arena-island.png` | Фон арены |
| `icons/hero-male.png` | Персонаж на главной |
| `icons/ico-*.png` | Меню профиля и утилиты |
| `icons/manifest.json` | Карта имён → путей |

Код: `js/icons.js`, стили: `css/v7-mockup.css` (`.game-icon`).
