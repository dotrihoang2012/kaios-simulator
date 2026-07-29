'use strict';
/* global applications, Service */

(function(exports) {

  /**
   * Handles relaying of information for web activities.
   * Contains code to display the list of valid activities,
   * and fires an event off when the user selects one.
   * @class Activities
   */
  function Activities() {
    this._ids = [];
    window.addEventListener('activity-choice', this);
    window.addEventListener('appopened', this);
    window.addEventListener('home', this);
    Service.registerState('activitiesShowing', this);
  }

  Activities.prototype = {
    /** @lends Activities */
    activitiesShowing: function() {
      return this._ids.length &&
        !!document.querySelector('.option-menu-root .menu-item');
    },
    /**
    * General event handler interface.
    * Updates the overlay with as we receive load events.
    * @memberof Activities.prototype
    * @param {DOMEvent} evt The event.
    */
    handleEvent: function(evt) {
      switch (evt.type) {
        /**
         * We need to drop the event manually because we won't get oncancel
         * if the entire app is closed.
         * Gecko will send the open-app event twice if we don't cancel it
         *  between the two activity chooser.
         */
        case 'home':
          if (this._ids.length) {
            this.cancel();
          }
          break;
        case 'activity-choice':
          this.chooseActivity(evt.detail);
          break;
      }
    },

   /**
    * Displays the activity menu if needed.
    * If there is only one option, the activity is popup actionmenu launched.
    * @memberof Activities.prototype
    * @param {Object} detail The activity choose event detail.
    */
    chooseActivity: function(detail) {
      this._ids.push(detail.id);
      var choices = detail.choices;
      this.publish('activityrequesting', detail);
      // Choose the selected VA app
      if (detail.name === 'voice-assistant') {
        const isSelectedVA = (choice) => choice.manifest === Service.query('selectedVAManifestURL');
        this.choose(choices.findIndex(isSelectedVA));
        return;
      }

      // Choose the selected VI app
      if (detail.name === 'voice-input') {
        const isSelectedVI = (choice) => choice.manifest === Service.query('selectedVIManifestURL');
        this.choose(choices.findIndex(isSelectedVI));
        return;
      }

      if (choices.length === 1 && !(detail.name == 'share')) {
        this.choose('0', choices[0].manifest);
      } else {
        // Since the activity-choice could be triggered by a 'click', and gecko
        // event are synchronous make sure to exit the event loop before
        // showing the list.
        setTimeout((function nextTick() {
          // Bug 852785: force the keyboard to close before the activity menu
          // shows
          window.dispatchEvent(new CustomEvent('activitymenuwillopen'));

          var activityNameL10nId = 'activity-' + detail.name;
          Service.request('showOptionMenu', {
            header: activityNameL10nId,
            options: this._listItems(choices, detail.name),
            onCancel: this.cancel.bind(this),
            hasCancel: true
          }, Service.query('getTopMostWindow'));
        }).bind(this));
      }
    },

    isInvalidApp(manifest) {
      const app = applications.getByManifestURL(manifest);
      return app && !!app.status;
    },

   /**
    * The user chooses an activity from the activity menu.
    * @memberof Activities.prototype
    * @param {Number} choice The activity choice.
    */
    choose: function(choice, manifest) {
      if (Service.query('isFtuRunning') &&
        manifest.endsWith('apps/manifest/OSlAbgrhLArfT7grf4_N')) {
        this.cancel();
      } else if (manifest && this.isInvalidApp(manifest)) {
        Service.request('SystemToaster:show', {
          textL10n:'invalidAppPrompt'
        });
        this.cancel();
      } else if (Service.query('promptRestrictedAppDialog',
        { manifestUrl: manifest })) {
        this.cancel();
      } else {
        const returnedChoice = {
          id: this._ids.pop(),
          type: 'activity-choice',
          value: choice
        };
        this._sendEvent(returnedChoice);
      }
    },

    cancelActivityMenu: function() {
      if (this._ids.length) {
        Service.request('hideOptionMenu');
        this.cancel();
      }
    },

   /**
    * Cancels from the activity menu.
    * @memberof Activities.prototype
    */
    cancel: function() {
      var returnedChoice = {
        id: this._ids.pop(),
        type: 'activity-choice',
        value: -1
      };
      this._sendEvent(returnedChoice);
    },

    publish: function(eventName, detail) {
      var event = new CustomEvent(eventName, { detail: detail });
      window.dispatchEvent(event);
    },

    /**
     * Sends an event to the platform when a user makes a choice
     * or cancels the activity menu.
     * @memberof Activities.prototype
     * @param {Number} value The index of the selected activity.
     */
    _sendEvent: function(value) {
      window.dispatchEvent(new CustomEvent('activity-choosen',
        { detail: value }));
    },

    /**
     * Formats and returns a list of activity choices.
     * @memberof Activities.prototype
     * @param {Array} choices The list of activity choices.
     * @return {Array}
     */
    _listItems: function(choices, name) {
      let sortItems = [];
      const highPriorityApps_pick = {};
      const highPriorityApps_share = {};
      const pickAppsArray = [
        'gallery',
        'video',
        'camera',
        'music',
        'contact',
        'download',
        'soundrecorder'
      ];
      const shareAppsArray = [
        'bluetooth',
        'sms',
        'email'
      ];
      pickAppsArray.forEach((appname, index) => {
        highPriorityApps_pick[window.AppOrigin.getManifestURL(appname)] = index;
      });
      shareAppsArray.forEach((appname, index) => {
        highPriorityApps_share[window.AppOrigin.getManifestURL(appname)] =
          index;
      });

      let highPriorityApps = {};
      if (name === 'pick') {
        highPriorityApps = highPriorityApps_pick;
      } else if (name === 'share') {
        highPriorityApps = highPriorityApps_share;
      }


      // Same length with highPriorityApps,
      // just for avoid circular include circular.
      let items = [0, 0, 0, 0, 0, 0, 0];

      choices.forEach((choice, index) => {
        let app = applications.getByManifestURL(choice.manifest);
        if (!app) {
          return;
        }

        let manifest = choice.manifest;
        let position = highPriorityApps[manifest];
        let item = {
          label: app.manifest.name,
          callback: () => {
            this.choose(index, choices[index].manifest);
          },
          value: index
        };
        if (position !== undefined) {
          items[position] = item;
        } else {
          items.push(item);
        }
      });

      items.forEach((item) => {
        if (item) {
          sortItems.push(item);
        }
      });
      return sortItems;
    }
  };

  exports.Activities = Activities;

}(window));
