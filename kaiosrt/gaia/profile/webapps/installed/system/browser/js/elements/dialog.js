import BaseElement from './base.js';

class Dialog extends BaseElement {
  constructor(node) {
    super(node);
    this.render();
    this.start();
  }

  start() {
    this.els = {};
    this.els.container = this.root.querySelector('.dialog-container');
    this.els.header = this.root.querySelector('#dialog-header');
    this.els.content = this.root.querySelector('#dialog-content');
  }

  show(options = {}) {
    const { title, content, translate = true, cancel, ok = '' } = options;

    this.softKey = {
      left: cancel,
      center: '',
      right: ok
    }

    this.onOk = typeof options.onOk === 'function' ?
      options.onOk : () => {};
    this.onCancel = typeof options.onCancel === 'function' ?
      options.onCancel : () => {};

    if (translate) {
      this.els.header.dataset.l10nId = title;
      this.els.content.dataset.l10nId = content;
    } else {
      this.els.header.textContent = title;
      this.els.content.textContent = content;
    }

    this.root.classList.remove('hidden');
    this.focus(this.els.container);
  }

  registerEvents() {
    this.root.addEventListener('keydown', this);
  }

  unregisterEvents() {
    this.root.removeEventListener('keydown', this);
  }

  handleEvent(evt) {
    switch (evt.type) {
      case 'keydown':
        this.handleKeydown(evt);
        break;
      default:
        break;
    }
  }

  handleKeydown(evt) {
    switch(evt.key) {
      case 'SoftLeft':
        this.hide();
        this.onCancel();
        break;
      case 'SoftRight':
        this.hide();
        this.onOk();
        break;
      case 'Backspace':
        evt.preventDefault();
        evt.stopPropagation();
        this.hide();
        this.onCancel();
        break;
    }
  }

  view() {
    return `<div class="dialog-container" tabindex="-1" role="dialog">
              <div class="dialog-wrap">
                <h3 id="dialog-header" aria-describedby="dialog-content"></h3>
                <div id="dialog-content"></div>
              </div>
            </div>`
  }

  render() {
    this.clear();
    this.root.insertAdjacentHTML('afterbegin', this.view());
  }
}

export default Dialog;
