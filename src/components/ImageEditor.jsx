import { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, Type, Droplets, ArrowUpRight, Undo2, Save, X } from 'lucide-react';
import { useI18n } from '../i18n';

function boxBlur(imageData, radius = 10) {
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = (ny * width + nx) * 4;
            r += copy[i]; g += copy[i + 1]; b += copy[i + 2]; count++;
          }
        }
      }
      const i = (y * width + x) * 4;
      data[i] = r / count; data[i + 1] = g / count; data[i + 2] = b / count;
    }
  }
  return imageData;
}

function drawArrow(ctx, fromX, fromY, toX, toY, headLen = 14) {
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

export default function ImageEditor({ imageUrl, onSave, onClose }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activeTool, setActiveTool] = useState(null);
  const [history, setHistory] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image onto canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
      setHistory([canvas.toDataURL('image/png')]);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory(prev => [...prev, canvas.toDataURL('image/png')]);
  }, []);

  const restoreFromDataUrl = useCallback((dataUrl) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    restoreFromDataUrl(newHistory[newHistory.length - 1]);
  }, [history, restoreFromDataUrl]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  }, [onSave]);

  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Draw selection overlay during crop/blur
  const drawSelectionRect = useCallback((from, to) => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    // Restore last snapshot first
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const x = Math.min(from.x, to.x);
      const y = Math.min(from.y, to.y);
      const w = Math.abs(to.x - from.x);
      const h = Math.abs(to.y - from.y);
      ctx.strokeStyle = activeTool === 'crop' ? '#4f46e5' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      // Dim area outside selection for crop
      if (activeTool === 'crop') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, y);
        ctx.fillRect(0, y, x, h);
        ctx.fillRect(x + w, y, canvas.width - x - w, h);
        ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
      }
    };
    img.src = history[history.length - 1];
  }, [history, activeTool]);

  // Draw arrow preview
  const drawArrowPreview = useCallback((from, to) => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      drawArrow(ctx, from.x, from.y, to.x, to.y, 16);
    };
    img.src = history[history.length - 1];
  }, [history]);

  const handleMouseDown = useCallback((e) => {
    if (!activeTool || !imageLoaded) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'text') {
      const text = prompt(t('editor.enterText'));
      if (!text) return;
      saveSnapshot();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const fontSize = Math.max(16, Math.round(canvas.width / 40));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const metrics = ctx.measureText(text);
      const padding = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(coords.x - padding, coords.y - fontSize - padding, metrics.width + padding * 2, fontSize + padding * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, coords.x, coords.y);
      // Update history with result
      setHistory(prev => [...prev.slice(0, -1), canvas.toDataURL('image/png')]);
      return;
    }

    setIsDrawing(true);
    setStartPos(coords);
  }, [activeTool, imageLoaded, getCanvasCoords, saveSnapshot, t]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !startPos) return;
    const coords = getCanvasCoords(e);
    if (activeTool === 'crop' || activeTool === 'blur') {
      drawSelectionRect(startPos, coords);
    } else if (activeTool === 'arrow') {
      drawArrowPreview(startPos, coords);
    }
  }, [isDrawing, startPos, activeTool, getCanvasCoords, drawSelectionRect, drawArrowPreview]);

  const handleMouseUp = useCallback((e) => {
    if (!isDrawing || !startPos) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (activeTool === 'crop') {
      const x = Math.min(startPos.x, coords.x);
      const y = Math.min(startPos.y, coords.y);
      const w = Math.abs(coords.x - startPos.x);
      const h = Math.abs(coords.y - startPos.y);
      if (w > 5 && h > 5) {
        // Restore clean image first
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(x, y, w, h);
          canvas.width = w;
          canvas.height = h;
          ctx.putImageData(imageData, 0, 0);
          saveSnapshot();
        };
        img.src = history[history.length - 1];
      } else {
        restoreFromDataUrl(history[history.length - 1]);
      }
    } else if (activeTool === 'blur') {
      const x = Math.round(Math.min(startPos.x, coords.x));
      const y = Math.round(Math.min(startPos.y, coords.y));
      const w = Math.round(Math.abs(coords.x - startPos.x));
      const h = Math.round(Math.abs(coords.y - startPos.y));
      if (w > 5 && h > 5) {
        // Restore clean image first, then apply blur
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(x, y, w, h);
          boxBlur(imageData, 10);
          ctx.putImageData(imageData, x, y);
          saveSnapshot();
        };
        img.src = history[history.length - 1];
      } else {
        restoreFromDataUrl(history[history.length - 1]);
      }
    } else if (activeTool === 'arrow') {
      const dx = coords.x - startPos.x;
      const dy = coords.y - startPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        // Arrow is already drawn via preview, just save snapshot
        saveSnapshot();
      } else {
        restoreFromDataUrl(history[history.length - 1]);
      }
    }

    setIsDrawing(false);
    setStartPos(null);
  }, [isDrawing, startPos, activeTool, getCanvasCoords, history, saveSnapshot, restoreFromDataUrl]);

  const toolBtn = (tool, icon, label) => (
    <button
      onClick={() => setActiveTool(activeTool === tool ? null : tool)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
        activeTool === tool
          ? 'bg-indigo-600 text-white'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/80 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-1">
          {toolBtn('crop', <Crop className="w-4 h-4" />, t('editor.crop'))}
          {toolBtn('text', <Type className="w-4 h-4" />, t('editor.text'))}
          {toolBtn('blur', <Droplets className="w-4 h-4" />, t('editor.blur'))}
          {toolBtn('arrow', <ArrowUpRight className="w-4 h-4" />, t('editor.arrow'))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[40px]"
            title={t('editor.undo')}
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('editor.undo')}</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors min-h-[40px]"
            title={t('editor.save')}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{t('editor.save')}</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[40px]"
            title={t('editor.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing) {
              setIsDrawing(false);
              setStartPos(null);
              if (history.length > 0) restoreFromDataUrl(history[history.length - 1]);
            }
          }}
          className={`max-w-full max-h-full rounded shadow-lg ${
            activeTool === 'text' ? 'cursor-text' : activeTool ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ imageRendering: 'auto' }}
        />
      </div>
    </div>
  );
}
