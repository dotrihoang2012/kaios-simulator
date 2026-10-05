/* global AppStarter RootManager SettingsCache */

/**
 * AppStarter determines the initial panel to be displayed for this launch. It
 * is also reponsible for attaching basic panel handlers for enabling the
 * ability of interacting with users.
 *
 * @module AppStarter
 */
(function appStarter(exports) {
  /**
   * @class AppStarter
   * @returns {AppStarter}
   */
  function AppStarter() {
    this.started = false;
    this.launchContext = null;
  }

  AppStarter.prototype = {
    initialPanelId: null,
    /**
     * Returns the initial panel id based on the pending system message. If
     * there is no system message available, it returns 'root'.
     *
     * @access private
     * @memberOf AppStarter.prototype
     * @returns {Promise String}
     */
    getInitialPanelId: function getInitialPanelId() {
      return new Promise(resolve => {
        if (ActivityHandler.currentActivity) {
          // Load activity handler only when we need to handle it.
          window.ActivityHandler.ready().then(() => {
            resolve(window.ActivityHandler.targetPanelId);
          });
        } else {
          resolve('root');
        }
      });
    },

    /**
     * Insert the elements of the initial panel.
     *
     * @access private
     * @memberOf AppStarter.prototype
     */
    showInitialPanel: function showInitialPanel(panelId) {
      const initialPanel = document.getElementById(panelId);
      initialPanel.classList.add('current');
    },

    /**
     * The function defines a launch context storing the information regarding
     * the launch to be used by the AMD modules.
     *
     * @access private
     * @memberOf AppStarter.prototype
     */
    createLaunchContext: function createLaunchContext(
      panelId,
      activityHandler
    ) {
      this.launchContext = {
        get initialPanelId() {
          return panelId;
        },
        get activityHandler() {
          return activityHandler;
        }
      };

      const that = this;
      Object.defineProperty(exports, 'LaunchContext', {
        configurable: true,
        get() {
          return that.launchContext;
        }
      });
    },

    /**
     * Load alameda and the required modules defined in main.js.
     *
     * @access private
     * @memberOf AppStarter.prototype
     */
    loadAlameda: function loadAlameda() {
      const scriptNode = document.createElement('script');
      scriptNode.setAttribute('data-main', 'js/main.js');
      scriptNode.src = 'js/vendor/alameda.js';
      document.head.appendChild(scriptNode);
    },

    lazyLoadLazyFiles: function lazyLoadLazyFiles() {
      const lazyFiles = [
        `${Constants.SHARD_ORIGIN}/style/commons/headers.css`,
        `${Constants.SHARD_ORIGIN}/style/commons/input_areas.css`,
        `${Constants.SHARD_ORIGIN}/style/commons/progress_activity.css`,
        `${Constants.SHARD_ORIGIN}/style/commons/action_menu.css`,
        'style/apps.css',
        'style/screen_lock.css',
        'style/simcard.css',
        'style/downloads.css',
        'js/utils/settings_softkey.js',
        `${Constants.SHARD_ORIGIN}/js/utils/l10n/l10n.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/navigation/navigation_handler.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/screen/screen_layout.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/manifest/manifest_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/keypad/keypad_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/common/performance_testing_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/date_time/date_time_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/device_storage/enumerate_all.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/common/text_normalizer.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/wifi/wifi_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/common/mime_mapper.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/common/template.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/phone/mobile_operator.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/simslot/simslot.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/simslot/simslot_manager.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/storage/async_storage.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/phone/icc_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/apn/apn_helper.js`,
        `${Constants.SHARD_ORIGIN}/js/helper/search_provider/search_provider.js`,
        `${Constants.SHARD_ORIGIN}/js/utils/media/wallpaper_processor.js`,
        'js/root_manager.js',
        'js/utils/account_helper.js'
      ];
      LazyLoader.load(lazyFiles, () => {
        if (!ActivityHandler.currentActivity) {
          RootManager.init();
        }
        ApiManager.setL10n();

        l10n.once(function l10nDone() {
          const codeNode = document.querySelector('.current');
          const dataL10ns = codeNode.querySelectorAll('[data-l10n-id]');
          for (let i = 0; i < dataL10ns.length; i++) {
            if (dataL10ns[i].getAttribute('data-l10n-args')) {
              dataL10ns[i].textContent = l10n.get(
                dataL10ns[i].getAttribute('data-l10n-id'),
                JSON.parse(dataL10ns[i].getAttribute('data-l10n-args'))
              );
            } else {
              dataL10ns[i].textContent = l10n.get(
                dataL10ns[i].getAttribute('data-l10n-id')
              );
            }
          }
          SettingsCache.saveSettingsCache();
          window.performance.mark('navigationLoaded');
          window.performance.mark('navigationInteractive');
        });
        this.loadAlameda();
      });
    },

    /**
     * The function determines the first panel to be displayed and loads the
     * minimal set of modules for basic interaction. It also exposes the launch
     * context for the delay loaded AMD modules.
     *
     * @access public
     * @memberOf AppStarter.prototype
     */
    start: function start() {
      let delayTime = 0;
      if (this.started) {
        return Promise.resolve();
      }
      this.started = true;
      if (!ActivityHandler.currentActivity) {
        window.addEventListener('navigation-map-init', () => {
          NavigationMap.currentSection = '#root';
          NavigationMap.menuReset();
        });
        this.showInitialPanel('root');
        const el = document.getElementById('airplane_mode_switch');
        if (el) {
          el.classList.add('focus');
        }
        if (SettingsCache.restoreSettingsCache()) {
          delayTime = 650;
        }

        DeviceFeature.ready(() => {
          if (SettingsDBCache.getInitComplete()) {
            Customization.updateUI([
              'airplane',
              'wifi',
              'bluetooth',
              'geolocation',
              'cmas'
            ]);
          } else {
            window.addEventListener('settings-db-ready', function onDBReady() {
              window.removeEventListener('settings-db-ready', onDBReady);
              SettingsDBCache.observe(
                'accessibility.screenreader',
                false,
                value => {
                  document.body.classList.toggle('readout', value);
                }
              );
              Customization.updateUI([
                'airplane',
                'wifi',
                'bluetooth',
                'geolocation',
                'cmas'
              ]);
            });
          }
        });
      }
      setTimeout(() => {
        const softkey = document.getElementById('fakeSoftKeyPanel');
        softkey.querySelector('#software-keys-center').textContent = '';
      }, 2500);

      return this.getInitialPanelId()
        .then(panelId => {
          this.initialPanelId = panelId;
          if (panelId !== 'root') {
            this.showInitialPanel(panelId);
          }
        })
        .then(() => {
          // Add timeout as loading the modules could block scrolling.
          setTimeout(() => {
            this.createLaunchContext(
              this.initialPanelId,
              window.ActivityHandler
            );

            this.lazyLoadLazyFiles();
          }, delayTime);
        });
    }
  };

  exports.AppStarter = () => {
    return new AppStarter();
  };
})(window); //eslint-disable-line

(() => {
  const appStarter = AppStarter();

  if (document.readyState === 'loading') {
    document.addEventListener('readystatechange', function readyStateChange() {
      if (document.readyState === 'interactive') {
        document.removeEventListener('readystatechange', readyStateChange);
        DebugHelper.log(`document.readyState:${document.readyState}`);
        appStarter.start();
      }
    });
  } else {
    appStarter.start();
  }
})();
