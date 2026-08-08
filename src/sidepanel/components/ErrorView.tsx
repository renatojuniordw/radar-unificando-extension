import type { AnalyzeErrorCode } from '../../shared/types';

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
    </div>
  );
}

export default ErrorView;
