import { useEffect, useRef, useState, useCallback } from 'react';
import ActionTracker from '../actionTracker';
import { api } from '../api';

function formatElementFromMeta(el) {
  if (!el || !el.tag) return null;
  const tag = String(el.tag).toLowerCase();
  const text = el.text || el.ariaLabel || el.name || el.placeholder || el.alt || '';
  const label = text ? `"${text}"` : '';
  if (tag === 'button' || el.role === 'button') return `кнопці ${label}`.trim();
  if (tag === 'a') return `посиланні ${label}`.trim();
  if (tag === 'input') {
    const type = (el.type || 'text').toLowerCase();
    if (type === 'checkbox') return `прапорцю ${label}`.trim();
    if (type === 'radio') return `перемикачу ${label}`.trim();
    if (type === 'submit' || type === 'button') return `кнопці ${label}`.trim();
    return `полю ${label}`.trim();
  }
  if (tag === 'select') return `списку ${label}`.trim();
  if (tag === 'textarea') return `текстовому полю ${label}`.trim();
  if (tag === 'img') return `зображенню ${label}`.trim();
  return `елементу <${tag}> ${label}`.trim();
}

function drawArrow(ctx, fromX, fromY, toX, toY, headLen) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

export default function useMediaCapture({ autoDescribe, useLocalRecognition, annotationStyle, addStep, isAuthenticated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState('manual');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const previousScreenshotRef = useRef(null);
  const actionTrackerRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const fileInputRef = useRef(null);

  // ActionTracker init
  useEffect(() => {
    actionTrackerRef.current = new ActionTracker();
    return () => {
      if (actionTrackerRef.current) actionTrackerRef.current.stopTracking();
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  const getLocalDescription = useCallback(() => {
    if (!actionTrackerRef.current) return null;
    const lastAction = actionTrackerRef.current.getLastAction();
    if (!lastAction) return null;
    return lastAction.description;
  }, []);

  const generateDescription = useCallback(async (imageData, previousImage = null) => {
    if (!autoDescribe || useLocalRecognition) return null;
    try {
      const res = await api.describeImage(imageData, previousImage);
      if (res.ok) {
        const data = await res.json();
        return data.description;
      }
      return null;
    } catch (e) {
      console.error('Помилка генерації опису:', e);
      return null;
    }
  }, [autoDescribe, useLocalRecognition]);

  const overlayClickAnnotate = useCallback(async (dataUrl, meta) => {
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dpr = meta?.dpr || window.devicePixelRatio || 1;
    const x = Math.round((meta?.x ?? 0) * dpr);
    const y = Math.round((meta?.y ?? 0) * dpr);
    ctx.save();
    if (meta?.elementRect && annotationStyle !== 'arrow') {
      const r = meta.elementRect;
      const left = Math.max(0, Math.round(r.left * dpr));
      const top = Math.max(0, Math.round(r.top * dpr));
      const width = Math.round(r.width * dpr);
      const height = Math.round(r.height * dpr);
      const pad = Math.round(4 * dpr);
      ctx.lineWidth = Math.max(3 * dpr, 2);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.95)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.beginPath();
      ctx.rect(left - pad, top - pad, width + pad * 2, height + pad * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(4 * dpr, 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
    const dx = Math.round(80 * dpr);
    const dy = Math.round(80 * dpr);
    let fromX = x - dx;
    let fromY = y - dy;
    if (fromX < 10) fromX = 10;
    if (fromY < 10) fromY = 10;
    if (annotationStyle !== 'box') {
      drawArrow(ctx, fromX, fromY, x, y, Math.max(14 * dpr, 10));
    }
    ctx.restore();
    return canvas.toDataURL('image/png');
  }, [annotationStyle]);

  const captureScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = rej; });
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());
      const imageData = canvas.toDataURL('image/png');
      let description = 'Знімок екрану';
      if (autoDescribe) {
        description = useLocalRecognition ? getLocalDescription() || 'Немає доступного локального опису' : await generateDescription(imageData, previousScreenshotRef.current);
      }
      previousScreenshotRef.current = imageData;
      addStep(imageData, 'image', false, description);
    } catch (e) {
      console.error('Помилка при скріншоті:', e);
      alert('Не вдалося виконати скріншот екрану.');
    }
  }, [autoDescribe, useLocalRecognition, addStep, getLocalDescription, generateDescription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' }, audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(videoUrl);
        addStep(videoUrl, 'video', false, 'Запис екрану завершено', blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      stream.getVideoTracks()[0].onended = () => stopRecording();
    } catch (e) {
      console.error('Помилка початку запису:', e);
      alert('Не вдалося розпочати запис екрана.');
    }
  }, [addStep, stopRecording]);

  const stopAutoCapture = useCallback(() => {
    if (actionTrackerRef.current) actionTrackerRef.current.stopTracking();
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); mediaRecorderRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setIsRecording(false);
    setRecordingMode('manual');
    previousScreenshotRef.current = null;
  }, []);

  const startAutoCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' }, audio: true });
      streamRef.current = stream;
      setIsRecording(true);
      setRecordingMode('auto');
      if (useLocalRecognition && actionTrackerRef.current) actionTrackerRef.current.startTracking();

      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(videoUrl);
        addStep(videoUrl, 'video', true, 'Автозйомка завершена', blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const captureInterval = setInterval(async () => {
        if (!streamRef.current) { clearInterval(captureInterval); return; }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        let description = 'Знімок екрану';
        if (autoDescribe) {
          description = useLocalRecognition ? getLocalDescription() || 'Немає доступного локального опису' : await generateDescription(imageData, previousScreenshotRef.current);
        }
        previousScreenshotRef.current = imageData;
        addStep(imageData, 'image', false, description);
      }, 3000);

      stream.getVideoTracks()[0].onended = () => { clearInterval(captureInterval); stopAutoCapture(); };
    } catch (e) {
      console.error('Помилка автозйомки:', e);
      alert('Не вдалося запустити автозйомку.');
    }
  }, [autoDescribe, useLocalRecognition, addStep, getLocalDescription, generateDescription, stopAutoCapture]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target.result;
        const description = useLocalRecognition ? getLocalDescription() : await generateDescription(imageData);
        addStep(imageData, 'image', false, description);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(videoUrl);
      addStep(videoUrl, 'video', false, 'Завантажено відео', file);
    }
  }, [useLocalRecognition, addStep, getLocalDescription, generateDescription]);

  return {
    isRecording,
    recordingMode,
    captureScreen,
    startRecording,
    stopRecording,
    startAutoCapture,
    stopAutoCapture,
    handleFileUpload,
    fileInputRef,
    // Exposed for extension hook
    overlayClickAnnotate,
    previousScreenshotRef,
    formatElementFromMeta,
    objectUrlsRef,
    // Exposed for regenerateDescription in App
    getLocalDescription,
    generateDescription,
  };
}

export { formatElementFromMeta };
