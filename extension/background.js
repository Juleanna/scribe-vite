// Cross-browser API: Firefox uses `browser`, Chrome uses `chrome`
const B = typeof browser !== 'undefined' ? browser : chrome;

let captureEnabled = false;

// Firefox MV2 uses browserAction, Chrome MV3 uses action
const action = B.action || B.browserAction;

function broadcastEnabled() {
  B.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      try {
        B.tabs.sendMessage(
          tab.id,
          { type: 'set-capture-enabled', enabled: captureEnabled },
          () => { void (B.runtime && B.runtime.lastError); }
        );
      } catch (_) {}
    }
  });
}

function toggleCapture() {
  captureEnabled = !captureEnabled;
  action.setBadgeText({ text: captureEnabled ? 'ON' : '' });
  action.setBadgeBackgroundColor({ color: '#6d28d9' });
  broadcastEnabled();
}

action.onClicked.addListener(() => toggleCapture());

// Keyboard shortcut
if (B.commands && B.commands.onCommand) {
  B.commands.onCommand.addListener((command) => {
    if (command === 'toggle-capture') {
      toggleCapture();
    }
  });
}

B.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'page-click') {
    const meta = {
      x: msg.x, y: msg.y, dpr: msg.dpr,
      url: msg.url, title: msg.title,
      element: msg.element, elementRect: msg.elementRect,
      ts: Date.now(),
    };
    const winId = sender?.tab?.windowId ?? undefined;

    // captureVisibleTab works in both Chrome and Firefox
    B.tabs.captureVisibleTab(winId, { format: 'png' }, (dataUrl) => {
      if ((B.runtime && B.runtime.lastError) || !dataUrl) {
        sendResponse({ ok: false, error: (B.runtime.lastError?.message) || 'captureVisibleTab failed' });
        return;
      }
      // Find the Scribe app tab
      B.tabs.query({ url: ['http://localhost:5173/*', 'http://127.0.0.1:5173/*', 'http://localhost:8080/*'] }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          sendResponse({ ok: false, error: 'Scribe tab not found' });
          return;
        }
        const targetTabId = tabs[0].id;
        try {
          B.tabs.sendMessage(targetTabId, { type: 'deliver-screenshot', dataUrl, meta }, () => {
            void (B.runtime && B.runtime.lastError);
          });
        } catch (_) {}
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
