import BaseElement from './base.js';

class SoftKey extends BaseElement {
  constructor(node) {
    super(node);
    this.render();
    this.start();
    this.on('softkeychange', this.update.bind(this));
  }

  start() {
    this.els = {};
    ['left', 'center', 'right'].forEach((k) => {
        this.els[k] = this.root.querySelector(`[data-pos=${k}]`);
    });
  }

  generateKeysInfo(keys) {
    const keysInfo = [];
    for (let key in keys) {
      var info = {};
      switch(key) {
        case 'left':
          info.code = 'SoftLeft';
          break;
        case 'center':
          info.code = 'Enter';
          break;
        case 'right':
          info.code = 'SoftRight';
          break;
      }

      const name = keys[key] &&
        !keys[key].startsWith('icon=') &&
        window.api.l10n.get(keys[key]) || keys[key];

      info.options = { name };
      keysInfo.push(info);
    }
    return keysInfo;
  }

  registerSoftkeys(keys) {
    const keysInfo = this.generateKeysInfo(keys);
    if (!keysInfo.length) return;

    // registerSoftkeys
    if (window.registerSoftkeys) {
      window.registerSoftkeys(keysInfo);
    }
  }

  update(keys) {
    this.registerSoftkeys(keys);
    ['left', 'right', 'center'].forEach((k) => {
      keys[k] = keys[k] || '';
      this.els[k].textContent = '';
      if (keys[k].startsWith('icon=')) {
        this.els[k].style.backgroundImage = '';
        this.els[k].dataset.l10nId = '';
        this.els[k].dataset.icon = keys[k].replace('icon=', '');
      } else if (keys[k].startsWith('img=')) {
        this.els[k].dataset.l10nId = '';
        this.els[k].dataset.icon = '';
        this.els[k].style.backgroundImage = keys[k].replace('img=', '');
      } else {
        this.els[k].style.backgroundImage = '';
        this.els[k].dataset.icon = '';
        this.els[k].dataset.l10nId = keys[k];
      }
    });
  }

  view() {
    return `<form class="skbar none-paddings visible focused ${this.theme || ''}">
              <button data-pos="left"></button>
              <button data-pos="center"></button>
              <button data-pos="right"></button>
            </form>`
  }

  render() {
    this.clear();
    this.root.insertAdjacentHTML('afterbegin', this.view());
  }
}

export default SoftKey;
