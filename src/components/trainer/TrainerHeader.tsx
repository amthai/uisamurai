"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./trainer-shell.module.css";

type TelegramUserPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export type CurrentUser = {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  is_admin: boolean;
};

type Props = {
  initialUser?: CurrentUser | null;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUserPayload) => void;
  }
}

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export function TrainerHeader({ initialUser = null }: Props) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUser) {
      return;
    }

    const fetchCurrentUser = async () => {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await response.json()) as { user: CurrentUser | null };
      setCurrentUser(data.user);
    };
    void fetchCurrentUser();
  }, [initialUser]);

  useEffect(() => {
    if (!botUsername || currentUser) return;

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
      const container = document.getElementById("telegram-login-widget");
      if (container) {
        container.innerHTML = "";
      }
      delete window.onTelegramAuth;
    };
  }, [currentUser]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setCurrentUser(null);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/logo.svg"
            alt="UISamurai"
            width={340}
            height={40}
            priority
            className={styles.brandLogo}
          />
        </Link>
        <div className={styles.auth}>
          {error && <span className={styles.authError}>{error}</span>}
          {!botUsername && <span className={styles.authWarn}>Нет NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</span>}
          {currentUser ? (
            <>
              <span className={styles.userName}>
                {currentUser.first_name}
                {currentUser.is_admin ? (
                  <Link href="/admin" className={styles.adminLink}>
                    {" "}
                    · админ
                  </Link>
                ) : null}
              </span>
              <button type="button" className={styles.buttonGhost} onClick={() => void logout()}>
                Выйти
              </button>
            </>
          ) : (
            <div id="telegram-login-widget" className={styles.widget} />
          )}
        </div>
      </div>
    </header>
  );
}
