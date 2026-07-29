
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line


  const SettingsPanel = require('modules/settings_panel');
  return function createResetProgressPanel() {
    let IsFactoryReset = false;
    function doFactoryReset() {
      if (!ApiManager.power) {
        console.error('Cannot get power');
        return;
      }
      ApiManager.power.setFactoryReset(0);
      IsFactoryReset = false;
    }

    function hexString2byte(str) {
      const a = [];
      for (let i = 0, len = str.length; i < len; i += 2) {
        a.push(parseInt(str.substr(i, 2), 16));
      }
      return new Uint8Array(a);
    }

    function resetSecureElement() {
      const AID = {
        CRS: 'A00000015143525300'
      };

      const APDU = {
        nxp: {
          reset: { cla: 0x80, ins: 0xc3, p1: 0x04, p2: 0x00, le: 0x00 }
        }
      };
      if (!window.navigator.seManager) {
        doFactoryReset();
        return;
      }

      window.navigator.seManager
        .getSEReaders()
        .then(readers => {
          window.reader = readers[0]; // eslint-disable-line
          return readers[0].openSession();
        })
        .then(session => {
          window.testSession = session;
          return session.getAtr();
        })
        .then(() => {
          return window.testSession.openBasicChannel(hexString2byte(AID.CRS));
        })
        .then(channel => {
          window.testChannel = channel;
          return channel.transmit(APDU.nxp.reset);
        })
        .then(() => {
          window.reader
            .closeAll()
            .then(() => {
              doFactoryReset();
            })
            .catch(() => {
              doFactoryReset();
            });
        })
        .catch(() => {
          window.reader
            .closeAll()
            .then(() => {
              doFactoryReset();
            })
            .catch(() => {
              doFactoryReset();
            });
        });
    }

    function factoryReset() {
      IsFactoryReset = true;
      const { nfc } = ApiManager;
      if (!nfc) {
        doFactoryReset();
        return;
      }

      SettingsDBCache.getSetting('nfc.enabled').then(enabled => {
        if (enabled) {
          resetSecureElement();
          return;
        }
        SettingsDBCache.saveSettings({ 'nfc.enabled': true });
        let count = 0;
        const check = function check() {
          if (!nfc.enabled) {
            if (count++ < 15) {
              window.setTimeout(check, 1000);
              return;
            }
            doFactoryReset();
            return;
          }
          resetSecureElement();
        };

        window.setTimeout(check, 1000);
      });
    }

    function HWKhandler(e) {
      if (e.key === 'Backspace') {
        // Prevent Settings app from being killed by system app.
        if (IsFactoryReset) {
          e.preventDefault();
        }
      }
    }

    return SettingsPanel({
      onBeforeShow() {
        window.addEventListener('keydown', HWKhandler);
        SettingsSoftkey.hide();
        factoryReset();
      },

      onBeforeHide() {
        window.removeEventListener('keydown', HWKhandler);
      }
    });
  };
});
