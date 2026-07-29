/* global WebActivity */
/* global SettingsObserver, AccountManagerDBHelper,
Requester, PowerManager, ScreenManager, DUMP*/

'use strict';

var PushCmd = {
  // The details of each status
  // accessibility int Accessibility type: one of  0 (unknown), 1 (Off line), 2 (Online)
  // locked int Locked type: one of  0 (unknown), 1 (Unlocked), 2 (Locked)
  // ringing int Ringing type: one of  0 (unknown), 1 (Idle), 2 (Ringing)
  // wiped_out int Accessibility type: one of  0 (unknown), 1 (None), 2 (Executed)
  processCommands: function pushcmd_process_commands(cmdarr) {
    // server response an array when command list size greater than one
    if (!Array.isArray(cmdarr)) {
      cmdarr = [cmdarr];
    }
    for (var i = 0; i < cmdarr.length; i++) {
      var cmdobj = cmdarr[i];
      for (var cmd in cmdobj) {
        // map server (short) commands to methods in the
        // commands object, and parse the arguments.
        var argsObj = cmdobj[cmd];
        switch (cmd) {
          case 'e':
            this.erase();
            break;
          case 'l':
            this.lock(argsObj.m, argsObj.c);
            break;
          case 'u':
            this.unlock();
            break;
          case 'r':
            this.ring();
            break;
          case 'm':
            this.update(argsObj.m, argsObj.n);
            break;
          default:
            break;
        }
      }
    }
  },

  ring: function pushcmd_ring() {
    var telephony = navigator.b2g.telephony;
    if (telephony &&
      telephony.calls && telephony.calls.length > 0) {
      telephony.calls.forEach(call => {
        call.hangUp();
      });
    }
    if (telephony &&
      telephony.conferenceGroup &&
      telephony.conferenceGroup.calls &&
      (telephony.conferenceGroup.calls.length ||
        telephony.conferenceGroup.state)) {
      telephony.conferenceGroup.hangUp();
    }

    ScreenManager.turnScreenOn('wake');

    const activity = new WebActivity('antitheft-ring', {});

    activity.start().then(
      result => {
        DUMP('Antitheft-ring Success', result);
        FMDManager.reportDeviceState(true, { ringing: 2 });
      },
      error => {
        console.error('Antitheft-ring Failure', error);
        FMDManager.reportDeviceState(false, { reason: 'failed to ring' });
      }
    );
  },

  erase: function pushcmd_erase() {
    FMDManager.reportFactoryReset().then(() => {
      try {
        PowerManager.setFactoryReset(0);
      }
      catch(e) {
        FMDManager.reportFactoryReset(true, { wiped_out: 0 });
      }
    });
  },

  lock: async function pushcmd_lock(message, passcode) {
    await SettingsObserver.setValue([{
      name: 'lockscreen.remote-lock',
      value: [message, passcode + '']
    }]);
    FMDManager.reportDeviceState(true, { locked: 2 });
  },

  update: async function pushcmd_update(message, number) {
    await SettingsObserver.setValue([{
      name: 'lockscreen.lock-message',
      value: '' + message + '\n' + number
    }]);
    FMDManager.reportDeviceState(true, { locked: 2 });
  },

  unlock: async function pushcmd_unlock() {
    await SettingsObserver.setValue([{
      name: 'lockscreen.remote-lock',
      value: ['', '']
    }]);
    FMDManager.reportDeviceState(true, { locked: 1 });
  },
};

const SCOPE_ANTITHEFT = '/js/antitheft';

var FMDManager = {
  isAntitheftLoggedIn: false,
  antitheft_registered: false,
  antitheft_enabled: false,
  push_url: 'https://api.kaiostech.com/v3.0',
  app_id: 'kNpFU6NavpPh4e5qnlFz',
  api_push: '/pushsubs/apps/',
  publicKey: base64UrlToUint8Array(
    'BJpjnIyVeRwf4tiHA5GeM-j1IqR7NN8kbqdQPaRD6QWezxvXJwicLRIYNU48JDJt8aH_28RvjUTtXRRqfL0GSZM'),
  REPORT_TIMEOUT: 30000,
  antitheft_userdisabled: false,

  setKidMacKey: function fmd_setKidMacKey(e) {
    try {
      if (typeof e === 'object') {
        this.token_info = {};
        this.token_info.kid = e.kid;
        this.token_info.mac_key = e.mac_key;
      } else if (typeof e === 'string') {
        this.token_info = JSON.parse(e);
      } else {
        this.token_info = null;
      }
    } catch (e) {
      console.error('antitheft set Kid catch');
    }
  },

  handlEnabled: function fdm_handleEnabled(value) {
    if (value && this.isAntitheftLoggedIn && !this.antitheft_registered) {
      DUMP('antitheft antitheft.enabled then subscribe Push');
      this.subscribePush();
    } else if (!value && this.isAntitheftLoggedIn && this.antitheft_registered) {
      this.disableAntitheft();
    }
  },

  disableAntitheft: function fdm_disableAntitheft() {
    SettingsObserver.setValue([{
      name: 'antitheft.userdisabled',
      value: true
    }]);
    this.antitheft_userdisabled = true;
    this.unsubscribe();
    this.resetAntitheftStatus();
  },

  initSettings: function fdm_initSettings() {
    var allPromise = [];
    allPromise.push(
      new Promise((resolve) => {
        SettingsObserver.getValue('antitheft.registered').then((isRegistered) => {
          this.antitheft_registered = !!isRegistered;
          resolve();
        });
      })
    );
    allPromise.push(
      new Promise((resolve) => {
        SettingsObserver.getValue('antitheft.enabled').then((enabled) => {
          this.antitheft_enabled = !!enabled;
          resolve();
        });
      })
    );
    allPromise.push(
      new Promise((resolve) => {
        SettingsObserver.getValue('antitheft.userdisabled').then((enabled) => {
          this.antitheft_userdisabled = !!enabled;
          resolve();
        });
      })
    );
    allPromise.push(
      new Promise((resolve) => {
        SettingsObserver.getValue('antitheft.apiServerUrl').then((value) => {
          this.push_url = value;
          resolve();
        });
      })
    );

    return Promise.all(allPromise).then(() => {
      return Promise.resolve();
    });
  },

  onDatachange: function fmd_onDatachange(e) {
    if (e.target.data.connected) {
      if (!this.antitheft_userdisabled &&
        !this.antitheft_enabled && this.isAntitheftLoggedIn) {
        DUMP('antitheft data connected then subscribe Push');
        this.subscribePush();
      }
    }
  },

  init: function fmd_init() {
    this.initSettings().then(() => {
      // make sure antitheft is registered when network is online
      // Try to register antitheft when not disabled by user
      const conns = navigator.b2g.mobileConnections || [];
      for (let i = 0; i < conns.length; i++) {
        conns[i].addEventListener('datachange', this.onDatachange.bind(this));
      }

      if (navigator.b2g.wifiManager) {
        navigator.b2g.wifiManager.addEventListener('wifihasinternet', () => {
          DUMP('antitheft wifihasinternet');
          const wifiManager = navigator.b2g.wifiManager;
          if (wifiManager.connection.status === 'connected' &&
            !this.antitheft_enabled && !this.antitheft_userdisabled &&
            this.isAntitheftLoggedIn) {
            DUMP('antitheft wifihasinternet then subscribe Push');
            this.subscribePush();
          }
        });
      }
    });

    this.getAccountToken().then(assertion => this.handleLoggedIn(assertion));

    window.addEventListener('kaiaccount:onlogin', (event) => {
      DUMP('antitheft KaiOS account signed in success.');
      // Per request, we force enable antitheft when log in.
      SettingsObserver.setValue([{ name: 'antitheft.enabled', value: true }]);
      this.handleLoggedIn(event.detail);
    });

    window.addEventListener('kaiaccount:onlogout', () => {
      console.warn('KaiOS account has been signed out.');
      SettingsObserver.setValue([{ name: 'antitheft.enabled', value: false }]);
      this.isAntitheftLoggedIn = false;
      this.disableAntitheft();
      this.setKidMacKey();
    });

    window.addEventListener('serviceworkermessage', ({
      detail
    }) => {
      const {
        type,
        scope,
        subscription,
        data
      } = detail;
      if (scope === SCOPE_ANTITHEFT) {
        DUMP(`Antitheft serviceworkermessage, detail=${JSON.stringify(detail)}`);
        switch (type) {
          case 'subscription':
            {
              this.shareSubscription(subscription);
              break;
            }
          case 'push':
            {
              this.swMessageHandler(data);
              break;
            }
          default:
            break;
        }
      }
    });

    SettingsObserver.observe('antitheft.enabled', '', (value) => {
      // When disable antitheft, we need user password verification.
      // This will cause the settings changed eanbled -> disabled -> eanbled,
      // Until user pass the verification, the final value will set to disabled.
      // Adding time out here to avoid these changes.
      clearTimeout(this.timeoutEnabled);
      this.timeoutEnabled = setTimeout(() => {
        this.handlEnabled(value);
      }, 1000);
    }, true);

    SettingsObserver.observe('lockscreen.remote-lock', '', (value) => {
      // We can not listen to lockscreen-request-unlock, since it can be
      // triggered right after the remote lock screen showing up. This will
      // cause the wrong lock status to server.
      DUMP('lockscreen.remote-lock value is ' + value[0] + ' ' + value[1]);
      if (value[0] === '' && value[1] === '') {
        // clear the lockscreen lock message
        SettingsObserver.setValue([{
          name: 'lockscreen.lock-message',
          value: ''
        }]);
        FMDManager.reportDeviceState(true, { locked: 1 });
        DUMP('Reporting lockscreen unlocked status');
      }
    }, true);
  },

  swMessageHandler: async function fmd_swMessageHandler(data) {
    var command = null;
    try {
      var command_text = data.text;
      DUMP('antitheft ' + command_text);
      command = JSON.parse(command_text.replace(/[\b\f\n\r\t]/g, ''));
    } catch (e) {
      DUMP('antitheft illegal text character');
    }
    if (!command) {
      command = {
        r: ''
      };
    }
    //Remove push subscription before sending wipe command, no matther the result.
    if (command && command.e) {
      await this.removeSubscription();
    }
    PushCmd.processCommands(command);
  },

  handleLoggedIn: function fmd_handleLoggedIn(assertion) {
    this.setKidMacKey(assertion);
    this.isAntitheftLoggedIn = true;
  },

  resetAntitheftStatus: function fmd_resetAntitheftStatus() {
    SettingsObserver.setValue([{
      name: 'antitheft.registered',
      value: false
    }]);
    this.antitheft_registered = false;
    SettingsObserver.setValue([{
      name: 'antitheft.enabled',
      value: false
    }]);
    this.antitheft_enabled = false;
  },

  enableAntitheftStatus: function fmd_enableAntitheftStatus() {
    SettingsObserver.setValue([{
      name: 'antitheft.registered',
      value: true
    }]);
    this.antitheft_registered = true;
    SettingsObserver.setValue([{
      name: 'antitheft.enabled',
      value: true
    }]);
    this.antitheft_enabled = true;
    SettingsObserver.setValue([{
      name: 'antitheft.userdisabled',
      value: false
    }]);
    this.antitheft_userdisabled = false;
  },

  subscribePush: function fmd_subscribePush() {
    // To trigger getting push endpoint.
    // Get subscription event from serviceworkermessage
    const proxyFrame = window.document.getElementById('sw-proxy');
    proxyFrame.contentWindow.postMessage({
        type: 'register-push',
        scope: SCOPE_ANTITHEFT,
        applicationServerKey: this.publicKey
      },
      proxyFrame.src
    );
    // In case any error during the process, reset state
    clearTimeout(this.timer);
    this.timer = setTimeout(this.resetAntitheftStatus, 60000);
  },


  shareSubscription: function fmd_shareEndpoint(subscription) {
    DUMP('antitheft in shareSubscription', JSON.stringify(subscription));
    this.sendSubscription(subscription).then((result) => {
      DUMP('antitheft subscription sent to server, result is ' + JSON.stringify(result));
      // Set enabled status
      clearTimeout(this.timer);
      this.enableAntitheftStatus();
    }, (error) => {
      this.resetAntitheftStatus();
      console.error('antitheft Sending subscription Error is ' + error);
    });
  },

  unsubscribe: function fmd_unsubscribe() {
    const proxyFrame = window.document.getElementById('sw-proxy');
    proxyFrame.contentWindow.postMessage({
        type: 'unregister-push',
        scope: SCOPE_ANTITHEFT
      },
      proxyFrame.src
    );

    this.removeSubscription();
  },

  reportDeviceState: function(success, state, callback) {
    if (!state) {
      state = { };
    }

    if (success && !state.accessibility) {
      state.accessibility = 2;
    }

    var opts = {
      url: this.push_url + '/accounts/me/devices/this/status',
      method: 'PUT',
      params: state,
    };

    DUMP('reporting' + JSON.stringify(opts));

    var requester = new Requester(this.REPORT_TIMEOUT);
    requester.setHawkCredentials(this.token_info.kid, this.token_info.mac_key);
    requester.send(opts).then((result) => {
      callback && callback(result);
    }, (error) => {
      callback && callback(error);
    });
  },

  reportFactoryReset: function() {
    return new Promise((resolve) => {
      var state = {
        'wiped_out': 3,
        'accessibility': 2
      };

      this.reportDeviceState(true, state, () => {
        resolve();
      })
    });
  },

  removeSubscription: function fmd_removeSubscription() {
    return new Promise((resolve, reject) => {
      var opts = {
        url: this.push_url + this.api_push + this.app_id,
        method: 'DELETE'
      };
      DUMP('antitheft deleting push from server');
      var requester = new Requester(this.REPORT_TIMEOUT);
      requester.setHawkCredentials(this.token_info.kid, this.token_info.mac_key);
      requester.send(opts).then((result) => {
        DUMP('antitheft Push subscription removed');
        resolve(result);
      }, (error) => {
        // handle error here
        DUMP('antitheft deleting error ' + JSON.stringify(error));
        reject(error);
      });
    });
  },

  sendSubscription: function fmd_sendSubscription(subscription) {
    return new Promise((resolve, reject) => {
      var format_sub = {};
      format_sub.push_type = 5000;
      format_sub.push_subsc = window.btoa(JSON.stringify(subscription));

      DUMP('antitheft btoa subscription is ' + JSON.stringify(format_sub));
      var opts = {
        url: this.push_url + this.api_push + this.app_id,
        method: 'POST',
        params: format_sub
      };
      var requester = new Requester(this.REPORT_TIMEOUT);
      requester.setHawkCredentials(this.token_info.kid, this.token_info.mac_key);
      requester.send(opts).then((result) => {
        resolve(result);
      }, (error) => {
        // handle error here
        DUMP('antitheft makeRequest error ' + JSON.stringify(error));
        reject(error);
      });
    });
  },

  getAccountToken: function fmd_getAccountToken() {
    return new Promise((resolve, reject) => {
      AccountManagerDBHelper.get({
          authenticatorId: 'kaiaccount'
        },
        account => {
          if (!account) {
            reject();
          } else {
            resolve(account && account.credential);
          }
        }
      );
    });
  },
};

function uint8ArrayToBase64Url(uint8Array, start, end) {
  start = start || 0;
  end = end || uint8Array.byteLength;

  const base64 = self.btoa(
    String.fromCharCode.apply(null, uint8Array.subarray(start, end)));
  return base64
    .replace(/\=/g, '') // eslint-disable-line no-useless-escape
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Converts the URL-safe base64 encoded |base64UrlData| to an Uint8Array buffer.
function base64UrlToUint8Array(base64UrlData) {
  const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  const base64 = (base64UrlData + padding)
    // eslint-disable-next-line no-useless-escape
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = self.atob(base64);
  const buffer = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

if (typeof window !== 'undefined' && window) {
  window.uint8ArrayToBase64Url = uint8ArrayToBase64Url;
  window.base64UrlToUint8Array = base64UrlToUint8Array;
}

FMDManager.init();
