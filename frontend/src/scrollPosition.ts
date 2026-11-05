/** Keep the page stable while controls replace asynchronously loaded sections. */
let requests = 0;
let saved: { x: number; y: number; height: string; anchor: string } | null = null;
let frame = 0;
let userScrolled = false;

function capture() {
  if (saved) return;
  const root = document.getElementById('root');
  if (!root) return;
  saved = {
    x: window.scrollX,
    y: window.scrollY,
    height: root.style.minHeight,
    anchor: root.style.overflowAnchor,
  };
  userScrolled = false;
  root.style.minHeight = `${root.getBoundingClientRect().height}px`;
  root.style.overflowAnchor = 'none';
}
function settle() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      if (requests || !saved) return;
      const position = saved;
      saved = null;
      const root = document.getElementById('root');
      if (root) {
        root.style.minHeight = position.height;
        root.style.overflowAnchor = position.anchor;
      }
      if (!userScrolled)
        window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    });
  });
}
export function beginPageUpdate() {
  capture();
  requests++;
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    requests--;
    settle();
  };
}
export function installScrollPositionPreservation() {
  const control = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('a')) {
      // Explicit navigation takes priority over a pending control update.
      userScrolled = true;
      return;
    }
    if (!target.closest('button, select, input, textarea')) return;
    capture();
    settle();
  };
  document.addEventListener('click', control, true);
  document.addEventListener('change', control, true);
  document.addEventListener('input', control, true);
  const manualScroll = () => {
    userScrolled = true;
  };
  window.addEventListener('wheel', manualScroll, { passive: true });
  window.addEventListener('touchmove', manualScroll, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (
      ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].includes(event.key) &&
      !(
        event.target instanceof Element &&
        event.target.closest('input, select, textarea, [role="combobox"]')
      )
    )
      manualScroll();
  });
  // Dragging a scrollbar or starting another pointer gesture cancels restoration.
  document.addEventListener(
    'pointerdown',
    () => {
      if (saved) userScrolled = true;
    },
    true,
  );
}
