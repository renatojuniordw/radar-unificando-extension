import { useState } from 'react';
import type { AtsResult } from '../../types';
import { formatResultToText } from '../../format';
import { copyText } from '../../clipboard';
import Section from './Section';

function ResultView({ result }: { result: AtsResult }) {
  const { analysis, heuristics } = result;
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  async function copyTips() {
    const ok = await copyText(formatResultToText(result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function sendFeedback(rating: boolean) {
    if (feedbackSent !== null) return;
    setFeedbackSent(rating);
    chrome.runtime.sendMessage({ type: 'FEEDBACK', rating });
  }

  return (
    <div>
      {result.cached && <div className="cached">Resultado em cache</div>}

      <div className="score-card">
        <div className="score-main">
          <span className="score-value">{analysis.score}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-track">
          <div className="score-fill" style={{ width: `${Math.max(0, Math.min(100, analysis.score))}%` }} />
        </div>
      </div>

      {analysis.summary && <p className="summary">{analysis.summary}</p>}

      {analysis.skillScores?.length > 0 && (
        <Section title="Score por skill">
          {analysis.skillScores.map((s) => (
            <div key={s.skill} className="skill">
              <div className="skill-row">
                <span className="skill-name">{s.skill}</span>
                <span className={s.present ? 'ok' : 'bad'}>{s.score}/100</span>
              </div>
              <div className="score-track slim">
                <div className="score-fill" style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }} />
              </div>
              {s.suggestion && <p className="skill-suggestion">{s.suggestion}</p>}
            </div>
          ))}
        </Section>
      )}

      {analysis.strengths.length > 0 && (
        <Section title="Pontos fortes">
          <ul className="list">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {analysis.missingKeywords.length > 0 && (
        <Section title="Skills faltando">
          <div className="chips">
            {analysis.missingKeywords.map((s, i) => (
              <span key={i} className="chip warn">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {analysis.recommendations.length > 0 && (
        <Section title="Dicas">
          <ul className="list">{analysis.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {heuristics.checks.length > 0 && (
        <Section title="Checklist do currículo">
          <ul className="list">
            {heuristics.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : 'bad'}>
                <span className="check">{c.ok ? '✓' : '✗'}</span> {c.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="actions">
        <button className="ghost" onClick={copyTips}>
          {copied ? 'Copiado!' : 'Copiar dicas'}
        </button>
        <div className="feedback">
          <span className="muted">Útil?</span>
          <button
            className={feedbackSent === true ? 'active' : ''}
            onClick={() => sendFeedback(true)}
            disabled={feedbackSent !== null}
          >
            Sim
          </button>
          <button
            className={feedbackSent === false ? 'active' : ''}
            onClick={() => sendFeedback(false)}
            disabled={feedbackSent !== null}
          >
            Não
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultView;
