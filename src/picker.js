function pickerElement(documentRef, tag, className) {
  const element = documentRef.createElement(tag);
  element.className = className;
  documentRef.documentElement.appendChild(element);
  return element;
}

export function startPicker({onPick, onCancel, documentRef = document}) {
  let selected = null;
  let closed = false;
  const outline = pickerElement(documentRef, 'div', 'stai-picker-outline');
  const tooltip = pickerElement(documentRef, 'div', 'stai-picker-tooltip');

  Object.assign(outline.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '2147483647', border: '2px solid #6d5dfc',
    background: 'rgba(109, 93, 252, 0.10)', borderRadius: '6px', display: 'none', boxSizing: 'border-box'
  });
  Object.assign(tooltip.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '2147483647', display: 'none', padding: '6px 8px',
    borderRadius: '6px', background: '#17151f', color: '#fff', font: '600 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace'
  });

  function remove() {
    if (closed) return;
    closed = true;
    documentRef.removeEventListener('pointermove', move, true);
    documentRef.removeEventListener('click', choose, true);
    documentRef.removeEventListener('keydown', keydown, true);
    outline.remove();
    tooltip.remove();
  }

  function candidate(target) {
    if (!(target instanceof Element) || target === outline || target === tooltip || outline.contains(target) || tooltip.contains(target)) return null;
    if (target === documentRef.documentElement || target === documentRef.body) return null;
    return target;
  }

  function move(event) {
    const next = candidate(event.target);
    if (!next) return;
    selected = next;
    const rect = next.getBoundingClientRect();
    Object.assign(outline.style, {display: 'block', top: rect.top + 'px', left: rect.left + 'px', width: rect.width + 'px', height: rect.height + 'px'});
    tooltip.textContent = next.tagName.toLowerCase() + ' · ' + Math.round(rect.width) + ' × ' + Math.round(rect.height);
    Object.assign(tooltip.style, {display: 'block', top: Math.max(8, rect.top - 30) + 'px', left: Math.max(8, rect.left) + 'px'});
  }

  function choose(event) {
    const next = candidate(event.target) || selected;
    if (!next) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    remove();
    onPick(next);
  }

  function keydown(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    remove();
    if (onCancel) onCancel();
  }

  documentRef.addEventListener('pointermove', move, true);
  documentRef.addEventListener('click', choose, true);
  documentRef.addEventListener('keydown', keydown, true);

  return {stop: remove};
}
