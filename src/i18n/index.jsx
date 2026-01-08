import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const messages = {
  ru: {
    app: { defaultTitle: 'Нова інструкція', language: 'Мова' },
    export: { html: 'HTML', md: 'MD', pdf: 'PDF' },
    header: { clickToEdit: 'Натисніть, щоб змінити', titlePlaceholder: 'Назва проекту', save: 'Зберегти' },
    headerExt: { toggle: 'Кліковий режим', on: 'Увімк', off: 'Вимк' },
    controls: {
      screenshot: 'Скріншот', autocapture: 'Автозйомка', record: 'Запис відео', stop: 'Зупинити', upload: 'Завантажити файл',
      recordingAuto: 'Триває автозйомка: знімок кожні 3 сек.', recordingManual: 'Триває запис екрана...',
      annotStyle: 'Стиль анотації', arrow: 'Стрілка', box: 'Рамка', both: 'Обидва'
    },
    dictation: {
      label: 'Диктування',
      on: 'Увімк',
      off: 'Вимк',
      hint: 'Alt+R — увімкнути/вимкнути диктування опису'
    },
    clickrec: {
      label: 'Відео у кліковому режимі',
      hint: 'Якщо увімкнено, під час увімкнення клікового режиму буде запускатися запис екрана (може знадобитися підтвердження).'
    },
    autod: { label: 'Автоопис кроків', local: 'Локальне розпізнування (без AI)', regenerate: 'Перегенерувати опис', generating: 'Генерація...' },
    empty: {
      title: 'Почніть створювати інструкцію', subtitle: 'Виберіть дію нижче:',
      list1: '• Натисніть «Скріншот» — знімок екрана', list2: '• Увімкніть «Автозйомка» — кадр кожні 3 секунди',
      list3: '• Виберіть «Запис відео», щоб записати екран.', list4: '• Увімкніть локальний опис — без AI'
    },
    step: { step: 'Крок', titlePlaceholder: 'Назва кроку', descPlaceholder: 'Опис кроку...', videoBadge: 'Відео', edit: 'Редагувати', save: 'Зберегти', moveUp: 'Перемістити вгору', moveDown: 'Перемістити вниз', delete: 'Видалити' },
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
    dictation: {
      label: 'Dictation',
      on: 'On',
      off: 'Off',
      hint: 'Alt+R — toggle dictation for step description'
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
