"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./trainer-shell.module.css";

type TelegramAuthPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type TelegramAuthResponse = {
  ok?: boolean;
  user?: CurrentUser;
  error?: string;
  details?: string;
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

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

export function TrainerHeader({ initialUser = null }: Props) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

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

  const completeTelegramAuth = useCallback(async (payload: TelegramAuthPayload) => {
    setError(null);
    setIsAuthorizing(true);
    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as TelegramAuthResponse;
      if (!response.ok || !data.user) {
        setError(data.details ? `${data.error}: ${data.details}` : data.error ?? "Не удалось войти через Telegram");
        return;
      }

      setCurrentUser(data.user);
      setError(null);
    } catch {
      setError("Сетевая ошибка при входе через Telegram");
    } finally {
      setIsAuthorizing(false);
    }
  }, []);

  useEffect(() => {
    if (!botUsername || currentUser || !widgetContainerRef.current) {
      return;
    }

    window.onTelegramAuth = (user) => {
      void completeTelegramAuth(user);
    };

    const container = widgetContainerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", "ru");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.onerror = () => {
      setError("Не удалось загрузить Telegram Login Widget");
    };
    container.appendChild(script);

    return () => {
      if (window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
      container.innerHTML = "";
    };
  }, [completeTelegramAuth, currentUser]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setCurrentUser(null);
    setError(null);
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
            <div className={styles.userMenu}>
              <span className={styles.userName}>{currentUser.first_name}</span>
              <div className={styles.userDropdown}>
                <button type="button" className={styles.dropdownItem} onClick={() => void logout()}>
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.widget}>
              <div ref={widgetContainerRef} className={styles.telegramWidgetSlot} />
              {isAuthorizing && <span className={styles.authWarn}>Входим...</span>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
