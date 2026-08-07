export const styles = `
  :root {
    color-scheme: light;
    --accent: #00ff66;
    --accent-soft: #e6fff0;
    --accent-dark: #059669;
    --bg: #f6f7f9;
    --card: #ffffff;
    --border: #e5e7eb;
    --text: #1f2937;
    --muted: #6b7280;
    --ok: #16a34a;
    --bad: #dc2626;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--bg); }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px; line-height: 1.55; color: var(--text);
  }
  .sidepanel { display: flex; flex-direction: column; height: 100vh; }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; background: var(--card); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 1;
  }
  .brand { display: flex; align-items: center; gap: 8px; }
  .logo {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: 7px;
    background: var(--accent); color: #020617; font-weight: 900; font-size: 13px;
  }
  .title { font-weight: 700; font-size: 13px; color: var(--text); }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; }
  .status-dot.ok { background: var(--ok); }
  .status-dot.off { background: var(--bad); }
  .reanalyze {
    background: var(--card); color: var(--muted); border: 1px solid var(--border); cursor: pointer;
    padding: 5px 12px; border-radius: 8px; font-family: inherit; font-size: 11px; font-weight: 600;
  }
  .reanalyze:hover { color: var(--accent-dark); border-color: var(--accent-dark); }
  .page-url {
    padding: 6px 14px; font-size: 11px; color: var(--muted); background: var(--card);
    border-bottom: 1px solid var(--border);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .body { flex: 1; overflow-y: auto; padding: 14px; }
  .footer { border-top: 1px solid var(--border); background: var(--card); padding: 12px 14px; max-height: 38%; overflow-y: auto; }
  .muted { color: var(--muted); }
  .error { color: var(--bad); }
  .summary { color: var(--text); margin: 0 0 12px; }
  .cached {
    display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--muted); background: var(--card); border: 1px solid var(--border);
    border-radius: 6px; padding: 2px 8px; margin-bottom: 10px;
  }
  .loading { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
  .spinner {
    width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent-dark);
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .score-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  }
  .score-main { display: flex; align-items: baseline; gap: 4px; }
  .score-value { font-size: 40px; font-weight: 800; color: var(--accent-dark); line-height: 1; }
  .score-label { color: var(--muted); font-size: 13px; }
  .score-track { height: 8px; background: #eef0f3; border-radius: 6px; overflow: hidden; margin-top: 8px; }
  .score-track.slim { height: 6px; margin-top: 4px; }
  .score-fill { height: 100%; background: linear-gradient(90deg, #34d399, var(--accent)); border-radius: 6px; }
  .section { margin-top: 16px; }
  .section h4 {
    margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--muted); font-weight: 600;
  }
  .list { margin: 0; padding-left: 0; list-style: none; }
  .list li { margin-bottom: 6px; padding-left: 14px; position: relative; }
  .list li::before { content: '·'; position: absolute; left: 2px; color: var(--accent-dark); }
  .list li.ok { color: var(--ok); }
  .list li.bad { color: var(--bad); }
  .list .check { color: var(--ok); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 3px 10px; border-radius: 999px; font-size: 12px; background: #eef0f3; color: var(--text); }
  .chip.warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .skill { margin-bottom: 10px; }
  .skill-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
  .skill-name { color: var(--text); }
  .skill-suggestion { margin: 3px 0 0; color: var(--muted); font-size: 11px; }
  .ok { color: var(--ok); }
  .bad { color: var(--bad); }
  .actions { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; gap: 8px; }
  .feedback { display: flex; align-items: center; gap: 6px; }
  .feedback button {
    background: var(--card); color: var(--muted); border: 1px solid var(--border); cursor: pointer;
    padding: 5px 10px; font-family: inherit; font-size: 11px; border-radius: 8px;
  }
  .feedback button.active { background: var(--accent-soft); color: var(--accent-dark); border-color: var(--accent); font-weight: 700; }
  .feedback button:disabled { opacity: 0.5; cursor: default; }
  button.ghost {
    background: var(--card); color: var(--accent-dark); border: 1px solid var(--accent); cursor: pointer;
    padding: 6px 12px; font-family: inherit; font-size: 11px; font-weight: 600; border-radius: 8px;
  }
  button.ghost:hover { background: var(--accent-soft); }
  button.primary {
    margin-top: 8px; background: var(--accent); color: #020617; border: none; font-weight: 700;
    padding: 9px 14px; cursor: pointer; font-family: inherit; font-size: 12px; border-radius: 8px;
  }
  button.primary:hover { background: #33ff7a; }
  button.primary:disabled { opacity: 0.5; cursor: default; }
  .error-view { padding: 6px 0; }
  .history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .history-toggle {
    display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer;
    padding: 0; font-family: inherit;
  }
  .history-toggle h2 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  .history-toggle:hover h2 { color: var(--accent-dark); }
  .chevron { display: inline-block; font-size: 10px; color: var(--muted); transition: transform 0.15s ease; }
  .chevron.open { transform: rotate(90deg); }
  .history-count {
    background: #eef0f3; color: var(--muted); border-radius: 999px; font-size: 10px;
    padding: 1px 7px; font-weight: 600;
  }
  .footer-actions { display: flex; gap: 10px; }
  .history-container { height: 200px; overflow-y: auto; margin-top: 4px; }
  .history { margin: 0; padding: 0; list-style: none; }
  .history li { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
  .history .score { font-weight: 800; color: var(--accent-dark); min-width: 24px; }
  .history .title { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button.link { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 11px; text-decoration: underline; font-family: inherit; padding: 0; }
  button.link:hover { color: var(--accent-dark); }
`;
