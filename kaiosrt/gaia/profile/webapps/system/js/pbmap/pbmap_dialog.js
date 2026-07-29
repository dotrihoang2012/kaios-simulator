/* global Service */
(function (exports) {
'use strict';

  let PbmapDialog = {

    USER_CONFIRMATION: 1,
    OBEX_PASSWORD: 2,

    show: function(options, callback) {
      console.log('pbmap dialog show.');
      let _ = window.api.l10n.get;
      let confirmMsg;
      let dialogId;

      confirmMsg = options.profile === 'PBAP' ? 'confirmPbapMsg' : 'confirmMapMsg';
      dialogId = options.profile === 'PBAP' ? 'dialog-pbap' : 'dialog-map';

      if (options.type === this.USER_CONFIRMATION) {
        console.log('bluetooth show dialog');
        Service.request('DialogService:show', {
          id: dialogId,
          header: _('confirmTitle'),
          content: _(confirmMsg, { deviceId: options.message }),
          ok: 'accept',
          type: 'confirm',
          onBack: () => {
            callback(false);
          },
          onCancel: () => {
            callback(false);
          },
          onOk: () => {
            callback(true);
          },
          translated: true
        });
      } else if (options.type === this.OBEX_PASSWORD) {
        Service.request('DialogService:show', {
          id: dialogId,
          header: _('confirmTitle'),
          content: _('initialValue'),
          ok: 'confirm',
          type: 'prompt',
          onCancel: () => {
            callback({
              value: false,
              password: ''
            });
          },
          onBack: () => {
            callback({
              value: false,
              password: ''
            });
          },
          onOk: (value) => {
            callback({
              value: true,
              password: value
            });
          },
          translated: true
        });

        let customInput = window.document.getElementById('custom-input');
        if (customInput) {
          customInput.setAttribute('maxLength', '16');
        }
      }
    }

  };
  exports.PbmapDialog = PbmapDialog;
})(window);
