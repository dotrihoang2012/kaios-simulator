/* global AccountHelper SimCardHelper */

define('panels/about/panel',['require','modules/settings_panel'],function (require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAboutPanel() {
    let elements = {};
    const LOW_BATTERY_LEVEL = 0.25;
    const ANTI_THEFT_KEY = 'antitheft.enabled';
    const link = 'https://support.kaiostech.com/en/support/tickets/new';

    function checkFactoryReset() {
      if (ApiManager.battery && ApiManager.battery.level < LOW_BATTERY_LEVEL) {
        const dialogConfig = {
          title: {},
          body: { id: 'battery-warning-body', args: {} },
          accept: {
            name: 'Ok',
            l10nId: 'ok',
            priority: 2,
            callback() {
              DebugHelper.debug('battery is low');
            }
          }
        };
        DialogHelper.show(dialogConfig);
      } else {
        checkScreenLock();
      }
    }

    function checkScreenLock() {
      SettingsDBCache.getSetting('lockscreen.passcode-lock.enabled').then(
        enabled => {
          if (enabled) {
            Settings.setCurrentPanel('#screen_lock_passcode', {
              mode: 'confirm',
              origin: '#about'
            });
          } else {
            Settings.setCurrentPanel('#reset_phone_progress');
          }
        }
      );
    }

    function renderPhoneNumberElement(iccInfo, index, isMultiSim) {
      const span = document.createElement('span');
      let msisdn = null;

      if (iccInfo) {
        msisdn = iccInfo.msisdn || iccInfo.mdn;
      }

      if (msisdn) {
        if (isMultiSim) {
          l10n.setAttributes(span, 'deviceInfo-MSISDN-with-index', {
            index: index + 1,
            msisdn
          });
        } else {
          span.textContent = msisdn;
        }
      } else if (iccInfo && iccInfo.iccid) {
        if (isMultiSim) {
          l10n.setAttributes(span, 'unknown-phoneNumber-sim', {
            index: index + 1
          });
        } else {
          span.setAttribute('data-l10n-id', 'unknown-phoneNumber');
        }
      } else if (isMultiSim) {
        l10n.setAttributes(span, 'noSim-with-index-and-colon', {
          index: index + 1
        });
      } else {
        span.setAttribute('data-l10n-id', 'noSimCard');
      }
      return span;
    }

    function loadHardwareInfo() {
      if (!SimCardHelper.hasValidCard()) {
        elements.deviceInfoPhoneNum.classList.add('hidden');
        return;
      }
      const conns = ApiManager.connections;

      const isMultiSim = conns.length > 1;
      // Only show the list item when there are valid iccinfos.
      let hideListItem = true;

      // Update msisdns
      while (elements.deviceInfoMsisdns.hasChildNodes()) {
        elements.deviceInfoMsisdns.removeChild(
          elements.deviceInfoMsisdns.lastChild
        );
      }

      Array.prototype.forEach.call(conns, (conn, index) => {
        const { iccId } = conn;
        let iccObj = null;
        let iccInfo = null;

        if (!iccId && !isMultiSim) {
          return;
        }

        if (iccId) {
          iccObj = ApiManager.iccManager.getIccById(iccId);
        }

        if (iccObj) {
          iccInfo = iccObj.iccInfo; //eslint-disable-line
        }

        hideListItem = false;
        const span = renderPhoneNumberElement(iccInfo, index, isMultiSim);
        elements.deviceInfoMsisdns.appendChild(span);
      });

      elements.deviceInfoPhoneNum.classList.toggle('hidden', hideListItem);
    }

    function signOutAndReset() {
      // It should add code to sign out kaios account.
      if (AccountHelper.kaiAccountLogin) {
        SettingsDBCache.getSetting(ANTI_THEFT_KEY).then(value => {
          if (!value) {
            checkFactoryReset();
          } else {
            if (!navigator.onLine) {
              ToastHelper.showToast('no-internet-connection');
              return;
            }
            ActivityHelper.start({
              name: 'account-manager',
              data: {
                authenticatorId: 'kaiaccount',
                action: 'showOtherPage',
                publicKey: AccountHelper.publicKey,
                flow: 'checkPassword',
                args: [
                  AccountHelper.kaiAccountInfo.userData,
                  'disableAntitheft'
                ]
              }
            }).then(
              response => {
                AccountHelper.decryptKey(response).then(result => {
                  if (result && result.result === 'success') {
                    checkFactoryReset();
                  } else {
                    DebugHelper.debug(
                      `disableAntitheft result:${JSON.stringify(result)}`
                    );
                  }
                });
              },
              err => {
                DebugHelper.log(
                  `disableAntitheft error:${JSON.stringify(err)}`
                );
              }
            );
          }
        });
      } else {
        checkFactoryReset();
      }
    }

    function showRestDialog(evt) {
      if (evt.key === 'Enter') {
        const dialogConfig = {
          title: { id: 'reset-warning-title', args: {} },
          body: { id: 'reset-warning-body-1', args: {} },
          cancel: {
            name: 'Cancel',
            l10nId: 'cancel',
            priority: 1,
            callback() {
              DebugHelper.debug('Reset cancel');
            }
          },
          confirm: {
            name: 'Reset',
            l10nId: 'reset',
            priority: 3,
            callback() {
              signOutAndReset();
            }
          }
        };
        DialogHelper.show(dialogConfig);
      }
    }

    function updateAboutLegalInfoItem(enabled) {
      elements.aboutLegalInfoItem.classList.toggle('hidden', !enabled);
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function fotaKeydownHandler(evt) {
      if (evt.key === 'Enter') {
        ActivityHelper.start({
          name: 'launch-fota',
          data: { param: 'startFromSettings' }
        });
      }
    }

    function checkCustomerSupport() {
      SettingsDBCache.getSettings(
        ['customer.support.enabled', 'language.current'],
        results => {
          const customerSupport = results['customer.support.enabled'];
          const currentLanguage = results['language.current'];
          if (
            customerSupport &&
            currentLanguage.startsWith('en-') &&
            AccountHelper.kaiAccountLogin
          ) {
            elements.customerSupport.classList.remove('hidden');
          } else {
            elements.customerSupport.classList.add('hidden');
          }
          window.dispatchEvent(new CustomEvent('refresh'));
        }
      );
    }

    function keyDownHandler(evt) {
      switch (evt.key) {
        case 'Enter':
          window.open(link, '', 'dialog');
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          items: panel.querySelectorAll('li'),
          resetButton: panel.querySelector('.reset-phone'),
          osVersion: panel.querySelector('#os-version'),
          aboutLegalInfoItem: panel.querySelector('.about-legal-info'),
          customerSupport: panel.querySelector('.customer-support'),
          deviceInfoPhoneNum: panel.querySelector('.deviceinfo-phone-num'),
          deviceInfoMsisdns: panel.querySelector('.deviceInfo-msisdns'),
          fotaSettings: panel.querySelector('#fota-settings')
        };
        window.api.session.has_service('Fota').then(
          value => {
            DebugHelper.log(`Fota Service:${value}`);
            if (value) {
              elements.fotaSettings.classList.remove('hidden');
            } else {
              elements.fotaSettings.classList.add('hidden');
            }
          },
          err => {
            elements.fotaSettings.classList.add('hidden');
            DebugHelper.log(`Can not got service of fota:${err}`);
          }
        );
      },

      onBeforeShow(panel, options) {
        loadHardwareInfo();
        if (options.origin === '#screen_lock_passcode') {
          SettingsDBCache.getSetting('lockscreen.passcode-lock.enabled').then(
            enabled => {
              if (!enabled) {
                Settings.setCurrentPanel('#reset_phone_progress');
              }
            }
          );
        }
        SettingsDBCache.getSetting('deviceinfo.software').then(value => {
          if (value === '') {
            elements.osVersion.classList.add('hidden');
          } else {
            elements.osVersion.classList.remove('hidden');
            elements.osVersion.querySelector('small').textContent = value;
          }
        });
        checkCustomerSupport();
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        SettingsDBCache.observe(
          'about.legal.info.enabled',
          true,
          updateAboutLegalInfoItem
        );
        ListFocusHelper.addEventListener(elements.items);
        elements.resetButton.addEventListener('keydown', showRestDialog);
        elements.fotaSettings.addEventListener('keydown', fotaKeydownHandler);
        elements.customerSupport.addEventListener('keydown', keyDownHandler);
      },

      onBeforeHide() {
        SettingsDBCache.unobserve(
          'about.legal.info.enabled',
          updateAboutLegalInfoItem
        );
        ListFocusHelper.removeEventListener(elements.items);
        elements.resetButton.removeEventListener('keydown', showRestDialog);
        elements.fotaSettings.removeEventListener(
          'keydown',
          fotaKeydownHandler
        );
        elements.customerSupport.removeEventListener('keydown', keyDownHandler);
      }
    });
  };
});

