# Auth

## Метод входа

- Только Telegram в v1.
- Supabase Auth не используется.

## Текущий поток входа

1. Пользователь нажимает кнопку «Войти».
2. Сервер создает challenge (одноразовый `nonce`, TTL 5 минут), сохраняет `nonce_hash` в `telegram_login_challenges`.
3. Фронт открывает deep-link в бота: `https://t.me/<bot>?start=login_<nonce>`.
4. Бот присылает update в `/api/auth/telegram/webhook`, сервер подтверждает challenge по `nonce_hash`.
5. Фронт поллит `/api/auth/telegram/challenge/status`.
6. После подтверждения сервер делает upsert пользователя, создает запись в `sessions` и ставит httpOnly cookie.

## Конфигурация Telegram

- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота без `@`.
- `TELEGRAM_BOT_TOKEN` — токен бота.
- `TELEGRAM_WEBHOOK_SECRET` — секрет проверки заголовка `X-Telegram-Bot-Api-Secret-Token`.

Webhook должен быть установлен на `https://<domain>/api/auth/telegram/webhook`.

## Что доступно без логина

- Чтение основного контента разделов.
- Навигация по разделам.

## Что доступно после логина

- Блок задания в конце раздела.
- Комментарии и ответы.
- Реакции на комментарии.

## Рендер в хедере

- Хедер инициализируется пользователем с сервера (`getSessionUser`) уже на первом SSR-рендере.
- Кнопка входа видна только если серверная сессия отсутствует.
- Дополнительный клиентский запрос `/api/auth/me` выполняется только как fallback, когда `initialUser` не передан.

## Админ

Пока один админ (Арман): флаг `users.is_admin = true` или allowlist по `telegram_id`.
