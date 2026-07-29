/* global AccountHelper */

define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const settingsPanel = require('modules/settings_panel');

  return function createKaiosAccountLoginPanel() {
    const VERIFICATION_INFO = 'verification.info';
    const expiresMin = Constants.EXPIRES_MINUTE;
    let elements = null;
    let originHref = null;
    const verificationInfo = {
      verificationId: null,
      timeStamp: null
    };

    function updateKaiAccount() {
      AccountHelper.getAccountInfo(['kaiaccount']).then(result => {
        updateAccountInfo(result[0].userData);
      });
    }

    function showConfirmDialog(bodyId, bodyArgs) {
      const dialogConfig = {
        title: { id: 'confirmation' },
        body: {
          id: bodyId,
          args: bodyArgs || {}
        },
        accept: {
          l10nId: 'ok',
          priority: 2,
          callback() {
            DialogHelper.destroy();
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function handleSelect() {
      const focusElement = elements.currentPanel.querySelector('.focus');
      if (focusElement.hasAttribute('aria-disabled')) {
        return;
      }
      let type = null;
      const { userData } = AccountHelper.kaiAccountInfo;
      switch (focusElement.id) {
        case 'phone-info':
          type = 'phone';
          break;
        case 'email-info':
          type = 'email';
          break;
        case 'resend-mail':
          elements.resendMail.setAttribute('aria-disabled', true);
          ActivityHelper.start({
            name: 'account-manager',
            data: {
              authenticatorId: 'kaiaccount',
              action: 'sendRequest',
              command: 'requestEmailVerification',
              args: [userData.pending.email, userData.uid],
              publicKey: AccountHelper.publicKey
            }
          }).then(
            response => {
              DebugHelper.log(
                `Account sendRequest success${JSON.stringify(response)}`
              );
              elements.resendMail.removeAttribute('aria-disabled');
              showConfirmDialog('email-verification-sent');
            },
            err => {
              elements.resendMail.removeAttribute('aria-disabled');
              DebugHelper.log(`Account sendRequest Failure${err}`);
              AccountHelper.showErrorDialog(err);
            }
          );
          break;
        case 'alt-phone-info':
          type = 'altPhone';
          break;
        case 'send-altPhone':
          {
            const sendAltBtnId = elements.sendAltPhoneBtn.getAttribute(
              'data-l10n-id'
            );
            if (sendAltBtnId === 'send-sms') {
              elements.sendAltPhone.setAttribute('aria-disabled', true);
              ActivityHelper.start({
                name: 'account-manager',
                data: {
                  authenticatorId: 'kaiaccount',
                  action: 'sendRequest',
                  command: 'requestPhoneVerification',
                  args: [userData.pending.altPhone, userData.uid],
                  publicKey: AccountHelper.publicKey
                }
              }).then(
                response => {
                  AccountHelper.decryptKey(response).then(value => {
                    elements.sendAltPhone.removeAttribute('aria-disabled');
                    elements.sendAltPhoneBtn.setAttribute(
                      'data-l10n-id',
                      'verify-altphone-otp'
                    );
                    verificationInfo.verificationId = value.verificationId;
                    verificationInfo.timeStamp = Date.now();
                    SettingsDBCache.saveSettings({
                      [VERIFICATION_INFO]: verificationInfo
                    });
                    setTimeout(() => {
                      elements.sendAltPhoneBtn.setAttribute(
                        'data-l10n-id',
                        'send-sms'
                      );
                    }, expiresMin * 60 * 1000);
                    showConfirmDialog('sms-sent-note', {
                      time: expiresMin,
                      phone: userData.pending.altPhone
                    });
                  });
                },
                err => {
                  elements.sendAltPhone.removeAttribute('aria-disabled');
                  DebugHelper.log(`Account sendRequest Failure${err}`);
                  if (err === 'ACCOUNT_DOES_NOT_EXIST') {
                    Settings.setCurrentPanel('kaios_account', { originHref });
                  }
                }
              );
            } else {
              ActivityHelper.start({
                name: 'account-manager',
                data: {
                  authenticatorId: 'kaiaccount',
                  action: 'showOtherPage',
                  publicKey: AccountHelper.publicKey,
                  flow: 'verifyAltPhone',
                  args: [
                    userData.pending.altPhone,
                    userData.uid,
                    verificationInfo.verificationId
                  ]
                }
              }).then(
                response => {
                  AccountHelper.decryptKey(response).then(value => {
                    DebugHelper.log(
                      `Account verifyAltPhone success:${JSON.stringify(value)}`
                    );
                    if (value.success) {
                      elements.sendAltPhoneBtn.setAttribute(
                        'data-l10n-id',
                        'send-sms'
                      );
                      verificationInfo.verificationId = null;
                      verificationInfo.timeStamp = null;
                      SettingsDBCache.saveSettings({
                        [VERIFICATION_INFO]: verificationInfo
                      });
                      AccountHelper.refreshAccount();
                      updateKaiAccount();
                    }
                  });
                },
                err => {
                  DebugHelper.log(
                    `Account verifyAltPhone error:${JSON.stringify(err)}`
                  );
                  if (err === 'ACCOUNT_DOES_NOT_EXIST') {
                    Settings.setCurrentPanel('kaios_account', { originHref });
                  }
                }
              );
            }
          }
          break;
        case 'personal-info':
          ActivityHelper.start({
            name: 'account-manager',
            data: {
              authenticatorId: 'kaiaccount',
              action: 'showOtherPage',
              publicKey: AccountHelper.publicKey,
              flow: 'editPersonalInfo',
              args: [userData]
            }
          }).then(
            response => {
              AccountHelper.decryptKey(response).then(result => {
                DebugHelper.log(
                  `Account editPersonalInfo :${JSON.stringify(result)}`
                );
                if (result) {
                  AccountHelper.refreshAccount();
                  updateKaiAccount();
                }
              });
            },
            err => {
              DebugHelper.log(
                `Account editPersonalInfo err:${JSON.stringify(err)}`
              );
            }
          );
          break;
        default:
          break;
      }
      if (type) {
        ActivityHelper.start({
          name: 'account-manager',
          data: {
            authenticatorId: 'kaiaccount',
            action: 'showOtherPage',
            publicKey: AccountHelper.publicKey,
            flow: 'checkPassword',
            args: [userData, `${type}`]
          }
        }).then(
          response => {
            AccountHelper.decryptKey(response).then(result => {
              DebugHelper.log(
                `Account checkPassword success:${JSON.stringify(result)}`
              );
              if (result) {
                if (result.success) {
                  AccountHelper.refreshAccount();
                  updateKaiAccount();
                  if (type === 'phone') {
                    showConfirmDialog('phone-number-updated');
                  } else if (type === 'email') {
                    showConfirmDialog('email-verification-sent');
                  } else if (type === 'altPhone') {
                    showConfirmDialog('alt-phone-updated');
                  }
                } else if (
                  result.error === 'ACCOUNT_DELETED' ||
                  result.error === 'ACCOUNT_DOES_NOT_EXIST'
                ) {
                  Settings.setCurrentPanel('kaios_account', { originHref });
                }
              }
            });
          },
          err => {
            DebugHelper.log(`Account checkPassword err:${JSON.stringify(err)}`);
          }
        );
      }
    }

    function initSoftKey() {
      const softkeyParams = {
        menuClassName: 'menu-button',
        header: { l10nId: 'options' },
        items: [
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2,
            method() {
              handleSelect();
            }
          },
          {
            name: 'Change password',
            l10nId: 'change-password',
            priority: 5,
            method() {
              ActivityHelper.start({
                name: 'account-manager',
                data: {
                  authenticatorId: 'kaiaccount',
                  action: 'showOtherPage',
                  publicKey: AccountHelper.publicKey,
                  flow: 'changePassword'
                }
              }).then(
                response => {
                  AccountHelper.decryptKey(response).then(result => {
                    DebugHelper.debug(
                      `Account changePassword success:${JSON.stringify(result)}`
                    );
                    if (result) {
                      ToastHelper.showToast('password-changed-successfully');
                    }
                  });
                },
                err => {
                  DebugHelper.log(
                    `Account changePassword error:${JSON.stringify(err)}`
                  );
                }
              );
            }
          },
          {
            name: 'Sign out',
            l10nId: 'sign-out',
            priority: 5,
            method() {
              ActivityHelper.start({
                name: 'account-manager',
                data: {
                  authenticatorId: 'kaiaccount',
                  action: 'revokeCredential',
                  publicKey: AccountHelper.publicKey
                }
              }).then(
                response => {
                  AccountHelper.decryptKey(response).then(result => {
                    DebugHelper.debug(
                      `Account revokeCredential${JSON.stringify(result)}`
                    );
                    if (result) {
                      if (result.success) {
                        DebugHelper.debug(`Account revokeCredential success`);
                        AccountHelper.refreshAccount();
                        Settings.setCurrentPanel('kaios_account', {
                          originHref
                        });
                        ToastHelper.showToast('sign-out-success');
                      } else if (result.error === 'ACCOUNT_DELETED') {
                        Settings.setCurrentPanel('kaios_account', {
                          originHref
                        });
                      } else {
                        ToastHelper.showToast('sign-out-unsuccess');
                      }
                    } else {
                      ToastHelper.showToast('sign-out-unsuccess');
                    }
                  });
                },
                err => {
                  DebugHelper.log(
                    `Account revokeCredential err:${JSON.stringify(err)}`
                  );
                  ToastHelper.showToast('sign-out-unsuccess');
                }
              );
            }
          }
        ]
      };
      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    function updateAccountInfo(accountInfo) {
      elements.phoneItemDesc.textContent =
        accountInfo.phone || l10n.get('no-phone-number');
      let verifyStr = '';

      const pendingEmail = accountInfo.pending && accountInfo.pending.email;
      elements.emailItemDesc.textContent =
        pendingEmail || accountInfo.email || l10n.get('no-email-added');
      if (pendingEmail) {
        verifyStr = ` ${l10n.get('unverified')}`;
        elements.resendMail.classList.remove('hidden');
      } else if (accountInfo.email) {
        verifyStr = ` ${l10n.get('verified')}`;
        elements.resendMail.classList.add('hidden');
      } else {
        elements.resendMail.classList.add('hidden');
      }
      elements.emailItemSpan.textContent = l10n.get('email') + verifyStr;

      const pendingAltPhone =
        accountInfo.pending && accountInfo.pending.altPhone;
      elements.altPhoneItemDesc.textContent =
        pendingAltPhone || accountInfo.altPhone || l10n.get('no-phone-number');
      verifyStr = '';
      if (pendingAltPhone) {
        verifyStr = ` ${l10n.get('unverified')}`;
        elements.sendAltPhone.classList.remove('hidden');
      } else if (accountInfo.altPhone) {
        verifyStr = ` ${l10n.get('verified')}`;
        elements.sendAltPhone.classList.add('hidden');
      } else {
        elements.sendAltPhone.classList.add('hidden');
      }
      elements.altPhoneItemSpan.textContent =
        l10n.get('alternative-phone') + verifyStr;

      let year = '';
      if (accountInfo.yob) {
        year = accountInfo.yob;
      } else if (!isNaN(new Date(accountInfo.birthday).getTime())) {
        year = new Date(accountInfo.birthday).getFullYear();
      }
      let lGender = '';
      if (accountInfo.gender) {
        lGender = l10n.get(`gender-${accountInfo.gender.toLowerCase()}`);
      }
      if (year === '' && lGender === '') {
        elements.personalItemDesc.textContent = '';
      } else {
        elements.personalItemDesc.textContent = `${year} / ${lGender}`;
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function checkTimeStamp(timeStamp) {
      const currentTime = Date.now();
      const leftTime = expiresMin * 60 * 1000 - (currentTime - timeStamp);
      if (leftTime < 0) {
        elements.sendAltPhoneBtn.setAttribute('data-l10n-id', 'send-sms');
        verificationInfo.verificationId = null;
        verificationInfo.timeStamp = null;
        SettingsDBCache.saveSettings({
          [VERIFICATION_INFO]: verificationInfo
        });
      } else {
        elements.sendAltPhoneBtn.setAttribute(
          'data-l10n-id',
          'verify-altphone-otp'
        );
        setTimeout(() => {
          elements.sendAltPhoneBtn.setAttribute('data-l10n-id', 'send-sms');
          verificationInfo.verificationId = null;
          verificationInfo.timeStamp = null;
          SettingsDBCache.saveSettings({
            [VERIFICATION_INFO]: verificationInfo
          });
        }, leftTime);
      }
    }

    return settingsPanel({
      onInit(panel, options) {
        elements = {
          currentPanel: panel,
          gaiaHeader: panel.querySelector('gaia-header'),
          phoneItem: panel.querySelector('#phone-info'),
          phoneItemDesc: panel.querySelector('#phone-info small'),
          emailItem: panel.querySelector('#email-info'),
          emailItemSpan: panel.querySelector('#email-info span'),
          emailItemDesc: panel.querySelector('#email-info small'),
          resendMail: panel.querySelector('#resend-mail'),
          altPhoneItem: panel.querySelector('#alt-phone-info'),
          altPhoneItemSpan: panel.querySelector('#alt-phone-info span'),
          altPhoneItemDesc: panel.querySelector('#alt-phone-info small'),
          sendAltPhone: panel.querySelector('#send-altPhone'),
          sendAltPhoneBtn: panel.querySelector('#send-altPhone button'),
          personalItem: panel.querySelector('#personal-info'),
          personalItemDesc: panel.querySelector('#personal-info small')
        };
        if (options.originHref) {
          // eslint-disable-next-line prefer-destructuring
          originHref = options.originHref;
          elements.gaiaHeader.setAttribute('data-href', originHref);
        }
      },
      onBeforeShow() {
        initSoftKey();
        AccountHelper.getAccountInfo(['kaiaccount']).then(result => {
          updateAccountInfo(result[0].userData);
        });
        SettingsDBCache.getSetting(VERIFICATION_INFO).then(value => {
          if (value && value.verificationId && value.timeStamp) {
            verificationInfo.verificationId = value.verificationId;
            verificationInfo.timeStamp = value.timeStamp;
            checkTimeStamp(value.timeStamp);
          }
        });
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
      }
    });
  };
});
