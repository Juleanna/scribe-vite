// Cross-browser API
const B = typeof browser !== 'undefined' ? browser : chrome;

let enabled = false;

async function safeSendMessage(payload) {
  try {
    if (!B || !B.runtime || !B.runtime.id || !B.runtime.sendMessage) {
      return null;
    }
    return await new Promise((resolve) => {
      try {
        B.runtime.sendMessage(payload, (resp) => {
          if (B.runtime && B.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(resp ?? null);
        });
      } catch (_) {
        resolve(null);
      }
    });
  } catch (_) {
    return null;
  }
}

// Messages from background: enable/disable mode
B.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'set-capture-enabled') {
    enabled = !!msg.enabled;
  }
  if (msg?.type === 'deliver-screenshot') {
    window.postMessage({ type: 'scribe_screenshot', dataUrl: msg.dataUrl, meta: msg.meta }, '*');
  }
});

// Capture element info on click
function getElementDescriptor(el) {
  try {
    if (!el || el.nodeType !== 1) return null;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || undefined;
    const id = el.id || undefined;
    const classes = (el.className && typeof el.className === 'string') ? el.className.split(/\s+/).slice(0, 5) : undefined;
    const ariaLabel = el.getAttribute('aria-label') || undefined;
    let text = (el.innerText || el.textContent || '').trim();
    if (text && text.length > 80) text = text.slice(0, 77) + '\u2026';
    const descriptor = { tag, role, id, classes, ariaLabel };
    if (text) descriptor.text = text;
    if (tag === 'input') {
      descriptor.type = el.type || 'text';
      descriptor.name = el.name || undefined;
      descriptor.placeholder = el.placeholder || undefined;
    }
    if (tag === 'img') descriptor.alt = el.alt || undefined;
    if (tag === 'a') descriptor.href = el.href || undefined;
    return descriptor;
  } catch (_) { return null; }
}

window.addEventListener('click', async (e) => {
  if (!enabled) return;
  const element = getElementDescriptor(e.target);
  let elementRect = undefined;
  try {
    const r = e.target?.getBoundingClientRect?.();
    if (r) {
      elementRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  } catch (_) {}
  await safeSendMessage({
    type: 'page-click',
    x: e.clientX,
    y: e.clientY,
    dpr: window.devicePixelRatio || 1,
    url: location.href,
    title: document.title,
    element,
    elementRect,
  });
}, true);

// Listen for messages from the Scribe app
window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'scribe_toggle_capture') {
    const resp = await safeSendMessage({ type: 'toggle-capture' });
    window.postMessage({ type: 'scribe_capture_state', enabled: !!(resp && resp.enabled) }, '*');
  }
  if (data.type === 'scribe_get_capture_state') {
    const resp = await safeSendMessage({ type: 'get-capture-state' });
    window.postMessage({ type: 'scribe_capture_state', enabled: !!(resp && resp.enabled) }, '*');
  }
});

// Request initial state on load
safeSendMessage({ type: 'get-capture-state' }).then((resp) => {
  enabled = !!(resp && resp.enabled);
  window.postMessage({ type: 'scribe_capture_state', enabled }, '*');
});
