import emitter from '../emitter.js';

const DEBUG = true;

class BaseElement {
  constructor(node) {
    if (node) {
      this.root = node;
      this.constructor._id = this.constructor._id ? 0 : this.constructor._id + 1;
      this.registerEvents();
    } else {
      this.debug('a root node is needed.');
    }
  }

  registerEvents() {}

  unregisterEvents() {}

  destroy() {
    this.clear();
    this.unregisterEvents();
    this.root = null;
  }

  focus(element) {
    if (element instanceof HTMLElement && this.root.contains(element)) {
      element.focus();
    } else if (this.lastFocused) {
      this.lastFocused.focus();
    } else if (this.defaultFocus) {
      this.defaultFocus.focus();
    } else {
      return;
    }

    this.currentFocus = document.activeElement;
    this.lastFocused = this.currentFocus;
    this.emit('onfocus', { element: this.currentFocus });
  }

  clear() {
    this.root.innerHTML = '';
  }

  public(type) {
    this.root.dispatchEvent(new CustomEvent(type, { bubbles: true }));
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  isActive() {
    return !this.root.classList.contains('hidden');
  }

  emit(type, data) {
    emitter.emit(type, data);
  }

  on(type, callback) {
    emitter.on(type, callback);
  }

  off(type, callback) {
    emitter.off(type, callback);
  }

  rtlConvert(key) {
    if ('rtl' === document.dir) {
      return { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' }[key] || key;
    }

    return key;
  }

  debug(...args) {
    if (DEBUG) {
      console.log(`[browser][${this.constructor.name}]`, ...args);
    }
  }
}

export default BaseElement;
