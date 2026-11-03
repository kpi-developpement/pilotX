// Vide = same-origin (Nginx kaydouz /api l backend) → walou mochkil dyal certificat
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const PILOT_TOKEN_KEY = 'pilotToken';
export const PILOT_KEY = 'pilot';
export const PILOT_SINCE_KEY = 'pilotStatusSince';
export const ADMIN_TOKEN_KEY = 'adminToken';

export type PilotStatus = 'WORKING' | 'PAUSE_10MIN' | 'PAUSE_1H' | 'TOILET' | 'PRAYER' | 'FIN_SERVICE';

export interface PilotData {
  id: number;
  name: string;
  username: string;
  status: PilotStatus;
  lastUpdated: string;
  dailyPauseTime: number;
}

export interface PilotAuthResponse {
  token: string;
  pilot: PilotData;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Fetch m3a JSON + token (ila kayn)
export async function api<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.');
  }

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : typeof data === 'string' && data ? data : null) ||
      (res.status === 401 || res.status === 403 ? 'Session expirée. Reconnectez-vous.' : 'Une erreur est survenue.');
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const storage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, v: string) { try { localStorage.setItem(key, v); } catch { /* ignore */ } },
  del(...keys: string[]) { try { keys.forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } },
};

export function savePilotSession(res: PilotAuthResponse) {
  storage.set(PILOT_TOKEN_KEY, res.token);
  storage.set(PILOT_KEY, JSON.stringify(res.pilot));
}

export function clearPilotSession() {
  storage.del(PILOT_TOKEN_KEY, PILOT_KEY, PILOT_SINCE_KEY);
}