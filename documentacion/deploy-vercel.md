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
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username бота без `@` |
| `YANDEX_CLIENT_ID` | OAuth Client ID Яндекс ID |
| `YANDEX_CLIENT_SECRET` | OAuth Client Secret Яндекс ID |
| `YANDEX_REDIRECT_URI` | Полный callback URL, например `https://<host>/api/auth/yandex/callback` |

Опционально для Prisma/CLI-скриптов на CI, если появятся:

- `DATABASE_URL` / `DIRECT_URL` — только если реально используются в билде или отдельных job’ах; для обычного Next-приложения часто достаточно ключей Supabase выше.

После изменения env — **Redeploy** превью или production.

## Telegram вход на прод-домене

Для Telegram Login Widget обязательно:

- Домен в BotFather должен совпадать с хостом деплоя (например `xxx.vercel.app` или свой домен).
- В BotFather у бота должен быть указан этот же хост в `Bot Settings / Domain` (без `https://`).

## Яндекс ID на прод-домене

- В кабинете Яндекс ID у OAuth-приложения должен быть добавлен callback URL из `YANDEX_REDIRECT_URI`.
- Протокол, домен и путь callback должны совпадать 1-в-1, иначе `code` обмен не пройдет.

## База данных

Supabase остаётся отдельным сервисом: в Vercel задаются только URL и ключи. Миграции по-прежнему через Supabase CLI / `supabase/migrations` (см. `setup-local.md`).

## Полезные ссылки

- [Deploying Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
