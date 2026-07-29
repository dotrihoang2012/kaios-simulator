import BaseElement from './base.js';
import BrowserIconStore from '../browser_icon_store.js';
class Slider extends BaseElement {

  rootFontSize = getComputedStyle(document.documentElement).fontSize;
  visibleCount = window.innerWidth / (parseInt(this.rootFontSize, 10) * 4) - 1;
  defaultIcon = 'style/img/ic_default_app_56.png';
  translateDis = 0;

  createItem(result, index) {
    const box = document.createElement('div');
    const favicon = document.createElement('img');
    box.setAttribute('tabindex', '-1');

    box.classList.add('recommend-app', 'focusable');
    box.dataset.url = result.manifest_url;
    box.dataset.name = result.name;
    box.setAttribute('role', 'menuitem');
    box.setAttribute('aria-labelledby', 'header');

    if (result.locales) {
      const langCode = window.api.l10n.language.code ||
        result.defaultLocale || 'en-US';
      box.dataset.title = result.locales[langCode].name;
    } else {
      box.dataset.title = result.display;
    }

    box.dataset.index = index;
    index === 0 && box.classList.add('boundary-left');
    index === this.visibleCount - 1 && box.classList.add('boundary-right');

    const iconSizes = Object.keys(result.icons);
    const url = result.icons[iconSizes[0]];

    BrowserIconStore.fetchIcon(url, (err, uri) => {
      if (err || !uri) {
        favicon.src = this.defaultIcon;
      } else {
        favicon.src = uri;
      }
    });

    favicon.src = this.defaultIcon;
    box.appendChild(favicon);
    return box;
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
    const key = this.rtlConvert(evt.key);

    if (Number.isInteger(parseInt(key, 10))) {
      this.focus(this.root.querySelector(`[data-index='${key - 1}']`));
    }

    this.emit(`${key.toLocaleLowerCase()}-press`, { element: evt.target });
    switch(key) {
      case 'ArrowUp':
        this.emit('crossboundary', { element: evt.target });
        break;
      case 'ArrowLeft':
        if (this.currentFocus.previousSibling) {
          this.translate(this.currentFocus.previousSibling, key);
          this.focus(this.currentFocus.previousSibling);
        }
        break;
      case 'ArrowRight':
        if (this.currentFocus.nextSibling) {
          this.translate(this.currentFocus.nextSibling, key);
          this.focus(this.currentFocus.nextSibling);
        }
        break;
    }
  }

  translate(element, key) {
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const index = parseInt(element.dataset.index, 10);
    const shiftNum = this.visibleCount - 1;
    let margin = 0;
    let isRtl = 'rtl' === document.dir;

    if (key === 'ArrowLeft') {
      margin = elementRect.left - elementRect.width / 2;

      if (margin < 0) {
        if (isRtl) {
          this.translateDis =
            Math.max(this.translateDis + Math.abs(margin), 0);
          parent.style.transform = `translateX(${this.translateDis}px)`;

          const leftBoundary = Math.max(index, shiftNum);
          this.boundaryElements = [leftBoundary - shiftNum, leftBoundary];
        } else {
          this.translateDis =
            Math.min(this.translateDis + Math.abs(margin), 0);
          parent.style.transform = `translateX(${this.translateDis}px)`;

          const leftBoundary = Math.max(index - 1, 0);
          this.boundaryElements = [leftBoundary, leftBoundary + shiftNum];
        }
      }
    } else {
      margin = parentRect.width - elementRect.right - elementRect.width / 2;

      if (margin < 0) {
        if (isRtl) {
          this.translateDis =
            Math.max(this.translateDis + margin, 0);
          parent.style.transform = `translateX(${this.translateDis}px)`;

          const rightBoundary = Math.max(index - 1, 0);
          this.boundaryElements = [rightBoundary, rightBoundary + shiftNum];
        } else {
          this.translateDis =
            Math.min(this.translateDis + margin, 0);
          parent.style.transform = `translateX(${this.translateDis}px)`;

          const rightBoundary = Math.max(index, shiftNum);
          this.boundaryElements = [rightBoundary - shiftNum, rightBoundary];
        }
      }
    }
  }

  addBoundaryClass() {
    const slider = this.root.querySelector('#slider');
    slider.style.transform = 'translateX(0)';

    Array.from(slider.children).forEach((el) => {
      const index = parseInt(el.dataset.index, 10);

      if (index < this.boundaryElements[0]) {
        el.classList.add('hidden');
      } else if (index === this.boundaryElements[0]) {
        el.classList.add('boundary-left');
      } else if (index === this.boundaryElements[1]) {
        el.classList.add('boundary-right');
      }
    });
  }

  removeBoundaryClass() {
    const slider = this.root.querySelector('#slider');
    slider.style.transform = `translateX(${this.translateDis}px)`;

    Array.from(slider.children).forEach((el) => {
      el.classList.remove('boundary-left');
      el.classList.remove('boundary-right');
      el.classList.remove('hidden');
    });
  }

  update(results) {
    if (!results) return;
    const slider = this.root.querySelector('#slider');
    const hint = this.root.querySelector('#slider-hint');
    const fragment = document.createDocumentFragment();
    let isOk = false;
    switch (results.status) {
      case 'ok':
        results.data.forEach((result, index) => {
          fragment.appendChild(this.createItem(result, index))
        });
        slider.innerHTML = '';
        slider.appendChild(fragment);
        this.translateDis = 0;
        this.defaultFocus = slider.children[0];
        this.lastFocused = null;
        this.boundaryElements = [
          0,
          Math.min(results.data.length, this.visibleCount - 1)
        ];
        isOk = true;
        break;
      case 'loading':
        hint.dataset.l10nId = '';
        hint.textContent = '';
        break;
      case 'net-error':
        hint.dataset.l10nId = "no-internet";
        break;
      case 'server-error':
        hint.dataset.l10nId = "connect-error";
        break;
      case 'no-available-content':
        hint.dataset.l10nId = 'no-data';
        break;
      default:
        break;
    }

    hint.classList.toggle('hidden', isOk);
    slider.classList.toggle('hidden', !isOk);
  }

  view() {
    return `<div class="slider-wrapper">
              <p id="slider-hint" tabindex="-1" dir="auto"></p>
              <div id="slider" class="hidden" role="menu"></div>
            </div>`
  }

  render(results) {
    this.clear();
    this.root.insertAdjacentHTML('afterbegin', this.view());
    this.update(results);
    this.public('rendered');
  }
}

export default Slider;
