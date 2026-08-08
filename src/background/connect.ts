import { SITE_URL, CONNECT_PATH } from '../shared/config';
import { getToken, setToken, clearToken } from '../shared/storage';

/** Retorna o token atual, conectando via launchWebAuthFlow se necessário. */
export async function getOrConnectToken(): Promise<string | null> {
  const existing = await getToken();
  if (existing) return existing;
  return connect();
}

let connectPromise: Promise<string | null> | null = null;

/**
 * Conecta a conta via launchWebAuthFlow e guarda o token recebido.
 * Single-flight: chamadas concorrentes compartilham o mesmo fluxo de login,
 * evitando abrir várias janelas de autenticação de uma vez.
 */
export function connect(): Promise<string | null> {
  if (!connectPromise) {
    connectPromise = doConnect().finally(() => {
      connectPromise = null;
    });
  }
  return connectPromise;
}

async function doConnect(): Promise<string | null> {
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