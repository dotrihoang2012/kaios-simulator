'use strict';

const DownloadNotificationStore = (function() {

  let downloadNotifications = new Map();

  function savedNotification() {
    const obj = {};
    downloadNotifications.forEach((item, id) => {
      obj[id] = item;
    });
    try {
      window.asyncStorage.setItem('download-notifications',
        JSON.stringify(obj));
    } catch (e) {
      console.log('savedNotification failed');
    }
  }

  function init() {
    window.asyncStorage.getItem('download-notifications', cache => {
      // restore to memory
      if (cache) {
        const obj = JSON.parse(cache);
        Object.keys(obj).forEach((id) => {
          addNotification(id);
        });
      }

      window.dispatchEvent(new CustomEvent('init-download-notifications'));
    });
  }

  function removeNotification(id) {
    downloadNotifications.delete(id);
    savedNotification();
  }

  function addNotification(id) {
    if (!downloadNotifications.has(id)) {
      downloadNotifications.set(id, 'true');
      savedNotification();
    }
  }

  function isDeletedNotification(id) {
    return !downloadNotifications.has(id);
  }

  return {
    init,
    addNotification,
    removeNotification,
    isDeletedNotification
  };
})();

DownloadNotificationStore.init();

window.DownloadNotificationStore = DownloadNotificationStore;
