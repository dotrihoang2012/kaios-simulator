import BaseEmitter from 'base-emitter';
import Service from 'service';
import NoticesDB from './NoticesDB';

class AppNotices extends BaseEmitter {
  constructor() {
    super();
    this.notices = {};
    this.oldNotices = {};
  }

  sendNoticesFrontDesk(noticesDate) {
    clearTimeout(this.throttleFunc);
    this.throttleFunc = setTimeout(() => {
      this.countNotices(noticesDate.data);
      this.emit('change', this.notices);
    }, 500);
  }

  sendNoticesBackStage(noticesDate) {
    this.countNotices(noticesDate.data);
    this.emit('change', this.notices);
  }

  initNoticesData() {
    DUMP('Notices data init!');
    navigator.serviceWorker.addEventListener('message', (event) => {
      DUMP('Get notices service message!');
      const noticesDate = event.data;
      if (noticesDate.name === 'notices-updated') {
        if (document.hidden) {
          this.sendNoticesBackStage(noticesDate);
        } else {
          this.sendNoticesFrontDesk(noticesDate);
        }
      }
    });

    // Get noticesDB data.
    NoticesDB.getAll().then((notices) => {
      if (notices.length && notices[0].notices) {
        this.countNotices(notices[0]);
        this.emit('change', this.notices);
      }
    });
  }

  setLocalStorage(key, value = '') {
    try {
      localStorage.setItem(key, value ? JSON.stringify(value) : '');
    } catch (err) {
      console.error(`set homeNoticesList error: ${err}`);
    }
  }

  countNotices(newNotices) {
    Service.request('updateMainNotices', newNotices);
    this.notices = Object.assign({}, newNotices.notices);
    this.notices.newNotice = newNotices.newNotice;
  }

  clearAppStatus(app) {
    this.setLocalStorage(`clearNotices${app.manifestUrl}`, true);
    this.setLocalStorage(`newInstall${app.manifestUrl}`);
    this.emit('clearAppStatus', app.manifestUrl);
  }
}

const appNotices = new AppNotices();
export default appNotices;
