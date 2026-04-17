"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./trainer-shell.module.css";

type TelegramChallengeStartResponse = {
  ok?: boolean;
  authUrl?: string;
  expiresAt?: string;
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

type TelegramChallengeStatusResponse =
  | { status: "idle" | "pending" | "expired" | "consumed" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "error"; error: string; details?: string };

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export function TrainerHeader({ initialUser = null }: Props) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const [error, setError] = useState<string | null>(null);
  const [isStartingLogin, setIsStartingLogin] = useState(false);
  const [isAwaitingTelegram, setIsAwaitingTelegram] = useState(false);
  const [telegramAuthUrl, setTelegramAuthUrl] = useState<string | null>(null);

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

  const checkLoginStatus = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/auth/telegram/challenge/status", { credentials: "include" });
    const data = (await response.json()) as TelegramChallengeStatusResponse;

    if (!response.ok) {
      if ("status" in data && data.status === "error") {
        setError(data.details ? `${data.error}: ${data.details}` : data.error);
      } else {
        setError("Не удалось проверить статус Telegram-входа");
      }
      setIsAwaitingTelegram(false);
      return;
    }

    if (data.status === "authenticated") {
      setCurrentUser(data.user);
      setError(null);
      setIsAwaitingTelegram(false);
      setTelegramAuthUrl(null);
      return;
    }

    if (data.status === "pending") {
      setIsAwaitingTelegram(true);
      return;
    }

    if (data.status === "expired") {
      setError("Время подтверждения в Telegram истекло. Нажми «Войти» и попробуй снова.");
      setIsAwaitingTelegram(false);
      return;
    }

    setIsAwaitingTelegram(false);
  }, []);

  useEffect(() => {
    if (!botUsername || currentUser) {
      return;
    }

    void checkLoginStatus();
  }, [checkLoginStatus, currentUser]);

  useEffect(() => {
    if (!isAwaitingTelegram || currentUser) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkLoginStatus();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [checkLoginStatus, currentUser, isAwaitingTelegram]);

  useEffect(() => {
    if (!isAwaitingTelegram || currentUser) {
      return;
    }

    const recheck = () => {
      void checkLoginStatus();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recheck();
      }
    };

    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkLoginStatus, currentUser, isAwaitingTelegram]);

  const startTelegramLogin = async () => {
    if (!botUsername || isStartingLogin) {
      return;
    }

    setError(null);
    setTelegramAuthUrl(null);
    setIsStartingLogin(true);
    const popup = window.open("", "_blank", "noopener,noreferrer");

    try {
      const response = await fetch("/api/auth/telegram/challenge/start", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as TelegramChallengeStartResponse;

      if (!response.ok || !data.authUrl) {
        setError(data.details ? `${data.error}: ${data.details}` : data.error ?? "Не удалось начать Telegram-вход");
        if (popup) {
          popup.close();
        }
        return;
      }

      if (popup) {
        popup.location.href = data.authUrl;
      } else {
        setTelegramAuthUrl(data.authUrl);
        setError("Браузер заблокировал pop-up. Нажми «Открыть Telegram» и подтверди вход.");
      }
      setIsAwaitingTelegram(true);
    } catch {
      setError("Не удалось связаться с сервером для старта Telegram-входа");
      if (popup) {
        popup.close();
      }
    } finally {
      setIsStartingLogin(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setCurrentUser(null);
    setError(null);
    setIsAwaitingTelegram(false);
    setTelegramAuthUrl(null);
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
              <button type="button" className={styles.buttonPrimary} onClick={() => void startTelegramLogin()} disabled={isStartingLogin}>
                {isStartingLogin ? "Запуск..." : "Войти"}
              </button>
              {isAwaitingTelegram && <span className={styles.authWarn}>Подтверди вход в боте, затем вернись на сайт.</span>}
              {telegramAuthUrl && (
                <a href={telegramAuthUrl} target="_blank" rel="noopener noreferrer" className={styles.buttonGhost}>
                  Открыть Telegram
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
