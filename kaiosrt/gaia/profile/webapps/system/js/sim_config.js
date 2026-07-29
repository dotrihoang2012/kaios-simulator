/* global SettingsObserver, WebActivity, FtuLauncher*/
'use strict';

var SimConfig = {
  _ftuFinished: null,
  _logoHiddenCb: null,
  _settingValues: {},
  _iccManagers: [],
  _eventHandler: null,
  _ftuDone: false,
  _logoHiddenDone: false,

  debug(log) {
    console.log(`Customization:SimConfig:${log}`);
  },

  initIccManagers() {
    const conns = navigator.b2g.mobileConnections;
    const iccManager = navigator.b2g.iccManager;
    const num = conns.length;
    let i = 0;

    for (i = 0; i < num; i++) {
      let icc = iccManager.getIccById(conns[i].iccId);
      if (!icc) {
        continue;
      }
      this._iccManagers.push(icc);
    }
  },

  getSettings() {
    return new Promise((resolve, reject) => {
      const names = [
        'sim.base.customization.enabled'
      ];
      SettingsObserver.getBatch(names).then(resultList => {
        if (resultList.length > 0) {
          for (let i = 0; i < resultList.length; i++) {
            this.debug(`get settings:${JSON.stringify(resultList[i])}`);
            this._settingValues[resultList[i].name] = resultList[i].value;
          }
          resolve(this._settingValues);
        } else {
          this.debug(`get settings:${names} failed`);
          reject({});
        }
      }).catch(e => {
        this.debug(`getSetting failed:${JSON.stringify(e)}`);
        reject(e);
      });
    });
  },
  // Run customization after FTU finished.
  ftuFinished() {
    this.debug('FTU done or skiped.');
    window.removeEventListener('ftudone', this._ftuFinished);
    window.removeEventListener('ftuskip', this._ftuFinished);
    this._ftuDone = true;
    if (this._logoHiddenDone) {
      this.simConfigRun();
    }
  },

  logoHidden() {
    this.debug('logohidden');
    window.removeEventListener('logohidden', this._logoHiddenCb);
    this._logoHiddenDone = true;
    if (this._ftuDone) {
      this.simConfigRun();
    }
  },
  /*
   * return true has SIM & ready, false not has SIM or SIM not ready
   */
  simcardReady() {
    if (this._iccManagers.length <= 0) {
      return false;
    }
    for (let i = 0; i < this._iccManagers.length; i++) {
      if ('ready' !== this._iccManagers[i].cardState) {
        return false;
      }
    }
    return true;
  },

  simConfigRun() {
    this.debug('simConfigRun');
    this.getSettings().then((values) => {
      if (values['sim.base.customization.enabled']) {
        this.initIccManagers();
        if (this._iccManagers.length > 0) {
          if (this.simcardReady()) {
            this.launchCustomization();
          } else {
            this.listenCardStateChanged();
          }
        } else {
          this.debug('no simcard insert');
        }
      } else {
        this.debug('sim base customization is disabled');
      }
    }, (error) => {
      this.debug(`sim base customization start failed:${error}`);
    });
  },

  onSimcardStateChanged() {
    if (this.simcardReady()) {
      this.launchCustomization();
    }
  },

  listenCardStateChanged() {
    this.debug('simcards are not ready, waiting for it ready');
    this._eventHandler = this.onSimcardStateChanged.bind(this);
    for (let i = 0; i < this._iccManagers.length; i++) {
      this._iccManagers[i].addEventListener('cardstatechange', this._eventHandler);
    }
  },

  launchCustomization() {
    new WebActivity('launch-customization').start();
    for (let i = 0; i < this._iccManagers.length; i++) {
      if (this._eventHandler) {
        this._iccManagers[i].removeEventListener('cardstatechange', this._eventHandler);
      }
      this._iccManagers[i] = null;
    }
    this._iccManagers = [];
  },

  start() {
    this.debug('start');
    if (!FtuLauncher.isFinished()) {
      this._ftuFinished = this.ftuFinished.bind(this);
      window.addEventListener('ftudone', this._ftuFinished);
      window.addEventListener('ftuskip', this._ftuFinished);
      this.debug('wait FTU finished');
    } else {
      this._ftuDone = true;
    }
    this._logoHiddenCb = this.logoHidden.bind(this);
    window.addEventListener('logohidden', this._logoHiddenCb);
  }
};

SimConfig.start();
