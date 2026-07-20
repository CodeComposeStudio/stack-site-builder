/**
 * Shared CLIENT-SIDE logic for the fixed right-rail TOC — imported by the
 * <script> blocks of both TocRail.astro (single-column pages: concepts,
 * articles) and StackDetail.astro (tab-aware rail). Everything here runs in
 * the browser, not at build time.
 */

/**
 * Start the scroll-spy: highlight the rail link whose section is nearest above
 * the viewport top. Headings that are hidden — inside an inactive tab panel or
 * a collapsed <details> (offsetParent === null) — are skipped. Returns the spy
 * so tab/version/example switches can re-run it after changing visibility.
 */
export function startScrollSpy(rail: HTMLElement): () => void {
  const spy = () => {
    const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    let activeId: string | null = null;
    for (const a of links) {
      const id = a.getAttribute('href')!.slice(1);
      const h = document.getElementById(id);
      if (h && h.offsetParent !== null && h.getBoundingClientRect().top <= 140) activeId = id;
    }
    links.forEach((a) =>
      a.setAttribute('aria-current', String(a.getAttribute('href')!.slice(1) === activeId)),
    );
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();
  return spy;
}

/** Wire the rail's back-to-top button. */
export function initBackToTop(rail: HTMLElement): void {
  rail
    .querySelector('[data-back-to-top]')
    ?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/**
 * Prose reveals (<details> in the body, e.g. "구체적인 예시"): open by default,
 * remembered per page in localStorage, with a "collapse / expand all" toggle in
 * the rail foot. Storage access is guarded throughout — a browser that blocks
 * storage just loses persistence, not the whole feature.
 */
export function initReveals(rail: HTMLElement): void {
  const reveals = Array.from(
    document.querySelectorAll<HTMLDetailsElement>('.prose details:not(.aas-tree-dir)'),
  );
  if (!reveals.length) return;
  const allBtn = rail.querySelector<HTMLButtonElement>('[data-toggle-all]');
  const key = (i: number) => `aas:reveal:${location.pathname}:${i}`;
  const syncAll = () => {
    if (!allBtn) return;
    const anyOpen = reveals.some((d) => d.open);
    allBtn.textContent = anyOpen ? allBtn.dataset.collapse! : allBtn.dataset.expand!;
  };
  reveals.forEach((d, i) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key(i));
    } catch {}
    if (saved === '0') d.open = false;
    else if (saved === '1') d.open = true;
    d.addEventListener('toggle', () => {
      try {
        localStorage.setItem(key(i), d.open ? '1' : '0');
      } catch {}
      syncAll();
    });
  });
  if (allBtn) {
    allBtn.hidden = false;
    allBtn.addEventListener('click', () => {
      const open = !reveals.some((d) => d.open);
      reveals.forEach((d) => (d.open = open));
    });
    syncAll();
  }
}
