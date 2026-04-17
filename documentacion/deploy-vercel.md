# Деплой на Vercel (разработка и тестирование)

На этапе разработки и тестирования проект деплоится на **Vercel**. Выбор продакшен-хостинга позже можно пересмотреть.

## Зачем так

- Нативная поддержка Next.js (App Router, serverless routes).
- Превью по веткам/PR, простые env-переменные.
- Достаточно для текущего стека: UI, API routes, Supabase снаружи.

## Подключение репозитория

1. [Vercel Dashboard](https://vercel.com) → Add New → Project → импорт из GitHub (`amthai/uisamurai` или актуальный репозиторий).
2. Framework Preset: **Next.js**, root: корень репозитория.
3. Build: `npm run build`, output по умолчанию.

## Переменные окружения на Vercel

В **Settings → Environment Variables** задать те же ключи, что и локально (см. `.env.example` и `setup-local.md`):

| Переменная | Заметка |
|------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Публичный URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Только для server-side; **не** префикс `NEXT_PUBLIC_` |
| `TELEGRAM_BOT_TOKEN` | Секрет бота |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет проверки входящих webhook от Telegram |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username бота без `@` |

Опционально для Prisma/CLI-скриптов на CI, если появятся:

- `DATABASE_URL` / `DIRECT_URL` — только если реально используются в билде или отдельных job’ах; для обычного Next-приложения часто достаточно ключей Supabase выше.

После изменения env — **Redeploy** превью или production.

## Telegram вход на прод-домене

Для deep-link входа и webhook обязательно:

- Домен в BotFather должен совпадать с хостом деплоя (например `xxx.vercel.app` или свой домен).
- После смены домена или первого деплоя обновить webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://<your-domain>/api/auth/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Проверка статуса webhook:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

## База данных

Supabase остаётся отдельным сервисом: в Vercel задаются только URL и ключи. Миграции по-прежнему через Supabase CLI / `supabase/migrations` (см. `setup-local.md`).

## Полезные ссылки

- [Deploying Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
