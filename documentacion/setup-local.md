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

## Запуск

```bash
npm run dev
```

## Проверка

```bash
npm run lint
npm run build
```
