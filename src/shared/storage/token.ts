const TOKEN_KEY = 'extensionToken';

export async function getToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(TOKEN_KEY);
  return data[TOKEN_KEY] ?? null;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY);
}