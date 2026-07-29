/* global port1 */
'use strict';

function debug() {
  console.log('[system][push.js]', ...arguments);
}

// registration saved in map
var push_registration_map = new Map();

// serviceWorker.ready only capable for waiting 1st serviceWorker to be ready
// For multiple serviceWorker, use this function for specific serviceWorker
function register_worker_active(url, scope) {
  return navigator.serviceWorker.register(url, { scope }).then((reg) => {
    let incoming = reg.installing || reg.waiting;
    if (reg.active && !incoming) {
      return reg;
    }
    return new Promise((resolve) => {
      incoming.onstatechange = (event) => {
        if (event.target.state === 'activated') {
          incoming.onstatechange = undefined;
          resolve(reg);
        }
      };
    });
  });
}

async function subscribe_push(registration, applicationServerKey, scope) {
  debug(`subscribe_push(), scope=${scope}`);
  let subscription = undefined;
  try {
    let options = applicationServerKey ? { applicationServerKey } : undefined;
    subscription = await registration.pushManager.subscribe(options);
    debug(`subscribe_push() succeeded, endpoint=${subscription.endpoint}`);
    debug(`subscribe_push() succeeded, subscription=${JSON.stringify(subscription)}`);
  } catch (error) {
    debug(`subscribe_push() failed, error=, ${error}`);
  }
  return subscription;
}

function subscribe_all() {
  debug(`subscribe_all(), connection.type=${navigator.connection.type}`);
  if (navigator.connection.type === 'none') {
    return;
  }
  push_registration_map.forEach(async (value, scope) => {
    if (value.subscription) {
      return; // We don't need to subscribe again when we have endpoint
    }
    let reg = value.registration;
    let appKey = value.applicationServerKey;

    for (let i = 0; i < 3; i++) { // retry 3 times
      let subscription = await subscribe_push(reg, appKey, scope);
      // Cannot directly set endpoint to push_registration_map because of eslint error
      if (subscription) {
        // Update endpoint in push_registration_map
        push_registration_map.get(scope).subscription = subscription;
        // Post endpoint to modules in chrome://system
        let subObj = JSON.parse(JSON.stringify(subscription));
        if (port1) {
          port1.postMessage({ scope, type: 'subscription', subscription: subObj });
        }
        break;
      }
    }
  });
}

// Init push function implementation
async function register_push(scope, applicationServerKey) {
  debug(`register_push(), scope=${scope}`);
  try {
    let push_worker = './push-sw.js';
    debug(`register ${push_worker} as serviceWorker`);
    // Ensure specific registration to be active
    let registration = await register_worker_active(push_worker, scope);
    debug(`register ${push_worker} succeeded`);

    // Note: No duplicate scope check here
    push_registration_map.set(
      scope, { registration, applicationServerKey }
    );

    // call subscribe when registration map updated or network change
    subscribe_all();
  } catch (error) {
    debug(`error in register_push(), ${error}`);
  }
}

// Unregister previous push subscription and service worker registration
async function unregister_push(scope) {
  debug(`unregister_push(), scope=${scope}`);
  try {
    let value = push_registration_map.get(scope);
    if (value.subscription) {
      let result = await value.subscription.unsubscribe();
      debug(`unregister_push(), unsubscribe result=${result}`);
    }
    if (value.registration) {
      let result = await value.registration.unregister();
      debug(`unregister_push(), unregister result=${result}`);
    }
    push_registration_map.delete(scope);
  } catch (error) {
    debug(`error in unregister_push(), ${error}`);
  }
}

// Handle "register-push" and "unregister-push" event from system
function onmessage(event) {
  const { origin, data } = event;
  debug(`onmessage: origin=${origin} data=${JSON.stringify(data)}`);
  if (origin === 'chrome://system') {
    switch (data.type) {
      case 'register-push':
        register_push(data.scope, data.applicationServerKey);
        break;
      case 'unregister-push':
        unregister_push(data.scope);
        break;
      default:
        break;
    }
  }
}

if ('serviceWorker' in navigator) {
  // Listen to "register-push" and "unregister-push" message
  window.addEventListener('message', onmessage);

  // We could possibily subscribe again when network connected
  navigator.connection.addEventListener('typechange', () => subscribe_all());

  // Setup event listener from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    debug(`onmessage, from sw, data=${JSON.stringify(event.data)}`);
    const { scope, type, data } = event.data;
    debug(`message from sw, scope=${scope}, type=${type}`);
    switch (type) {
      case 'subscriptionchange': { // Got subscription change
          // Reset endpoint for scope and subscribe again
          let value = push_registration_map.get(scope);
          value.subscription = undefined;
          subscribe_push(value.registration, value.applicationServerKey);
        }
        break;
      case 'push': { // Got push
          if (port1) {
            port1.postMessage({ scope, type, data });
          }
        }
        break;
      default:
        break;
    }
  });
}

/**
 * Sample codes to use push module in system js
 *

// Register push example
const proxyFrame = window.document.getElementById('sw-proxy');
proxyFrame.contentWindow.postMessage(
  { type: 'register-push', scope: YOUR_SCOPE, applicationServerKey: YOUR_KEY },
  proxyFrame.src
);

// Unregister push example
const proxyFrame = window.document.getElementById('sw-proxy');
proxyFrame.contentWindow.postMessage(
  { type: 'unregister-push', scope: YOUR_SCOPE },
  proxyFrame.src
);

// Listening push message example
window.addEventListener('serviceworkermessage', ({ detail }) => {
  const { type, scope, endpoint } = detail;
  if (scope === YOUR_SCOPE) {
    switch (type) {
      case 'endpoint': {
        // Register your endpoint
        break;
      }
      case 'push': {
        // Handle push event, if you have data in push, extract it from detail
        break;
      }
      default:
        break;
    }
  }
});

*/