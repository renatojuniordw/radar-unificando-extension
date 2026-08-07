/**
 * Detecta mudanças de URL em SPAs (que não recarregam a página). Patcheia
 * history.pushState/replaceState + popstate e faz polling como fallback.
 * Retorna uma função de cleanup.
 */
export function onUrlChange(cb: () => void): () => void {
  let lastUrl = location.href;

  const check = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      cb();
    }
  };

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    const result = originalPush.apply(this, args);
    check();
    return result;
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    const result = originalReplace.apply(this, args);
    check();
    return result;
  };

  window.addEventListener('popstate', check);
  const pollId = window.setInterval(check, 1500);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener('popstate', check);
    window.clearInterval(pollId);
  };
}