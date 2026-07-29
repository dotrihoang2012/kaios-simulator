'use strict';

function debug() {
  console.log('[system][push-sw.js]', ...arguments);
}

self.addEventListener('push', async function(event) {
  let scope = self.registration.scope.replace(self.origin, '');
  let clients = await self.clients.matchAll({
    includeUncontrolled: true
  });
  let data = event.data ? {
    text: event.data.text(),
    json: event.data.json()
  } : null;
  debug(`onpush, scope=${scope}, data=${data}`);
  if (clients && clients[0]) {
    clients[0].postMessage({
      scope,
      type: 'push',
      data,
    });
  }
});

self.addEventListener('pushsubscriptionchange', async function() {
  let scope = self.registration.scope.replace(self.origin, '');
  let clients = await self.clients.matchAll({
    includeUncontrolled: true
  });
  debug(`onpushsubscriptionchange, scope=${scope}`);
  if (clients && clients[0]) {
    clients[0].postMessage({
      scope,
      type: 'subscriptionchange'
    });
  }
});