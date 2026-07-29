/* exported SettingsCore */
/* global BaseModule, SettingsObserver */
'use strict';

(function() {
  var SettingsCore = function() {
  };
  SettingsCore.SERVICES = [
    'get',
    'set',
    'addObserver',
    'removeObserver'
  ];

  /**
   * SettingsCore is a wrapper to access SettingsObserver
   * and provides some API it doesn't provide.
   * *SettingsCore#addObserver(SETTING_NAME, OBSERVER_OBJECT)
   * *SettingsCore#set(SETTING_OBJECT)
   * *SettingsCore#get(SETTING_NAME)
   * @class SettingsCore
   */
  BaseModule.create(SettingsCore, {
    name: 'SettingsCore',

    /* keep record of observers in order to remove them in the future */
    _observers: [],

    get: function(name) {
      return new Promise(function(resolve, reject) {
        SettingsObserver.getValue(name).then((value) => {
          resolve(value);
        }, () => {
          reject();
        });
      });
    },

    set: function(notifier) {
      return new Promise(function(resolve, reject) {
        let settingsArray = [];
        for (let key in notifier) {
          settingsArray.push({
            name: key,
            value: notifier[key]
          });
        }
        SettingsObserver.setValue(settingsArray).then(resolve, reject);
      });
    },

    /**
     * addObserver provides a "addEventListener"-like interface
     * to observe settings change.
     *
     * @example
     * var s = new SettingsCore();
     * s.start();
     * var MyModule = {
     *   init: function() {
     *     s.addObserver('lockscreen.enabled', this);
     *     s.addObserver('lockscreen.locked', this);
     *   },
     *   observe: function(name, value) {
     *     console.log('settings of ' + name + ' had changed to ' + value);
     *   }
     * };
     * MyModule.init();
     *
     * @param {String} name    The settings name
     * @param {Object} context The object which wants to observe the settings.
     *                         It should have a method named for 'observe'.
     */
    addObserver: function(name, context) {
      let settingChanged = function settingChanged(value) {
        if ('observe' in context) {
          context.observe.call(context, name, value);
        } else if (typeof(context) === 'function') {
          context(value);
        }
      };
      this._observers.push({
        name: name,
        context: context,
        observer: settingChanged
      });
      SettingsObserver.observe(name, null, settingChanged);
    },

    removeObserver: function(name, context) {
      SettingsObserver.unobserve(name, context);
      this._observers.forEach((value, index) => {
        if (value.name === name && value.context === context) {
          context.unobserve(name, value.observer);
          this._observers.splice(index, 1);
        }
      });
    }
  });
}(window));
