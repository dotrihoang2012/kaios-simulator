'use strict';

(function (window) {
  function log() {
    console.log('[system][proxy-browser.js]', ...arguments);
  }

  let port = null;
  const bc = new BroadcastChannel('places');
  bc.onmessage = ({ data }) => port && port.postMessage(data);

  function messageHandler(evt) {
    if (evt.origin === 'chrome://system' && evt.data === '#transfer-browser#') {
      port = evt.ports[0];
      log('Successfully transfer the port2 and keep the port1');
      port.onmessage = ({ data }) => bc && bc.postMessage(data);
      window.removeEventListener('message', messageHandler);
    }
  }

  window.addEventListener('message', messageHandler);
})(this);
