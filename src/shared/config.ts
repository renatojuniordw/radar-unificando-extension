/**
 * URL base do site Radar Unificando.
 * Em produção, aponte para https://radar.unificando.com.br via VITE_SITE_URL.
 */
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://radar.unificando.com.br';

export const API_BASE = `${SITE_URL}/api`;
export const CONNECT_PATH = '/extensao/conectar';

/** Cores do badge de score */
export const BADGE_COLORS = {
  GOOD: '#16a34a',
  WARNING: '#ca8a04',
  BAD: '#dc2626',
} as const;