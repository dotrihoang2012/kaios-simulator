import React from 'react';
import ReactDOM from 'react-dom';
import BaseModule from 'base-module';
import ReactDialog from 'react-dialog';
import '../scss/modal_dialog.scss';

class ModalDialogRenderer extends BaseModule {
  name = 'ModalDialogRenderer';
  start() {
    Service.register('showModalDialog', this);
  }
  showModalDialog(config, module) {
    if (!module.element) {
      return;
    }
    config.translated = true;
    let overlay = document.createElement('div');
    overlay.classList.add('modal-dialog-root');
    module.element.appendChild(overlay);
    module._modalDialog = ReactDOM.render(<ReactDialog {...config} />, overlay);
    module._modalDialog.on('opened', () => {
      setTimeout(() => {
        module._modalDialog.focus();
        Service.request('focus');
      }, 0);
    });
    module._modalDialog.show();

    module._modalDialog.on('closed', () => {
      module.element.removeChild(overlay);
      Service.request('focus');
      let modal_dialogs = module.element.querySelectorAll('.dialog-container');
      if (modal_dialogs.length) {
        modal_dialogs[modal_dialogs.length - 1].focus();
      }
    });
  }
}

var instance = new ModalDialogRenderer();
instance.start();

export default instance;
