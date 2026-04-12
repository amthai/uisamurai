# Stack

## Runtime

- Next.js (App Router)
- TypeScript

## Data

- Supabase Postgres
- Supabase Storage (изображения контента)
- Supabase Auth не используется в v1

## Auth

- Telegram Login
- Свои таблицы `users` и `sessions`

## Контент

- Контент в БД через админку (Tiptap JSON: `body`, `assignment`)
- Публичный рендер: `@tiptap/html/server` + `sanitize-html`
- Публичный UI: сайдбар слева, контент справа (`/trainer/[slug]`)

Подробнее по продуктовой логике: `product/overview.md`.

## Деплой (сейчас)

- Разработка и тестирование: **Vercel** — см. `deploy-vercel.md`. Продакшен-хостинг при необходимости выберем позже.
