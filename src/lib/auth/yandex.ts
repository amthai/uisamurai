import crypto from "crypto";

const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";
const YANDEX_USERINFO_URL = "https://login.yandex.ru/info";

export type YandexOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type YandexUserProfile = {
  id: string;
  login?: string;
  default_email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  default_avatar_id?: string;
  is_avatar_empty?: boolean;
};

type YandexTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export function getYandexOAuthConfig(): YandexOAuthConfig {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Yandex OAuth environment variables");
  }

  return { clientId, clientSecret, redirectUri };
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildYandexAuthorizeUrl(state: string, config: YandexOAuthConfig): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  });

  return `${YANDEX_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForYandexAccessToken(code: string, config: YandexOAuthConfig): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(YANDEX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json()) as YandexTokenResponse;
  if (!response.ok || !data.access_token) {
    const reason = data.error_description ?? data.error ?? "Unknown token exchange error";
    throw new Error(`Failed to exchange Yandex code: ${reason}`);
  }

  return data.access_token;
}

export async function fetchYandexUserProfile(accessToken: string): Promise<YandexUserProfile> {
  const params = new URLSearchParams({ format: "json" });
  const response = await fetch(`${YANDEX_USERINFO_URL}?${params.toString()}`, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = (await response.json()) as YandexUserProfile & { error?: string };
  if (!response.ok || !data.id) {
    const reason = data.error ?? "Unknown user info error";
    throw new Error(`Failed to fetch Yandex profile: ${reason}`);
  }

  return data;
}

export function buildYandexAvatarUrl(defaultAvatarId?: string): string | null {
  if (!defaultAvatarId) {
    return null;
  }

  return `https://avatars.yandex.net/get-yapic/${defaultAvatarId}/islands-200`;
}

