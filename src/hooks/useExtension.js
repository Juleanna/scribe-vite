import { useEffect, useState, useCallback, useRef } from 'react';

export default function useExtension({
  addStep,
  annotationStyle,
  recordOnClickMode,
  isRecording,
  startRecording,
  stopRecording,
  overlayClickAnnotate,
  previousScreenshotRef,
  formatElementFromMeta,
}) {
  const [extCaptureEnabled, setExtCaptureEnabled] = useState(false);
  const [extInstalled, setExtInstalled] = useState(null);
  const [showExtBanner, setShowExtBanner] = useState(false);
  const clickRecordRef = useRef(false);

  // Extension screenshots via postMessage
  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.type !== 'scribe_screenshot' || typeof data.dataUrl !== 'string') return;
      const meta = data.meta || {};
      const elementText = formatElementFromMeta(meta.element);
      const descBase = elementText
        ? `Клік по ${elementText} на сторінці: ${meta.title || ''}${meta.url ? ` (${meta.url})` : ''}`.trim()
        : `Клік на сторінці: ${meta.title || ''}${meta.url ? ` (${meta.url})` : ''}`.trim();
      const description = descBase;
      overlayClickAnnotate(data.dataUrl, meta).then((annotated) => {
        previousScreenshotRef.current = annotated;
        addStep(annotated, 'image', false, description);
      }).catch(() => {
        previousScreenshotRef.current = data.dataUrl;
        addStep(data.dataUrl, 'image', false, description);
      });
    };
    const onState = (event) => {
      const data = event.data;
      if (!data || data.type !== 'scribe_capture_state') return;
      const enabled = !!data.enabled;
      setExtCaptureEnabled(enabled);
      if (enabled && recordOnClickMode && !isRecording) {
        startRecording().then(() => { clickRecordRef.current = true; }).catch(() => {});
      }
      if (!enabled && isRecording && clickRecordRef.current) {
        stopRecording();
        clickRecordRef.current = false;
      }
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('message', onState);
    // Detect extension
    try { window.postMessage({ type: 'scribe_get_capture_state' }, '*'); } catch(_) {}
    const detectTimeout = setTimeout(() => {
      setExtInstalled((prev) => prev === null ? false : prev);
    }, 800);
    const onDetect = (event) => {
      if (event.data?.type === 'scribe_capture_state') {
        setExtInstalled(true);
        clearTimeout(detectTimeout);
      }
    };
    window.addEventListener('message', onDetect);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('message', onState);
      window.removeEventListener('message', onDetect);
      clearTimeout(detectTimeout);
    };
  }, [annotationStyle, recordOnClickMode, isRecording, addStep, overlayClickAnnotate, previousScreenshotRef, formatElementFromMeta, startRecording, stopRecording]);

  // Alt+C hotkey
  useEffect(() => {
    const onKeyDown = (e) => {
      try {
        const key = (e.key || '').toLowerCase();
        if (e.altKey && key === 'c') {
          e.preventDefault();
          window.postMessage({ type: 'scribe_toggle_capture' }, '*');
        }
      } catch (_) {}
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleExtensionCapture = useCallback(() => {
    if (extInstalled === false) {
      setShowExtBanner(true);
      return;
    }
    try { window.postMessage({ type: 'scribe_toggle_capture' }, '*'); } catch(_) {}
  }, [extInstalled]);

  return { extCaptureEnabled, extInstalled, showExtBanner, setShowExtBanner, toggleExtensionCapture };
}
