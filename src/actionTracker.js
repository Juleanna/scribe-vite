// Трекинг действий пользователя для локального автоописания

class ActionTracker {
  constructor() {
    this.lastAction = null;
    this.isTracking = false;
    this.actionHistory = [];
  }

  getElementText(element) {
    if (!element) return '';
    if (element.tagName === 'BUTTON') {
      return element.innerText || element.textContent || element.value || 'Кнопка';
    }
    if (element.tagName === 'A') {
      return element.innerText || element.textContent || element.href || 'Ссылка';
    }
    if (element.tagName === 'INPUT') {
      return element.placeholder || element.name || element.id || 'Поле ввода';
    }
    if (element.tagName === 'TEXTAREA') {
      return element.placeholder || element.name || 'Текстовое поле';
    }
    const text = element.innerText || element.textContent;
    if (text && text.trim().length > 0 && text.trim().length < 50) {
      return text.trim();
    }
    return element.getAttribute('aria-label') || element.title || element.className || 'Элемент';
  }

  getElementDescription(element) {
    const tag = element.tagName.toLowerCase();
    const text = this.getElementText(element);
    const role = element.getAttribute('role');
    if (tag === 'button' || role === 'button') return `Кнопка "${text}"`;
    if (tag === 'a') return `Ссылка "${text}"`;
    if (tag === 'input') {
      const type = element.type || 'text';
      if (type === 'checkbox') return `Флажок "${text}"`;
      if (type === 'radio') return `Переключатель "${text}"`;
      if (type === 'submit') return `Кнопка "${text}"`;
      return `Поле "${text}"`;
    }
    if (tag === 'textarea') return `Текстовое поле "${text}"`;
    if (tag === 'select') return `Список "${text}"`;
    if (role === 'menuitem') return `Пункт меню "${text}"`;
    if (tag === 'img') return `Изображение "${element.alt || 'без описания'}"`;
    return `"${text}"`;
  }

  trackClick(event) {
    const element = event.target;
    const description = this.getElementDescription(element);
    this.lastAction = { type: 'click', description: `Клик по ${description}`, element, timestamp: Date.now() };
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  trackInput(event) {
    const element = event.target;
    const value = element.value;
    const fieldName = this.getElementText(element);
    this.lastAction = { type: 'input', description: `Ввод "${value}" в поле "${fieldName}"`, element, value, timestamp: Date.now() };
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  trackChange(event) {
    const element = event.target;
    if (element.tagName === 'SELECT') {
      const selectedOption = element.options[element.selectedIndex];
      const fieldName = this.getElementText(element);
      this.lastAction = { type: 'select', description: `Выбор "${selectedOption.text}" в "${fieldName}"`, element, value: selectedOption.text, timestamp: Date.now() };
      this.actionHistory.push(this.lastAction);
      return this.lastAction;
    }
  }

  trackScroll() {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    this.lastAction = { type: 'scroll', description: `Прокрутка страницы на ${scrollPercent}%`, timestamp: Date.now() };
    return this.lastAction;
  }

  trackNavigation(url) {
    const pageTitle = document.title || 'Страница';
    this.lastAction = { type: 'navigation', description: `Переход на страницу "${pageTitle}"`, url, timestamp: Date.now() };
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  trackModalAppearance(modalElement) {
    const modalText = this.getElementText(modalElement);
    this.lastAction = { type: 'modal', description: `Появилось окно "${modalText}"`, element: modalElement, timestamp: Date.now() };
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  getLastAction() { return this.lastAction; }
  getActionHistory() { return this.actionHistory; }
  clearHistory() { this.actionHistory = []; this.lastAction = null; }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.clickHandler = (e) => this.trackClick(e);
    document.addEventListener('click', this.clickHandler, true);
    let inputTimeout;
    this.inputHandler = (e) => { clearTimeout(inputTimeout); inputTimeout = setTimeout(() => this.trackInput(e), 800); };
    document.addEventListener('input', this.inputHandler, true);
    this.changeHandler = (e) => this.trackChange(e);
    document.addEventListener('change', this.changeHandler, true);
    let scrollTimeout;
    this.scrollHandler = () => { clearTimeout(scrollTimeout); scrollTimeout = setTimeout(() => this.trackScroll(), 400); };
    window.addEventListener('scroll', this.scrollHandler);
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList && (node.classList.contains('modal') || node.classList.contains('dialog') || node.getAttribute('role') === 'dialog')) {
              this.trackModalAppearance(node);
            }
          }
        });
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    console.log('Action Tracker started');
  }

  stopTracking() {
    if (!this.isTracking) return;
    this.isTracking = false;
    document.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('input', this.inputHandler, true);
    document.removeEventListener('change', this.changeHandler, true);
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.observer) this.observer.disconnect();
    console.log('Action Tracker stopped');
  }
}

export default ActionTracker;

