/**
 * URL base do site Radar Unificando.
 * Em produção, aponte para https://radar.unificando.com.br via VITE_SITE_URL.
 */
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://radar.unificando.com.br';

export const API_BASE = `${SITE_URL}/api`;
export const CONNECT_PATH = '/extensao/conectar';