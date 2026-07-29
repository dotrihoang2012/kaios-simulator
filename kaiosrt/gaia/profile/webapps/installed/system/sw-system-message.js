'use strict';
/* global clients */

const SYSTEM_MESSAGE_TYPES = [
  'activity',
  'alarm',
  'bluetooth-opp-receiving-file-confirmation',
  'bluetooth-opp-transfer-complete',
  'bluetooth-opp-transfer-start',
  'bluetooth-opp-update-progress',
  'bluetooth-pbap-request',
  'bluetooth-map-request',
  'bluetooth-pairing-request',
  // 'cdma-info-rec-received',
  'data-sms-received',
  'icc-stkcommand',
  'ussd-received',
  'telephony-call-ended',
  // 'nfc-manager-send-file',
  // 'nfc-manager-tech-discovered',
  // 'nfc-manager-tech-lost',
  // 'notification',
  'sms-received'
  // 'salestracker-register-server',
];

const HAS_RETURN_VALUE_ACTIVITIES = ['reboot-device', 'account-manager'];
let messageCache = [];
let handlerMap = {};

self.addEventListener('install', (evt) => {
  evt.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

function log() {
  console.log('[sw-system-message]', ...arguments);
}

function postMessage(evt, message) {
  if (evt) {
    let find = false;
    evt.waitUntil(
      clients
        .matchAll({
          includeUncontrolled: true,
          type: 'window',
        })
        .then((clientList) => {
          clientList.forEach((client) => {
            find = true;
            client.postMessage(message);
          });
          if (!find &&
            ['icc-stkcommand', 'alarm'].includes(message.type) !== -1) {
            messageCache.push(evt);
          }
        })
    );
  } else {
    log('postMessage without event');
  }
}

function processCacheMessage(evt) {
  log('processCacheMessage ', messageCache.length);
  if (messageCache.length) {
    evt.waitUntil(
      clients
        .matchAll({
          includeUncontrolled: true,
          type: 'window',
        })
        .then((clientList) => {
          clientList.forEach((client) => {
            messageCache.forEach(message => {
              client.postMessage({
                category: 'systemmessage',
                type: message.name,
                data: message.data.json(),
              });
            })
          });
          messageCache = [];
        })
    );
  }
}

function showNotification(data) {
  const { title, options } = data;
  self.registration.showNotification(title, options);
}

self.onsystemmessage = (evt) => {
  log('onsystemmessage', evt.name);
  if (SYSTEM_MESSAGE_TYPES.includes(evt.name)) {
    switch (evt.name) {
      case 'activity':
        {
          const handler = evt.data.webActivityRequestHandler();
          const source = handler.source;
          if (HAS_RETURN_VALUE_ACTIVITIES.includes(source.name)) {
            addWebActivityRequestHandler(handler, evt).then(
              (activityHandlerId) => {
                const data = { source: handler.source, activityHandlerId };
                postMessage(evt, {
                  category: 'systemmessage',
                  type: evt.name,
                  data,
                });
              }
            );
          } else {
            const data = { source: handler.source };
            postMessage(evt, {
              category: 'systemmessage',
              type: evt.name,
              data,
            });
          }
        }
        break;
      default:
        {
          const data = evt.data.json();
          postMessage(evt, {
            category: 'systemmessage',
            type: evt.name,
            data,
          });
        }
        break;
    }
  }
};

self.onnotificationclick = (evt) => {
  log('onnotificationclick tag: ', evt.notification.tag);
  if (!evt.notification.tag) {
    evt.notification.close();
  } else {
    const data = {};
    for (var e in evt.notification) {
      data[e] = evt.notification[e];
    }
    postMessage(evt, {
      category: 'systemmessage',
      type: 'notificationclick',
      data: JSON.stringify(data)
    });
  }
};

self.addEventListener('message', (event) => {
  // Message received from clients
  const { data } = event;
  log('service worker receive message: ', data);
  if (data?.type) {
    switch (data.type) {
      case 'activity-result':
        if (data.isDummy) {
          log(
            'ignore this dummy message, wait for real result'
          );
        } else if (data.activityHandlerId) {
          const handler = handlerMap[data.activityHandlerId];
          if (data.isError) {
            handler.postError(data.activityResult);
          } else {
            handler.postResult(data.activityResult);
          }
          removeWebActivityRequestHandler(data.activityHandlerId, event);
        }
        break;
      case 'notification-request':
        showNotification(data);
        break;
      case 'clean-activity-handler':
        if (data.activityName) {
          for (let handlerId in handlerMap) {
            if (handlerMap[handlerId].source.name === data.activityName) {
              removeWebActivityRequestHandler(handlerId, event);
            }
          }
        }
        break;
      case 'system-ready':
        processCacheMessage(event);
        break;
      default:
        log('no action with type: ', data.type);
        break;
    }
  }
});

const addWebActivityRequestHandler = async (handler, event) => {
  // activityHandlerId should be unique
  const activityHandlerId = `${+new Date()}`;
  handlerMap[activityHandlerId] = handler;
  log('addWebActivityRequestHandler: ', handlerMap);
  const handlerMapSize = Object.keys(handlerMap).length;
  // start the 'dummy message interval' when the first activity
  // is added to handlerMap
  if (handlerMapSize === 1) {
    postMessage(event, {
      category: 'systemmessage',
      type: 'activity_dummy',
      data: 'start',
    });
  }
  return activityHandlerId;
};

const removeWebActivityRequestHandler = async (activityHandlerId, event) => {
  delete handlerMap[activityHandlerId];
  log('removeWebActivityRequestHandler: ', handlerMap);
  const handlerMapSize = Object.keys(handlerMap).length;
  // stop the 'dummy message interval' if no pending activity
  if (handlerMapSize === 0) {
    postMessage(event, {
      category: 'systemmessage',
      type: 'activity_dummy',
      data: 'stop',
    });
  }
};
