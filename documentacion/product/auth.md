# Auth

## Метод входа

- Telegram и Яндекс ID в v1.
- Supabase Auth не используется.

## Поток входа через Telegram

1. На клиенте в хедере рендерится Telegram Login Widget (`telegram.org/js/telegram-widget.js`).
2. Пользователь проходит стандартный Telegram OAuth в виджете.
3. Telegram возвращает подписанный payload (`id`, `first_name`, `username`, `auth_date`, `hash`) в клиентский callback.
4. Клиент отправляет payload в `POST /api/auth/telegram`.
5. Сервер проверяет `hash` и TTL payload, делает upsert пользователя, создает запись в `sessions` и ставит httpOnly cookie.

## Конфигурация Telegram

- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота без `@`.
- `TELEGRAM_BOT_TOKEN` — токен бота.

## Поток входа через Яндекс ID

1. Клиент в модалке вызывает `GET /api/auth/yandex/start` с `returnTo`.
2. Сервер генерирует OAuth `state`, кладет его в httpOnly cookie и редиректит пользователя в Яндекс OAuth.
3. Яндекс возвращает `code` и `state` в `GET /api/auth/yandex/callback`.
4. Сервер валидирует `state`, обменивает `code` на access token, запрашивает профиль пользователя в Яндекс.
5. Сервер делает upsert пользователя в `users` по `yandex_id`, создает запись в `sessions` и ставит `uisamurai_session`.

## Конфигурация Яндекс ID

- `YANDEX_CLIENT_ID` — OAuth Client ID из Яндекс ID.
- `YANDEX_CLIENT_SECRET` — OAuth Client Secret.
- `YANDEX_REDIRECT_URI` — callback URL, например `https://<host>/api/auth/yandex/callback`.

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
- В модалке входа доступны Telegram Login Widget и кнопка старта Яндекс OAuth.
- Дополнительный клиентский запрос `/api/auth/me` выполняется только как fallback, когда `initialUser` не передан.

## Админ

Пока один админ (Арман): флаг `users.is_admin = true` или allowlist по `telegram_id`.
