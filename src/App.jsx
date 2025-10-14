import { useState, useRef, useEffect } from 'react';
import { Camera, Download, Trash2, Edit2, Save, MoveUp, MoveDown, FileText, Upload, Video, Square, FileDown, Sparkles, Brain } from 'lucide-react';
import ActionTracker from './actionTracker';

function App() {
  const [steps, setSteps] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [projectTitle, setProjectTitle] = useState('Новая инструкция');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState('manual');
  const [autoDescribe, setAutoDescribe] = useState(true);
  const [useLocalRecognition, setUseLocalRecognition] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const previousScreenshotRef = useRef(null);
  const actionTrackerRef = useRef(null);

  useEffect(() => {
    // Инициализация локального трекера
    actionTrackerRef.current = new ActionTracker();
    
    return () => {
      if (actionTrackerRef.current) {
        actionTrackerRef.current.stopTracking();
      }
    };
  }, []);

  // Локальное распознавание действий
  const getLocalDescription = () => {
    if (!actionTrackerRef.current) return null;
    
    const lastAction = actionTrackerRef.current.getLastAction();
    if (!lastAction) return null;
    
    return lastAction.description;
  };

  // Генерация описания с помощью Claude (опционально)
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
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: previousImage 
                ? `Проанализируй два скриншота (предыдущий и текущий) и опиши ТОЛЬКО изменение, которое произошло. Например:
- Если нажали на кнопку - напиши "Нажать на кнопку [название]"
- Если ввели текст - напиши "Ввести текст '[текст]' в поле [название]"
- Если выбрали элемент - напиши "Выбрать [что выбрано]"
- Если открылось новое окно/страница - напиши "Открылось [что]"

Ответ должен быть коротким (1-2 предложения) и описывать конкретное действие пользователя. Формат: императив (повелительное наклонение).`
                : `Посмотри на скриншот и определи, какое действие сейчас нужно выполнить или было выполнено. Опиши его кратко в формате инструкции:
- Если видна кнопка в фокусе - "Нажать на кнопку [название]"
- Если видно активное поле ввода - "Ввести [что ввести]"
- Если открыта страница - "Перейти на страницу [название]"

Ответ: одно короткое предложение (до 10 слов) в повелительном наклонении.`
            }
          ]
        }
      ];

      if (previousImage) {
        const prevBase64 = previousImage.split(',')[1];
        messages[0].content.unshift({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: prevBase64
          }
        });
      }

      const response = await fetch('http://localhost:3001/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка генерации описания');
      }

      const data = await response.json();
      return data.content[0].text.trim();
    } catch (error) {
      console.error('Ошибка генерации описания:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const captureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      stream.getTracks().forEach(track => track.stop());
      
      const imageData = canvas.toDataURL('image/png');
      
      // Получаем описание
      let description = 'Добавьте описание шага...';
      
      if (autoDescribe) {
        if (useLocalRecognition) {
          // Локальное распознавание
          description = getLocalDescription() || 'Действие на экране';
        } else {
          // AI распознавание (если включено)
          description = await generateDescription(imageData, previousScreenshotRef.current);
        }
      }
      
      previousScreenshotRef.current = imageData;
      addStep(imageData, 'image', false, description);
    } catch (err) {
      console.error('Ошибка захвата экрана:', err);
      alert('Не удалось захватить экран. Попробуйте загрузить изображение вручную.');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        addStep(videoUrl, 'video', false, 'Видеозапись процесса');
        
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (err) {
      console.error('Ошибка записи:', err);
      alert('Не удалось начать запись экрана.');
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      streamRef.current = stream;
      setIsRecording(true);
      setRecordingMode('auto');

      // Запускаем трекер действий
      if (useLocalRecognition && actionTrackerRef.current) {
        actionTrackerRef.current.startTracking();
      }

      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        addStep(videoUrl, 'video', true, 'Полная видеозапись процесса');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const captureInterval = setInterval(async () => {
        if (!streamRef.current) {
          clearInterval(captureInterval);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        
        let description = 'Шаг процесса';
        
        if (autoDescribe) {
          if (useLocalRecognition) {
            description = getLocalDescription() || 'Действие на экране';
          } else {
            description = await generateDescription(imageData, previousScreenshotRef.current);
          }
        }
        
        previousScreenshotRef.current = imageData;
        addStep(imageData, 'image', false, description);
      }, 3000);

      stream.getVideoTracks()[0].onended = () => {
        clearInterval(captureInterval);
        stopAutoCapture();
      };

    } catch (err) {
      console.error('Ошибка автозахвата:', err);
      alert('Не удалось начать автоматический захват.');
    }
  };

  const stopAutoCapture = () => {
    // Останавливаем трекер
    if (actionTrackerRef.current) {
      actionTrackerRef.current.stopTracking();
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingMode('manual');
    previousScreenshotRef.current = null;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageData = event.target.result;
          const description = useLocalRecognition 
            ? getLocalDescription() 
            : await generateDescription(imageData);
          addStep(imageData, 'image', false, description);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const videoUrl = URL.createObjectURL(file);
        addStep(videoUrl, 'video', false, 'Загруженное видео');
      }
    }
  };

  const addStep = (mediaData, type, insertAtStart = false, customDescription = null) => {
    setSteps(prevSteps => {
      const newStep = {
        id: Date.now() + Math.random(),
        media: mediaData,
        type,
        title: `Шаг ${prevSteps.length + 1}`,
        description: customDescription || 'Добавьте описание шага...',
        isGenerating: !customDescription && autoDescribe && !useLocalRecognition
      };
      return insertAtStart ? [newStep, ...prevSteps] : [...prevSteps, newStep];
    });
  };

  const regenerateDescription = async (stepId) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || step.type !== 'image') return;

    setSteps(steps.map(s => 
      s.id === stepId ? { ...s, isGenerating: true } : s
    ));

    let description;
    if (useLocalRecognition) {
      description = getLocalDescription() || 'Не удалось определить действие';
    } else {
      description = await generateDescription(step.media);
    }
    
    setSteps(steps.map(s => 
      s.id === stepId 
        ? { ...s, description: description || 'Не удалось сгенерировать описание', isGenerating: false }
        : s
    ));
  };

  const updateStep = (id, field, value) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const deleteStep = (id) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const moveStep = (id, direction) => {
    const index = steps.findIndex(step => step.id === id);
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === steps.length - 1)
    ) return;
    
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
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 40px;
      font-size: 2.5rem;
    }
    .step {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .step-number {
      display: inline-block;
      background: #6366f1;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      margin-bottom: 15px;
    }
    .step-title {
      font-size: 1.5rem;
      color: #1a1a1a;
      margin: 15px 0;
    }
    .step-description {
      color: #666;
      line-height: 1.6;
      margin: 15px 0;
    }
    .step-media {
      width: 100%;
      border-radius: 8px;
      margin-top: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <h1>${projectTitle}</h1>
  ${steps.map((step, index) => `
    <div class="step">
      <div class="step-number">Шаг ${index + 1}</div>
      <h2 class="step-title">${step.title}</h2>
      <p class="step-description">${step.description}</p>
      ${step.type === 'image' 
        ? `<img src="${step.media}" alt="${step.title}" class="step-media">`
        : `<video src="${step.media}" controls class="step-media"></video>`
      }
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

  const exportToPDF = async () => {
    const printWindow = window.open('', '_blank');
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${projectTitle}</title>
  <style>
    @page {
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 30px;
      font-size: 2rem;
      page-break-after: avoid;
    }
    .step {
      page-break-inside: avoid;
      margin-bottom: 40px;
    }
    .step-number {
      display: inline-block;
      background: #6366f1;
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .step-title {
      font-size: 1.3rem;
      color: #1a1a1a;
      margin: 10px 0;
    }
    .step-description {
      color: #666;
      line-height: 1.6;
      margin: 10px 0;
    }
    .step-media {
      width: 100%;
      max-width: 100%;
      margin-top: 15px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <h1>${projectTitle}</h1>
  ${steps.map((step, index) => `
    <div class="step">
      <div class="step-number">Шаг ${index + 1}</div>
      <h2 class="step-title">${step.title}</h2>
      <p class="step-description">${step.description}</p>
      ${step.type === 'image' 
        ? `<img src="${step.media}" alt="${step.title}" class="step-media">`
        : `<p style="color: #999; font-style: italic;">Видео: ${step.title}</p>`
      }
    </div>
  `).join('')}
  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              {isEditingTitle ? (
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  className="text-3xl font-bold border-b-2 border-indigo-600 focus:outline-none"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-3xl font-bold text-gray-800 cursor-pointer hover:text-indigo-600"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {projectTitle}
                </h1>
              )}
            </div>
            {steps.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={exportToHTML}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  HTML
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FileDown className="w-5 h-5" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {/* Auto-describe toggle */}
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={autoDescribe}
                onChange={(e) => setAutoDescribe(e.target.checked)}
                className="w-5 h-5 text-purple-600"
              />
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="text-purple-900 font-medium">
                  Автоматическое описание действий
                </span>
              </div>
            </label>
            
            {autoDescribe && (
              <label className="flex items-center gap-3 cursor-pointer ml-8">
                <input
                  type="checkbox"
                  checked={useLocalRecognition}
                  onChange={(e) => setUseLocalRecognition(e.target.checked)}
                  className="w-5 h-5 text-indigo-600"
                />
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  <span className="text-indigo-900 font-medium">
                    Использовать локальное распознавание (без AI)
                  </span>
                </div>
              </label>
            )}
            
            <p className="text-sm text-purple-600 mt-2 ml-8">
              {useLocalRecognition 
                ? '🎯 Локальная система отслеживает клики, ввод текста и другие действия'
                : '🤖 AI анализирует скриншоты (требуется API ключ)'}
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={captureScreen}
              disabled={isRecording}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              Скриншот
            </button>

            {!isRecording ? (
              <>
                <button
                  onClick={startAutoCapture}
                  className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Camera className="w-5 h-5" />
                  Авто-захват
                </button>
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <Video className="w-5 h-5" />
                  Записать видео
                </button>
              </>
            ) : (
              <button
                onClick={recordingMode === 'auto' ? stopAutoCapture : stopRecording}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium animate-pulse"
              >
                <Square className="w-5 h-5" />
                Остановить {recordingMode === 'auto' ? 'захват' : 'запись'}
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording}
              className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              Загрузить файл
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {isRecording && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">
                {recordingMode === 'auto' 
                  ? '🔴 Идёт автоматический захват скриншотов каждые 3 секунды...'
                  : '🔴 Идёт запись видео...'
                }
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        {steps.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">
              Начните создавать инструкцию
            </h2>
            <p className="text-gray-500 mb-4">
              Выберите режим захвата:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
              <li>📸 <strong>Скриншот</strong> - один снимок экрана</li>
              <li>🔄 <strong>Авто-захват</strong> - автоматические скриншоты каждые 3 сек</li>
              <li>🎥 <strong>Записать видео</strong> - полная видеозапись экрана</li>
              <li>🎯 <strong>Локальное распознавание</strong> - автоопределение действий без AI</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {editingStep === step.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                          className="w-full text-xl font-semibold border-b-2 border-indigo-600 focus:outline-none pb-1"
                          placeholder="Название шага"
                        />
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-indigo-600 focus:outline-none resize-none"
                          rows="3"
                          placeholder="Описание шага..."
                        />
                        <button
                          onClick={() => setEditingStep(null)}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Сохранить
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-gray-800">
                            {step.title}
                          </h3>
                          {step.type === 'video' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              ВИДЕО
                            </span>
                          )}
                          {step.isGenerating && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3 h-3" />
                              Генерация...
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{step.description}</p>
                        {step.type === 'image' && autoDescribe && !step.isGenerating && (
                          <button
                            onClick={() => regenerateDescription(step.id)}
                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2"
                          >
                            {useLocalRecognition ? <Brain className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            Перегенерировать описание
                          </button>
                        )}
                      </div>
                    )}
                    
                    {step.type === 'image' ? (
                      <img
                        src={step.media}
                        alt={step.title}
                        className="w-full rounded-lg shadow-md mt-4"
                      />
                    ) : (
                      <video
                        src={step.media}
                        controls
                        className="w-full rounded-lg shadow-md mt-4"
                      />
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {editingStep !== step.id && (
                      <button
                        onClick={() => setEditingStep(step.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => moveStep(step.id, 'up')}
                      disabled={index === 0}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Переместить вверх"
                    >
                      <MoveUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => moveStep(step.id, 'down')}
                      disabled={index === steps.length - 1}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Переместить вниз"
                    >
                      <MoveDown className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;