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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("authError") === "yandex") {
      setError("Не удалось войти через Яндекс");
      params.delete("authError");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

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
      setIsAuthModalOpen(false);
    } catch {
      setError("Сетевая ошибка при входе через Telegram");
    } finally {
      setIsAuthorizing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthModalOpen || !botUsername || currentUser || !widgetContainerRef.current) {
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
  }, [completeTelegramAuth, currentUser, isAuthModalOpen]);

  useEffect(() => {
    if (!isAuthModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAuthModalOpen]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setCurrentUser(null);
    setError(null);
  };

  const startYandexAuth = () => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/auth/yandex/start?returnTo=${encodeURIComponent(returnTo)}`;
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
            <button type="button" className={styles.buttonPrimary} onClick={() => setIsAuthModalOpen(true)}>
              Войти
            </button>
          )}
        </div>
      </div>
      {isAuthModalOpen && !currentUser && (
        <div className={styles.authModalOverlay} role="presentation" onClick={() => setIsAuthModalOpen(false)}>
          <div
            className={styles.authModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.authModalHead}>
              <h2 id="auth-modal-title" className={styles.authModalTitle}>
                Вход в UISamurai
              </h2>
              <button
                type="button"
                className={styles.authModalClose}
                onClick={() => setIsAuthModalOpen(false)}
                aria-label="Закрыть окно входа"
              >
                ×
              </button>
            </div>
            <div className={styles.authModalBody}>
              {error && <span className={styles.authError}>{error}</span>}
              {!botUsername && <span className={styles.authWarn}>Нет NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</span>}
              <div className={styles.authOption}>
                <p className={styles.authOptionTitle}>Telegram</p>
                <div className={styles.widget}>
                  <div ref={widgetContainerRef} className={styles.telegramWidgetSlot} />
                  {isAuthorizing && <span className={styles.authWarn}>Входим...</span>}
                </div>
              </div>
              <div className={styles.authOption}>
                <p className={styles.authOptionTitle}>Другие варианты</p>
                <div className={styles.authOptionsList}>
                  <button type="button" className={styles.buttonGhost} onClick={startYandexAuth}>
                    Яндекс ID
                  </button>
                  <button type="button" className={styles.buttonGhost} disabled>
                    Magic link (скоро)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
