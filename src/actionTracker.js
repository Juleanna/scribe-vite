// Система распознавания действий пользователя

class ActionTracker {
  constructor() {
    this.lastAction = null;
    this.isTracking = false;
    this.actionHistory = [];
  }

  // Получить текст элемента (умно)
  getElementText(element) {
    if (!element) return '';
    
    // Для кнопок
    if (element.tagName === 'BUTTON') {
      return element.innerText || element.textContent || element.value || 'кнопка';
    }
    
    // Для ссылок
    if (element.tagName === 'A') {
      return element.innerText || element.textContent || element.href || 'ссылка';
    }
    
    // Для полей ввода
    if (element.tagName === 'INPUT') {
      return element.placeholder || element.name || element.id || 'поле ввода';
    }
    
    if (element.tagName === 'TEXTAREA') {
      return element.placeholder || element.name || 'текстовое поле';
    }
    
    // Для остальных - попробовать найти текст
    const text = element.innerText || element.textContent;
    if (text && text.length < 50) {
      return text.trim();
    }
    
    // Попробовать aria-label или title
    return element.getAttribute('aria-label') || 
           element.title || 
           element.className || 
           'элемент';
  }

  // Получить читаемое описание элемента
  getElementDescription(element) {
    const tag = element.tagName.toLowerCase();
    const text = this.getElementText(element);
    const role = element.getAttribute('role');
    
    if (tag === 'button' || role === 'button') {
      return `кнопку "${text}"`;
    }
    
    if (tag === 'a') {
      return `ссылку "${text}"`;
    }
    
    if (tag === 'input') {
      const type = element.type || 'text';
      if (type === 'checkbox') return `чекбокс "${text}"`;
      if (type === 'radio') return `переключатель "${text}"`;
      if (type === 'submit') return `кнопку "${text}"`;
      return `поле "${text}"`;
    }
    
    if (tag === 'textarea') {
      return `текстовое поле "${text}"`;
    }
    
    if (tag === 'select') {
      return `выпадающий список "${text}"`;
    }
    
    if (role === 'menuitem') {
      return `пункт меню "${text}"`;
    }
    
    if (tag === 'img') {
      return `изображение "${element.alt || 'без описания'}"`;
    }
    
    return `"${text}"`;
  }

  // Отслеживание кликов
  trackClick(event) {
    const element = event.target;
    const description = this.getElementDescription(element);
    
    this.lastAction = {
      type: 'click',
      description: `Нажать на ${description}`,
      element: element,
      timestamp: Date.now()
    };
    
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  // Отслеживание ввода текста
  trackInput(event) {
    const element = event.target;
    const value = element.value;
    const fieldName = this.getElementText(element);
    
    this.lastAction = {
      type: 'input',
      description: `Ввести "${value}" в поле "${fieldName}"`,
      element: element,
      value: value,
      timestamp: Date.now()
    };
    
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  // Отслеживание изменения select
  trackChange(event) {
    const element = event.target;
    
    if (element.tagName === 'SELECT') {
      const selectedOption = element.options[element.selectedIndex];
      const fieldName = this.getElementText(element);
      
      this.lastAction = {
        type: 'select',
        description: `Выбрать "${selectedOption.text}" в "${fieldName}"`,
        element: element,
        value: selectedOption.text,
        timestamp: Date.now()
      };
      
      this.actionHistory.push(this.lastAction);
      return this.lastAction;
    }
  }

  // Отслеживание скролла
  trackScroll() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    
    this.lastAction = {
      type: 'scroll',
      description: `Прокрутить страницу до ${scrollPercent}%`,
      timestamp: Date.now()
    };
    
    return this.lastAction;
  }

  // Отслеживание навигации
  trackNavigation(url) {
    const pageTitle = document.title || 'страница';
    
    this.lastAction = {
      type: 'navigation',
      description: `Перейти на страницу "${pageTitle}"`,
      url: url,
      timestamp: Date.now()
    };
    
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  // Отслеживание появления модальных окон
  trackModalAppearance(modalElement) {
    const modalText = this.getElementText(modalElement);
    
    this.lastAction = {
      type: 'modal',
      description: `Открылось окно "${modalText}"`,
      element: modalElement,
      timestamp: Date.now()
    };
    
    this.actionHistory.push(this.lastAction);
    return this.lastAction;
  }

  // Получить последнее действие
  getLastAction() {
    return this.lastAction;
  }

  // Получить историю действий
  getActionHistory() {
    return this.actionHistory;
  }

  // Очистить историю
  clearHistory() {
    this.actionHistory = [];
    this.lastAction = null;
  }

  // Начать отслеживание
  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    
    // Отслеживание кликов
    this.clickHandler = (e) => this.trackClick(e);
    document.addEventListener('click', this.clickHandler, true);
    
    // Отслеживание ввода с дебаунсом
    let inputTimeout;
    this.inputHandler = (e) => {
      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(() => this.trackInput(e), 1000);
    };
    document.addEventListener('input', this.inputHandler, true);
    
    // Отслеживание изменений select
    this.changeHandler = (e) => this.trackChange(e);
    document.addEventListener('change', this.changeHandler, true);
    
    // Отслеживание скролла
    let scrollTimeout;
    this.scrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => this.trackScroll(), 500);
    };
    window.addEventListener('scroll', this.scrollHandler);
    
    // Отслеживание MutationObserver для модальных окон
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            // Проверяем на модальное окно
            if (node.classList && (
              node.classList.contains('modal') ||
              node.classList.contains('dialog') ||
              node.getAttribute('role') === 'dialog'
            )) {
              this.trackModalAppearance(node);
            }
          }
        });
      });
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('🎯 Action Tracker started');
  }

  // Остановить отслеживание
  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    document.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('input', this.inputHandler, true);
    document.removeEventListener('change', this.changeHandler, true);
    window.removeEventListener('scroll', this.scrollHandler);
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    console.log('🛑 Action Tracker stopped');
  }
}

export default ActionTracker;