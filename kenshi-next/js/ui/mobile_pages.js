export function isPortraitPhone() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
}

export function pageBounds(count, page, size) {
  const pages = Math.max(1, Math.ceil(count / Math.max(1, size)));
  const index = Math.max(0, Math.min(pages - 1, Number(page) || 0));
  return { index, pages, start: index * size, end: Math.min(count, (index + 1) * size) };
}

export function mobilePager(count, page, size, change, label = 'ページ') {
  if (!isPortraitPhone() || count <= size) return null;
  const bounds = pageBounds(count, page, size);
  const nav = document.createElement('nav');
  nav.className = 'mobile-pager';
  nav.setAttribute('aria-label', label);
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '‹ 前';
  const next = document.createElement('button'); next.type = 'button'; next.textContent = '次 ›';
  previous.disabled = bounds.index === 0; next.disabled = bounds.index === bounds.pages - 1;
  previous.addEventListener('click', () => change(bounds.index - 1));
  next.addEventListener('click', () => change(bounds.index + 1));
  const status = document.createElement('span'); status.textContent = `${bounds.index + 1} / ${bounds.pages}`;
  nav.append(previous, status, next);
  return nav;
}
