class GlobalService {
  constructor() {
    if (GlobalService.instance) {
      return GlobalService.instance;
    }

    GlobalService.instance = this;
  }

  showDialog = (title, msg, options) => {
    Service.request('DialogService:show', {
      header: title,
      content: msg,
      ...options,
    });
  };

  showNotification = (title, options, clickHandler) => {
    let notice = new Notification(title, options);
    notice.onclick = function () {
      notice.close();
      if (clickHandler) {
        clickHandler();
      }
    };

    notice.onclose = function () {
      if (options['icon']) {
        URL.revokeObjectURL(options['icon']);
      }
    };
  }

  toggleAutoUpdateView = (status, options) => {
    /**
     * Bug 110462: Disable auto update view for now. But there is still a chance
     * that it would be reverted in the future so we just simply return here.
     */
    return;
    if (status === 'show') {
      Service.request('AutoUpdateView:show', options);
    } else {
      Service.request('AutoUpdateView:hide');
    }
  };

  powerOff = () => {
    Service.request('startPowerOff', true);
  };

  isLockedScreen = () => {
    return Service.query('locked');
  };
}

export default GlobalService;
