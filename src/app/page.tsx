"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type TelegramUserPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type CurrentUser = {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  is_admin: boolean;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUserPayload) => void;
  }
}

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function Home() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await response.json()) as { user: CurrentUser | null };
      setCurrentUser(data.user);
    };
    void fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!botUsername) return;

    window.onTelegramAuth = async (user: TelegramUserPayload) => {
      setError(null);
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string; details?: string };
        setError(data.details ? `${data.error}: ${data.details}` : data.error ?? "Auth failed");
        return;
      }

      const meResponse = await fetch("/api/auth/me", { credentials: "include" });
      const meData = (await meResponse.json()) as { user: CurrentUser | null };
      setCurrentUser(meData.user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");

    const container = document.getElementById("telegram-login-widget");
    if (container) {
      container.innerHTML = "";
      container.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setCurrentUser(null);
  };

  return (
    <main className={styles.page}>
      <h1>UISamurai</h1>
      <p>Базовая проверка Telegram auth flow: verify payload, upsert users, session cookie.</p>

      {!botUsername && (
        <p className={styles.warning}>
          Заполни NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в .env.local, иначе виджет не отобразится.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {currentUser ? (
        <section className={styles.card}>
          <h2>Ты авторизован</h2>
          <p>
            {currentUser.first_name} {currentUser.last_name ?? ""}
          </p>
          <p>@{currentUser.username ?? "no_username"}</p>
          <p>admin: {currentUser.is_admin ? "yes" : "no"}</p>
          <button onClick={logout} className={styles.button} type="button">
            Выйти
          </button>
        </section>
      ) : (
        <section className={styles.card}>
          <h2>Вход через Telegram</h2>
          <div id="telegram-login-widget" />
        </section>
      )}
    </main>
  );
}
