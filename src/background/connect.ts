import { SITE_URL, CONNECT_PATH } from '../shared/config';
import { getToken, setToken, clearToken } from '../shared/storage';

/** Retorna o token atual, conectando via launchWebAuthFlow se necessário. */
export async function getOrConnectToken(): Promise<string | null> {
  const existing = await getToken();
  if (existing) return existing;
  return connect();
}

/** Conecta a conta via launchWebAuthFlow e guarda o token recebido. */
export async function connect(): Promise<string | null> {
  const redirectUri = chrome.identity.getRedirectURL();
  const url = `${SITE_URL}${CONNECT_PATH}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
    if (!responseUrl) return null;
    const token = new URL(responseUrl).searchParams.get('token');
    if (token) await setToken(token);
    return token;
  } catch (err) {
    console.error('[extension] Falha na conexão:', err);
    return null;
  }
}

export async function disconnect(): Promise<void> {
  await clearToken();
}