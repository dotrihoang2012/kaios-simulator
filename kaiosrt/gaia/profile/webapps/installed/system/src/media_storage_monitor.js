/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

import BaseModule from 'base-module';

class MediaStorageMonitor extends BaseModule {
  name = 'MediaStorageMonitor';
  CHECK_TIME_INTERVAL = 5000;
  LIMIT_FREE_SPACE = 10 * 1024 * 1024;
  downloadManager = navigator.b2g.downloadManager;
  downloadingNum = 0;
  turnOffTimer = 0;
  downloadingList = [];
  isShowingConfirmDialog = false;
  // Storage name by default
  STORAGE_NAME_BY_DEFAULT = 'sdcard';
  // Storage name settings key
  STORAGE_NAME_KEY = 'device.storage.writable.name';
  // Current storage name
  storageName = this.STORAGE_NAME_BY_DEFAULT;
  NS_ERROR_FILE_NO_DEVICE_SPACE = '2152857616';
  NS_ERROR_FILE_DISK_FULL = '2152857610';

  start() {
    SettingsObserver.observe(this.STORAGE_NAME_KEY, '', (value) => {
      if (value) {
        this.storageName = value;
      }
    }, true);
    if (this.downloadManager) {
      this.downloadManager.addEventListener('downloadstart', this.downloadStart.bind(this));
    }
  }

  downloadStart(ev) {
    ev.download.addEventListener('statechange', this.stateChange.bind(this));
  }

  stateChange(ev) {
    let index = this.downloadingList.indexOf(ev.download.id);
    let self = this;

    let isPhoneStorage = this.storageName === this.STORAGE_NAME_BY_DEFAULT ?
      true : false;
    let headerString = isPhoneStorage ? 'phone-storage-full-title' :
      'sdcard-storage-full-title';
    let contentString = isPhoneStorage ? 'phone-storage-full-warning' :
      'sdcard-storage-full-warning';

    if (ev.download.state === 'stopped' &&
      (ev.download.error.message === this.NS_ERROR_FILE_NO_DEVICE_SPACE ||
      ev.download.error.message === this.NS_ERROR_FILE_DISK_FULL)) {
      Service.request('DialogService:show', {
        header: headerString,
        content: contentString,
        ok: 'opt-settings',
        type: 'confirm',
        onOk: () => {
          let activity = new WebActivity('configure', {
            target: 'device',
            section: 'mediaStorage'
          });
          activity.start();
        }
      });
    }
  }
}

let instance = new MediaStorageMonitor();
instance.start();

export default instance;
