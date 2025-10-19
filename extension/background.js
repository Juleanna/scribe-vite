let captureEnabled = false;

function broadcastEnabled() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'set-capture-enabled', enabled: captureEnabled },
          () => {
            // Consume potential errors to avoid "Unchecked runtime.lastError"
            // e.g., tabs without content scripts (chrome:// pages)
            void (chrome.runtime && chrome.runtime.lastError);
          }
        );
      } catch (_) {}
    }
  });
}

function toggleCapture() {
  captureEnabled = !captureEnabled;
  chrome.action.setBadgeText({ text: captureEnabled ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#6d28d9' });
  broadcastEnabled();
}

chrome.action.onClicked.addListener(() => toggleCapture());

// Keyboard shortcut (Chrome commands) — works from any Chrome window/tab
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'toggle-capture') {
    toggleCapture();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'page-click') {
    const meta = { x: msg.x, y: msg.y, dpr: msg.dpr, url: msg.url, title: msg.title, element: msg.element, elementRect: msg.elementRect, ts: Date.now() };
    const winId = sender?.tab?.windowId ?? undefined;
    chrome.tabs.captureVisibleTab(winId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'captureVisibleTab failed' });
        return;
      }
      // Найдём вкладку с приложением (localhost:5173 или 127.0.0.1:5173)
      chrome.tabs.query({ url: ["http://localhost:5173/*", "http://127.0.0.1:5173/*"] }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          sendResponse({ ok: false, error: 'Scribe tab not found' });
          return;
        }
        const targetTabId = tabs[0].id;
        try {
          chrome.tabs.sendMessage(targetTabId, { type: 'deliver-screenshot', dataUrl, meta }, () => {
            // consume possible errors silently
            void (chrome.runtime && chrome.runtime.lastError);
          });
        } catch (_) {}
        // Ответим отправителю сразу, не ожидая ответа от вкладки-приложения
        sendResponse({ ok: true });
      });
    });
    return true; // async response
  }
  if (msg?.type === 'toggle-capture') {
    toggleCapture();
    sendResponse({ ok: true, enabled: captureEnabled });
    return true;
  }
  if (msg?.type === 'get-capture-state') {
    sendResponse({ ok: true, enabled: captureEnabled });
    return true;
  }
});
