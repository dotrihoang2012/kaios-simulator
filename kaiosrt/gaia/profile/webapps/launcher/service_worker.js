importScripts('./js/create_db.js');

self.addEventListener('install', (evt) => {
  evt.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

let handler = null;
const ACTIVITY_NAME = [
  'bookmark',
  'ussd-received',
  'notices-updated'
];
const postMessageToHome = (data) => {
  clients.matchAll({ includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach(client => {
        client.postMessage(data);
      });
      console.log('service_worker: matchAll success!');
    })
    .catch((err) => {
      console.log('service_worker: matchAll error', err);
      // Resend the request when the first request is unsuccessful.
      clients.matchAll()
        .then((clientList) => {
          clientList.forEach(client => {
            client.postMessage(data);
          });
          console.log('service_worker: matchAll second success!');
        })
        .catch((err) => console.log('service_worker: matchAll second error', err))
    });
};
const postMessageResult = (isError, data) => {
  if (handler) {
    if (isError) {
      handler.postError(data);
    } else {
      handler.postResult(data);
    }
    handler = null;
  }
};

const NoticesDB = new CreateDB('notices', '1.0', 'name');
const BookMarkDB = new CreateDB('bookmark', '1.0', 'url');
const appDB = new CreateDB('apps', '1.0', 'category');

self.onsystemmessage = evt => {
  console.log('service_worker: system message', evt.name);
  const serviceHandler = () => {
    if (evt.name === 'activity') {
      handler = evt.data.webActivityRequestHandler();
      const { name: activityName, data: activityData } = handler.source;

      if (ACTIVITY_NAME.includes(activityName)) {
        if (activityName === 'notices-updated') {
          let noticesData = handler.source.data;
          noticesData.name = activityName;
          NoticesDB.getAll().then((data) => {
            if (data.length) {
              NoticesDB.update(noticesData, noticesData.name);
            } else {
              NoticesDB.add(noticesData, noticesData.name);
            }
          });
          postMessageToHome(handler.source);
        } else if (activityName === 'bookmark') {
          let bookMarkDate = handler.source.data;
          switch (bookMarkDate.action) {
            case 'get':
              BookMarkDB.get(bookMarkDate.url)
                .then((result) => postMessageResult(false, result))
                .catch(() => postMessageResult(true, ''));
              break;
            case 'getAll':
              BookMarkDB.getAll()
                .then((result) => postMessageResult(false, result))
                .catch(() => postMessageResult(true, ''));
              break;
            case 'add':
              BookMarkDB.add(bookMarkDate, bookMarkDate.url)
                .then(() => {
                  postMessageToHome({
                    name: 'bookmark',
                    type: 'add-success',
                    data: bookMarkDate
                  });
                  postMessageResult(false, 'success');
                })
                .catch(() => postMessageResult(true, ''));
              break;
            case 'remove':
              BookMarkDB.get(bookMarkDate.url)
                .then((result) => {
                  BookMarkDB.remove(result.url)
                  .then(() => {
                    postMessageToHome({
                      name: 'bookmark',
                      type: 'remove-success',
                      data: result
                    });
                    postMessageResult(false, 'success');
                  });
                })
                .catch(() => postMessageResult(true, ''));
              break;
            default:
              break;
          }
        } else {
          postMessageToHome(handler.source);
        }
      }

      if ('dial' === activityName) {
        clients.openWindow('/dial-activity.html', { "disposition": "inline" }).then(
          (openWindow) => {
            openWindow.postMessage(handler.source);
            console.log(`service_worker: openWindow success!--- ${openWindow}`);
          },
          (err) => {
            console.log(`service_worker: openWindow fail with error: ${err}`);
          }
        );
      } else if ('get-app' === activityName) {
        appDB.getAll().then(
          (categories) => {
            const allApps = [];
            const isExist = {};
            categories.forEach((category) => {
              category.apps.forEach((app) => {
                const dn = app.displayName;
                if (!isExist[dn]) {
                  isExist[dn] = true;
                  // 1. STT use email instead of e-mail, so let's normalize it
                  // 2. `value` is for VA Skill's validator
                  allApps.push({
                    ...app, value: dn.toLowerCase().replace(/(_|-)/g, '')
                  });
                }
              });
            });
            postMessageResult(false, allApps);
          },
          (err) => {
            console.error(err);
            postMessageResult(true, 'Error occured while getting apps');
          }
        );
      }
    }
  };
  evt.waitUntil(serviceHandler());
};

self.addEventListener('message', event => {
  // Message received from clients
  console.log('service_worker: receive message ', event.data);
  const { data } = event;
  if (data.isWebActivity) {
    new WebActivity(data.name, data.detail).start();
    return;
  }
  postMessageResult(data.isError, data.activityResult);
});
