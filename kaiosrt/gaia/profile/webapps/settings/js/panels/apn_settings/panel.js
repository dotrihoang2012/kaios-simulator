
define(['require','modules/settings_panel','modules/apn/apn_settings_manager'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const ApnSettingsManager = require('modules/apn/apn_settings_manager');

  return function createApnSettingsPanel() {
    let serviceIdNum = 0;
    const APN_KEYS = [
      'ril.data.dm.apnSettings.sim1',
      'ril.data.dm.apnSettings.sim2'
    ];
    let apnSettingsList = [];
    const listElements = [];

    function initSoftKey(hasSelect) {
      const softkeyParams = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2
          },
          {
            name: 'Reset to Default',
            l10nId: 'reset-apn',
            priority: 3,
            method() {
              resetApn();
            }
          }
        ]
      };

      const noSelectParam = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Reset to Default',
            l10nId: 'reset-apn',
            priority: 3,
            method() {
              resetApn();
            }
          }
        ]
      };

      if (hasSelect) {
        SettingsSoftkey.init(softkeyParams);
      } else {
        SettingsSoftkey.init(noSelectParam);
      }
      SettingsSoftkey.show();
    }

    function updateSoftKey(evt) {
      const { userVisible } = evt.target.dataset;
      if (userVisible === 'false') {
        initSoftKey(false);
      } else {
        initSoftKey(true);
      }
    }

    function resetApnWarningDialog() {
      return new Promise(resolve => {
        const dialogConfig = {
          title: { id: 'apnSettings-reset', args: {} },
          body: { id: 'reset-apn-warning-message', args: {} },
          cancel: {
            name: 'Cancel',
            l10nId: 'cancel',
            priority: 1,
            callback() {
              resolve(false);
              DialogHelper.destroy();
            }
          },
          confirm: {
            name: 'Reset',
            l10nId: 'reset-apn',
            priority: 3,
            callback() {
              resolve(true);
              DialogHelper.destroy();
            }
          }
        };

        DialogHelper.show(dialogConfig);
      });
    }

    function resetApn() {
      resetApnWarningDialog().then(result => {
        if (result) {
          ApnSettingsManager.restore(serviceIdNum).then(() => {
            ToastHelper.showToast('apnSettings-reset-toast');
          });
        }
      });
    }

    function browseApnItems(evt) {
      if (!evt.target.dataset.apnType) {
        return;
      }
      Settings.setCurrentPanel('#apn_list', {
        type: evt.target.dataset.apnType,
        serviceId: serviceIdNum
      });
    }

    function addClickEventListener() {
      let i = apnSettingsList.length - 1;
      for (i; i >= 0; i--) {
        if (apnSettingsList[i].userVisible !== 'false') {
          apnSettingsList[i].addEventListener('click', browseApnItems);
        }
      }
    }

    function removeClickEventListener() {
      let i = apnSettingsList.length - 1;
      for (i; i >= 0; i--) {
        apnSettingsList[i].removeEventListener('click', browseApnItems);
      }
    }

    /**
     * XXX: Hide the Message/A-GPS/Tethering APN settings item for India carrier
     */
    function initUI(panel) {
      const conn = ApiManager.connections[serviceIdNum];
      const promises = [];
      promises.push(conn.getSupportedNetworkTypes());
      Promise.all(promises).then(values => {
        const [supportedNetworkTypes] = values;
        const item = panel.querySelector('li#ims.apn-optional');
        if (item) {
          if (supportedNetworkTypes.indexOf('lte') < 0) {
            item.classList.add('hidden');
          } else {
            item.classList.remove('hidden');
          }
        }
      });
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        apnSettingsList = panel.querySelectorAll('a[data-apn-type]');
      },

      onBeforeShow: function onBeforeShow(panel, options) {
        initSoftKey(true);
        serviceIdNum = options.serviceId || serviceIdNum;
        initUI(panel);
        const apnKey = APN_KEYS[serviceIdNum];
        SettingsDBCache.getSetting(apnKey).then(value => {
          const apns = value;
          let i = apnSettingsList.length - 1;
          for (i; i >= 0; i--) {
            const apnSettingsLi = apnSettingsList[i].parentNode;
            const apnType = apnSettingsList[i].getAttribute('data-apn-type');
            const apnSettings = apns.find(
              apn => apn.types.indexOf(apnType) >= 0
            );
            if (apnSettings) {
              apnSettingsList[i].userVisible = apnSettings.user_visible;
              if (apnSettings.user_visible === 'false') {
                apnSettingsList[i].parentNode.classList.add('none-select');
                apnSettingsList[i].parentNode.setAttribute(
                  'aria-disabled',
                  true
                );
              } else {
                apnSettingsList[i].parentNode.classList.remove('none-select');
                apnSettingsList[i].parentNode.removeAttribute('aria-disabled');
              }
              apnSettingsLi.dataset.userVisible = apnSettings.user_visible;
            }
            listElements.push(apnSettingsLi);
          }

          addClickEventListener();
          ListFocusHelper.addEventListener(listElements, updateSoftKey);
        });
      },

      onHide() {
        removeClickEventListener();
        ListFocusHelper.removeEventListener(listElements, updateSoftKey);
      }
    });
  };
});
