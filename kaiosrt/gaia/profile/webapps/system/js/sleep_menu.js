'use strict';
/* global CustomLogoPath, Service, LogoLoader, PowerManager */

(function(exports) {

  /**
   * SleepMenu controls functionality found in the menu after long-pressing on
   * the power button. Controls include: airplane mode, silence incoming calls,
   * restart, and power off. This file also currently contains a
   * developerOptions object which is not currently in use.
   * @class SleepMenu
   * @requires InitLogoHandler
   * @requires LogoLoader
   */
  function SleepMenu() {}

  SleepMenu.prototype = {
    isShuttingDown: false,

    /**
     * Start listening for events and settings changes.
     * @memberof SleepMenu.prototype
     */
    start: function sm_init() {
      this.showSleepMenu = this.show.bind(this);
      window.addEventListener('holdsleep', this);
      window.addEventListener('batteryshutdown', this);

      Service.register('startPowerOff', this);
      Service.register('showSleepMenu', this);
      Service.registerState('isShuttingDown', this);
    },

    /**
     * Generates menu items.
     * @memberof SleepMenu.prototype
     */
    generateItems: function sm_generateItems() {
      var items = [];
      var _ = window.api.l10n.get;
      // keep original implement, maybe someday sleep menu will become dynamic.
      var options = {
        lock: {
          label: _('lock'),
          callback: Service.request.bind(Service, 'LockscreenView:lock')
        },
        restart: {
          label: _('restart'),
          callback: this.startPowerOff.bind(this, true, 'sleep-menu')
        },
        power: {
          label: _('power'),
          callback: this.startPowerOff.bind(this, false, 'sleep-menu')
        }
      };
      if (!Service.query('isFlip')) {
        items.push(options.lock);
      }
      items.push(options.restart);
      items.push(options.power);
      return items;
    },

    /**
     * Shows the sleep menu.
     * @memberof SleepMenu.prototype
     */
    show: function sm_show() {
      Service.request('showSystemOptionMenu', {
        customClass: 'sleep-menu',
        header: 'select',
        options: this.generateItems()
      });
    },

    /**
     * General event handler.
     * @memberof SleepMenu.prototype
     * @param {Event} evt The event to handle.
     */
    handleEvent: function sm_handleEvent(evt) {
      switch (evt.type) {
        case 'holdsleep':
          this.show();
          break;

        case 'batteryshutdown':
          window.dispatchEvent(
              new CustomEvent('requestshutdown', {detail: this}));
          break;

        default:
          break;
      }
    },

    publish: function(evtName) {
      window.dispatchEvent(new CustomEvent(evtName));
    },

    /**
     * Begins the power off of the device. Also reboots the device if
     * requested.
     * @memberof SleepMenu.prototype
     * @param {Boolean} reboot Whether or not to reboot the phone.
     */
    startPowerOff: function sm_startPowerOff(reboot, reason) {
      console.log('startPowerOff ' + reason);
      this.publish('will-shutdown');
      var self = this;

      // Early return if we are already shutting down.
      if (document.getElementById('poweroff-splash')) {
        return;
      }

      this.isShuttingDown = true;

      // Show shutdown animation before actually performing shutdown.
      //  * step1: fade-in poweroff-splash.
      //  * step2: - As default, 3-ring animation is performed on the screen.
      //           - Manufacturer can customize the animation using mp4/png
      //             file to replace the default.
      var div = document.createElement('div');
      div.dataset.zIndexLevel = 'poweroff-splash';
      div.id = 'poweroff-splash';


      var logoLoader = new LogoLoader(CustomLogoPath.poweroff);

      logoLoader.onload = function customizedAnimation(elem) {
        // Perform customized animation.
        div.appendChild(elem);
        div.className = 'step1';

        if (elem.tagName.toLowerCase() == 'video' && !elem.ended) {
          elem.onended = function() {
            window.clearInterval(self.timerId);
            elem.classList.add('hide');
            // XXX workaround of bug 831747
            // Unload the video. This releases the video decoding hardware
            // so other apps can use it.
            elem.removeAttribute('src');
            elem.load();
          };
          self.lastTime = 0;
          self.timerId = window.setInterval(() => {
            if (elem.currentTime === self.lastTime) {
              window.clearInterval(self.timerId);
              self._actualPowerOff(reboot);
            }
            self.lastTime = elem.currentTime;
          }, 2000);
          elem.play();
        } else {
          div.addEventListener('animationend', function() {
            elem.classList.add('hide');
            if (elem.tagName.toLowerCase() == 'video') {
                // XXX workaround of bug 831747
                // Unload the video. This releases the video decoding hardware
                // so other apps can use it.
                elem.removeAttribute('src');
                elem.load();
            }
          });
        }

        elem.addEventListener('transitionend', function() {
          self._actualPowerOff(reboot);
        });
        document.getElementById('screen').appendChild(div);
      };

      logoLoader.onnotfound = function defaultAnimation() {
        self._actualPowerOff(reboot);
        document.getElementById('screen').appendChild(div);
      };
    },

    /**
     * Helper for powering the device off.
     * @memberof SleepMenu.prototype
     * @param {Boolean} isReboot Whether or not to reboot the phone.
     */
    _actualPowerOff: function sm_actualPowerOff(isReboot) {
      if (window.core.mobileConnectionCore &&
        window.core.mobileConnectionCore.radio.enabled) {
        window.addEventListener('radio-disabled', () => {
          this._actualPowerOff(isReboot);
        });
      } else {
        if (isReboot) {
          PowerManager.reboot();
        } else {
          PowerManager.powerOff();
        }
      }
    }
  };

  exports.SleepMenu = SleepMenu;

}(window));
