import BaseElement from './base.js';
import BrowserIconStore from '../browser_icon_store.js';
class GridList extends BaseElement {
  createItem(result, index) {
    const box = document.createElement('div');
    const favicon = document.createElement('img');
    const iconWrapper = document.createElement('div');
    const indexNum = document.createElement('i');
    const data = result.data;
    box.dataset.index = index;
    box.setAttribute('tabindex', '-1');
    iconWrapper.className = 'icon-wrapper';
    iconWrapper.appendChild(favicon);
    favicon.src = '';
    box.appendChild(iconWrapper);

    switch (result.type) {
      case 'pinned':
        if (typeof result.originIndex === 'number') {
          box.dataset.originIndex = result.originIndex;
        }

        box.setAttribute('role', 'menuitem');

        if (data) {
          box.dataset.type = 'pinned';
          box.classList.add('top-site', 'pinned', 'focusable');
          box.dataset.url = data.url;
          box.dataset.title = data.title || data.url;
          box.setAttribute('aria-labelledby', 'header');

          if (data.frecency < 0) {
            box.dataset.preload = true;
          }
        } else {
          box.dataset.type = 'empty';
          box.classList.add('top-site', 'empty', 'focusable');
          box.setAttribute('aria-label', 'empty');
        }

        break;
      case 'basic':
        box.dataset.type = 'basic';
        box.classList.add('basic', 'fixed', 'focusable');
        box.dataset.id = data.id;
        box.setAttribute('role', 'menuitem');
        box.setAttribute('aria-labelledby', 'header');
        break;
      default:
        break;
    }

    indexNum.dataset.num = (index + 1).toLocaleString();
    box.appendChild(indexNum);

    if (data) {
      if (data.frecency <= 0 && data.tile || data.icon) {
        if (data.icon && data.icon.startsWith('defaultIcon=')) {
          iconWrapper.dataset.icon = data.icon.substring(12);
        } else {
          favicon.src = data.tile || data.icon;
        }
      } else {
        this.updateIcon(data, favicon);
      }
    } else {
      iconWrapper.classList.add('default');
    }

    return box;
  }

  updateIcon(place, iconDom) {
    const iconUrl = BrowserIconStore.getIcon(place);

    if (typeof iconUrl === 'string') {
      iconDom.src = iconUrl;
    } else {
      iconUrl.then((uri) => {
        iconDom.src = uri;
        !uri && iconDom.parentElement.classList.add('not-found');
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
        if (this.currentFocus.nextSibling &&
          this.currentFocus.nextSibling.nextSibling &&
          this.currentFocus.nextSibling.nextSibling.nextSibling) {
          this.focus(this.currentFocus.nextSibling.nextSibling.nextSibling);
        } else {
          this.emit('crossboundary', { element: evt.target });
        }

        break;
      case 'ArrowUp':
        if (this.currentFocus.previousSibling &&
          this.currentFocus.previousSibling.previousSibling &&
          this.currentFocus.previousSibling.previousSibling.previousSibling) {
          this.focus(this.currentFocus.previousSibling.previousSibling.previousSibling);
        }
        break;
      case 'ArrowLeft':
        if (this.currentFocus.previousSibling) {
          this.focus(this.currentFocus.previousSibling);
        }
        break;
      case 'ArrowRight':
        if (this.currentFocus.nextSibling) {
          this.focus(this.currentFocus.nextSibling);
        }
        break;
    }
  }

  updateItem(change) {
    if (change.type === 'update') {
      const newItem = this.createItem(change.data, change.index);
      this.root.replaceChild(newItem, this.root.children[change.index]);
      this.focus(newItem);
    }

    this.public('updated');
  }

  render(results) {
    if (results) {
      this.clear();
      const fragment = document.createDocumentFragment();
      results.forEach((result, index) => fragment.appendChild(this.createItem(result, index)));
      this.root.appendChild(fragment);
      this.defaultFocus = this.root.children[0];
      this.public('rendered');
    }
  }
}

export default GridList;
