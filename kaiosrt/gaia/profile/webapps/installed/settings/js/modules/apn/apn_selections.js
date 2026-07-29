/**
 * ApnSelections stores the id of the apn being used on each apn type. The
 * selections are provided in terms of Observable. Changes to the selection
 * can be observed and then be saved to the settings database.
 * Implementation details please refer to {@link ApnSelections}.
 *
 * @module modules/apn/apn_selections
 */

define(['require','modules/mvvm/observable','modules/apn/apn_const'],function(require) { //eslint-disable-line
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
