/**
 * ApnList stores ApnItem objects representing apns come from the apn.json
 * database, client provisioning messages, and user's creation. Each ApnItem has
 * an id assigned upon the creation. The id is used to recored users' apn
 * selection.
 *
 * @module modules/apn/apn_list
 */

define(['require','modules/async_storage','modules/apn/apn_utils','modules/apn/apn_item'],function(require) { //eslint-disable-line
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
