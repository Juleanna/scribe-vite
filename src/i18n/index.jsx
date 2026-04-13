import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const messages = {
  uk: {
    app: { defaultTitle: 'Нова інструкція', language: 'Мова' },
    export: { html: 'HTML', md: 'MD', pdf: 'PDF', docx: 'DOCX' },
    header: { clickToEdit: 'Натисніть, щоб змінити', titlePlaceholder: 'Назва проекту', save: 'Зберегти', back: 'Назад до проектів', logout: 'Вийти' },
    headerExt: { toggle: 'Кліковий режим', on: 'Увімк', off: 'Вимк' },
    controls: {
      screenshot: 'Скріншот', autocapture: 'Автозйомка', record: 'Запис відео', stop: 'Зупинити', upload: 'Завантажити файл',
      recordingAuto: 'Триває автозйомка: знімок кожні 3 сек.', recordingManual: 'Триває запис екрана...',
      annotStyle: 'Стиль анотації', arrow: 'Стрілка', box: 'Рамка', both: 'Обидва'
    },
    dictation: { label: 'Диктування', on: 'Увімк', off: 'Вимк', hint: 'Alt+R — увімкнути/вимкнути диктування опису' },
    clickrec: { label: 'Відео у кліковому режимі', hint: 'Якщо увімкнено, під час увімкнення клікового режиму буде запускатися запис екрана (може знадобитися підтвердження).' },
    autod: { label: 'Автоопис кроків', local: 'Локальне розпізнування (без AI)', regenerate: 'Перегенерувати опис', generating: 'Генерація...' },
    empty: {
      title: 'Почніть створювати інструкцію', subtitle: 'Виберіть дію нижче:',
      list1: '• Натисніть «Скріншот» — знімок екрана', list2: '• Увімкніть «Автозйомка» — кадр кожні 3 секунди',
      list3: '• Виберіть «Запис відео», щоб записати екран.', list4: '• Увімкніть локальний опис — без AI'
    },
    step: { step: 'Крок', titlePlaceholder: 'Назва кроку', descPlaceholder: 'Опис кроку...', videoBadge: 'Відео', edit: 'Редагувати', save: 'Зберегти', moveUp: 'Перемістити вгору', moveDown: 'Перемістити вниз', delete: 'Видалити' },
    undo: { undo: 'Скасувати', redo: 'Повторити' },
    auth: {
      subtitle: 'Створюйте покрокові інструкції',
      password: 'Пароль',
      login: 'Увійти',
      register: 'Зареєструватись',
      or: 'або',
      noAccount: 'Немає акаунту?',
      hasAccount: 'Вже є акаунт?',
      loginError: 'Невірний email або пароль',
      registerError: 'Помилка реєстрації',
      loginAfterRegisterError: 'Реєстрація успішна, але не вдалося увійти автоматично',
      networkError: 'Помилка мережі. Спробуйте пізніше.',
    },
    projects: {
      title: 'Мої інструкції',
      new: 'Нова інструкція',
      empty: 'Ще немає інструкцій',
      emptyHint: 'Створіть першу інструкцію для початку роботи',
      createFirst: 'Створити інструкцію',
      steps: 'кроків',
      delete: 'Видалити',
      confirmDelete: 'Видалити цю інструкцію? Цю дію не можна скасувати.',
      loading: 'Завантаження...',
    },
    profile: {
      title: 'Профіль',
      firstName: "Ім'я",
      lastName: 'Прізвище',
      language: 'Мова інтерфейсу',
      save: 'Зберегти',
      saved: 'Збережено!',
      changePassword: 'Змінити пароль',
      oldPassword: 'Поточний пароль',
      newPassword: 'Новий пароль',
      pwError: 'Невірний пароль',
      pwChanged: 'Пароль успішно змінено',
    },
    ext: {
      title: 'Встановіть розширення для клікового режиму',
      description: 'Кліковий режим потребує браузерного розширення, яке перехоплює кліки на будь-якій сторінці та робить скріншоти автоматично.',
      hint: 'Після встановлення перезавантажте цю сторінку.',
      close: 'Закрити',
    },
    editor: { crop: 'Обрізати', text: 'Текст', blur: 'Розмити', arrow: 'Стрілка', undo: 'Скасувати', save: 'Зберегти', close: 'Закрити', editImage: 'Редагувати зображення', enterText: 'Введіть текст:' },
    templates: { duplicate: 'Дублювати', duplicated: 'Дубльовано!' },
    share: { share: 'Поділитись', copied: 'Посилання скопійовано!' },
    versions: { title: 'Історія змін', restore: 'Відновити' },
    save: { saved: 'Збережено', saving: 'Зберігається...', error: 'Помилка збереження' },
    shared: { title: 'Інструкція', createdWith: 'Створено за допомогою', createOwn: 'Створити свою інструкцію' },
    search: { placeholder: 'Пошук інструкцій...', noResults: 'Нічого не знайдено' },
    tags: { title: 'Теги', add: 'Додати тег', name: 'Назва тегу', color: 'Колір' },
    bulk: { selected: 'Вибрано', deleteSelected: 'Видалити вибрані', selectAll: 'Вибрати всі', deselectAll: 'Зняти вибір' },
    theme: { dark: 'Темна тема', light: 'Світла тема' },
  },
  en: {
    app: { defaultTitle: 'New Instruction', language: 'Language' },
    export: { html: 'HTML', md: 'MD', pdf: 'PDF', docx: 'DOCX' },
    header: { clickToEdit: 'Click to edit', titlePlaceholder: 'Project title', save: 'Save', back: 'Back to projects', logout: 'Logout' },
    headerExt: { toggle: 'Click Capture', on: 'On', off: 'Off' },
    controls: {
      screenshot: 'Screenshot', autocapture: 'Auto-capture', record: 'Record', stop: 'Stop', upload: 'Upload file',
      recordingAuto: 'Auto-capturing: frame every 3s', recordingManual: 'Screen recording in progress...',
      annotStyle: 'Annotation style', arrow: 'Arrow', box: 'Box', both: 'Both'
    },
    dictation: { label: 'Dictation', on: 'On', off: 'Off', hint: 'Alt+R — toggle dictation for step description' },
    clickrec: { label: 'Record during click-mode', hint: 'If enabled, turning on click-mode starts screen recording (may require user permission).' },
    autod: { label: 'Auto-describe steps', local: 'Local recognition (no AI)', regenerate: 'Regenerate description', generating: 'Generating...' },
    empty: {
      title: 'Start creating an instruction', subtitle: 'Pick an action below:',
      list1: '• Press "Screenshot" — capture the screen', list2: '• Turn on "Auto-capture" — frame every 3s',
      list3: '• Use "Record" — capture video', list4: '• Enable local auto-describe — no AI'
    },
    step: { step: 'Step', titlePlaceholder: 'Step title', descPlaceholder: 'Step description...', videoBadge: 'Video', edit: 'Edit', save: 'Save', moveUp: 'Move up', moveDown: 'Move down', delete: 'Delete' },
    undo: { undo: 'Undo', redo: 'Redo' },
    auth: {
      subtitle: 'Create step-by-step instructions',
      password: 'Password',
      login: 'Sign in',
      register: 'Sign up',
      or: 'or',
      noAccount: 'No account?',
      hasAccount: 'Already have an account?',
      loginError: 'Invalid email or password',
      registerError: 'Registration failed',
      loginAfterRegisterError: 'Registration succeeded but auto-login failed',
      networkError: 'Network error. Please try again later.',
    },
    projects: {
      title: 'My Instructions',
      new: 'New Instruction',
      empty: 'No instructions yet',
      emptyHint: 'Create your first instruction to get started',
      createFirst: 'Create instruction',
      steps: 'steps',
      delete: 'Delete',
      confirmDelete: 'Delete this instruction? This cannot be undone.',
      loading: 'Loading...',
    },
    profile: {
      title: 'Profile',
      firstName: 'First name',
      lastName: 'Last name',
      language: 'Interface language',
      save: 'Save',
      saved: 'Saved!',
      changePassword: 'Change password',
      oldPassword: 'Current password',
      newPassword: 'New password',
      pwError: 'Wrong password',
      pwChanged: 'Password changed successfully',
    },
    ext: {
      title: 'Install the extension for click capture mode',
      description: 'Click capture mode requires a browser extension that intercepts clicks on any page and takes screenshots automatically.',
      hint: 'After installation, reload this page.',
      close: 'Close',
    },
    editor: { crop: 'Crop', text: 'Text', blur: 'Blur', arrow: 'Arrow', undo: 'Undo', save: 'Save', close: 'Close', editImage: 'Edit image', enterText: 'Enter text:' },
    templates: { duplicate: 'Duplicate', duplicated: 'Duplicated!' },
    share: { share: 'Share', copied: 'Link copied!' },
    versions: { title: 'Version history', restore: 'Restore' },
    save: { saved: 'Saved', saving: 'Saving...', error: 'Save error' },
    shared: { title: 'Instruction', createdWith: 'Created with', createOwn: 'Create your own instruction' },
    search: { placeholder: 'Search instructions...', noResults: 'Nothing found' },
    tags: { title: 'Tags', add: 'Add tag', name: 'Tag name', color: 'Color' },
    bulk: { selected: 'Selected', deleteSelected: 'Delete selected', selectAll: 'Select all', deselectAll: 'Deselect all' },
    theme: { dark: 'Dark mode', light: 'Light mode' },
  },
};

const I18nContext = createContext({ t: (k) => k, locale: 'uk', setLocale: () => {} });

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('uk');
  useEffect(() => { const saved = localStorage.getItem('i18n_locale'); if (saved === 'uk' || saved === 'en') setLocale(saved); }, []);
  useEffect(() => { localStorage.setItem('i18n_locale', locale); }, [locale]);

  const t = useMemo(() => {
    return (key) => {
      const dict = messages[locale] || messages.uk;
      return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict) ?? key;
    };
  }, [locale]);

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
