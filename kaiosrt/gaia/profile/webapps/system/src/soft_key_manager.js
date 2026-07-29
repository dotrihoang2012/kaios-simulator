import React from 'react';
import ReactDOM from 'react-dom';
import SoftKeyStore from 'soft-key-store';
import ReactSoftKey from 'react-soft-key';
import BaseComponent from 'base-component';
import '../scss/soft_key.scss';

export default class SoftKeyManager extends ReactSoftKey {
  name = 'SoftKeyManager';

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    this.store = SoftKeyStore;
    SoftKeyStore.on('change', () => {
      const keys = SoftKeyStore.currentKeys;
      const theme = SoftKeyStore.currentTheme || '';
      this.softkeys.forEach((k) => {
        keys[k] = this.uniformContent(keys[k] || '');
      });
      this.setState(Object.assign({}, keys, { theme }));
      if (this.isActive()) {
        Service.request('currentSoftKeyUpdate');
      }
    });
    document.addEventListener('focus', this, true);
    window.addEventListener('blur', this);
    this._handle_focus();
    window.Service.registerState('isActive', this);
    window.Service.registerState('getSoftkeys', this);
  };

  focus() {
    // do nothing.
  }

  componentDidUpdate() {
    this._handle_focus();
  }

  _handle_blur() {
    if (document.activeElement !== document.body) {
      return;
    }
    this.setState({left: '', right: '', center: '', theme: ''});
  }

  shouldIgnore() {
    const isBrowserElement =
      document.activeElement.tagName.toLowerCase() === 'browser';
    const hasMozApp = 
      document.activeElement.parentElement.hasAttribute('mozapp');
    // In case of Browser app, it does not have 'mozapp'.
    // In case of Hosted app, it might have 'mozapp=http..'.
    const topUI = Service.query('getTopMostUI');
    if (isBrowserElement &&
      (hasMozApp || (topUI && topUI.name === 'AttentionWindowManager'))) {
      return !SoftKeyStore.registeredDOMMap.get(document.activeElement);
    } else {
      return false;
    }
  }

  getSoftkeys() {
    return SoftKeyStore.generateKeysInfo(SoftKeyStore.currentKeys);
  }

  _handle_focus() {
    if (this.shouldIgnore()) {
      this.debug('should ignore');
      this.hide();
      return;
    }

    let shouldHide = true;
    this.softkeys.forEach(k => {
      shouldHide = shouldHide && (
        !this.state[k] || (!this.state[k].icon && !this.state[k].text)
      );
    });
    if (shouldHide) {
      this.debug('no soft key');
      this.hide();
      return;
    }
    this.show();
  }
}
