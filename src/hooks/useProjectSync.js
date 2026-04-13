import { useEffect, useRef } from 'react';
import { api } from '../api';

export default function useProjectSync({
  currentProject,
  projectTitle,
  annotationStyle,
  recordOnClickMode,
  setProjectTitle,
  setAnnotationStyle,
  setRecordOnClickMode,
  setSteps,
}) {
  const saveTimeoutRef = useRef(null);

  // Load project from API when selected
  useEffect(() => {
    if (!currentProject?.id) return;
    (async () => {
      try {
        const res = await api.getProject(currentProject.id);
        if (res.ok) {
          const project = await res.json();
          setProjectTitle(project.title);
          setAnnotationStyle(project.annotation_style || 'both');
          setRecordOnClickMode(project.record_on_click_mode || false);
          setSteps((project.steps || []).map(s => ({
            id: s.id,
            media: s.media_url || '',
            type: s.media_type,
            title: s.title,
            description: s.description,
            isGenerating: false,
          })));
        }
      } catch (e) {
        console.error('Failed to load project from API:', e);
      }
    })();
  }, [currentProject?.id, setProjectTitle, setAnnotationStyle, setRecordOnClickMode, setSteps]);

  // Save project title/settings to server (debounced)
  useEffect(() => {
    if (!currentProject?.id) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      api.updateProject(currentProject.id, {
        title: projectTitle,
        annotation_style: annotationStyle,
        record_on_click_mode: recordOnClickMode,
      }).catch(() => {});
    }, 1500);
  }, [projectTitle, annotationStyle, recordOnClickMode, currentProject?.id]);
}
