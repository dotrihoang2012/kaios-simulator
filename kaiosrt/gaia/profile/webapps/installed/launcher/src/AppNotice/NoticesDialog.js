/* global AppStore */
import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import NoticesDB from './NoticesDB';
import { sendActivity } from '../util/utils';
import '../../style/scss/notices_dialog.scss';

// LocalStroage key.
const NOTICES = {
  OLD: 'oldNoticesList',
  LAST: 'lastNoticesList',
  HASPOINT: 'localHasPoint',
  IMG_CACHE: 'noticesImgCache'
};

const localNotices = localStorage.getItem(NOTICES.OLD) || null;
const localLastNotices = localStorage.getItem(NOTICES.LAST) || null;
const localHasPoint = localStorage.getItem(NOTICES.HASPOINT) || null;
const noticesImgCahce = localStorage.getItem(NOTICES.IMG_CACHE) || null;
const SEVEN_DAY_TIME = 7 * 24 * 60 * 60 * 1000;
const customIcon = ['battery', 'bluetooth', 'download', 'voicemail'];

export default class NoticesDialog extends BaseComponent {
  name = 'NoticesDialog';

  static defaultProps = {
    showNotices: {},
    iconList: []
  };
  static propTypes = {
    showNotices: React.PropTypes.object,
    iconList: React.PropTypes.array
  };

  constructor(props) {
    super(props);

    this.state = {
      showNotices: {},
      iconList: []
    };

    this.pocketMode = 'none';
    this.hasPoint = false;
    this.oldNotices = JSON.parse(localNotices) || {};
    this.message = JSON.parse(localLastNotices) || { notices: {} };
    this.imgCache = JSON.parse(noticesImgCahce) || {};
    this.currentPanel = 'mainView';
    this.needShowSummary = true;
    this.needShowReminder = false;
    this.getSettingList = [];

    Service.register('updateMainNotices', this);
    Service.register('updateSoftKeyPoint', this);
    Service.register('timeUpdate', this);
    window.addEventListener('panelChange', this.panelChange);

    window.addEventListener('visibilitychange', () => {
      // Off screen show last notices when pocket mode closed.
      if (document.hidden &&
        this.pocketMode === 'none' &&
        this.currentPanel === 'mainView') {
        PowerManager.getScreenEnabled()
          .then((value) => {
            !value && this.showNoticesSummary();
          });
      }
    });

    this.addObserver('lockscreen.mode');
    this.addObserver('lockscreen.enabled');
    this.addObserver('pocketmode.autolock.enabled');
    this.addObserver('lockscreen.notifications-preview.enabled');
  }

  addObserver(name) {
    this.getSettingList.push(name);

    SettingsObserver.getValue(name)
      .then((result) => {
        this.getSettingList.pop();
        if (name === 'lockscreen.mode') {
          this.pocketMode = result;
        } else if (name === 'lockscreen.enabled') {
          this.lockMode = result;
        } else if (name === 'pocketmode.autolock.enabled') {
          this.autoLockMode = result;
        } else if (name === 'lockscreen.notifications-preview.enabled') {
          this.isShowSummary = result;
        }
      });

    SettingsObserver.observe(name, null, this[`_observe_${name}`], true);
  }

  '_observe_lockscreen.mode' = (result) => {
    // Into pocket mode reset notices.
    const mode = result;
    if (this.pocketMode === 'none' &&
      (mode === 'pocket' || mode === 'passcode')) {
      // In lock mode, no notices are received on the lockscreen,
      // and no notices summary is displayed.
      if (this.lockMode || this.autoLockMode) {
        this.needShowSummary = false;
      }
      this.resetNoticesSummary();
    }

    this.pocketMode = mode;
  }

  '_observe_lockscreen.notifications-preview.enabled' = (result) => {
    this.isShowSummary = result;
    this.resetNoticesSummary();
  }

  '_observe_lockscreen.enabled' = (result) => {
    this.lockMode = result;
    this.resetNoticesSummary();
  }

  '_observe_pocketmode.autolock.enabled' = (result) => {
    this.autoLockMode = result;
    this.resetNoticesSummary();
  }

  componentDidMount() {
    const currentNum = this.getNoticesNum(this.message.notices);
    if (currentNum > 0 && localHasPoint) {
      this.updateSoftKeyPoint(true);
    }
  }

  componentDidUpdate() {
    if (!this.state.iconList.length) {
      return;
    }
    setTimeout(() => {
      this.element.classList.remove('show-notices');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          this.element.classList.add('show-notices');
        });
      });
    }, 0);
  }

  panelChange = (evt) => {
    // Trigger dialog not displayed on the cards view.
    if (this.needShowReminder &&
      this.currentPanel === 'cards' &&
      evt.detail.panel === 'mainView') {
      this.needShowReminder = false;
      this.updateReminderDialog(0);
    }

    this.currentPanel = evt.detail.panel;
    if (evt.detail.panel === 'mainView' &&
      this.nextShowing &&
      this.isShowSummary &&
      this.needShowSummary) {
      this.showNoticesSummary();
    }
  }

  updateMainNotices(message) {
    this.message = message;
    if (this.getSettingList.length) {
      return;
    }

    if (!Object.keys(this.message.notices).length) {
      this.updateSoftKeyPoint(false);
      return;
    }

    // If notices app open, not show notices summary.
    if (!message.listUnread) {
      this.oldNotices = message.notices;
      this.updateSoftKeyPoint(false);
      this.setLocalStorage(NOTICES.OLD, this.oldNotices);
      return;
    }

    const currentNum = this.getNoticesNum(this.message.notices);
    const oldNum = this.getNoticesNum(this.oldNotices);
    // If delete notices, don't need to display summary.
    if (currentNum < this.lastNum) {
      this.minusDeleteNotices();
      this.lastNum = this.getNoticesNum(this.message.notices);
      return;
    } else if (currentNum > oldNum || currentNum === 99) {
      message.listUnread && this.updateSoftKeyPoint(true);
    }

    this.lastNum = this.getNoticesNum(this.message.notices);

    if (this.lockMode || this.autoLockMode) {
      if (this.pocketMode === 'pocket' || this.pocketMode === 'passcode') {
        this.needShowSummary = true;
      }
    } else {
      this.needShowSummary = true;
    }

    this.computeNextShowNotices();

    if (!Object.keys(this.nextShowNotices).length && !message.newNotice) {
      return;
    }

    this.updateSoftKeyPoint(true);
    this.showNoticesSummary();
  }

  getNoticesNum(notices) {
    let number = 0;
    Object.keys(notices).forEach((item) => {
      number += Number(notices[item]);
    });
    return number;
  }

  // Delete notices when it is read.
  minusDeleteNotices() {
    for (let manifest in this.oldNotices) {
      if (this.oldNotices[manifest] > this.message.notices[manifest]) {
        this.oldNotices[manifest] = this.message.notices[manifest];
      } else if (!this.message.notices[manifest]) {
        delete this.oldNotices[manifest];
      }
    }
    this.computeNextShowNotices();
    this.setLocalStorage(NOTICES.OLD, this.oldNotices);
  }

  // Compute next need show notices.
  computeNextShowNotices() {
    // Get show notices number.
    let newShowNotices = {};
    const { newNotice, notices } = this.message;

    if (this.getNoticesNum(notices) === 99 && newNotice) {
      const lastNotices = JSON.parse(localStorage.getItem(NOTICES.LAST)).notices;
      if (this.getNoticesNum(lastNotices) === 99) {
        if (lastNotices[newNotice] === notices[newNotice]
          && notices[newNotice] > 1
          && this.oldNotices[newNotice]) {
          this.oldNotices[newNotice] = this.oldNotices[newNotice] - 1;
        }
        if (notices[newNotice] > lastNotices[newNotice]) {
          Object.keys(notices).forEach((item) => {
            if (lastNotices[item] &&
              notices[item] &&
              this.oldNotices[item] &&
              lastNotices[item] - notices[item] === 1) {
              this.oldNotices[item] = this.oldNotices[item] - 1;
            }
          });
        }
        this.setLocalStorage(NOTICES.OLD, this.oldNotices);
      }
    }

    for (let manifestUrl in notices) {
      if (notices[manifestUrl] ===
        this.oldNotices[manifestUrl]) {
        // eslint-disable-next-line
        continue;
      } else {
        const nowNum = notices[manifestUrl];
        const lastNum = this.oldNotices[manifestUrl] || 0;
        if (nowNum - lastNum > 0) {
          newShowNotices[manifestUrl] = nowNum - lastNum;
        }

        if (lastNum > nowNum) {
          this.oldNotices[manifestUrl] = nowNum;
          this.setLocalStorage(NOTICES.OLD, this.oldNotices);
        }
      }
    }

    if (newNotice && !newShowNotices[newNotice]) {
      newShowNotices[newNotice] = 1;
      if (customIcon.includes(newNotice) && this.oldNotices[newNotice]) {
        this.oldNotices[newNotice] = 0;
        this.setLocalStorage(NOTICES.OLD, this.oldNotices);
      }
    }

    // Get show notices icon.
    this.nextShowNotices = {};
    const manifestUrls = Object.keys(newShowNotices);
    const appList = AppStore.apps.map((item) => item.manifestUrl);
    manifestUrls.forEach((manifestUrl) => {
      if (manifestUrl === 'undefined') return;
      if (customIcon.indexOf(manifestUrl) !== -1) {
        this.nextShowNotices[`style/images/notices_icon/${manifestUrl}.png`] =
        newShowNotices[manifestUrl];
        return;
      }

      const appIndex = appList.indexOf(manifestUrl);
      const appInfo = (appIndex !== -1) && AppStore.apps[appList.indexOf(manifestUrl)];
      const iconUrl = (appInfo && appInfo.icon_url) || this.imgCache[manifestUrl];
      if (!iconUrl) return;
      this.nextShowNotices[iconUrl] = newShowNotices[manifestUrl];

      this.setImageCache(iconUrl, manifestUrl);
    });

    // When the number of notices reaches 99, need to know the last notices list.
    this.setLocalStorage(NOTICES.LAST, this.message);
  }

  showNoticesSummary() {
    if (!this.isShowSummary || !this.needShowSummary) {
      return;
    }
    // Don't show notices summary if not main view.
    if (this.currentPanel !== 'mainView') {
      this.nextShowing = true;
      return;
    }
    this.nextShowing = false;

    this.setState({
      showNotices: this.nextShowNotices,
      iconList: this.iconSort(this.nextShowNotices)
    });
  }

  resetNoticesSummary() {
    // Update noticesDB data.
    if (Object.keys(this.message).length > 1) {
      this.message.newNotice = '';
      this.message.name = 'notices-updated';
      NoticesDB.update(this.message, this.message.name);
    }
    this.oldNotices = Object.assign({}, this.message.notices);
    this.setLocalStorage(NOTICES.OLD, this.oldNotices);
    this.nextShowNotices = {};
    this.needShowSummary = false;
    this.lastNum = 0;
    this.setState({
      showNotices: {},
      iconList: []
    });
  }

  iconSort(newNotices) {
    let { showNotices, iconList } = this.state;

    // Filter don't display icons.
    iconList = iconList.filter((item) => newNotices[item]);

    Object.keys(newNotices).forEach((item) => {
      if (!showNotices[item]) {
        iconList.unshift(item);
      } else if (showNotices[item] < newNotices[item]) {
        iconList.splice(iconList.findIndex((url) => url === item), 1);
        iconList.unshift(item);
      }
    });

    // If there is a newNotice field, the app’s icon should be placed first.
    if (this.message.newNotice) {
      let newItemIndex = 0;
      if (customIcon.includes(this.message.newNotice)) {
        newItemIndex = iconList
          .findIndex((item) => item.includes(this.message.newNotice));
      } else {
        const appList = AppStore.apps.map((item) => item.manifestUrl);
        const appInfo = AppStore.apps[appList.indexOf(this.message.newNotice)];
        const iconUrl = (appInfo && appInfo.icon_url) ||
          this.imgCache[this.message.newNotice];
        if (iconUrl) {
          newItemIndex = iconList.findIndex((item) => item === iconUrl);
        }
      }

      if (newItemIndex && newItemIndex !== -1) {
        const iconItems = iconList.splice(newItemIndex, 1);
        iconList.unshift(iconItems[0]);
      }
    }

    return iconList;
  }

  timeUpdate() {
    const currentTime = Date.now();
    const localTime = Number(localStorage.getItem('noticesReminderTime'));
    if (!localTime) return;

    const difference = currentTime - localTime;
    if (difference >= SEVEN_DAY_TIME) {
      this.updateReminderDialog(SEVEN_DAY_TIME - difference);
    }
  }

  updateSoftKeyPoint(show) {
    if (this.hasPoint && show) {
      return;
    }
    const softKey = document.querySelector('#software-keys-left');
    if (show) {
      this.hasPoint = true;
      softKey.classList.add('softkey-point');
      this.setLocalStorage(NOTICES.HASPOINT, true);
      this.computeReminderTime();
    } else {
      clearTimeout(this.reminderTimer);
      this.setLocalStorage('noticesReminderTime');
      this.setLocalStorage(NOTICES.HASPOINT);
      this.hasPoint = false;
      this.resetNoticesSummary();
      softKey.classList.remove('softkey-point');
    }
  }

  updateReminderDialog(time) {
    clearTimeout(this.reminderTimer);

    this.reminderTimer = setTimeout(() => {
      // The card view prevents dialog popup.
      if (this.currentPanel === 'cards') {
        this.needShowReminder = true;
        return;
      }
      const cancelFun = () => {
        this.setLocalStorage('noticesReminderTime', Date.now());
        this.updateReminderDialog(SEVEN_DAY_TIME);
        Service.request('hideDialog');
      };

      Service.request('showDialog', {
        type: 'custom',
        header: 'notices-reminder-header',
        content: 'notices-reminder-content',
        noClose: 'true',
        buttons: [
          { 'message': 'cancel' },
          { 'message': 'ok' },
          { 'message': '' }
        ],
        onBack: cancelFun,
        onOk: (evt) => {
          if (evt.selectedButton === 1) {
            sendActivity({ name: 'open-notices' });
            this.updateSoftKeyPoint(false);
            Service.request('hideDialog');
          } else if (evt.selectedButton === 0) {
            cancelFun();
          }
        }
      });
    }, time);
  }

  computeReminderTime() {
    const localTime = Number(localStorage.getItem('noticesReminderTime')) || 0;
    let time = Date.now();

    if (time < localTime) {
      return;
    }

    if (localTime) {
      time = SEVEN_DAY_TIME - (time - localTime);
    } else {
      this.setLocalStorage('noticesReminderTime', time);
      time = SEVEN_DAY_TIME;
    }

    this.updateReminderDialog(time);
  }

  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value ? JSON.stringify(value) : '');
    } catch (err) {
      console.error(`set localNotice error:${err}`);
    }
  }

  setImageCache(iconUrl, manifestUrl) {
    this.imgCache[manifestUrl] = iconUrl;
    this.setLocalStorage(NOTICES.IMG_CACHE, this.imgCache);
  }

  render() {
    const showIconNum = this.state.iconList.length;
    return (
      <div
        id="main-notices"
        className={`${!showIconNum ? 'unvisible' : ''}`}
        ref={(node) => { this.element = node; }}
        data-num={showIconNum}
      >
        {this.state.iconList.map((url, index) => (
          <div
            className={[
              'notices-item',
              index !== 0 ? 'notices-item-margin' : ''
            ].join(' ')}
          >
            <span className="notices-num">{this.state.showNotices[url]}</span>
            <img src={url} alt="" />
          </div>
        ))}
      </div>
    );
  }
}
