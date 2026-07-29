'use strict';

let port1;
let messageCache = [];
function log() {
  console.log('[system][proxy.js]', ...arguments);
}

function messageHandler(evt) {
  log('messageHandler: ', evt.data);
  const { origin, data } = evt;
  if (origin === 'chrome://system') {
    switch (data.type) {
      case 'port-transfer':
        port1 = evt.ports[0];

        messageCache.forEach((msg) => {
          port1.postMessage(msg);
        });
        messageCache = [];
        log('Successfully transfer the port2 and keep the port1');
        break;
      case 'activity-result':
      case 'notification-request':
      case 'clean-activity-handler':
        // send result to serviceWorker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage(data);
        } else {
          console.error('navigator.serviceWorker.controller is null');
        }
        break;
      default:
        break;
    }
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('message', messageHandler);

  window.addEventListener('load', () => {
    navigator.serviceWorker.addEventListener('message', ({ data }) => {
      log('Got msg from SW:', data);
      if (port1) {
        if ([
          'systemmessage',
          // There might be other categories (service workers) in the future.
        ].includes(data.category)) {
          // relay messages to https://system.local
          port1.postMessage(data);
        }
      } else if (['icc-stkcommand', 'alarm'].includes(data.type) !== -1) {
        messageCache.push(data);
      }
    });
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({ type: 'system-ready' });
      }
    });
  }, { once: true });
}
