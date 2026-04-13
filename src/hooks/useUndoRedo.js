import { useCallback, useRef } from 'react';

export default function useUndoRedo(setState, maxHistory = 50) {
  const historyRef = useRef([]);
  const indexRef = useRef(-1);
  const skipRef = useRef(false);

  const pushState = useCallback((state) => {
    if (skipRef.current) { skipRef.current = false; return; }
    const history = historyRef.current;
    // Видалити все після поточного індексу (якщо було undo)
    history.splice(indexRef.current + 1);
    history.push(JSON.parse(JSON.stringify(state)));
    if (history.length > maxHistory) history.shift();
    indexRef.current = history.length - 1;
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    skipRef.current = true;
    setState(JSON.parse(JSON.stringify(historyRef.current[indexRef.current])));
  }, [setState]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    skipRef.current = true;
    setState(JSON.parse(JSON.stringify(historyRef.current[indexRef.current])));
  }, [setState]);

  const canUndo = useCallback(() => indexRef.current > 0, []);
  const canRedo = useCallback(() => indexRef.current < historyRef.current.length - 1, []);

  return { pushState, undo, redo, canUndo, canRedo };
}
