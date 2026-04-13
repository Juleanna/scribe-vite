import { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './auth';
import { api } from './api';
import Header from './components/Header';
import useUndoRedo from './hooks/useUndoRedo';
import Controls from './components/Controls';
import StepList from './components/StepList';
import ExtensionBanner from './components/ExtensionBanner';
import ErrorBoundary from './components/ErrorBoundary';
import useMediaCapture from './hooks/useMediaCapture';
import useDictation from './hooks/useDictation';
import useExtension from './hooks/useExtension';
import useProjectSync from './hooks/useProjectSync';
import { useDarkMode } from './hooks/useDarkMode';

const Login = lazy(() => import('./components/Login'));
const ProjectList = lazy(() => import('./components/ProjectList'));
const Profile = lazy(() => import('./components/Profile'));
const SharedView = lazy(() => import('./components/SharedView'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function InnerApp() {
  const { user, setUser, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [dark, setDark] = useDarkMode();

  // Check for shared project URL
  const [sharedToken] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/shared/')) return path.replace('/shared/', '');
    return null;
  });

  const [currentProject, setCurrentProject] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [steps, setSteps] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [projectTitle, setProjectTitle] = useState('Нова інструкція');
  const [autoDescribe, setAutoDescribe] = useState(true);
  const [useLocalRecognition, setUseLocalRecognition] = useState(true);
  const [annotationStyle, setAnnotationStyle] = useState('both');
  const [recordOnClickMode, setRecordOnClickMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'

  const saveTimeoutRef = useRef(null);

  // --- Step CRUD (stays in App because of currentProject & api dependency) ---

  const addStep = (mediaData, type, insertAtStart = false, customDescription = null, mediaBlob = null) => {
    const tempId = Date.now() + Math.random();
    const newStep = {
      id: tempId,
      media: mediaData,
      type,
      title: `Крок`,
      description: customDescription || 'Готую опис кроку...',
      isGenerating: !customDescription && autoDescribe && !useLocalRecognition,
    };

    setSteps((prev) => {
      newStep.title = `Крок ${prev.length + 1}`;
      const shouldPrepend = type === 'video' || insertAtStart;
      return shouldPrepend ? [newStep, ...prev] : [...prev, newStep];
    });

    if (currentProject?.id) {
      const order = insertAtStart ? 0 : -1;
      api.createStep(currentProject.id, {
        mediaBase64: type === 'image' ? mediaData : null,
        mediaBlob: type === 'video' ? mediaBlob : null,
        mediaType: type,
        title: newStep.title,
        description: customDescription || '',
        order: Math.max(order, 0),
      }).then(async (res) => {
        if (res.ok) {
          const saved = await res.json();
          setSteps(prev => prev.map(s =>
            s.id === tempId ? { ...s, id: saved.id, media: saved.media_url || s.media } : s
          ));
          setSaveStatus('saved');
        } else { setSaveStatus('error'); }
      }).catch(() => { setSaveStatus('error'); });
    }
  };

  const updateStep = (id, field, value) => {
    setSteps(prev => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    if (currentProject?.id) {
      clearTimeout(saveTimeoutRef.current);
      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(() => {
        api.updateStep(currentProject.id, id, { [field]: value })
          .then((res) => { setSaveStatus(res.ok ? 'saved' : 'error'); })
          .catch(() => { setSaveStatus('error'); });
      }, 1000);
    }
  };

  const deleteStep = (id) => {
    setSteps(prev => prev.filter((s) => s.id !== id));
    if (currentProject?.id) {
      setSaveStatus('saving');
      api.deleteStep(currentProject.id, id)
        .then((res) => { setSaveStatus(res.ok ? 'saved' : 'error'); })
        .catch(() => { setSaveStatus('error'); });
    }
  };

  const moveStep = (id, direction) => {
    setSteps(prev => {
      const index = prev.findIndex((s) => s.id === id);
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === prev.length - 1)) return prev;
      const newSteps = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      if (currentProject?.id) {
        const ids = newSteps.map(s => s.id);
        setSaveStatus('saving');
        api.reorderSteps(currentProject.id, ids)
          .then((res) => { setSaveStatus(res.ok ? 'saved' : 'error'); })
          .catch(() => { setSaveStatus('error'); });
      }
      return newSteps;
    });
  };

  const reorderSteps = (fromIndex, toIndex) => {
    setSteps(prev => {
      const newSteps = [...prev];
      const [moved] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, moved);
      if (currentProject?.id) {
        api.reorderSteps(currentProject.id, newSteps.map(s => s.id)).catch(() => {});
      }
      return newSteps;
    });
  };

  // --- Undo/Redo ---

  const undoRedo = useUndoRedo(setSteps);

  useEffect(() => {
    undoRedo.pushState(steps);
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRedo.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        undoRedo.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        undoRedo.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoRedo]);

  // --- Custom Hooks ---

  const mediaCapture = useMediaCapture({
    autoDescribe,
    useLocalRecognition,
    annotationStyle,
    addStep,
    isAuthenticated,
  });

  const dictation = useDictation({ steps, editingStep, setSteps });

  const extension = useExtension({
    addStep,
    annotationStyle,
    recordOnClickMode,
    isRecording: mediaCapture.isRecording,
    startRecording: mediaCapture.startRecording,
    stopRecording: mediaCapture.stopRecording,
    overlayClickAnnotate: mediaCapture.overlayClickAnnotate,
    previousScreenshotRef: mediaCapture.previousScreenshotRef,
    formatElementFromMeta: mediaCapture.formatElementFromMeta,
  });

  useProjectSync({
    currentProject,
    projectTitle,
    annotationStyle,
    recordOnClickMode,
    setProjectTitle,
    setAnnotationStyle,
    setRecordOnClickMode,
    setSteps,
    setSaveStatus,
  });

  const regenerateDescription = async (stepId) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step || step.type !== 'image') return;
    setSteps(prev => prev.map((s) => (s.id === stepId ? { ...s, isGenerating: true } : s)));
    let description = useLocalRecognition
      ? mediaCapture.getLocalDescription?.() || 'Немає локального опису дій'
      : await mediaCapture.generateDescription?.(step.media);
    setSteps(prev => prev.map((s) => (s.id === stepId ? { ...s, description: description || 'Опис недоступний', isGenerating: false } : s)));
    if (currentProject?.id) {
      api.updateStep(currentProject.id, stepId, { description: description || '' }).catch(() => {});
    }
  };

  // --- Export functions ---

  const escapeHTML = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const exportToHTML = () => {
    const safeTitle = escapeHTML(projectTitle);
    const brandFooter = user?.brand_name
      ? `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999;">Created by ${escapeHTML(user.brand_name)}</div>`
      : `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999;">Created with Scribe</div>`;
    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:40px 20px;background:#f5f5f5}h1{color:#1a1a1a;margin-bottom:40px;font-size:2.5rem}.step{background:white;border-radius:12px;padding:30px;margin-bottom:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}.step-number{display:inline-block;background:#6366f1;color:white;padding:8px 16px;border-radius:20px;font-weight:600;margin-bottom:15px}.step-title{font-size:1.5rem;color:#1a1a1a;margin:15px 0}.step-description{color:#666;line-height:1.6;margin:15px 0}.step-media{width:100%;border-radius:8px;margin-top:20px;box-shadow:0 4px 12px rgba(0,0,0,0.1)}</style></head><body><h1>${safeTitle}</h1>${steps.map((step, index) => `<div class="step"><div class="step-number">Крок ${index + 1}</div><h2 class="step-title">${escapeHTML(step.title)}</h2><p class="step-description">${escapeHTML(step.description)}</p>${step.type === 'image' ? `<img src="${step.media}" alt="${escapeHTML(step.title)}" class="step-media">` : `<video src="${step.media}" controls class="step-media"></video>`}</div>`).join('')}${brandFooter}</body></html>`;
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
      `# ${projectTitle}`, '',
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
    if (!printWindow) { alert('Не вдалося відкрити вікно друку.'); return; }
    const safeTitle = escapeHTML(projectTitle);
    const brandFooterPdf = user?.brand_name
      ? `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999;">Created by ${escapeHTML(user.brand_name)}</div>`
      : `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999;">Created with Scribe</div>`;
    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><title>${safeTitle}</title><style>@page{margin:20mm}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:100%;margin:0;padding:0}h1{color:#1a1a1a;margin-bottom:30px;font-size:2rem;page-break-after:avoid}.step{page-break-inside:avoid;margin-bottom:40px}.step-number{display:inline-block;background:#6366f1;color:white;padding:6px 12px;border-radius:15px;font-weight:600;margin-bottom:10px}.step-title{font-size:1.3rem;color:#1a1a1a;margin:10px 0}.step-description{color:#666;line-height:1.6;margin:10px 0}.step-media{width:100%;max-width:100%;margin-top:15px;border-radius:8px}</style></head><body><h1>${safeTitle}</h1>${steps.map((step, index) => `<div class="step"><div class="step-number">Крок ${index + 1}</div><h2 class="step-title">${escapeHTML(step.title)}</h2><p class="step-description">${escapeHTML(step.description)}</p>${step.type === 'image' ? `<img src="${step.media}" alt="${escapeHTML(step.title)}" class="step-media">` : `<p style="color:#999;font-style:italic;">Відео: ${escapeHTML(step.title)}</p>`}</div>`).join('')}${brandFooterPdf}<script>window.onload=()=>{setTimeout(()=>{window.print();},500)};</script></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportToDocx = () => {
    const safeTitle = escapeHTML(projectTitle);
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">
      <style>
        body { font-family: Calibri, sans-serif; }
        h1 { color: #1a1a1a; font-size: 24pt; }
        .step { margin-bottom: 24pt; page-break-inside: avoid; }
        .step-number { color: #6366f1; font-weight: bold; font-size: 14pt; }
        .step-title { font-size: 16pt; margin: 6pt 0; }
        .step-desc { color: #666; margin: 6pt 0; }
        img { max-width: 100%; }
      </style></head>
      <body>
        <h1>${safeTitle}</h1>
        ${steps.map((step, i) => `
          <div class="step">
            <p class="step-number">Крок ${i + 1}</p>
            <p class="step-title">${escapeHTML(step.title)}</p>
            <p class="step-desc">${escapeHTML(step.description)}</p>
            ${step.type === 'image' && step.media ? `<img src="${step.media}">` : ''}
          </div>
        `).join('')}
      </body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToProjects = () => {
    setCurrentProject(null);
    setSteps([]);
    setProjectTitle('Нова інструкція');
  };

  // --- Render ---

  if (sharedToken) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SharedView token={sharedToken} />
      </Suspense>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-indigo-600 text-lg">Завантаження...</div>
      </div>
    );
  }

  if (!isAuthenticated) return (
    <Suspense fallback={<LoadingSpinner />}>
      <Login />
    </Suspense>
  );

  if (showProfile) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Profile
          user={user}
          onBack={() => setShowProfile(false)}
          onUserUpdate={(updated) => setUser(updated)}
        />
      </Suspense>
    );
  }

  if (!currentProject) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ProjectList
          onSelectProject={(project) => setCurrentProject(project)}
          onNewProject={(project) => setCurrentProject(project)}
          onOpenProfile={() => setShowProfile(true)}
          user={user}
          onLogout={logout}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Header
          projectTitle={projectTitle}
          setProjectTitle={setProjectTitle}
          steps={steps}
          exportToHTML={exportToHTML}
          exportToPDF={exportToPDF}
          exportToMarkdown={exportToMarkdown}
          exportToDocx={exportToDocx}
          saveStatus={saveStatus}
          extCaptureEnabled={extension.extCaptureEnabled}
          onToggleExtensionCapture={extension.toggleExtensionCapture}
          onBackToProjects={handleBackToProjects}
          user={user}
          onLogout={logout}
          onOpenProfile={() => setShowProfile(true)}
          dark={dark}
          setDark={setDark}
          onUndo={undoRedo.undo}
          onRedo={undoRedo.redo}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
        />
        {extension.showExtBanner && <ExtensionBanner onClose={() => extension.setShowExtBanner(false)} />}
        <Controls
          autoDescribe={autoDescribe}
          setAutoDescribe={setAutoDescribe}
          useLocalRecognition={useLocalRecognition}
          setUseLocalRecognition={setUseLocalRecognition}
          annotationStyle={annotationStyle}
          setAnnotationStyle={setAnnotationStyle}
          recordOnClickMode={recordOnClickMode}
          setRecordOnClickMode={setRecordOnClickMode}
          isDictating={dictation.isDictating}
          dictationSupported={dictation.dictationSupported}
          onToggleDictation={() => (dictation.isDictating ? dictation.stopDictation() : dictation.startDictation())}
          isRecording={mediaCapture.isRecording}
          recordingMode={mediaCapture.recordingMode}
          onCaptureScreen={mediaCapture.captureScreen}
          onStartAutoCapture={mediaCapture.startAutoCapture}
          onStartRecording={mediaCapture.startRecording}
          onStopAutoCapture={mediaCapture.stopAutoCapture}
          onStopRecording={mediaCapture.stopRecording}
          onFileUpload={mediaCapture.handleFileUpload}
          fileInputRef={mediaCapture.fileInputRef}
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
          onReorder={reorderSteps}
          deleteStep={deleteStep}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ErrorBoundary>
          <InnerApp />
        </ErrorBoundary>
      </AuthProvider>
    </I18nProvider>
  );
}
