/**
 * ApnItem is a wrapper of apn objects.
 *
 * @module modules/apn/apn_item
 */

define('modules/apn/apn_item',[],function() { //eslint-disable-line
  const APN_CATEGORY = {
    PRESET: 'preset',
    CUSTOM: 'custom',
    EU: 'eu'
  };

  /**
   * @class ApnItem
   * @params {String} id
   * @params {String} category
   * @params {Object} apn
   * @returns {ApnItem}
   */
  function ApnItem(id, category, apn) {
    this.itemId = id;
    this.itemCategory = category;
    this.itemApn = apn;
  }

  ApnItem.prototype = {
    get id() {
      return this.itemId;
    },
    get category() {
      return this.itemCategory;
    },
    get apn() {
      return this.itemApn;
    }
  };

  const constructor = function constructor(id, category, apn) {
    return new ApnItem(id, category, apn);
  };
  constructor.APN_CATEGORY = APN_CATEGORY;

  return constructor;
});

/* global ApnHelper */
/**
 * The apn utilities
 */

define('modules/apn/apn_utils',['require','modules/apn/apn_const','modules/apn/apn_item'],function(require) { //eslint-disable-line
  const ApnConst = require('modules/apn/apn_const');
  const ApnItem = require('modules/apn/apn_item');

  const { CP_APN_KEY } = ApnConst;
  const { DEFAULT_APN_KEY } = ApnConst;
  const { MCC_SETTINGS_KEY } = ApnConst;
  const { MNC_SETTINGS_KEY } = ApnConst;
  const { MVNO_SETTINGS_KEY } = ApnConst;
  const { APN_PROPS } = ApnConst;
  const { EU_ROAMING_FILE_PATH } = ApnConst;

  function getOperatorCode(serviceId, type) {
    let value = '';
    let key = '';

    if (type === 'mcc') {
      value = '000';
      key = MCC_SETTINGS_KEY;
    } else if (type === 'mnc') {
      value = '00';
      key = MNC_SETTINGS_KEY;
    } else if (type === 'mvno') {
      value = [];
      key = MVNO_SETTINGS_KEY;
    } else {
      const error = 'invalid type';
      return Promise.reject(error);
    }

    return new Promise(resolve => {
      SettingsDBCache.getSetting(key).then(results => {
        if (results && Array.isArray(results) && results[serviceId]) {
          value = results[serviceId];
        }
        resolve(value);
      });
    });
  }

  /**
   * Helper function. Filter APNs by apn type.
   *
   * @param {String} type
   *                 The apn type we would like to include.
   * @param {ApnItem} apnItem
   */
  function apnTypeFilter(type, apnItem) {
    if (!type || !apnItem || !apnItem.apn.types) {
      return false;
    } else if (type === '*') {
      return true;
    }
    return apnItem.apn.types.indexOf(type) !== -1;
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments in the apn.json
   * database
   *
   * @param {String} mcc
   * @param {String} mnc
   * @param {String} networkType
   *                 The network type which the APN must be compatible with.
   */
  function getDefaultApns(Obj, serviceId) {
    // Should fallback to the JSON file if we don't get the apns
    return new Promise(resolve => {
      SettingsDBCache.getSetting(DEFAULT_APN_KEY).then(value => {
        const { mcc, mnc, networkType } = Obj;
        const result = value[serviceId] || {};
        const apns = {};
        apns[mcc] = {};
        apns[mcc][mnc] = result || {};
        resolve(ApnHelper.getCompatible(apns, mcc, mnc, networkType)); // eslint-disable-line
      });
    });
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments in the database
   * received through client provisioning messages.
   *
   * @param {String} mcc
   * @param {String} mnc
   * @param {String} networkType
   *                 The network type which the APN must be compatible with.
   */
  function getCpApns(Obj, serviceId) {
    return new Promise(resolve => {
      SettingsDBCache.getSetting(CP_APN_KEY).then(value => {
        const { mcc, mnc, networkType } = Obj;
        const apns = value || {};
        resolve(
          ApnHelper.getCompatible(apns[serviceId], mcc, mnc, networkType)
        ); // eslint-disable-line
      });
    });
  }

  let euApnChecked = false;
  let euApns = null;

  /**
   * Return the EU apns for roaming.
   */
  function getEuApns() {
    if (euApnChecked) {
      return Promise.resolve(euApns);
    }
    return LazyLoader.getJSON(EU_ROAMING_FILE_PATH)
      .then(result => {
        euApnChecked = true;

        /*
         * Only return eu apns when both home and foreign operators are
         * Specified.
         */
        if (
          result.home &&
          result.foreign &&
          Object.keys(result.home).length > 0 &&
          Object.keys(result.foreign).length > 0
        ) {
          euApns = result.defaultApns;
        }
        return euApns;
      })
      .catch(() => {
        euApnChecked = true;
        return null;
      });
  }

  function generateId() {
    // Should refine this
    return Math.random()
      .toString(36)
      .substr(2, 9);
  }

  function cloneApn(apn) {
    const newApn = {};
    for (let p in apn) { // eslint-disable-line
      newApn[p] = apn[p];
    }
    return newApn;
  }

  function separateApnsByType(apns) {
    if (!apns) {
      return [];
    }
    return apns.reduce((result, apn) => {
      // Separate the apn by type
      apn.types.forEach(type => {
        const newApn = cloneApn(apn);
        newApn.types = [type];
        result.push(newApn);
      });
      return result;
    }, []);
  }

  function isMatchedApn(apn1, apn2) {
    if (!apn1 || !apn2) {
      return false;
    }

    // Check if the type of apn1 is the subset of apn2
    if (!apn1.types.every(type => apn2.types.indexOf(type) !== -1)) {
      return false;
    }

    return APN_PROPS.every(prop => {
      if (prop === 'types') {
        // We've already check this property
        return true;
      }
      return apn1[prop] === apn2[prop];
    });
  }

  function sortByCategory(apn1, apn2) {
    if (apn1.category === ApnItem.APN_CATEGORY.PRESET) {
      return true;
    } else if (apn2.category === ApnItem.APN_CATEGORY.PRESET) {
      return false;
    }
    return true;
  }

  function clone(apn) {
    return JSON.parse(JSON.stringify(apn));
  }

  return {
    getOperatorCode,
    apnTypeFilter,
    getDefaultApns,
    getCpApns,
    getEuApns,
    generateId,
    separateApnsByType,
    isMatchedApn,
    sortByCategory,
    clone
  };
});

/**
 * ApnSettings provides functions for manipulating the apn settings in the
 * settings database.
 * Implementation details please refer to {@link ApnSettings}.
 *
 * @module modules/apn/apn_settings
 */

define('modules/apn/apn_settings',['require','modules/apn/apn_utils','modules/apn/apn_const'],function(require) { //eslint-disable-line
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

/**
 * ApnList stores ApnItem objects representing apns come from the apn.json
 * database, client provisioning messages, and user's creation. Each ApnItem has
 * an id assigned upon the creation. The id is used to recored users' apn
 * selection.
 *
 * @module modules/apn/apn_list
 */

define('modules/apn/apn_list',['require','modules/async_storage','modules/apn/apn_utils','modules/apn/apn_item'],function(require) { //eslint-disable-line
  const AsyncStorage = require('modules/async_storage');
  const ApnUtils = require('modules/apn/apn_utils');
  const ApnItem = require('modules/apn/apn_item');

  /**
   * @class ApnList
   * @requires module:modules/async_storage
   * @requires module:modules/apn/apn_utils
   * @requires module:modules/apn/apn_item
   * @returns {ApnList}
   */
  function ApnList(key) {
    this.key = key;
    this.apnItems = null;
    this.pendingTaskCount = 0;
    this.promiseChain = Promise.resolve();
  }

  ApnList.prototype = {
    /**
     * As the operations should not be performed concurrently. We use this
     * function to enusre the operations are performed one by one.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @param {Function} task
     * @returns {Promise}
     */
    schedule(task) {
      const that = this;
      this.promiseChain = this.promiseChain.then(() => {
        that.pendingTaskCount++;
        return task().then(result => {
          that.pendingTaskCount--;
          if (that.pendingTaskCount === 0) {
            return that.commit().then(() => result);
          }
          return result;
        });
      });
      return this.promiseChain;
    },

    /**
     * ApnItems are wrapped apn items. The function unwraps the items so
     * that they can be stored to async storage.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @returns {Array}
     */
    export() {
      return this.apnItems.map(apnItem => {
        // Convert the apn items to static objects for storing.
        const apnClone = ApnUtils.clone(apnItem.apn);
        apnClone.id = apnItem.id;
        apnClone.category = apnItem.category;
        return apnClone;
      });
    },

    /**
     * Stores the current copy of apn items to async storage.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @returns {Promise}
     */
    commit() {
      if (!this.apnItems) {
        return Promise.resolve();
      }
      const apns = this.export();
      return AsyncStorage.setItem(this.key, apns);
    },

    /**
     * The internal add function.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @params {Object} apn
     * @params {ApnItem.APN_CATEGORY} category
     * @returns {Promise String} The apn id
     */
    addInternal(apn, category) {
      return this.items().then(apnItems => {
        if (!apnItems) {
          // Set default apn items
          apnItems = [];
          this.apnItems = apnItems;
        }

        const existApnItem = apnItems.find(
          apnItem => apn.itemId && apnItem.itemApn.itemId === apn.itemId
        );

        if (existApnItem) {
          return apn.id;
        }

        category = category || ApnItem.APN_CATEGORY.CUSTOM;
        const apnItem = ApnItem(ApnUtils.generateId(), category, apn);

        apnItems.unshift(apnItem);
        return apnItem.id;
      });
    },

    /**
     * The internal remove function.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @params {String} id
     * @returns {Promise}
     */
    removeInternal(id) {
      return this.items().then(apnItems => {
        if (!apnItems) {
          const error = 'no apn items';
          return Promise.reject(error);
        }

        const index = apnItems.findIndex(apnItem => apnItem.id === id);
        if (index >= 0) {
          apnItems = apnItems.splice(index, 1);
          return Promise.resolve(apnItems);
        }
        const error = 'apn not found';
        return Promise.reject(error);
      });
    },

    /**
     * The internal update function.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @params {String} id
     * @params {Object} apn
     * @returns {Promise}
     */
    updateInternal(id, apn) {
      return this.items().then(apnItems => {
        if (!apnItems) {
          const error = 'no apn items';
          return Promise.reject(error);
        }

        const index = apnItems.findIndex(apnItem => apnItem.id === id);
        if (index >= 0) {
          const currentApn = apnItems[index].apn;
          for (let p in apn) { // eslint-disable-line
            // Id and category are not allowed to be changed
            if (p === 'id' || p === 'category') {
              continue;
            }
            currentApn[p] = apn[p];
          }
          return Promise.resolve(apn);
        }
        const error = 'apn not found';
        return Promise.reject(error);
      });
    },

    updateInternalByWap(id, apn) {
      return this.items().then(apnItems => {
        if (!apnItems) {
          const error = 'no apn items';
          return Promise.reject(error);
        }

        const index = apnItems.findIndex(apnItem => apnItem.apn.itemId === id);
        if (index >= 0) {
          const currentApn = apnItems[index].apn;
          for (let p in apn) { // eslint-disable-line
            if (p === 'itemId') {
              continue;
            }
            currentApn[p] = apn[p];
          }
          return id;
        }
        const error = 'apn not found';
        return Promise.reject(error);
      });
    },

    /**
     * Get all apn items of the list.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @returns {Promise Array<ApnItem>}
     */
    items() {
      /*
       * Because add/remove/update depend on this function so we should not
       * schedule it or we will get a dead lock. We return the current copy of
       * apn items.
       */
      if (this.apnItems) {
        return Promise.resolve(this.apnItems);
      }
      return AsyncStorage.getItem(this.key).then(apns => {
        if (apns) {
          this.apnItems = apns.map(apn => ApnItem(apn.id, apn.category, apn));
          this.apnItems = this.apnItems.filter(apnItem => {
            DebugHelper.debug(`apnItems ${JSON.stringify(apnItem)}`);
            return apnItem.itemApn.user_visible !== 'false';
          });
          const key0 = 'ril.data.default.apnSettings';
          const key1 = 'ril.data.dm.apnSettings.sim1';
          const key2 = 'ril.data.dm.apnSettings.sim2';
          SettingsDBCache.getSettings([key0, key1, key2], results => {
            DebugHelper.debug(
              `${key0} sim1 apnItems ${JSON.stringify(results[key0][0])}`
            );
            DebugHelper.debug(
              `${key0} sim2 apnItems ${JSON.stringify(results[key0][1])}`
            );
            DebugHelper.debug(
              `${key1} sim1 apnItems ${JSON.stringify(results[key1])}`
            );
            DebugHelper.debug(
              `${key2} sim2 apnItems ${JSON.stringify(results[key2])}`
            );
          });
          return this.apnItems;
        }
        return null;
      });
    },

    /**
     * Get the apn item with a specified id.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @returns {Promise ApnItem}
     */
    item(id) {
      // Return the apn item based on the current copy if apn items.
      return this.items().then(apnItems => {
        if (!apnItems || !id) {
          return null;
        }
        return apnItems.find(apnItem => apnItem.id === id);
      });
    },

    /**
     * Add an apn to the list with specified category. Returns the id of the
     * newly added apn.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @params {Object} apn
     * @params {ApnItem.APN_CATEGORY} category
     * @returns {Promise String} The apn id
     */
    add(apn, category) {
      const apnClone = ApnUtils.clone(apn);
      return this.schedule(this.addInternal.bind(this, apnClone, category));
    },

    /**
     * Remove an apn from the list.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @params {String} id
     * @returns {Promise}
     */
    remove(id) {
      return this.schedule(this.removeInternal.bind(this, id));
    },

    /**
     * Update an apn. All properties expect for "id" and "category" will be
     * overwritten based on the passed apn object.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @params {String} id
     * @params {Object} apn
     * @returns {Promise}
     */
    update(id, apn) {
      const apnClone = ApnUtils.clone(apn);
      return this.schedule(this.updateInternal.bind(this, id, apnClone));
    },

    updateByWap(id, apn) {
      const apnClone = ApnUtils.clone(apn);
      return this.schedule(this.updateInternalByWap.bind(this, id, apnClone));
    }
  };

  return function apnList(key) {
    return new ApnList(key);
  };
});

/**
 * ApnSelections stores the id of the apn being used on each apn type. The
 * selections are provided in terms of Observable. Changes to the selection
 * can be observed and then be saved to the settings database.
 * Implementation details please refer to {@link ApnSelections}.
 *
 * @module modules/apn/apn_selections
 */

define('modules/apn/apn_selections',['require','modules/mvvm/observable','modules/apn/apn_const'],function(require) { //eslint-disable-line
  const Observable = require('modules/mvvm/observable');
  const ApnConst = require('modules/apn/apn_const');

  const ICC_COUNT = navigator.b2g.mobileConnections.length;
  const { APN_TYPES } = ApnConst;
  const { APN_SELECTIONS_KEY } = ApnConst;

  /**
   * @class ApnSelections
   * @requires module:modules/mvvm/observable
   * @requires module:modules/apn/apn_const
   * @returns {ApnSelections}
   */
  function ApnSelections() {
    this.readyPromise = null;
    this.apnSelections = [];
  }

  ApnSelections.prototype = {
    /**
     * Converts the apn selections to static objects for storing.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise Array}
     */
    export() {
      return this.apnSelections.map(apnSelection => {
        const obj = {};
        APN_TYPES.forEach(apnType => {
          obj[apnType] = apnSelection[apnType];
        });
        return obj;
      });
    },

    /**
     * Stores the current selection to the settings database.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise}
     */
    commit() {
      return new Promise(resolve => {
        const obj = {};
        obj[APN_SELECTIONS_KEY] = this.export();
        SettingsDBCache.saveSettings(obj);
        resolve();
      });
    },

    /**
     * Registers observers so that we can save the selection when it changes.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     */
    observeApnSelections(apnSelection) {
      APN_TYPES.forEach(function observe(apnType) {
        apnSelection.observe(apnType, this.commit.bind(this));
      }, this);
    },

    /**
     * Creates empty selections.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise}
     */
    createEmptySelections() {
      const emptySelections = [];
      const emptySelection = {};
      APN_TYPES.forEach(apnType => {
        emptySelection[apnType] = null;
      });

      for (let i = 0; i < ICC_COUNT; i++) {
        emptySelections.push(emptySelection);
      }

      return new Promise(resolve => {
        const obj = {};
        obj[APN_SELECTIONS_KEY] = emptySelections;
        SettingsDBCache.saveSettings(obj);
        resolve(emptySelections);
      });
    },

    /**
     * Initializes the selections based on the values stored in the settings
     * database.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise}
     */
    ready() {
      // This ensures that the ready process being executed only once.
      if (!this.readyPromise) {
        const that = this;
        this.readyPromise = new Promise(resolve => {
          SettingsDBCache.getSetting(APN_SELECTIONS_KEY).then(value => {
            resolve(value);
          });
        })
          .then(apnSelections => {
            if (apnSelections) {
              return apnSelections;
            }
            return that.createEmptySelections();
          })
          .then(apnSelections => {
            // Turn the selections to observables
            apnSelections.forEach((selection, index) => {
              const observableApnSelection = Observable(selection);
              that.observeApnSelections(observableApnSelection);
              that.apnSelections[index] = observableApnSelection;
            });

            /*
             * Clear the entire apn selection states when the selections are
             * Cleared by other apps (usually the wap push app).
             */
            SettingsDBCache.observe(
              APN_SELECTIONS_KEY,
              '',
              value => {
                if (value === null) {
                  that.readyPromise = null;
                }
              },
              true
            );
          });
      }

      return this.readyPromise;
    },

    /**
     * Returns the apn selection of a sim slot. The selection object is an
     * Observable in which the apn types and apn ids are stored as key-value
     * pairs.
     *
     * @access public
     * @memberOf ApnSelections.prototype
     * @params {Number} serviceId
     * @returns {Promise Observable}
     */
    get(serviceId) {
      return this.ready().then(() => this.apnSelections[serviceId]);
    },

    /**
     * Reset the apn selection to null.
     *
     * @access public
     * @memberOf ApnSelections.prototype
     * @params {Number} serviceId
     * @returns {Promise}
     */
    clear(serviceId) {
      return this.ready().then(() => {
        const apnSelection = this.apnSelections[serviceId];
        if (!apnSelection) {
          return Promise.resolve();
        }
        APN_TYPES.forEach(apnType => {
          apnSelection[apnType] = null;
        });
        return Promise.resolve(apnSelection);
      });
    }
  };

  return function apnSelections() {
    return new ApnSelections();
  };
});

/* global ApnHelper */
/**
 * ApnSettingsManager provides functions for managing apn items. When an item
 * is selected to be used, ApnSettingsManager also helps convert the selection
 * to the real settings expected by the platform.
 * ApnSettingsManager does its task by coordinating the following objects:
 * - ApnList
 *     There is an ApnList object for each sim. ApnList stores ApnItem objects
 *     representing apns come from the apn.json database, client provisioning
 *     messages, and user's creation. Each ApnItem has an id assigned upon
 *     the creation. The id is used to recored users' apn selection.
 * - ApnSelections
 *     ApnSelections stores the id of the apn being used on each apn
 *     type.
 * - ApnSettings
 *     ApnSettings wraps the apn settings stored in the moz settings database
 *     and provides simple interface for manipulation.
 * Implementation details please refer to {@link ApnSettingsManager}.
 *
 * @module modules/apn/apn_settings_manager
 */

define('modules/apn/apn_settings_manager',['require','modules/async_storage','modules/apn/apn_const','modules/apn/apn_utils','modules/apn/apn_item','modules/apn/apn_settings','modules/apn/apn_list','modules/apn/apn_selections'],function(require) { //eslint-disable-line
  const AsyncStorage = require('modules/async_storage');
  const ApnConst = require('modules/apn/apn_const');
  const ApnUtils = require('modules/apn/apn_utils');
  const ApnItem = require('modules/apn/apn_item');
  const ApnSettings = require('modules/apn/apn_settings');
  const ApnList = require('modules/apn/apn_list');
  const ApnSelections = require('modules/apn/apn_selections');

  const { APN_TYPES } = ApnConst;
  const { APN_LIST_KEY } = ApnConst;
  const { CACHED_PLMN_MVNO_KEY } = ApnConst;
  const { DEFAULT_APN_SETTINGS_KEY } = ApnConst;
  const { CP_APN_KEY } = ApnConst;
  // Const { MVNO_SETTINGS_KEY } = ApnConst;

  const RESTORE_MODE = {
    ALL: 0,
    ONLY_APN_ITEMS: 1
  };

  /**
   * @class ApnSettingsManager
   * @requires module:modules/async_storage
   * @requires module:modules/apn/apn_const
   * @requires module:modules/apn/apn_utils
   * @requires module:modules/apn/apn_item
   * @requires module:modules/apn/apn_settings
   * @requires module:modules/apn/apn_list
   * @requires module:modules/apn/apn_selections
   * @returns {ApnSettingsManager}
   */
  function ApnSettingsManager() {
    this.apnLists = {};
    this.apnSelections = ApnSelections();
    this.apnSettings = ApnSettings();

    this.readyPromises = {};
    this.defaultApnSettingChanged = {};
    this.cpApnSettings = {};

    Object.defineProperty(this, 'RESTORE_MODE', {
      configurable: false,
      get() {
        return RESTORE_MODE;
      }
    });
  }

  ApnSettingsManager.prototype = {
    /**
     * Ensures the current apn items are up-to-date. When the current plmn
     * does not equal to the cached plmn, we should restore the apn items.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @returns {Promise}
     */
    ready(serviceId) {
      if (!this.readyPromises[serviceId]) {
        const that = this;
        let plmn = {};
        // Register default apn changed observer
        that.addObservers(serviceId);
        // Get current plmn information
        return that.getPlmnAndMvnoInfo(serviceId).then(values => {
          plmn = values;
          that.readyPromises[serviceId] = AsyncStorage.getItem(
            CACHED_PLMN_MVNO_KEY
          ).then(cacheValues => {
            const cachePlmn = cacheValues && cacheValues[serviceId];
            if (
              plmn.length === 0 ||
              (cachePlmn &&
                plmn[0] === cachePlmn[0] &&
                plmn[1] === cachePlmn[1] &&
                JSON.stringify(plmn[2]) === JSON.stringify(cachePlmn[2]))
            ) {
              DebugHelper.debug(`simcard ${serviceId}not change`);
              return;
            }

            cacheValues = cacheValues || {};
            cacheValues[serviceId] = plmn;
            // Get the default preset apns by restoring.
            // eslint-disable-next-line
                  return Promise.all([
              /*
               * In this case we only restore apn items
               * but not apn settings.
               */
              that.restore(serviceId, RESTORE_MODE.ONLY_APN_ITEMS),
              AsyncStorage.setItem(CACHED_PLMN_MVNO_KEY, cacheValues)
            ]);
          });
        });
      }
      return this.readyPromises[serviceId];
    },

    /**
     * Register default APN changed observer
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     */
    addObservers(serviceId) {
      this.defaultApnSettingChanged[serviceId] = () => {
        this.readyPromises[serviceId] = null;
      };

      SettingsDBCache.observe(
        DEFAULT_APN_SETTINGS_KEY,
        '',
        this.defaultApnSettingChanged[serviceId],
        true
      );
      SettingsDBCache.observe(CP_APN_KEY, {}, cpApnJson => {
        if (cpApnJson && cpApnJson[serviceId]) {
          this.getPlmnAndMvnoInfo(serviceId).then(values => {
            const networkType =
              navigator.b2g.mobileConnections[serviceId].data.type;
            const [mcc, mnc] = values;
            const apnList = this.apnList(serviceId);
            this.cpApnSettings = ApnHelper.getCompatible(
              cpApnJson[serviceId],
              mcc,
              mnc,
              networkType
            );
            const cpApns = ApnUtils.separateApnsByType(this.cpApnSettings);
            if (cpApns.length) {
              this.ready(serviceId)
                .then(() => this.apnList(serviceId).items())
                .then(apnItems => {
                  cpApns.forEach(apn => {
                    const matchedApnItem = apnItems.find(
                      apnItem => apnItem.apn.itemId === apn.itemId
                    );
                    if (matchedApnItem) {
                      // Update exist apn by cp apn
                      apnList.updateByWap(apn.itemId, apn);
                    } else {
                      apn.deletedCpApn = false;
                      apnList.add(apn, ApnItem.APN_CATEGORY.PRESET);
                    }
                  });
                });
            }
          });
        }
      });
    },

    /**
     * Get current mcc/mnc information
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @returns {Promise Array}
     */
    getPlmnAndMvnoInfo(serviceId) {
      return Promise.all([
        ApnUtils.getOperatorCode(serviceId, 'mcc'),
        ApnUtils.getOperatorCode(serviceId, 'mnc'),
        ApnUtils.getOperatorCode(serviceId, 'mvno')
      ]).then(values => values || {});
    },

    /**
     * Returns the id of the first preset apn item.
     *
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise String}
     */
    deriveActiveApnIdFromItems(serviceId, apnType) {
      return this.apnItems(serviceId, apnType).then(apnItems => {
        const filterapnItems = apnItems.filter(
          apnItem => apnItem.apn.deletedCpApn !== true
        );
        if (filterapnItems.length) {
          return filterapnItems.sort(ApnUtils.sortByCategory)[0].id;
        }
        return null;
      });
    },

    /**
     * Returns the id of the apn item that matches the current apn setting of
     * the specified apn type.
     *
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise String}
     */
    deriveActiveApnIdFromSettings(serviceId, apnType) {
      return Promise.all([
        this.apnItems(serviceId, apnType),
        this.apnSettings.get(serviceId, apnType)
      ]).then(results => {
        const [apnItems, apnInUse] = results;
        const cpApns = ApnUtils.separateApnsByType(this.cpApnSettings);
        const apnList = this.apnList(serviceId);
        let updateApnItem = null;

        // ApnInUse is the apn that RIL is currently using.
        if (apnInUse) {
          const existApnItem = apnItems.find(
            apnItem => apnItem.apn.itemId === apnInUse.itemId
          );

          const matchedApnItem = apnItems.find(apnItem =>
            ApnUtils.isMatchedApn(apnItem.apn, apnInUse)
          );

          if (cpApns.length) {
            updateApnItem = cpApns.find(
              apnItem => apnItem.itemId === apnInUse.itemId
            );
          }

          if (updateApnItem) {
            /*
             * Check if current using apn is in cp apn list and current apn
             * list:
             * 1. in both lists, and no need to update
             * 2. in both lists, but need to update by cp apn
             * 3. in cp apn list but not in current apn list, need to add
             */
            if (matchedApnItem) {
              return matchedApnItem.id;
            } else if (existApnItem) {
              return apnList.updateByWap(apnInUse.itemId, apnInUse);
            }
            apnInUse.deletedCpApn = false;
            return apnList.add(apnInUse, ApnItem.APN_CATEGORY.PRESET);
          } else if (matchedApnItem) {
            return matchedApnItem.id;
          } else if (apnItems.length > 0) {
            /*
             * Current using apn is not in current apn list,
             * Suppose it is CUSTOM apn and obsere whether cause issue.
             */
            const category = ApnItem.APN_CATEGORY.CUSTOM;
            return this.addApn(serviceId, apnInUse, category);
          }
          return null;
        }
        return null;
      });
    },

    /**
     * Return the apn type an apn that is actively being used for.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnId
     *                 id of the apn being checked.
     * @returns {Promise String}
     */
    getApnAppliedType(serviceId, apnId) {
      return this.apnSelections
        .get(serviceId)
        .then(apnSelection =>
          APN_TYPES.find(apnType => apnSelection[apnType] === apnId)
        );
    },

    /**
     * Store the current apn selection to apn settings to the settings database.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     */
    storeApnSettingByType(serviceId, apnType) {
      return this.apnSelections
        .get(serviceId) // eslint-disable-next-line
        .then(apnSelection => {
          const apnList = this.apnList(serviceId);
          const apnId = apnSelection[apnType];
          if (apnId) {
            // Get the apn item of apnType.
            return apnList.item(apnId);
          }
        })
        .then(apnItem => {
          if (apnItem) {
            return this.apnSettings.update(serviceId, apnType, apnItem.apn);
          }
          return this.apnSettings.update(serviceId, apnType, null);
        });
    },

    /**
     * Get the apn item list of a sim slot.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @returns {ApnList} The apn item list.
     */
    apnList(serviceId) {
      let apnList = this.apnLists[serviceId];
      if (!apnList) {
        apnList = ApnList(APN_LIST_KEY + serviceId);
        this.apnLists[serviceId] = apnList;
      }
      return apnList;
    },

    /**
     * Get the apn items of an apn type for a sim slot.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise Array<ApnItem>} The apn items.
     */
    apnItems(serviceId, apnType) {
      return this.ready(serviceId)
        .then(() => this.apnList(serviceId).items())
        .then(
          apnItems =>
            (apnItems &&
              apnItems.filter(ApnUtils.apnTypeFilter.bind(null, apnType))) ||
            []
        );
    },

    /**
     * Restore the apn items of a category.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {ApnList} apnList
     * @param {Array<Object>} apnsForRestoring
     *                        The function use this to restore the apn items.
     * @param {ApnItem.APN_CATEGORY} category
     *                               The category of the items to be resotred.
     * @returns {Promise Array<String>} The id of the restored apn items.
     */
    restoreApnItemsOfCategory(apnList, apnsForRestoring, category) {
      return apnList
        .items()
        .then(apnItems => {
          // Remove all existing preset apns.
          apnItems = apnItems || [];
          const promises = [];
          apnItems // eslint-disable-next-line
            .filter(apnItem => {
              if (apnItem.category === category) {
                return true;
              }
            })
            .forEach(apnItem => {
              promises.push(apnList.remove(apnItem.id));
            });

          return Promise.all(promises);
        })
        .then(() => {
          // Add default preset apns.
          const promises = [];
          if (apnsForRestoring) {
            apnsForRestoring = apnsForRestoring.filter(
              apnItem => apnItem.user_visible !== 'false'
            );
            apnsForRestoring.forEach(apns => {
              promises.push(apnList.add(apns, category));
            });
          }
          return Promise.all(promises);
        });
    },

    /**
     * Get current carrier mcc code by service Id
     */
    getServiceIdMcc(serviceId) {
      return ApnUtils.getOperatorCode(serviceId, 'mcc');
    },

    /**
     * Restore the apn items and apn settings to the default. Apn items of
     * the category ApnItem.APN_CATEGORY.PRESET and ApnItem.APN_CATEGORY.EU are
     * restored. User created apn items (custom apns) will be delete. The
     * preset apn items are from the apn.json database and client provisioning
     * messages.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {String} serviceId
     * @param {Number} mode
     *                 The possible values are defined in RESTORE_MODE. We
     *                 restore both apn items and apn settings by default. Only
     *                 apn items are restored when mode is
     *                 RESTORE_MODE.ONLY_APN_ITEMS.
     * @returns {Promise}
     */
    restore(serviceId, mode) {
      const mobileConnection = navigator.b2g.mobileConnections[serviceId];
      const networkType = mobileConnection.data.type;
      const apnList = this.apnList(serviceId);
      const that = this;
      let presetApns = null;

      return (
        that
          .getPlmnAndMvnoInfo(serviceId)
          .then(values => {
            /*
             * Get default apns and client provisioning apns matching the mcc/mnc
             * codes.
             */
            const [mcc, mnc] = values;

            return Promise.all([
              ApnUtils.getEuApns(),
              ApnUtils.getDefaultApns({ mcc, mnc, networkType }, serviceId),
              ApnUtils.getCpApns({ mcc, mnc, networkType }, serviceId)
            ]);
          })
          .then(results => {
            // Restore preset and eu apns.
            const euApns = ApnUtils.separateApnsByType(results[0]);
            const defaultApns = results[1] || [];
          const cpApns = results[2]; // eslint-disable-line

            if (cpApns && cpApns.length) {
              cpApns.forEach(cpApn => {
                cpApn.deletedCpApn = false;
              });
            }
            presetApns = ApnUtils.separateApnsByType(
              Array.prototype.concat.apply([], defaultApns.concat(cpApns))
            );

            return that
              .restoreApnItemsOfCategory(
                apnList,
                euApns,
                ApnItem.APN_CATEGORY.EU
              )
              .then(() =>
                that.restoreApnItemsOfCategory(
                  apnList,
                  null,
                  ApnItem.APN_CATEGORY.CUSTOM
                )
              )
              .then(() =>
                that.restoreApnItemsOfCategory(
                  apnList,
                  presetApns,
                  ApnItem.APN_CATEGORY.PRESET
                )
              );
          })
          .then(
            () => that.apnSelections.clear(serviceId)

            /*
             * We simply clear the apn selections. The selections will be restored
             * based on the current apn settings when it is being queried.
             */
          )
          // eslint-disable-next-line
        .then(() => {
            if (mode !== RESTORE_MODE.ONLY_APN_ITEMS) {
              return that.apnSettings.restore(serviceId, presetApns);
            }
          })
      );
    },

    /**
     * Query apn items matching the mcc/mnc codes in the apn.json
     * database and the one received through client provisioning messages.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise Array<ApnItem>} The apn items
     */
    queryApns(serviceId, apnType) {
      return this.getActiveApnId(serviceId, apnType).then(activeApnId =>
        this.apnItems(serviceId, apnType).then(items => {
          items.forEach(apnItem => {
            apnItem.active = apnItem.id === activeApnId;
            if (apnItem.active && apnItem.apn.deletedCpApn) {
              apnItem.apn.deletedCpApn = false;
              this.apnSettings.update(serviceId, apnType, apnItem.apn);
            }
          });
          return items;
        })
      );
    },

    /**
     * Add an apn to a sim slot.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {Object} apn
     * @param {ApnItem.APN_CATEGORY} category
     * @returns {Promise}
     */
    addApn(serviceId, apn, category) {
      return this.ready(serviceId).then(() =>
        this.apnList(serviceId).add(
          apn,
          category || ApnItem.APN_CATEGORY.CUSTOM
        )
      );
    },

    /**
     * Remove an apn from a sim slot.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} id
     *                 id of the apn item to be added.
     * @returns {Promise}
     */
    removeApn(serviceId, id) {
      return (
        this.ready(serviceId)
          .then(() => this.apnList(serviceId).remove(id))
          .then(
            () => this.getApnAppliedType(serviceId, id)
            // Check if the removed apn is actively being used.
          )
          // eslint-disable-next-line
        .then((matchedApnType) => {
            if (matchedApnType) {
              return this.deriveActiveApnIdFromItems(
                serviceId,
                matchedApnType
              ).then(activeApnId =>
                this.setActiveApnId(serviceId, matchedApnType, activeApnId)
              );
            }
          })
      );
    },

    /**
     * Update an apn item.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} id
     *                 id of the apn item to be updated.
     * @param {Object} apn
     * @returns {Promise}
     */
    updateApn(serviceId, id, apn) {
      return (
        this.ready(serviceId)
          .then(() => this.apnList(serviceId).update(id, apn))
          .then(
            () => this.getApnAppliedType(serviceId, id)
            // Check if the updated apn is actively being used.
          )
          // eslint-disable-next-line
        .then((matchedApnType) => {
            if (matchedApnType) {
              if (apn.deletedCpApn) {
                return this.deriveActiveApnIdFromItems(
                  serviceId,
                  matchedApnType
                ).then(activeApnId =>
                  this.setActiveApnId(serviceId, matchedApnType, activeApnId)
                );
              }
              return this.storeApnSettingByType(serviceId, matchedApnType);
            }
          })
      );
    },

    /**
     * Get the id of the apn that is actively being used for an apn type.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise String}
     */
    getActiveApnId(serviceId, apnType) {
      const that = this;
      return this.ready(serviceId)
        .then(() => that.apnSelections.get(serviceId))
        .then(apnSelection => apnSelection && apnSelection[apnType])
        .then(activeApnId => {
          if (activeApnId) {
            return activeApnId;
          }

          /*
           * If there is no existing active apn id, try to derive the id from
           * the current apn settings.
           */
          return that
            .deriveActiveApnIdFromSettings(serviceId, apnType)
            .then(apnId => {
              // Set the id as the active apn id.
              that.setActiveApnId(serviceId, apnType, apnId);
              return apnId;
            });
        })
        .then(activeApnId => {
          /*
           * If there is still no active apn id, means that the apn settings
           * have not been set and we need to derive a default id from the
           * current apn items (stored in the apn list).
           */
          if (activeApnId) {
            return activeApnId;
          }
          return '';
        });
    },

    /**
     * Set the id of an apn that is to be used for an apn type.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @param {String} id
     * @returns {Promise}
     */
    setActiveApnId(serviceId, apnType, id) {
      return (
        this.ready(serviceId)
          .then(() => this.apnSelections.get(serviceId))
          // eslint-disable-next-line
        .then((apnSelection) => {
            if (apnSelection[apnType] !== id) {
              apnSelection[apnType] = id;
              return this.storeApnSettingByType(serviceId, apnType);
            }
          })
      );
    }
  };

  return new ApnSettingsManager();
});

