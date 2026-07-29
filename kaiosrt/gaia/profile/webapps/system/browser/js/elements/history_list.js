import BaseElement from './base.js';
import BrowserIconStore from '../browser_icon_store.js';

class HistoryList extends BaseElement {
  createItem(result, index) {
    if (result.type == "separator") {
      const separator = document.createElement('h3');
      separator.dataset.l10nId = result.data.label;

      if (result.data.args) {
        separator.dataset.l10nArgs = JSON.stringify(result.data.args);
      }

      return separator;
    } else {
      const box = document.createElement('div');
      const favicon = document.createElement('img');
      const iconWrapper = document.createElement('div');
      const description = document.createElement('div');
      const title = document.createElement('span');
      const meta = document.createElement('small');
      const data = result.data;

      box.classList.add('result', 'focusable', 'list-item');
      box.tabIndex = 0;
      iconWrapper.classList.add('icon-wrapper');
      favicon.src = '';
      description.classList.add('description');
      title.classList.add('title', 'p-pri');
      meta.classList.add('meta', 'p-sec');
      meta.setAttribute('dir', 'ltr');
      box.dataset.url = data.url;

      if (data.title) {
        title.textContent = data.title;
      } else {
        title.textContent = data.url;
        description.classList.add('no-title');
      }

      meta.textContent = data.url
        .replace(/^[a-z\u00a1-\uffff0-9-+]+:(\/\/)?/i, '');

      if (data.description) {
        meta.id = this.name + '-description-' + index;
        meta.setAttribute('aria-label', data.description);
        box.setAttribute('aria-describedby', meta.id);
      }

      box.setAttribute('role', 'link');
      box.setAttribute('aria-label', data.label || data.title);

      description.appendChild(title);
      description.appendChild(meta);
      iconWrapper.appendChild(favicon);
      box.appendChild(iconWrapper);
      box.appendChild(description);
      this.updateIcon(data, favicon);
      return box;
    }
  }

  updateIcon(place, iconDom) {
    const iconUrl = BrowserIconStore.getIcon(place);

    if (typeof iconUrl === 'string') {
      iconDom.src = iconUrl;
    } else {
      const iconWrapper = iconDom.parentElement;
      iconWrapper.classList.add('loading');
      iconUrl.then((uri) => {
        iconDom.src = uri;
        iconWrapper.classList.remove('loading')
        !uri && iconWrapper.classList.add('not-found');
      });
    }
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
    this.emit(`${key.toLocaleLowerCase()}-press`, { element: evt.target });
    switch(key) {
      case 'ArrowDown':
        if (this.focusIndex < this.candidates.length - 1) {
          this.focusIndex = this.focusIndex + 1;
          this.focus(this.candidates[this.focusIndex]);
        } else if (this.loop === 'all' || this.loop === 'only-down') {
          this.focusIndex = 0;
          this.focus(this.candidates[this.focusIndex]);
        } else {
          this.emit('list-crossboundary', { dir: 'down' });
        }

        break;
      case 'ArrowUp':
        if (this.focusIndex > 0) {
          this.focusIndex = this.focusIndex - 1;
          this.focus(this.candidates[this.focusIndex]);
        } else if (this.loop === 'all' || this.loop === 'only-up') {
          this.focusIndex = this.candidates.length - 1;
          this.focus(this.candidates[this.focusIndex]);
        } else {
          this.emit('list-crossboundary', { dir: 'up' });
        }

        break;
      case 'Backspace':
        evt.preventDefault();
        evt.stopPropagation();
        this.emit('home');
        break;
    }
  }

  focus(element) {
    if (element === this.defaultFocus) {
      this.focusIndex = 0;
    }

    super.focus(element);
    this.scrollToElement();
  }

  scrollToElement() {
    if (this.focusIndex === 0) {
      this.root.scrollTop = 0;
      return;
    }

    const rect = this.currentFocus.getBoundingClientRect();
    const containerRect = this.root.getBoundingClientRect();

    if (rect.top < containerRect.top) {
      this.root.scrollTop -= (containerRect.top - rect.top);
    } else if (rect.bottom > containerRect.bottom) {
      this.root.scrollTop += (rect.bottom - containerRect.bottom);
    }
  }

  update(results) {
    const container = document.getElementById('history-sites');
    const noSites = document.getElementById('no-sites');

    if (!results) return;
    container.innerHTML = '';

    if (results.length > 0) {
      const fragment = document.createDocumentFragment();

      results.forEach((result, index) => {
        fragment.appendChild(this.createItem(result, index));
      });

      container.appendChild(fragment);
      container.classList.remove('hidden');
      noSites.classList.add('hidden');
      this.candidates = Array.from(this.root.querySelectorAll('.focusable'));
    } else {
      this.candidates = [noSites];
      container.classList.add('hidden');
      noSites.classList.remove('hidden');
    }

    this.currentFocus = null;
    this.lastFocused = null;
    this.defaultFocus = this.candidates[0];
    this.focusIndex = 0;
  }

  view() {
    return `<div>
              <div id="history-sites" class="hidden" aria-labelledby="header"></div>
              <div id="no-sites" class="hidden" tabindex="-1" role="menuitem"
                aria-describedby="no-sites-description">
                <img src="/browser/style/img/img_no_website.png">
                <p id="no-sites-description" data-l10n-id="no-sites-description"></p>
              </div>
            </div>`
  }

  render(results, loop = 'all') {
    this.clear();
    this.loop = loop;
    this.root.insertAdjacentHTML('afterbegin', this.view());
    this.update(results);
    this.public('rendered');
  }
}

export default HistoryList;
