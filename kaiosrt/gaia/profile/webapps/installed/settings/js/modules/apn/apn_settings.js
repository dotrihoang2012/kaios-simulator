/**
 * ApnSettings provides functions for manipulating the apn settings in the
 * settings database.
 * Implementation details please refer to {@link ApnSettings}.
 *
 * @module modules/apn/apn_settings
 */

define(['require','modules/apn/apn_utils','modules/apn/apn_const'],function(require) { //eslint-disable-line
  const ApnUtils = require('modules/apn/apn_utils');
  const ApnConst = require('modules/apn/apn_const');

  const APN_SIM1 = 'ril.data.dm.apnSettings.sim1';
  const APN_SIM2 = 'ril.data.dm.apnSettings.sim2';
  const { DEFAULT_APN_SETTINGS_KEY } = ApnConst;

  /**
   * @class ApnSettings
   * @returns {ApnSettings}
   */
  function ApnSettings() {
    this.isReady = false;
    this.readyPromise = null;
    this.isWritingDB = false;
    this.isDirty = false;
    this.apnSettings = ['', ''];
    this.promiseChain = Promise.resolve();
  }

  ApnSettings.prototype = {
    /**
     * As the operations should not be performed concurrently. We use this
     * function to enusre the operations are performed one by one.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @param {Function} task
     * @returns {Promise}
     */
    schedule(task) {
      const that = this;
      this.promiseChain = this.promiseChain.then(() =>
        task().then(() => that.commit())
      );
      return this.promiseChain;
    },

    /**
     * Stores the current copy of apn settings to the settings database.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @returns {Promise}
     */
    commit() {
      if (!this.isDirty) {
        return Promise.resolve();
      }

      const that = this;
      return new Promise(resolve => {
        that.isWritingDB = true;
        const obj = {
          [APN_SIM1]: that.apnSettings[0],
          [APN_SIM2]: that.apnSettings[1]
        };
        SettingsDBCache.saveSettings(obj);
        that.isDirty = false;
        that.isWritingDB = false;
        resolve();
      });
    },

    /**
     * Registers an observer on setting changes because ril.data.apnSettings
     * could be changed by other apps (system and wap).
     *
     * @access private
     * @memberOf ApnSettings.prototype
     */
    addObservers() {
      SettingsDBCache.observe(
        APN_SIM1,
        '',
        value => {
          if (!this.isWritingDB) {
            // Do not reflect the change during the committing.
            this.apnSettings[0] = value;
          }
        },
        true
      );
      SettingsDBCache.observe(
        APN_SIM2,
        '',
        value => {
          if (!this.isWritingDB) {
            // Do not reflect the change during the committing.
            this.apnSettings[1] = value;
          }
        },
        true
      );
    },

    /**
     * Initializes the settings based on the values stored in the settings
     * database.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @returns {Promise}
     */
    ready() {
      if (this.isReady) {
        return Promise.resolve();
      }
      // This ensures that the ready process being executed only once.
      if (!this.readyPromise) {
        const that = this;
        this.readyPromise = new Promise(resolve => {
          SettingsDBCache.getSettings([APN_SIM1, APN_SIM2], result => {
            that.isReady = true;
            that.apnSettings[0] = result[APN_SIM1];
            that.apnSettings[1] = result[APN_SIM2];
            that.addObservers();
            resolve();
          });
        });
      }
      return this.readyPromise;
    },

    /**
     * The internal update function.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @params {String} apnType
     * @params {Object} newApn
     * @returns {Promise}
     */
    updateInternal(serviceId, apnType, newApn) {
      return this.ready().then(() => {
        let apns = this.apnSettings[serviceId];
        if (!apns) {
          apns = [];
          this.apnSettings[serviceId] = apns;
        }

        const index = apns.findIndex(apn =>
          apn.types.some(type => apnType === type)
        );

        if (index === -1) {
          if (newApn) {
            this.isDirty = true;
            apns.push(newApn);
          }
        } else if (newApn) {
          if (!ApnUtils.isMatchedApn(apns[index], newApn)) {
            this.isDirty = true;
            apns[index] = newApn;
          }
        } else {
          this.isDirty = true;
          apns.splice(index, 1);
        }
      });
    },

    /**
     * Get all apns with of a sim card.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @returns {Promise Array}
     */
    getAll(serviceId) {
      return this.ready().then(() => this.apnSettings[serviceId]);
    },

    /**
     * Get the apn of the specified apn type.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @params {String} apnType
     * @returns {Promise Object}
     */
    get(serviceId, apnType) {
      return this.ready().then(() => {
        const apns = this.apnSettings[serviceId];
        if (apns) {
          return apns.find(apn => apn.types.indexOf(apnType) >= 0);
        }
        return null;
      });
    },

    /**
     * Update an apn and the change will be saved into the settings database.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @params {String} apnType
     * @params {Object} apn
     * @returns {Promise}
     */
    update(serviceId, apnType, apn) {
      const apnClone = ApnUtils.clone(apn);
      return this.schedule(
        this.updateInternal.bind(this, serviceId, apnType, apnClone)
      );
    },

    /**
     * Restore the apn settings to the default value determined in
     * system/js/operator_variants.js.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {String} serviceId
     * @params {Object} presetApns
     * @returns {Promise}
     */
    restore(serviceId, presetApns) {
      const that = this;
      return that.ready().then(() => {
        new Promise(resolve => {
          if (DeviceFeature.getValue('cdmaApn') === 'true') {
            resolve(presetApns);
          } else {
            SettingsDBCache.getSetting(DEFAULT_APN_SETTINGS_KEY).then(value => {
              resolve(value[serviceId] || []);
            });
          }
        }).then(restoreApns =>
          that.schedule(() => {
            that.isDirty = true;
            that.apnSettings[serviceId] = restoreApns;
            return Promise.resolve();
          })
        );
      });
    }
  };

  return function apnSettings() {
    return new ApnSettings();
  };
});
