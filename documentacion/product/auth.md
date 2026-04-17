# Auth

## Метод входа

- Только Telegram в v1.
- Supabase Auth не используется.

## Текущий поток входа

1. На клиенте в хедере рендерится Telegram Login Widget (`telegram.org/js/telegram-widget.js`).
2. Пользователь проходит стандартный Telegram OAuth в виджете.
3. Telegram возвращает подписанный payload (`id`, `first_name`, `username`, `auth_date`, `hash`) в клиентский callback.
4. Клиент отправляет payload в `POST /api/auth/telegram`.
5. Сервер проверяет `hash` и TTL payload, делает upsert пользователя, создает запись в `sessions` и ставит httpOnly cookie.

## Конфигурация Telegram

- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота без `@`.
- `TELEGRAM_BOT_TOKEN` — токен бота.

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
- Кнопка входа — это Telegram Login Widget, без polling и без webhook.
- Дополнительный клиентский запрос `/api/auth/me` выполняется только как fallback, когда `initialUser` не передан.

## Админ

Пока один админ (Арман): флаг `users.is_admin = true` или allowlist по `telegram_id`.
