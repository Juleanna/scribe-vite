import { useEffect, useRef, useState, useCallback } from 'react';

export default function useDictation({ steps, editingStep, setSteps }) {
  const recognitionRef = useRef(null);
  const dictationTargetRef = useRef(null);
  const dictationTextRef = useRef('');
  const [isDictating, setIsDictating] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);

  // Init Web Speech API
  useEffect(() => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setDictationSupported(false); return; }
      setDictationSupported(true);
      const rec = new SR();
      rec.lang = (navigator.language || 'ru-RU');
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const piece = (res[0]?.transcript || '').trim();
            if (piece) {
              dictationTextRef.current = (dictationTextRef.current + ' ' + piece).trim();
            }
          }
        }
        if (dictationTargetRef.current) {
          const targetId = dictationTargetRef.current;
          const text = dictationTextRef.current;
          setSteps(prev => prev.map(s => s.id === targetId ? { ...s, description: text } : s));
        }
      };
      rec.onend = () => {
        setIsDictating(false);
        dictationTargetRef.current = null;
      };
      recognitionRef.current = rec;
    } catch (_) {}
  }, [setSteps]);

  const startDictation = useCallback(() => {
    if (!dictationSupported || !recognitionRef.current || isDictating) return;
    let targetId = editingStep;
    if (!targetId && steps.length > 0) targetId = steps[steps.length - 1].id;
    if (!targetId) return;
    dictationTargetRef.current = targetId;
    dictationTextRef.current = '';
    try { recognitionRef.current.start(); setIsDictating(true); } catch (_) {}
  }, [dictationSupported, isDictating, editingStep, steps]);

  const stopDictation = useCallback(() => {
    try { recognitionRef.current && recognitionRef.current.stop(); } catch (_) {}
    setIsDictating(false);
    dictationTargetRef.current = null;
    dictationTextRef.current = '';
  }, []);

  // Alt+R hotkey
  useEffect(() => {
    const onKeyDown = (e) => {
      try {
        const key = (e.key || '').toLowerCase();
        if (e.altKey && key === 'r') {
          e.preventDefault();
          if (isDictating) stopDictation(); else startDictation();
        }
      } catch (_) {}
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDictating, startDictation, stopDictation]);

  return { isDictating, dictationSupported, startDictation, stopDictation };
}
