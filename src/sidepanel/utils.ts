import type { AnalyzeErrorCode } from '../shared/types';

export function truncateUrl(url: string, max = 60): string {
  return url.length > max ? `${url.slice(0, max)}…` : url;
}

export function errorMessage(code: AnalyzeErrorCode): string {
  switch (code) {
    case 'NOT_CONNECTED':
      return 'Sua conta não está conectada. Clique em "Conectar" no rodapé para continuar.';
    case 'NO_RESUME':
      return 'Nenhum currículo encontrado. Importe seu currículo no site primeiro.';
    case 'RATE_LIMITED':
      return 'Muitas análises em pouco tempo. Aguarde um instante e tente de novo.';
    case 'NO_TEXT':
      return 'Não encontramos texto de vaga nesta página.';
    default:
      return 'Não foi possível analisar a vaga. Tente novamente.';
  }
}
