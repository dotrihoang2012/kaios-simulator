/* global Service */
'use strict';

(function() {
  const iframeProxy = window.document.getElementById('sw-proxy');
  const channel = new MessageChannel();
  channel.port1.onmessage = ({ data }) => {
    // commands sent form browser app.
    if (data.command) {
      switch (data.command) {
        case 'accessDB':
          {
            let store = null;

            if (data.store === 'places' && window.places && window.places.store) {
              store = window.places.store;
            }

            if (data.store === 'pinsites' && window.browserPinSitesStore) {
              store = window.browserPinSitesStore;
            }

            if (!store) return;

            store[data.action](...data.args)
              .then((result) => {
                channel.port1.postMessage({ id: data.id, data: result });
              });
          }

          break;
        case 'showSearchBar':
          Service.request('BrowserSearchView:show', '');
          break;
        case 'navigate':
          Service.request('BrowserSearchView:navigate', data.url);
          break;
        case 'getVaStatus':
          channel.port1.postMessage({
            id: data.id,
            data: {
              isVAEnabled: Service.query('VoiceAssistant.isVAEnabled'),
              appIcon: Service.query('VoiceAssistant.getVAInAppIcon')
            }
          });
          break;
        case 'isShowPaidApps':
          window.BrowserUtils.isShowPaidApps().then((isShow) => {
            channel.port1.postMessage({
              id: data.id,
              data: isShow
            });
          });
          break;
        case 'requestApps':
          window.BrowserUtils.requestApps()
            .then((json) => {
              channel.port1.postMessage({
                id: data.id,
                data: json
              });
            })
            .catch(() => {
              channel.port1.postMessage({
                id: data.id,
                data: null
              });
            });
          break;
      }
    }
  };

  iframeProxy.contentWindow.postMessage(
    '#transfer-browser#', window.AppOrigin.getOrigin('system'), [channel.port2]
  );

  window.addEventListener('places-init', () => {
    if (window.places.store) {
      window.places.store.on('change', () => {
        channel.port1.postMessage('places-store-change');
      });
    }
  });
})(window);
