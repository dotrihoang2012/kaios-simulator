export const MAX_SILENT_RETRY = 10;
export const BATTERY_LIMIT = 0.3;
export const AUTO_UPDATE_SUCCESS_FADEOUT = 2000;
export const LOW_STORAGE = 30 * 1024 * 1024; // 30MB
export const AUTO_REBOOT_HANDLED_KEY = 'app.store.autoupdate.reboot';
export const SETTINGS_KEY = {
  SILENT_INSTALL_SUCCESS: 'store.silentInstall.success', // For silent install
  CUSTOMIZATION_COMPLETED: 'sim.base.customization.completed', // For check carrier customization completed
  ENABLE_SETTINGS_FEATURE_IN_STORE: 'apps.serviceCenter.settingsEnabled',
};

/*
* Error code refer to
* https://git.kaiostech.com/feature-phone-apps/shared/-/blob/next/js/session/apps_manager/apps_manager.js#L42
*/
export const DOWNLOAD_ERRORS_TO_MESSAGE = {
  3: 'device-issue',
  4: 'storage-issue',
  5: 'network-issue',
  6: 'network-issue',
  11: 'device-issue',
  12: 'device-issue',
  15: 'network-issue',
};

export const DOWNLOAD_ERRORS_TO_CODE = {
  GENERIC_ERROR: 1000,
  STORAGE_FULL: 1001,
  INVALID_SIGNATURE: 1002,
  NETWORK_INTERRUPTION: 1003,
  DOWNLOAD_CANCELED: 1004,
  NETWORK_ERROR: 1005,
  DOWNLOAD_ERROR: 1006,
};

export const DEFAULT_ICON_SIZE = {
  NORMAL: '56',
  MIDDLE: '84',
  LARGE: '112',
};

export const APPS_INSTALL_STATE_MAP = new Map([
  [0, 'installed'],
  [1, 'installing'],
  [2, 'pending'],
]);
