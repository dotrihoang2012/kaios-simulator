import BaseModule from 'base-module';
import { MAX_SILENT_RETRY, SETTINGS_KEY } from './constant';
import { getSimInfo, getRetryInterval, isNetworkConnected } from './utils';

class SilentInstallService extends BaseModule {
  DEBUG = true;
  constructor() {
    super();

    if (SilentInstallService.instance) {
      return SilentInstallService.instance;
    }
    SilentInstallService.instance = this;

    this.silentApps = [];
    this.silentInstallRetryCount = 0;
    // [1, 2, 3, 5, 8, 13, 21, 34]
    this.retryInterval = getRetryInterval(MAX_SILENT_RETRY, 2);
    this.silentInstallTimer = null;
    this.isSimBaseCustomizationCompleted = false;
    this.screenEnabled = true;
    this.installStatus = 'unknown';
    this.installedStorageKey = 'installed-silent-apps';
    this.installedSilentApps = [];
    this.keyMap = new Map([
      ['apps.serviceCenter.microServiceUrl', 'apiUri' ],
      ['ril.data.defaultServiceId', 'defaultServiceId'],
      ['deviceinfo.build_number', 'build_number'],
      ['deviceinfo.cu', 'cu'],
      ['deviceinfo.hardware', 'hardware'],
      ['deviceinfo.os', 'os'],
      ['deviceinfo.platform_build_id', 'platform_build_id'],
      ['deviceinfo.platform_version', 'platform_version'],
      ['deviceinfo.product_model', 'product_model'],
      ['deviceinfo.software', 'software'],
    ]);
    this.initSilentAppsParams();
  }

  get installed() {
    return this.installStatus === 'installed';
  }

  get installing() {
    return this.installStatus === 'installing';
  }

  setDeviceStatus = ({ key, value }) => {
    const updateableStatus = [
      'isSimBaseCustomizationCompleted',
      'screenEnabled',
    ];

    if (!updateableStatus.includes(key)) {
      console.error('Invalid status update.');
    } else {
      this[key] = value;
    }

    return this;
  };

  installCompleted = () => {
    this.installStatus = 'installed';
    SettingsObserver.setValue([
      {
        name: `${SETTINGS_KEY.CUSTOMIZATION_COMPLETED}`,
        value: false,
      },
    ]);
  };

  resetRetryCount = () => {
    this.silentInstallRetryCount = 0;

    return this;
  };

  retry = () => {
    this.debug('Start Rerty');
    const count = this.silentInstallRetryCount;
    const deleyTime = this.retryInterval[count] * 60 * 1000;

    clearTimeout(this.silentInstallTimer);
    this.silentInstallTimer = setTimeout(() => {
      if (this.isReady()) {
        this.activate();
      } else {
        this.retry();
      }
    }, deleyTime);
  };

  activate = async () => {
    this.debug('Start Activate');
    if (!this.isReady()) return;

    if(this.installed) {
      this.disabled();
    } else {
      // Don't invoke silent install while screen is disabled.
      if (!this.screenEnabled) {
        this.retry();
        return;
      }
      // Don't invoke silent install while network is disconnected.
      if (!isNetworkConnected()) {
        this.retry();
        return;
      }

      if (!this.installing) {
        this.installStatus = 'installing';
        this.params = await this.getSilentAppsParams();
        // Get installed silent app from asyncStorage
        await this.getInstalledApps();

        const activity = new WebActivity(
          'kaistore-get-silent-apps',
          this.params
        );

        activity.start()
          .then((silentApps) => {
            this.silentApps = silentApps || [];
            this.silentApps.forEach(app => {
              /**
               * Do not re-install if the silent app has been installed before.
               * Note: Basically, it should be app.update_url for KaiOS 3.0, but
               * data come from server is still app.manifest_url for now.
               **/
              if (this.installedSilentApps.includes(app.manifest_url)) {
                return;
              }

              this.debug(
                'Start Install',
                app.name,
                app.type,
                app.manifest_url
              );
              if (app.type === 'hosted') {
                AppsManager.installPwa(app.manifest_url);
              } else {
                AppsManager.installPackage(app.manifest_url);
              }
            });
            this.disabled();
          })
          .catch(() => {
            /**
             * If silent install is failed due to server-side error, use
             * Fibonacci to be the delay time and retry it.
             */
            console.error('[app_store]', err);
            if (this.silentInstallRetryCount < MAX_SILENT_RETRY - 3) {
              this.silentInstallRetryCount++;
            }
            this.installStatus = 'error';
            this.retry();
          });
      }
    }
  };

  disabled() {
    this.publish('silentInstallDisabled');
    this.resetRetryCount();
    this.installCompleted();
  }

  isReady = () => {
    const isHomeScreen =
      window.appWindowManager.getActiveApp() &&
      window.appWindowManager.getActiveApp().isHomescreen;

    this.debug(
      'isReady',
      this.isSimBaseCustomizationCompleted,
      SIMSlotManager.ready,
      isHomeScreen
    );

    return (
      this.isSimBaseCustomizationCompleted &&
      SIMSlotManager.ready &&
      isHomeScreen
    );
  };

  /**
   * Check remoteURL if it's in the silent app list, and remove it
   * from the list.
   */
  checkIsSilent = (remoteURL) => {
    const field = 'manifest_url';
    const silentApp = this.silentApps.find(app => app[field] === remoteURL);

    this.debug('Start checkIsSilent', remoteURL, silentApp ? true : false);

    if (silentApp) {
      const index = this.silentApps.indexOf(silentApp);

      this.silentApps.splice(index, 1);
      return true;
    }
    return false;
  };

  getInstalledApps = () => {
    return new Promise((resolve) => {
      asyncStorage.getItem(
        this.installedStorageKey,
        (installApps) => {
          this.installedSilentApps = installApps || [];
          resolve();
        }
      );
    });
  };

  setInstalledApps = (updateUrl) => {
    this.installedSilentApps.push(updateUrl);
    asyncStorage.setItem(this.installedStorageKey, this.installedSilentApps);
  }

  initSilentAppsParams = () => {
    this.params = {
      apiUri: undefined,
      defaultServiceId: undefined,
      build_number: undefined,
      connectionType: undefined,
      cu: undefined,
      hardware: undefined,
      imei: undefined,
      os: undefined,
      platform_build_id: undefined,
      platform_version: undefined,
      product_model: undefined,
      software: undefined,
      currentMCC: undefined,
      currentMNC: undefined,
      simMCC: undefined,
      simMNC: undefined,
      currentMCC2: undefined,
      currentMNC2: undefined,
      simMCC2: undefined,
      simMNC2: undefined,
      token: {
        kid: undefined,
        macKey: undefined,
      },
    };
  };

  getSilentAppsParams = async () => {
    const { params } = this;

    for (const [key, field] of this.keyMap) {
      try {
        let settingsValue = await SettingsObserver.getValue(key);

        if (!settingsValue && field === 'apiUri') {
          settingsValue = 'https://api.kaiostech.com/kc_ksfe/v1.0';
        }

        if (typeof settingsValue === 'string') {
          settingsValue = settingsValue.replaceAll(' ', '_');
        }
        params[field] = settingsValue;
      } catch (e) {
        this.debug(`Failed to get ${key}`, e);
      }
    }

    params.connectionType = (
      navigator.connection.type === 'wifi' ? 'wifi' : 'mobile'
    );

    const slotId = params.defaultServiceId;
    const deviceId = navigator.b2g.mobileConnections[slotId]
      .getDeviceIdentities();

    if (deviceId.imei) {
      params.imei = deviceId.imei;
    }

    try {
      const { icc_mcc, icc_mnc, icc_mcc2, icc_mnc2 } = getSimInfo();

      params.currentMCC = params.simMCC = icc_mcc ? icc_mcc : null;
      params.currentMNC = params.simMNC = icc_mnc ? icc_mnc : null;
      params.currentMCC2 = params.simMCC2 = icc_mcc2 ? icc_mcc2 : null;
      params.currentMNC2 = params.simMNC2 = icc_mnc2 ? icc_mnc2 : null;
    } catch (e) {
      this.debug('Failed to get ICC info', e);
    }

    try {
      const token = await navigator.b2g.authorizationManager
        .getRestrictedToken('service');

      params.token.kid = token.kid;
      params.token.macKey = token.macKey;
    } catch (e) {
      this.debug('Failed to get restricted token, reason=', e);
    }

    return params;
  };

  debug = (...args) => {
    this.DEBUG && console.log('[SilentInstallService]', ...args);
  };
}

export default SilentInstallService;
