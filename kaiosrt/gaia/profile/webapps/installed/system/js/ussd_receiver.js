/* global Service, DUMP */
let ussdReceiver = {
  init: function _init() {
    window.addEventListener('serviceworkermessage', (event) => {
      const message = event.detail;
      if (message && message.type === 'ussd-received') {
        this.handleUssd(message.data);
      }
    });
  },

  handleUssd: function _handleUssd(evt) {
    DUMP('ussd: handle ussd ', evt);
    if (evt.sessionEnded) {
      this.onUssdReceivedNoSession(evt);
      this.mmiloading = false;
    } else {
      let cancelSession = () => {
        Service.request('StkDialog:hide');
        this.mmiloading = false;
        navigator.b2g.telephony.cancelUSSD(evt.serviceId);
      };
      Service.request('StkDialog:show', {
        mode: 'input',
        message: evt.message.replace(/\\r\\n|\\r|\\n/g, '\n'),
        header: window.api.l10n.get('confirmation'),
        onOk: (res) => {
          if (res) {
            console.log('send res = ', res);
            this.mmiloading = true;
            navigator.b2g.telephony.sendUSSD(res, evt.serviceId);
            Service.request('SystemToaster:show', {
              text: window.api.l10n.get('message-sent')
            });
          } else {
            cancelSession();
          }
        },
        onCancel: cancelSession,
        onBack: cancelSession,
        messageType: 'ussd'
      });
    }
  },

  onUssdReceivedNoSession: function _onUssdReceivedNoSession(evt) {
    if (this.mmiloading) {
      Service.request('StkDialog:hide');
    }
    const conns = navigator.b2g.mobileConnections || [];
    const sid = evt.serviceId || 0;
    let network = null;
    if (conns[sid]) {
      network = conns[sid].voice && conns[sid].voice.network ||
        conns[sid].data && conns[sid].data.network;
    }

    Service.request('StkDialog:show', {
      mode: 'alert',
      header: network ? (network.shortName || network.longName) : '',
      message: evt.message ?
        evt.message.replace(/\\r\\n|\\r|\\n/g, '\n')
        : window.api.l10n.get('GetEmptyUssdPrompt'),
      messageType: 'ussd'
    });
  }
};

ussdReceiver.init();
