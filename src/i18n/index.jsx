import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const messages = {
  ru: {
    app: { defaultTitle: 'Новая инструкция', language: 'Язык' },
    export: { html: 'HTML', md: 'MD', pdf: 'PDF' },
    header: { clickToEdit: 'Нажмите, чтобы изменить', titlePlaceholder: 'Название проекта', save: 'Сохранить' },
    headerExt: { toggle: 'Кликовый режим', on: 'Вкл', off: 'Выкл' },
    controls: {
      screenshot: 'Скриншот', autocapture: 'Автосъёмка', record: 'Запись видео', stop: 'Остановить', upload: 'Загрузить файл',
      recordingAuto: 'Идёт автосъёмка: снимок каждые 3 сек', recordingManual: 'Идёт запись экрана...',
      annotStyle: 'Стиль аннотации', arrow: 'Стрелка', box: 'Рамка', both: 'Оба'
    },
    clickrec: {
      label: 'Видео в кликовом режиме',
      hint: 'Если включено, при включении кликового режима будет запускаться запись экрана (может потребоваться подтверждение).'
    },
    autod: { label: 'Автоописание шагов', local: 'Локальное распознавание (без AI)', regenerate: 'Перегенерировать описание', generating: 'Генерация...' },
    empty: {
      title: 'Начните создавать инструкцию', subtitle: 'Выберите действие ниже:',
      list1: '• Нажмите «Скриншот» — снимок экрана', list2: '• Включите «Автосъёмка» — кадр каждые 3 секунды',
      list3: '• Выберите «Запись видео» — записать экран', list4: '• Включите локальное автоописание — без AI'
    },
    step: { step: 'Шаг', titlePlaceholder: 'Название шага', descPlaceholder: 'Описание шага...', videoBadge: 'Видео', edit: 'Редактировать', save: 'Сохранить', moveUp: 'Переместить вверх', moveDown: 'Переместить вниз', delete: 'Удалить' },
  },
  en: {
    app: { defaultTitle: 'New Instruction', language: 'Language' },
    export: { html: 'HTML', md: 'MD', pdf: 'PDF' },
    header: { clickToEdit: 'Click to edit', titlePlaceholder: 'Project title', save: 'Save' },
    headerExt: { toggle: 'Click Capture', on: 'On', off: 'Off' },
    controls: {
      screenshot: 'Screenshot', autocapture: 'Auto-capture', record: 'Record', stop: 'Stop', upload: 'Upload file',
      recordingAuto: 'Auto-capturing: frame every 3s', recordingManual: 'Screen recording in progress...',
      annotStyle: 'Annotation style', arrow: 'Arrow', box: 'Box', both: 'Both'
    },
    clickrec: {
      label: 'Record during click-mode',
      hint: 'If enabled, turning on click-mode starts screen recording (may require user permission).'
    },
    autod: { label: 'Auto-describe steps', local: 'Local recognition (no AI)', regenerate: 'Regenerate description', generating: 'Generating...' },
    empty: {
      title: 'Start creating an instruction', subtitle: 'Pick an action below:',
      list1: '• Press “Screenshot” — capture the screen', list2: '• Turn on “Auto-capture” — frame every 3s',
      list3: '• Use “Record” — capture video', list4: '• Enable local auto-describe — no AI'
    },
    step: { step: 'Step', titlePlaceholder: 'Step title', descPlaceholder: 'Step description...', videoBadge: 'Video', edit: 'Edit', save: 'Save', moveUp: 'Move up', moveDown: 'Move down', delete: 'Delete' },
  },
};

const I18nContext = createContext({ t: (k) => k, locale: 'ru', setLocale: () => {} });

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('ru');
  useEffect(() => { const saved = localStorage.getItem('i18n_locale'); if (saved === 'ru' || saved === 'en') setLocale(saved); }, []);
  useEffect(() => { localStorage.setItem('i18n_locale', locale); }, [locale]);

  const t = useMemo(() => {
    return (key) => {
      const dict = messages[locale] || messages.ru;
      return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict) ?? key;
    };
  }, [locale]);

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
