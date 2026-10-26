export const filename = name => (name.trim().replace(/[^a-z\d_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'motionlab');
export function downloadFile(source, name, type) {
  const url = URL.createObjectURL(new Blob([source], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function copyText(source) {
  try { await navigator.clipboard.writeText(source); return; } catch { /* Static HTTP/browser fallback. */ }
  const field = document.createElement('textarea'); field.value = source; field.style.position = 'fixed'; field.style.opacity = '0';
  document.body.append(field); field.select();
  const success = document.execCommand('copy'); field.remove();
  if (!success) throw new Error('Clipboard access is unavailable. Download the source instead.');
}
export function highlight(code, source, language) {
  code.replaceChildren();
  const visible = source.slice(0, 100000);
  const expression = language === 'css'
    ? /(\/\*[\s\S]*?\*\/|@[\w-]+|#[\da-f]{3,8}\b|"[^"\n]*"|\b\d+(?:\.\d+)?(?:px|s|%|deg)?\b)/gi
    : /("(?:[^"\\]|\\.)*"|<\/?[^>]+>|\b(?:true|false|null)\b|\b\d+(?:\.\d+)?\b)/g;
  let previous = 0;
  for (const match of visible.matchAll(expression)) {
    code.append(document.createTextNode(visible.slice(previous, match.index)));
    const token = document.createElement('span'); token.className = 'code-token'; token.textContent = match[0]; code.append(token);
    previous = match.index + match[0].length;
  }
  code.append(document.createTextNode(visible.slice(previous)));
  return visible.length < source.length;
}
