import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  exchangeCodeForYandexAccessToken,
  fetchYandexUserProfile,
  getYandexOAuthConfig,
} from "@/lib/auth/yandex";
import { createSessionForUser, upsertYandexUser } from "@/lib/auth/yandex-session";

const YANDEX_OAUTH_STATE_COOKIE = "yandex_oauth_state";
const YANDEX_OAUTH_RETURN_TO_COOKIE = "yandex_oauth_return_to";

function getSafeReturnTo(encodedReturnTo: string | undefined): string {
  if (!encodedReturnTo) {
    return "/trainer";
  }

  let returnTo: string;
  try {
    returnTo = decodeURIComponent(encodedReturnTo);
  } catch {
    return "/trainer";
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/trainer";
  }

  return returnTo;
}

function redirectWithAuthError(request: Request, returnTo: string): NextResponse {
  const baseUrl = new URL(returnTo, request.url);
  baseUrl.searchParams.set("authError", "yandex");
  const response = NextResponse.redirect(baseUrl);

  response.cookies.set({
    name: YANDEX_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: YANDEX_OAUTH_RETURN_TO_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = cookies();
  const stateCookieValue = cookieStore.get(YANDEX_OAUTH_STATE_COOKIE)?.value ?? "";
  const returnToCookieValue = cookieStore.get(YANDEX_OAUTH_RETURN_TO_COOKIE)?.value;

  const returnTo = getSafeReturnTo(returnToCookieValue);

  if (!code || !state || !stateCookieValue || state !== stateCookieValue) {
    return redirectWithAuthError(request, returnTo);
  }

  let config;
  try {
    config = getYandexOAuthConfig();
  } catch {
    return redirectWithAuthError(request, returnTo);
  }

  try {
    const accessToken = await exchangeCodeForYandexAccessToken(code, config);
    const profile = await fetchYandexUserProfile(accessToken);
    const user = await upsertYandexUser(profile);
    const session = await createSessionForUser(user.id);
    const response = NextResponse.redirect(new URL(returnTo, request.url));

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });

    response.cookies.set({
      name: YANDEX_OAUTH_STATE_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: YANDEX_OAUTH_RETURN_TO_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    return redirectWithAuthError(request, returnTo);
  }
}

