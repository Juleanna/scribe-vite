import { useEffect, useRef, useState } from 'react';
import { I18nProvider } from './i18n';
import Header from './components/Header';
import Controls from './components/Controls';
import StepList from './components/StepList';
import ActionTracker from './actionTracker';
import { saveProject, loadProject, saveMedia, loadMedia } from './db';

function InnerApp() {
  const [steps, setSteps] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [projectTitle, setProjectTitle] = useState('Нова інструкція');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState('manual');
  const [autoDescribe, setAutoDescribe] = useState(true);
  const [useLocalRecognition, setUseLocalRecognition] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [annotationStyle, setAnnotationStyle] = useState('both');
  const [recordOnClickMode, setRecordOnClickMode] = useState(false);
  const clickRecordRef = useRef(false); // запись запущена именно кликовым режимом
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const previousScreenshotRef = useRef(null);
  const actionTrackerRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const [extCaptureEnabled, setExtCaptureEnabled] = useState(false);
  // Dictation (speech-to-text) for step description via hotkey
  const recognitionRef = useRef(null);
  const dictationTargetRef = useRef(null);
  const dictationTextRef = useRef('');
  const [isDictating, setIsDictating] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);

  useEffect(() => {
    actionTrackerRef.current = new ActionTracker();
    return () => {
      if (actionTrackerRef.current) actionTrackerRef.current.stopTracking();
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  // Init Web Speech API for dictation
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
  }, []);

  const startDictation = () => {
    if (!dictationSupported || !recognitionRef.current || isDictating) return;
    // choose target step: currently editing or last step
    let targetId = editingStep;
    if (!targetId && steps.length > 0) targetId = steps[steps.length - 1].id;
    if (!targetId) return; // nothing to append to
    dictationTargetRef.current = targetId;
    dictationTextRef.current = '';
    try { recognitionRef.current.start(); setIsDictating(true); } catch (_) {}
  };
  const stopDictation = () => {
    try { recognitionRef.current && recognitionRef.current.stop(); } catch (_) {}
    setIsDictating(false);
    dictationTargetRef.current = null;
    dictationTextRef.current = '';
  };

  // Приём скриншотов от расширения через postMessage
  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.type !== 'scribe_screenshot' || typeof data.dataUrl !== 'string') return;
      const meta = data.meta || {};
      const elementText = formatElementFromMeta(meta.element);
      const descBase = elementText
        ? `Клік по ${elementText} на сторінці: ${meta.title || ''}${meta.url ? ` (${meta.url})` : ''}`.trim()
        : `Клік на сторінці: ${meta.title || ''}${meta.url ? ` (${meta.url})` : ''}`.trim();
      const description = descBase; // приоритет: описание по целевому элементу
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
      // авто-запуск/остановка записи при кликовом режиме
      if (enabled && recordOnClickMode && !isRecording) {
        startRecording().then(() => {
          clickRecordRef.current = true;
        }).catch(() => {
          // возможно требуется жест пользователя — проигнорируем
        });
      }
      if (!enabled && isRecording && clickRecordRef.current) {
        stopRecording();
        clickRecordRef.current = false;
      }
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('message', onState);
    try { window.postMessage({ type: 'scribe_get_capture_state' }, '*'); } catch(_) {}
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('message', onState);
    };
  }, [autoDescribe, useLocalRecognition, annotationStyle, recordOnClickMode, isRecording]);

  const toggleExtensionCapture = () => {
    try { window.postMessage({ type: 'scribe_toggle_capture' }, '*'); } catch(_) {}
  };

  // Hotkey: Alt+C toggles click-capture mode
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

  // Hotkey: Alt+R toggles dictation (speech-to-text) for step description
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
  }, [isDictating, steps, editingStep]);

  async function overlayClickAnnotate(dataUrl, meta) {
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
    // Сначала рамка вокруг элемента, если есть
    if (meta?.elementRect && annotationStyle !== 'arrow') {
      const r = meta.elementRect;
      const left = Math.max(0, Math.round(r.left * dpr));
      const top = Math.max(0, Math.round(r.top * dpr));
      const width = Math.round(r.width * dpr);
      const height = Math.round(r.height * dpr);
      const pad = Math.round(4 * dpr);
      ctx.lineWidth = Math.max(3 * dpr, 2);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.95)'; // синяя рамка
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.beginPath();
      ctx.rect(left - pad, top - pad, width + pad * 2, height + pad * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Затем стрелка к точке клика
    ctx.lineWidth = Math.max(4 * dpr, 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)'; // красная стрелка
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
  }

  function drawArrow(ctx, fromX, fromY, toX, toY, headLen) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    // наконечник
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

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
    // общее: по элементу <tag>
    return `елементу <${tag}> ${label}`.trim();
  }

  const getLocalDescription = () => {
    if (!actionTrackerRef.current) return null;
    const lastAction = actionTrackerRef.current.getLastAction();
    if (!lastAction) return null;
    return lastAction.description;
  };

  const generateDescription = async (imageData, previousImage = null) => {
    if (!autoDescribe || useLocalRecognition) return null;
    setIsGenerating(true);
    try {
      const base64Image = imageData.split(',')[1];
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64Image },
            },
            { type: 'text', text: 'Опиши коротко, що зображено на скріншоті.' },
          ],
        },
      ];
      if (previousImage) {
        const prevBase64 = previousImage.split(',')[1];
        messages[0].content.unshift({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: prevBase64 } });
      }
      const response = await fetch('http://localhost:3001/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, messages }),
      });
      if (!response.ok) throw new Error('Помилка створення опису');
      const data = await response.json();
      return data.content?.[0]?.text?.trim();
    } catch (e) {
      console.error('Помилка генерації опису:', e);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const captureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => (video.onloadedmetadata = r));
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
  };

  const startRecording = async () => {
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
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startAutoCapture = async () => {
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
  };

  const stopAutoCapture = () => {
    if (actionTrackerRef.current) actionTrackerRef.current.stopTracking();
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); mediaRecorderRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setIsRecording(false);
    setRecordingMode('manual');
    previousScreenshotRef.current = null;
  };

  const handleFileUpload = (e) => {
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
  };

  const addStep = (mediaData, type, insertAtStart = false, customDescription = null, mediaBlob = null) => {
    setSteps((prev) => {
      const newStep = {
        id: Date.now() + Math.random(),
        media: mediaData,
        type,
        title: `Крок ${prev.length + 1}`,
        description: customDescription || 'Готую опис кроку...',
        isGenerating: !customDescription && autoDescribe && !useLocalRecognition,
      };
      if (type === 'video' && mediaBlob) {
        newStep.mediaKey = String(newStep.id);
        saveMedia(newStep.mediaKey, mediaBlob).catch(() => {});
      }
      const shouldPrepend = type === 'video' || insertAtStart;
      return shouldPrepend ? [newStep, ...prev] : [...prev, newStep];
    });
  };

  const regenerateDescription = async (stepId) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step || step.type !== 'image') return;
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, isGenerating: true } : s)));
    let description = useLocalRecognition ? getLocalDescription() || 'Немає локального опису дій' : await generateDescription(step.media);
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, description: description || 'Опис недоступний', isGenerating: false } : s)));
  };

  const updateStep = (id, field, value) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const deleteStep = (id) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const moveStep = (id, direction) => {
    const index = steps.findIndex((s) => s.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) return;
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const exportToHTML = () => {
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #f5f5f5; }
    h1 { color: #1a1a1a; margin-bottom: 40px; font-size: 2.5rem; }
    .step { background: white; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .step-number { display: inline-block; background: #6366f1; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-bottom: 15px; }
    .step-title { font-size: 1.5rem; color: #1a1a1a; margin: 15px 0; }
    .step-description { color: #666; line-height: 1.6; margin: 15px 0; }
    .step-media { width: 100%; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <h1>${projectTitle}</h1>
  ${steps.map((step, index) => `
    <div class="step">
      <div class="step-number">Крок ${index + 1}</div>
      <h2 class="step-title">${step.title}</h2>
      <p class="step-description">${step.description}</p>
      ${step.type === 'image' ? `<img src="${step.media}" alt="${step.title}" class="step-media">` : `<video src="${step.media}" controls class="step-media"></video>`}
    </div>
  `).join('')}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToMarkdown = () => {
    const md = [
      `# ${projectTitle}`,
      '',
      ...steps.flatMap((step, index) => {
        const lines = [];
        lines.push(`## Крок ${index + 1}: ${step.title || 'Без назви'}`);
        if (step.description) { lines.push(''); lines.push(step.description); }
        lines.push('');
        if (step.type === 'image') lines.push(`![${step.title || 'Скріншот'}](${step.media})`);
        else if (step.type === 'video') lines.push(`Відео: ${step.media}`);
        lines.push('');
        return lines;
      })
    ].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    const printWindow = window.open('', '_blank');
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${projectTitle}</title>
  <style>
    @page { margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 100%; margin: 0; padding: 0; }
    h1 { color: #1a1a1a; margin-bottom: 30px; font-size: 2rem; page-break-after: avoid; }
    .step { page-break-inside: avoid; margin-bottom: 40px; }
    .step-number { display: inline-block; background: #6366f1; color: white; padding: 6px 12px; border-radius: 15px; font-weight: 600; margin-bottom: 10px; }
    .step-title { font-size: 1.3rem; color: #1a1a1a; margin: 10px 0; }
    .step-description { color: #666; line-height: 1.6; margin: 10px 0; }
    .step-media { width: 100%; max-width: 100%; margin-top: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${projectTitle}</h1>
  ${steps.map((step, index) => `
    <div class="step">
      <div class="step-number">Крок ${index + 1}</div>
      <h2 class="step-title">${step.title}</h2>
      <p class="step-description">${step.description}</p>
      ${step.type === 'image' ? `<img src="${step.media}" alt="${step.title}" class="step-media">` : `<p style="color: #999; font-style: italic;">Видео: ${step.title}</p>`}
    </div>
  `).join('')}
  <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); };</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // IndexedDB загрузка/сохранение
  useEffect(() => {
    (async () => {
      try {
        const saved = await loadProject();
        if (saved && Array.isArray(saved.steps)) {
          const restored = await Promise.all(saved.steps.map(async (s) => {
            if (s.type === 'video' && s.mediaKey) {
              const blob = await loadMedia(s.mediaKey);
              if (blob) {
                const url = URL.createObjectURL(blob);
                objectUrlsRef.current.push(url);
                return { ...s, media: url };
              }
            }
            return s;
          }));
          setSteps(restored);
        }
        if (saved && typeof saved.projectTitle === 'string') setProjectTitle(saved.projectTitle);
        if (saved && saved.settings && typeof saved.settings.annotationStyle === 'string') setAnnotationStyle(saved.settings.annotationStyle); if (saved && saved.settings && typeof saved.settings.recordOnClickMode === 'boolean') setRecordOnClickMode(saved.settings.recordOnClickMode);
      } catch (e) { console.warn('Не вдалося завантажити проект з IndexedDB:', e); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storeSteps = steps.map((s) => ({ ...s, media: s.type === 'video' ? null : s.media }));
        await saveProject({ projectTitle, steps: storeSteps, settings: { annotationStyle, recordOnClickMode }, updatedAt: Date.now() });
      } catch (e) { console.warn('Не вдалося зберегти проект у IndexedDB:', e); }
    })();
  }, [projectTitle, steps, annotationStyle]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Header projectTitle={projectTitle} setProjectTitle={setProjectTitle} steps={steps} exportToHTML={exportToHTML} exportToPDF={exportToPDF} exportToMarkdown={exportToMarkdown} extCaptureEnabled={extCaptureEnabled} onToggleExtensionCapture={toggleExtensionCapture} />
        <Controls
          autoDescribe={autoDescribe}
          setAutoDescribe={setAutoDescribe}
          useLocalRecognition={useLocalRecognition}
          setUseLocalRecognition={setUseLocalRecognition}
          annotationStyle={annotationStyle}
          setAnnotationStyle={setAnnotationStyle}
          recordOnClickMode={recordOnClickMode}
          setRecordOnClickMode={setRecordOnClickMode}
          isDictating={isDictating}
          dictationSupported={dictationSupported}
          onToggleDictation={() => (isDictating ? stopDictation() : startDictation())}
          isRecording={isRecording}
          recordingMode={recordingMode}
          onCaptureScreen={captureScreen}
          onStartAutoCapture={startAutoCapture}
          onStartRecording={startRecording}
          onStopAutoCapture={stopAutoCapture}
          onStopRecording={stopRecording}
          onFileUpload={handleFileUpload}
          fileInputRef={fileInputRef}
        />
        <StepList
          steps={steps}
          editingStep={editingStep}
          setEditingStep={setEditingStep}
          autoDescribe={autoDescribe}
          useLocalRecognition={useLocalRecognition}
          updateStep={updateStep}
          regenerateDescription={regenerateDescription}
          moveStep={moveStep}
          deleteStep={deleteStep}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <InnerApp />
    </I18nProvider>
  );
}





