import React from 'react';
import ReactDOM from 'react-dom';
import BaseModule from 'base-module';
import OptionMenu from 'react-option-menu';
import SoftKeyStore from 'soft-key-store';

class OptionMenuRenderer extends BaseModule {
  name = 'OptionMenuRenderer';
  optionMenu = null;
  start() {
    Service.register('showOptionMenu', this);
    Service.register('hideOptionMenu', this);
  }

  hideOptionMenu() {
    this.optionMenu && this.optionMenu.hide();
    this.optionMenu = null;
  }
  onkeypress(evt) {
    switch (evt.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        evt.stopPropagation();
        evt.preventDefault();
        break;
      default:
        break;
    }
  }

  showOptionMenu(config, module) {
    if (!module.element) {
      var menu = ReactDOM.render(<OptionMenu />, document.getElementById('menu-root'));
      if (menu.element) {
        menu.element.onkeypress = this.onkeypress;
      }
      menu.show(config);
      menu.on('closed', () => {
        Service.request('focus');
      });
      this.optionMenu = menu;
      return;
    }
    if (module._optionMenu) {
      module._optionMenu.show(config);
    } else {
      var overlay = document.createElement('div');
      overlay.classList.add('option-menu-root');
      module.element.appendChild(overlay);
      module._optionMenu = ReactDOM.render(<OptionMenu />, overlay);
      if (module._optionMenu.element) {
        module._optionMenu.element.onkeypress = this.onkeypress;
      }
      module._optionMenu.on('opened', function opened() {
        Service.request('focus');
        module._optionMenu.off('opened', opened);
      });
      module._optionMenu.show(config);
      module._optionMenu.on('closed', function closed() {
        Service.request('focus');
        module._optionMenu.off('closed', closed);
        SoftKeyStore.unregister(module._optionMenu.element);
        module.element.removeChild(overlay);
        module._optionMenu = null;
        ReactDOM.unmountComponentAtNode(overlay);
      });
    }
    this.optionMenu = module._optionMenu;
  }
}

var instance = new OptionMenuRenderer();
instance.start();

export default instance;
