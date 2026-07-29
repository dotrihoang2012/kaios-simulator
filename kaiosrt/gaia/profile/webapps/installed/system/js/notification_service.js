/* exported NotificationService */
(function notificationService(window) {
  function postNotificationRequest(title, options) {
    const iframeSwProxy = window.document.getElementById('sw-proxy');
    const proxySrc = iframeSwProxy.src;
    iframeSwProxy.contentWindow.postMessage(
      { type: 'notification-request', ...{ title, options }},
      proxySrc
    );
  }

  window.NotificationService = {
    send(title, options) {
      return new Promise((resolve) => {
        postNotificationRequest(title, options);
        resolve();
      });
    }
  };

  window.addEventListener('serviceworkermessage', (event) => {
    const { type } = event.detail;
    if (type === 'notificationclick') {
      window.dispatchEvent(new CustomEvent(type, {
        detail: JSON.parse(event.detail.data)
      }));
    }
  });
})(window);

