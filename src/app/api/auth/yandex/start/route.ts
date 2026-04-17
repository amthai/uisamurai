import { NextResponse } from "next/server";
import { buildYandexAuthorizeUrl, generateOAuthState, getYandexOAuthConfig } from "@/lib/auth/yandex";

const YANDEX_OAUTH_STATE_COOKIE = "yandex_oauth_state";
const YANDEX_OAUTH_RETURN_TO_COOKIE = "yandex_oauth_return_to";

function sanitizeReturnTo(returnTo: string | null): string {
  if (!returnTo) {
    return "/trainer";
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/trainer";
  }

  return returnTo;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = sanitizeReturnTo(requestUrl.searchParams.get("returnTo"));

  let config;
  try {
    config = getYandexOAuthConfig();
  } catch {
    const redirectUrl = new URL(returnTo, request.url);
    redirectUrl.searchParams.set("authError", "yandex");
    return NextResponse.redirect(redirectUrl);
  }

  const state = generateOAuthState();
  const authorizeUrl = buildYandexAuthorizeUrl(state, config);
  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set({
    name: YANDEX_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  response.cookies.set({
    name: YANDEX_OAUTH_RETURN_TO_COOKIE,
    value: encodeURIComponent(returnTo),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}

