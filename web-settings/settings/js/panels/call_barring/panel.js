/**
 *  Call Barring Settings
 *  Manage the state of the different services of call barring
 */

(function callBarring(exports) {
  const SERVICE_CLASS_VOICE = 1; // (1 << 0);
  const SERVICE_CLASS_VIDEO = 80;
  const SERVICE_CLASS_NONE = 0;

  const cbAction = {
    CALL_BARRING_BAOC: 0, // BAOC: Barring All Outgoing Calls
    CALL_BARRING_BOIC: 1, // BOIC: Barring Outgoing International Calls
    CALL_BARRING_BOICEXHC: 2, // BOICEXHC: Barring Outgoing International
    //           Calls Except to Home Country
    CALL_BARRING_BAIC: 3, // BAIC: Barring All Incoming Calls
    CALL_BARRING_BAICR: 4 // BAICR: Barring All Incoming Calls in Roaming
  };

  const cbServiceMapper = {
    baoc: cbAction.CALL_BARRING_BAOC,
    boic: cbAction.CALL_BARRING_BOIC,
    boicExhc: cbAction.CALL_BARRING_BOICEXHC,
    baic: cbAction.CALL_BARRING_BAIC,
    baicR: cbAction.CALL_BARRING_BAICR
  };

  const callBarringPrototype = {
    // Settings
    baoc: '',
    boic: '',
    boicExhc: '',
    baic: '',
    baicR: '',
    // Enabled state for the settings
    baocEnabled: '',
    boicEnabled: '',
    boicExhcEnabled: '',
    baicEnabled: '',
    baicREnabled: '',

    // UpdatingState
    updating: false,

    enable(elementArray) {
      elementArray.forEach(element => {
        this[`${element}Enabled`] = true;
      });

      // If barring All Outgoing is set, disable the rest of outgoing calls
      if (this.baoc) {
        this.boicEnabled = false;
        this.boicExhcEnabled = false;
      }
      // If barring All Incoming is active, disable the rest of incoming calls
      if (this.baic) {
        this.baicREnabled = false;
      }
    },

    disable(elementArray) {
      elementArray.forEach(element => {
        this[`${element}Enabled`] = false;
      });
    },

    /**
     * Makes a request to the RIL for the current state of a specific
     * call barring option.
     * @param id Code of the service we want to request the state of
     * @returns Promise with result/error of the request
     */
    getRequest(api, id, callType) {
      const callOptions = {
        program: id,
        /*
         * Changed serviceClass to ICC_SERVICE_CLASS_NONE for request
         * all cases
         */
        serviceClass: SERVICE_CLASS_NONE
      };
      return new Promise(resolve => {
        // Send the request
        const request = api.getCallBarringOption(callOptions);
        request.onsuccess = () => {
          const mask =
            callType === 'voice' ? SERVICE_CLASS_VOICE : SERVICE_CLASS_VIDEO;
          const value = request.result.serviceClass & mask;
          const status = value === mask;
          resolve(status);
        };
        request.onerror = () => {
          /* Request.error = { name, message } */
          resolve(request.error);
        };
      });
    },

    /**
     * Makes a request to the RIL to change the current state of a specific
     * call barring option.
     * @param options Object with the details of the new state
     * {
     *   'program':      // id of the service to update
     *   'enabled':      // new state for the service
     *   'password':     // password introduced by the user
     *   'serviceClass': // type of RIL service (voice/video)
     * }
     */
    setRequest(api, options) {
      return new Promise((resolve, reject) => {
        // Send the request
        const request = api.setCallBarringOption(options);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          /* Request.error = { name, message } */
          reject(request.error);
        };
      });
    },

    set(api, setting, password, callType) {
      // Check for updating in progress
      if (this.updating) {
        return;
      }
      // Check for API to be called
      if (!api) {
        return;
      }

      // eslint-disable-next-line
      return new Promise((resolve, reject) => {
        this.updating = true;
        const allElements = ['baoc', 'boic', 'boicExhc', 'baic', 'baicR'];
        this.disable(allElements);
        const serviceClass =
          callType === 'voice'
            ? api.ICC_SERVICE_CLASS_VOICE
            : api.ICC_SERVICE_CLASS_PACKET | api.ICC_SERVICE_CLASS_DATA_SYNC;
        // Get options
        const options = {
          program: cbServiceMapper[setting],
          enabled: !this[setting],
          password,
          serviceClass
        };

        let error = null;
        this.setRequest(api, options)
          .then(() => {
            this[setting] = !this[setting];
          })
          .catch(err => {
            error = err;
          })
          .then(() => {
            this.updating = false;
            this.enable(allElements);
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
      });
    },

    getAll(api, callType) {
      // Check for updating in progress
      if (this.updating) {
        return;
      }
      // Check for API to be called
      if (!api) {
        return;
      }

      // Check for all elements' status
      const allElements = ['baoc', 'boic', 'boicExhc', 'baic', 'baicR'];

      this.updating = true;
      const elementList = [];

      // eslint-disable-next-line
      return new Promise((resolve) => {
        this.disable(allElements);

        let setting = 'baoc';
        this.getRequest(api, cbServiceMapper[setting], callType)
          .then(value => {
            if (typeof value === 'boolean') {
              this[setting] = value;
              elementList.push('baoc');
            }
            setting = 'boic';
            return this.getRequest(api, cbServiceMapper[setting], callType);
          })
          .then(value => {
            if (typeof value === 'boolean') {
              this[setting] = value;
              elementList.push('boic');
            }
            setting = 'boicExhc';
            return this.getRequest(api, cbServiceMapper[setting], callType);
          })
          .then(value => {
            if (typeof value === 'boolean') {
              this[setting] = value;
              elementList.push('boicExhc');
            }
            setting = 'baic';
            return this.getRequest(api, cbServiceMapper[setting], callType);
          })
          .then(value => {
            if (typeof value === 'boolean') {
              this[setting] = value;
              elementList.push('baic');
            }
            setting = 'baicR';
            return this.getRequest(api, cbServiceMapper[setting], callType);
          })
          .then(value => {
            if (typeof value === 'boolean') {
              this[setting] = value;
              elementList.push('baicR');
            }
          })
          .then(() => {
            this.updating = false;
            this.enable(elementList);
            resolve();
          });
      });
    }
  };

  exports.CallBarring = callBarringPrototype;
})(window);

define("panels/call_barring/call_barring", function(){});

/* global CallBarring*/


define('panels/call_barring/panel',['require','modules/settings_panel','panels/call_barring/call_barring'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  require('panels/call_barring/call_barring');

  return function createCallBarringPanel() {
    let serviceId = 0;
    let elements = null;
    const callBarring = CallBarring;
    let mobileConnection = null;
    let cbSettings = {};
    let refresh = null;
    let updating = null;
    let listElements = {};
    let callType = 'voice';

    /**
     * @HACK To Enable the select option
     */
    function enableSelect(evt) {
      if (evt.key === 'Enter') {
        const select = document.querySelector('li.focus select');
        if (!select) {
          return;
        }
        if (!updating) {
          select.classList.remove('hidden');
          select.focus();
        }
        select.classList.add('hidden');
      }
    }

    /**
     * Updates a Call Barring item with a new status.
     * @parameter item DOM 'li' element to update
     * @parameter newStatus Object with data for the update. Of the form:
     * {
     *   disabled:[true|false], // optional, new disabled state
     *   checked: [true|false], // optional, new checked state for the input
     *   message: [string]      // optional, new message for the description
     * }
     */
    function updateCallBarringItem(item, newStatus) {
      const descText = item.querySelector('small');
      const select = item.querySelector('select');

      // Disable the item
      if (typeof newStatus.disabled === 'boolean') {
        if (newStatus.disabled) {
          item.setAttribute('aria-disabled', true);
          item.classList.add('none-select');
        } else {
          item.removeAttribute('aria-disabled');
          item.classList.remove('none-select');
        }
        ListFocusHelper.updateSoftkey(elements.currentPanel);

        if (select) {
          select.disabled = newStatus.disabled;
        }
      }

      // Update the select value
      if (select && typeof newStatus.checked === 'boolean') {
        select.value = newStatus.checked ? 'true' : 'false';
      }

      // Update the description
      function getSelectValue() {
        const enabled = select.value === 'true';
        let status = '';
        if (select) {
          status = enabled ? 'enabled' : 'disabled';
        }
        return status;
      }

      if (descText && updating) {
        descText.setAttribute('data-l10n-id', 'callSettingsQuery');
      } else {
        // Clear the data-l10n-id information
        descText.innerHTML = '';
        descText.setAttribute('data-l10n-id', getSelectValue());
      }
    }

    /**
     * Shows the passcode input screen for the user to introduce the PIN
     * needed to activate/deactivate a service
     */
    function callBarringChange(evt) {
      const settingValue = evt.target.name;
      const enabled = evt.target.value;
      Settings.setCurrentPanel('#call_barring_passcode', {
        type: callType,
        serviceId,
        settingValue,
        enabled
      });
    }

    function onClickEventHandler() {
      Settings.setCurrentPanel('#call_barring_passcode_change', {
        type: callType,
        serviceId
      });
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          currentPanel: panel,
          header: panel.querySelector('#call-cb-header'),
          title: panel.querySelector('#call-cb-header h1'),
          changePasscodeButton: panel.querySelector('#li-cb-pswd button')
        };
        listElements = panel.querySelectorAll('li');
        cbSettings = {
          baoc: document.getElementById('li-cb-baoc'),
          boic: document.getElementById('li-cb-boic'),
          boicExhc: document.getElementById('li-cb-boicExhc'),
          baic: document.getElementById('li-cb-baic'),
          baicR: document.getElementById('li-cb-baicR')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        callType = options.type || 'voice';
        DeviceFeature.ready(() => {
          if (DeviceFeature.getValue('vilte') === 'true') {
            elements.header.setAttribute('data-href', '#call_cb_settings_list');
            if (callType === 'video') {
              elements.title.setAttribute('data-l10n-id', 'video-call-header');
            } else {
              elements.title.setAttribute('data-l10n-id', 'voice-call-header');
            }
          } else {
            elements.header.setAttribute('data-href', '#call');
            elements.title.setAttribute('data-l10n-id', 'callBarring-header');
          }
        });

        mobileConnection = ApiManager.connections[serviceId];

        if (
          options &&
          options.origin &&
          options.origin === '#call_barring_passcode_change'
        ) {
          refresh = false;
          updating = false;
        } else {
          refresh = true;
          updating = true;
          // Update the call barring item value status
          for (let element in cbSettings) { // eslint-disable-line
            callBarring[element] = false;
            updateCallBarringItem(cbSettings[element], {
              checked: false,
              disabled: true
            });
          }
        }

        for (let i in cbSettings) { //eslint-disable-line
          cbSettings[i]
            .querySelector('select')
            .addEventListener('change', callBarringChange);
        }

        ListFocusHelper.addEventListener(listElements);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
      },

      onShow() {
        if (refresh) {
          callBarring.getAll(mobileConnection, callType).then(() => {
            updating = callBarring.updating; // eslint-disable-line
            updateCallBarringItem(cbSettings.baoc, {
              checked: callBarring.baoc,
              disabled: !callBarring.baocEnabled
            });
            updateCallBarringItem(cbSettings.boic, {
              checked: callBarring.boic,
              disabled: !callBarring.boicEnabled
            });
            updateCallBarringItem(cbSettings.boicExhc, {
              checked: callBarring.boicExhc,
              disabled: !callBarring.boicExhcEnabled
            });
            updateCallBarringItem(cbSettings.baic, {
              checked: callBarring.baic,
              disabled: !callBarring.baicEnabled
            });
            updateCallBarringItem(cbSettings.baicR, {
              checked: callBarring.baicR,
              disabled: !callBarring.baicREnabled
            });
          });
        }

        window.addEventListener('keydown', enableSelect);
        elements.changePasscodeButton.addEventListener(
          'click',
          onClickEventHandler
        );
      },

      onHide() {
        window.removeEventListener('keydown', enableSelect);
        elements.changePasscodeButton.removeEventListener(
          'click',
          onClickEventHandler
        );
      },

      onBeforeHide() {
        for (let i in cbSettings) { //eslint-disable-line
          cbSettings[i]
            .querySelector('select')
            .removeEventListener('change', callBarringChange);
        }
        ListFocusHelper.removeEventListener(listElements);
      },

      onUninit() {
        CallBarring.updating = false;
      }
    });
  };
});

