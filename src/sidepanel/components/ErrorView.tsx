import type { AnalyzeErrorCode } from '../../shared/types';
import { SITE_URL } from '../../shared/config';

function ErrorView({ code, message, onRetry }: { code: AnalyzeErrorCode; message: string; onRetry: () => void }) {
  const isNotConnected = code === 'NOT_CONNECTED';
  return (
    <div className="error-view">
      <p className="error">{message}</p>
      {isNotConnected && (
        <button className="primary" onClick={onRetry}>
          Conectar conta
        </button>
      )}
      {code === 'NO_RESUME' && (
        <a className="primary" href={SITE_URL} target="_blank" rel="noopener noreferrer">
          Importar currículo
        </a>
      )}
    </div>
  );
}

export default ErrorView;
