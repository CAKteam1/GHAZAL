const STORAGE_URL_KEY = 'ghazal_api_base';
const STORAGE_TOKEN_KEY = 'ghazal_mobile_token';

export function getApiBase(): string {
  const saved = localStorage.getItem(STORAGE_URL_KEY);
  if (saved) return saved.replace(/\/+$/, '');
  const host = window.location.hostname || 'localhost';
  return `http://${host}:4747`;
}

export function setApiBase(url: string) {
  if (!url.trim()) localStorage.removeItem(STORAGE_URL_KEY);
  else localStorage.setItem(STORAGE_URL_KEY, url.trim().replace(/\/+$/, ''));
}

export function getPairingToken(): string {
  return localStorage.getItem(STORAGE_TOKEN_KEY) || '';
}

export function setPairingToken(token: string) {
  localStorage.setItem(STORAGE_TOKEN_KEY, token.trim());
}

export async function apiFetch<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = getPairingToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-ghazal-token': token } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${getApiBase()}${endpoint}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}
