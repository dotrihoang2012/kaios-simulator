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
