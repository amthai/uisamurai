# Setup Local

## Требования

- Node.js 20+ (рекомендуется LTS)
- npm 10+

## Установка

```bash
npm install
```

## Переменные окружения

1. Скопировать `.env.example` в `.env.local`.
2. Заполнить:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`

### Telegram Login и домен

В настройках бота (BotFather → **Bot Settings / Domain**) укажи хост приложения без `https://`.

**Варианты:**

1. **Туннель с HTTPS** (удобно для dev): [ngrok](https://ngrok.com/), Cloudflare Tunnel (`cloudflared`), LocalTunnel и т.п. Поднимаешь `npm run dev`, запускаешь туннель на порт 3000, получаешь хост вида `xxxx.ngrok-free.app`. В BotFather в Domain указываешь **только этот хост** (без `https://`). Страницу открываешь по URL туннеля, не по `localhost`.

2. **Только Vercel**: деплой на `*.vercel.app`, в BotFather — тот же хост.

### Telegram webhook для deep-link входа

После деплоя нужно один раз зарегистрировать webhook у Telegram:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://<your-domain>/api/auth/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Проверка:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Подробнее: `product/auth.md`.

## Запуск

```bash
npm run dev
```

## Проверка

```bash
npm run lint
npm run build
```

## База данных

Перед тестом авторизации выполни SQL из `documentacion/supabase-schema.sql` в Supabase SQL Editor.
