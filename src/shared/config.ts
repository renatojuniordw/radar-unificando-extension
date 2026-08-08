/**
 * URL base do site Radar Unificando.
 * Em produção, defina VITE_SITE_URL no ambiente (ex.: .env.local) apontando
 * para o domínio real; o default é o backend local de desenvolvimento.
 */
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:11010';

export const API_BASE = `${SITE_URL}/api`;
export const CONNECT_PATH = '/extensao/conectar';