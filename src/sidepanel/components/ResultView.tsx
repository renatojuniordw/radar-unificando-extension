import { useState } from "react";
import type { AtsResult } from "../../shared/types";
import { SITE_URL, API_BASE } from "../../shared/config";
import { formatResultToText } from "../format";
import { copyText } from "../clipboard";
import Section from "./Section";

/** Registra clique em curso de afiliado (fire-and-forget, sem bloquear navegação). */
function trackCourseClick(c: { skill: string; plataforma: string; url: string }) {
  try {
    fetch(`${API_BASE}/track/course-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: c.url,
        skill: c.skill,
        platform: c.plataforma.toLowerCase(),
        origin: "extension",
        url: c.url,
      }),
    }).catch(() => undefined);
  } catch {
    // fire-and-forget: erro de analytics não deve bloquear a navegação
  }
}

function getQualityBadge(score: number) {
  if (score >= 80) return { label: "Excelente", cls: "excellent" };
  if (score >= 60) return { label: "Bom", cls: "good" };
  return { label: "Atenção", cls: "warning" };
}

function ResultView({ result }: { result: AtsResult }) {
  const { analysis, heuristics } = result;
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  async function copyTips() {
    const ok = await copyText(formatResultToText(result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  function sendFeedback(rating: boolean) {
    if (feedbackSent !== null) return;
    setFeedbackSent(rating);
    chrome.runtime.sendMessage({ type: "FEEDBACK", rating });
  }

  const quality = getQualityBadge(analysis.score);

  return (
    <div>
      {result.cached && <div className="cached">⚡ Resultado em cache</div>}

      <div className="score-card">
        <div className="score-header">
          <span className="score-badge-title">MATCH SCORE ATS</span>
          <span className={`score-quality ${quality.cls}`}>{quality.label}</span>
        </div>
        <div className="score-main">
          <span className="score-value">{analysis.score}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-track">
          <div
            className="score-fill"
            style={{ width: `${Math.max(0, Math.min(100, analysis.score))}%` }}
          />
        </div>
      </div>

      {analysis.summary && <p className="summary">{analysis.summary}</p>}

      {analysis.skillScores?.length > 0 && (
        <Section title="Score por Skill">
          {analysis.skillScores.map((s) => (
            <div key={s.skill} className="skill">
              <div className="skill-row">
                <span className="skill-name">{s.skill}</span>
                <span className={s.present ? "ok" : "bad"}>{s.score}/100</span>
              </div>
              <div className="score-track slim">
                <div
                  className="score-fill"
                  style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
                />
              </div>
              {s.suggestion && (
                <p className="skill-suggestion">{s.suggestion}</p>
              )}
            </div>
          ))}
        </Section>
      )}

      {analysis.strengths.length > 0 && (
        <Section title="Pontos Fortes Alinhados">
          <ul className="list">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="ok">
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.missingKeywords.length > 0 && (
        <Section title="Skills Faltando">
          <div className="chips">
            {analysis.missingKeywords.map((s, i) => (
              <span key={i} className="chip warn">
                ⚠ {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {result.courses?.length > 0 && (
        <Section title="Cursos Recomendados">
          <div className="course-list">
            {result.courses.map((c) => (
              <div key={c.url} className="course-card">
                <div className="course-top">
                  <span className={`course-badge ${c.plataforma.toLowerCase()}`}>
                    {c.plataforma}
                  </span>
                  <span className="course-price">{c.preco}</span>
                </div>
                <p className="course-title">{c.titulo}</p>
                <p className="course-skill">{c.skill}</p>
                <a
                  className="course-link"
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCourseClick(c)}
                >
                  Ver curso
                </a>
              </div>
            ))}
          </div>
          <a
            className="course-all"
            href={`${SITE_URL}/cursos`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver todos os cursos →
          </a>
          <p className="course-disclosure">
            Links de afiliado — você apoia o Radar sem pagar a mais.
          </p>
        </Section>
      )}

      {analysis.recommendations.length > 0 && (
        <Section title="Dicas de Ajuste">
          <ul className="list">
            {analysis.recommendations.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {heuristics.checks.length > 0 && (
        <Section title="Checklist do Currículo">
          <ul className="list">
            {heuristics.checks.map((c) => (
              <li key={c.id} className={c.ok ? "ok" : "bad"}>
                {c.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="actions">
        <button className="ghost" onClick={copyTips}>
          {copied ? "✓ Dicas copiadas!" : "Copiar dicas de ajuste"}
        </button>
        <div className="feedback">
          <span className="feedback-label">Útil?</span>
          <button
            className={feedbackSent === true ? "active" : ""}
            onClick={() => sendFeedback(true)}
            disabled={feedbackSent !== null}
          >
            Sim
          </button>
          <button
            className={feedbackSent === false ? "active" : ""}
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
