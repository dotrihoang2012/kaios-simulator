import BaseElement from './base.js';

class Header extends BaseElement {
  update(text, translate = false) {
    if (translate) {
      this.root.dataset.l10nId = text || '';
    } else {
      this.root.textContent = text || '';
    }
  }
}

export default Header;
