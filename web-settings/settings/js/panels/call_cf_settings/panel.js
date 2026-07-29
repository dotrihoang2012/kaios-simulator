/* global */


define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallForwardingPanel() {
    let serviceId = 0;
    let mobileConnection = null;
    let voiceServiceClassMask = null;
    let videoServiceClassMask = null;
    let mask = null;
    let callType = 'voice';
    const cfReason = {
      CALL_FORWARD_REASON_UNCONDITIONAL: 0,
      CALL_FORWARD_REASON_MOBILE_BUSY: 1,
      CALL_FORWARD_REASON_NO_REPLY: 2,
      CALL_FORWARD_REASON_NOT_REACHABLE: 3
    };
    const cfReasonMapping = {
      unconditional: cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
      mobilebusy: cfReason.CALL_FORWARD_REASON_MOBILE_BUSY,
      noreply: cfReason.CALL_FORWARD_REASON_NO_REPLY,
      notreachable: cfReason.CALL_FORWARD_REASON_NOT_REACHABLE,
      'vt.unconditional': cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
      'vt.mobilebusy': cfReason.CALL_FORWARD_REASON_MOBILE_BUSY,
      'vt.noreply': cfReason.CALL_FORWARD_REASON_NO_REPLY,
      'vt.notreachable': cfReason.CALL_FORWARD_REASON_NOT_REACHABLE
    };
    const cfAction = {
      CALL_FORWARD_ACTION_DISABLE: 0,
      CALL_FORWARD_ACTION_ENABLE: 1,
      CALL_FORWARD_ACTION_QUERY_STATUS: 2,
      CALL_FORWARD_ACTION_REGISTRATION: 3,
      CALL_FORWARD_ACTION_ERASURE: 4
    };
    const cfReasonStates = [0, 0, 0, 0];
    let ignoreSettingChanges = false;
    let elements = {};
    let checkDone = false;
    const cfDescMapping = {
      unconditional: 'cfu-desc',
      mobilebusy: 'cfmb-desc',
      noreply: 'cfnrep-desc',
      notreachable: 'cfnrea-desc',
      'vt.unconditional': 'cfu-desc',
      'vt.mobilebusy': 'cfmb-desc',
      'vt.noreply': 'cfnrep-desc',
      'vt.notreachable': 'cfnrea-desc'
    };

    const cfDescIdMapping = {
      unconditional: 'li-cfu-desc',
      mobilebusy: 'li-cfmb-desc',
      noreply: 'li-cfnrep-desc',
      notreachable: 'li-cfnrea-desc',
      'vt.unconditional': 'li-cfu-desc',
      'vt.mobilebusy': 'li-cfmb-desc',
      'vt.noreply': 'li-cfnrep-desc',
      'vt.notreachable': 'li-cfnrea-desc'
    };

    const cfKeyMapping = {
      'ril.cf.unconditional.enabled': 'unconditional',
      'ril.cf.mobilebusy.enabled': 'mobilebusy',
      'ril.cf.noreply.enabled': 'noreply',
      'ril.cf.notreachable.enabled': 'notreachable',
      'ril.cf.vt.unconditional.enabled': 'vt.unconditional',
      'ril.cf.vt.mobilebusy.enabled': 'vt.mobilebusy',
      'ril.cf.vt.noreply.enabled': 'vt.noreply',
      'ril.cf.vt.notreachable.enabled': 'vt.notreachable'
    };

    /**
     * Helper function. Check whether the phone number is valid or not.
     *
     * @param {String} number The phone number to check.
     *
     * @return {Boolean} Result.
     */
    function isPhoneNumberValid(number) {
      if (number) {
        const re = '^[+]*[0-9]+$';
        const regExp = new RegExp(re, 'u');
        if (regExp.test(number)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Helper function. Stores settings into the database.
     */
    function setToSettingsDB(settingKey, settingValue, callback) {
      const done = function done() {
        if (callback) {
          callback();
        }
      };

      SettingsDBCache.getSetting(settingKey).then(value => {
        const currentValue = value;
        if (currentValue !== settingValue) {
          const cset = {};
          cset[settingKey] = settingValue;
          SettingsDBCache.saveSettings(cset);
          done();
        } else {
          done();
        }
      });
    }

    /**
     * Helper function. Displays rule info.
     */
    function displayRule(rules, elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = '';
        if (rules) {
          for (let i = 0; i < rules.length; i++) {
            if (rules[i].active && (mask & rules[i].serviceClass) !== 0) {
              element.setAttribute('data-l10n-id', 'enabled');
              return;
            }
          }
          element.setAttribute('data-l10n-id', 'callForwardingNotForwarding');
        }
      }
    }

    function navigateToCallForwadingSubPanel(evt) {
      const target =
        evt.target.tagName === 'A' ? evt.target.parentNode : evt.target;
      const hrefList = {
        'li-cfu-desc': 'call_cf_unconditional_settings',
        'li-cfmb-desc': 'call_cf_mobile_busy_settings',
        'li-cfnrep-desc': 'call_cf_no_reply_settings',
        'li-cfnrea-desc': 'call_cf_not_reachable_settings'
      };
      Settings.setCurrentPanel(hrefList[target.id], {
        type: callType,
        serviceId
      });
    }

    function enableTapOnCallForwardingItem(id, enable) {
      const isUnconditionalCFOn = cfReasonStates[0] === 1;
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      if (enable) {
        /*
         * @HACK To make user can't enter any page
         * when the devices get the SIM card state.
         */
        element.addEventListener('click', navigateToCallForwadingSubPanel);
        element.removeAttribute('aria-disabled');
        element.classList.remove('none-select');
        /*
         * If unconditional call forwarding is on we keep disabled the other
         * panels.
         */
        if (isUnconditionalCFOn && id !== 'li-cfu-desc') {
          element.removeEventListener('click', navigateToCallForwadingSubPanel);
          element.setAttribute('aria-disabled', true);
          element.classList.add('none-select');
        }
      } else {
        element.removeEventListener('click', navigateToCallForwadingSubPanel);
        element.setAttribute('aria-disabled', true);
        element.classList.add('none-select');
      }
    }

    /**
     * Helper function. Enables/disables tapping on call forwarding entry.
     */
    function enableTapOnCallForwardingItems(enable) {
      // Update 'Call Forwarding' submenu items
      const elementIds = [
        'li-cfu-desc',
        'li-cfmb-desc',
        'li-cfnrep-desc',
        'li-cfnrea-desc'
      ];
      const isUnconditionalCFOn = cfReasonStates[0] === 1;

      elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
          return;
        }

        if (enable) {
          /*
           * @HACK To make user can't enter any page
           * when the devices get the SIM card state.
           */
          element.addEventListener('click', navigateToCallForwadingSubPanel);
          element.removeAttribute('aria-disabled');
          element.classList.remove('none-select');
          /*
           * If unconditional call forwarding is on we keep disabled the other
           * panels.
           */
          if (isUnconditionalCFOn && id !== 'li-cfu-desc') {
            element.removeEventListener(
              'click',
              navigateToCallForwadingSubPanel
            );
            element.setAttribute('aria-disabled', true);
            element.classList.add('none-select');
          }
        } else {
          element.removeEventListener('click', navigateToCallForwadingSubPanel);
          element.setAttribute('aria-disabled', true);
          element.classList.add('none-select');
        }
      });
    }

    function displayInfo(id, l10nId) {
      const element = document.getElementById(id);
      element.innerHTML = '';
      element.setAttribute('data-l10n-id', l10nId);
    }

    /**
     * Display information relevant to the SIM card state.
     */
    function displayInfoForAll(l10nId) {
      const elementIds = [
        'cfu-desc',
        'cfmb-desc',
        'cfnrep-desc',
        'cfnrea-desc'
      ];
      elementIds.forEach(id => {
        const element = document.getElementById(id);

        // Clear all child elements before setting the l10n id
        element.innerHTML = '';
        element.setAttribute('data-l10n-id', l10nId);
      });
    }

    function getRequest(option, serviceClassMask) {
      return new Promise(resolve => {
        // Send the request
        mobileConnection.getCallForwardingOption(option, serviceClassMask).then(
          result => {
            resolve(result);
          },
          err => {
            DebugHelper.debug(`getCallForwardingOption:${err}`);
            resolve(null);
          }
        );
      });
    }

    function getCallForwardingStatus(settingKey, callback) {
      let rules = null;
      getRequest(cfReasonMapping[settingKey], mask)
        .then(value => {
          if (typeof value === 'object' && value) {
            rules = value;
          }
        })
        .then(() => {
          if (!rules) {
            callback(null);
            return;
          }

          for (let i = 0; i < rules.length; i++) {
            if (mask & rules[i].serviceClass) {
              const enabled = rules[i].active;
              setToSettingsDB(`ril.cf.${settingKey}.enabled`, enabled);
              setToSettingsDB(`ril.cf.${settingKey}.number`, rules[i].number);
              if (enabled) {
                cfReasonStates[cfReasonMapping[settingKey]] = 1;
                break;
              }
            }
          }
          callback(rules);
        });
    }

    /**
     * Gets current call forwarding rules.
     */
    function getCallForwardingOption(callback) {
      let unconditionalRules = null;
      let unconditionalRulesVoice = null;
      let unconditionalRulesVideo = null;
      let mobileBusyRules = null;
      let noReplyRules = null;
      let notReachableRules = null;
      getRequest(
        cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
        voiceServiceClassMask
      )
        .then(value => {
          if (typeof value === 'object' && value) {
            unconditionalRulesVoice = value;
          }
          return getRequest(
            cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
            videoServiceClassMask
          );
        })
        .then(value => {
          if (typeof value === 'object' && value) {
            unconditionalRulesVideo = value;
          }
          return getRequest(cfReason.CALL_FORWARD_REASON_MOBILE_BUSY, mask);
        })
        .then(value => {
          if (typeof value === 'object' && value) {
            mobileBusyRules = value;
          }
          return getRequest(cfReason.CALL_FORWARD_REASON_NO_REPLY, mask);
        })
        .then(value => {
          if (typeof value === 'object' && value) {
            noReplyRules = value;
          }
          return getRequest(cfReason.CALL_FORWARD_REASON_NOT_REACHABLE, mask);
        })
        .then(value => {
          if (typeof value === 'object' && value) {
            notReachableRules = value;
          }
        })
        .then(() => {
          unconditionalRules =
            callType === 'voice'
              ? unconditionalRulesVoice
              : unconditionalRulesVideo;
          if (!unconditionalRules) {
            callback(null);
            return;
          }
          const cfOptions = {
            unconditional: unconditionalRules,
            mobilebusy: mobileBusyRules,
            noreply: noReplyRules,
            notreachable: notReachableRules
          };

          let unconditionalFlag = false;

          // Waits for all DB settings completed.
          const asyncOpChecker = {
            taskCount: 0,
            runTask(func) {
              this.taskCount++;
              const newArgs = [];
              for (let i = 1; i < arguments.length; i++) {
                newArgs.push(arguments[i]); // eslint-disable-line
              }
              newArgs.push(this.complete.bind(this));
              func.apply(window, newArgs);
            },
            complete() {
              this.taskCount--;
              if (this.taskCount === 0) {
                this.finish();
              }
            },
            finish() {
              setTimeout(() => {
                ignoreSettingChanges = false;
                callback(cfOptions);
              }, 500);
            }
          };

          /*
           * While storing the settings into the database we avoid observing
           * changes on those ones and enabling/disabling call forwarding.
           */
          ignoreSettingChanges = true;
          // Ensures the settings being set to the setting DB.
          Object.keys(cfOptions).forEach(settingKey => {
            const rules = cfOptions[settingKey];
            if (!rules) {
              return;
            }

            let hasValidRule = false;
            for (let i = 0; i < rules.length; i++) {
              if (mask & rules[i].serviceClass) {
                const enabled = rules[i].active;
                asyncOpChecker.runTask(
                  setToSettingsDB,
                  `ril.cf.${settingKey}.number`,
                  rules[i].number
                );
                asyncOpChecker.runTask(
                  setToSettingsDB,
                  `ril.cf.${settingKey}.enabled`,
                  enabled
                );

                if (enabled) {
                  cfReasonStates[cfReasonMapping[settingKey]] = 1;
                  if (
                    settingKey === 'unconditional' ||
                    settingKey === 'vt.unconditional'
                  ) {
                    unconditionalFlag = true;
                  }
                  hasValidRule = true;
                  break;
                }
              }
            }

            if (!hasValidRule) {
              cfReasonStates[cfReasonMapping[settingKey]] = 0;
              if (
                settingKey === 'unconditional' ||
                settingKey === 'vt.unconditional'
              ) {
                unconditionalFlag = false;
              }
            }
          });

          if (
            (unconditionalRulesVideo[0] &&
              unconditionalRulesVideo[0].active &&
              (videoServiceClassMask &
                unconditionalRulesVideo[0].serviceClass) ===
                videoServiceClassMask) ||
            (unconditionalRulesVoice[0] &&
              unconditionalRulesVoice[0].active &&
              (voiceServiceClassMask &
                unconditionalRulesVoice[0].serviceClass) !==
                0)
          ) {
            unconditionalFlag = true;
          } else {
            unconditionalFlag = false;
          }
          if (!unconditionalFlag) {
            asyncOpChecker.runTask(setToSettingsDB, 'ril.cf.carrier.enabled', {
              enabled: false,
              index: serviceId
            });
          } else {
            // Send the latest query result from carrier to system app
            asyncOpChecker.runTask(setToSettingsDB, 'ril.cf.carrier.enabled', {
              enabled: true,
              index: serviceId
            });
          }
        });
    }

    function setCallForwarding(cfKey, cfNumber) {
      const key = cfKeyMapping[cfKey];
      SettingsDBCache.getSetting(cfKey).then(enabled => {
        /*
         * While storing the settings into the database we avoid observing
         * changes on those ones and enabling/disabling call forwarding.
         */
        if (ignoreSettingChanges) {
          return;
        }
        // Bails out in case the reason is already enabled/disabled.
        if (cfReasonStates[cfReasonMapping[key]] === enabled) {
          return;
        }
        const mobileCFInfo = {};

        mobileCFInfo.action = enabled
          ? cfAction.CALL_FORWARD_ACTION_REGISTRATION
          : cfAction.CALL_FORWARD_ACTION_DISABLE;
        mobileCFInfo.reason = cfReasonMapping[key];
        mobileCFInfo.serviceClass = mask;

        // Skip the phone number checking when disabling call forwarding.
        if (enabled && !isPhoneNumberValid(cfNumber)) {
          ToastHelper.showToast('callForwardingInvalidNumberError');

          updateCallForwardingSubpanels();
          return;
        }
        mobileCFInfo.number = cfNumber;
        mobileCFInfo.timeSeconds =
          mobileCFInfo.reason !== cfReason.CALL_FORWARD_REASON_NO_REPLY
            ? 0
            : 20;

        const req = mobileConnection.setCallForwardingOption(mobileCFInfo);

        if (key === 'unconditional' || key === 'vt.unconditional') {
          enableTapOnCallForwardingItems(false);
          displayInfoForAll('callSettingsQuery');
        } else {
          enableTapOnCallForwardingItem(cfDescIdMapping[key], false);
          displayInfo(cfDescMapping[key], 'callSettingsQuery');
        }

        req.onsuccess = () => {
          updateCallForwardingSubpanels(null, true, key, mobileCFInfo.action);
        };
        req.onerror = () => {
          ToastHelper.showToast('callForwardingSetError');
          updateCallForwardingSubpanels();
        };
      });
    }

    /**
     * Get the l10nId to show after setting up call forwarding.
     */
    function getSetCallForwardingOptionResult(rules, action) {
      let l10nId = '';
      for (let i = 0; i < rules.length; i++) {
        if (rules[i].active && (mask & rules[i].serviceClass) !== 0) {
          const disableAction = action === cfAction.CALL_FORWARD_ACTION_DISABLE;
          if (disableAction) {
            l10nId = 'callForwardingSetForbidden';
          } else {
            l10nId = 'callForwardingSetSuccess';
          }
          return l10nId;
        }
      }
      const registrationAction =
        action === cfAction.CALL_FORWARD_ACTION_REGISTRATION;
      if (registrationAction) {
        l10nId = 'callForwardingSetError';
      } else {
        l10nId = 'callForwardingSetSuccess';
      }
      return l10nId;
    }

    /**
     * Update call forwarding related subpanels.
     */
    function updateCallForwardingSubpanels(
      callback,
      checkSetCallForwardingOptionResult,
      reason,
      action
    ) {
      checkDone = false;
      const element = document.getElementById('list-callForwarding');
      if (!element || element.classList.contains('hidden')) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      if (
        !reason ||
        reason === 'unconditional' ||
        reason === 'vt.unconditional'
      ) {
        displayInfoForAll('callSettingsQuery');
        enableTapOnCallForwardingItems(false);

        getCallForwardingOption(cfOptions => {
          if (cfOptions) {
            DebugHelper.debug(`cfOptions=${JSON.stringify(cfOptions)}`);
            /*
             * Need to check whether we enabled/disabled forwarding calls
             * properly e.g. the carrier might not support disabling call
             * forwarding for some reasons such as phone is busy, unreachable,
             * etc.
             */
            if (checkSetCallForwardingOptionResult) {
              const rules = cfOptions[reason];
              if (rules) {
                const messageL10nId = getSetCallForwardingOptionResult(
                  rules,
                  action
                );
                ToastHelper.showToast(messageL10nId);
              }
            }
            displayRule(cfOptions.unconditional, 'cfu-desc');
            displayRule(cfOptions.mobilebusy, 'cfmb-desc');
            displayRule(cfOptions.noreply, 'cfnrep-desc');
            displayRule(cfOptions.notreachable, 'cfnrea-desc');
            //  If the query is a success enable call forwarding items.
            enableTapOnCallForwardingItems(true);
          } else {
            displayInfoForAll('callSettingsQueryError');
            //  If the query is an error disable call forwarding items.
            enableTapOnCallForwardingItems(false);
          }

          checkDone = true;
          const focusElement = document.querySelector(
            '#call_cf_settings .focus'
          );
          if (focusElement) {
            const disabled = focusElement.hasAttribute('aria-disabled');
            if (!disabled) {
              SettingsSoftkey.init(SoftParams.defaultSelect);
              SettingsSoftkey.show();
            } else {
              SettingsSoftkey.hide();
            }
          }
          if (callback) {
            callback(null);
          }
        });
      } else {
        displayInfo(cfDescMapping[reason], 'callSettingsQuery');
        enableTapOnCallForwardingItem(cfDescIdMapping[reason], false);

        getCallForwardingStatus(reason, cfOptions => {
          const rules = cfOptions;
          if (rules) {
            if (checkSetCallForwardingOptionResult) {
              const messageL10nId = getSetCallForwardingOptionResult(
                rules,
                action
              );
              ToastHelper.showToast(messageL10nId);
            }

            displayRule(rules, cfDescMapping[reason]);
            //  If the query is a success enable call forwarding items.
            enableTapOnCallForwardingItem(cfDescIdMapping[reason], true);
          } else {
            displayInfo(cfDescMapping[reason], 'callSettingsQueryError');
            //  If the query is an error disable call forwarding items.
            enableTapOnCallForwardingItem(cfDescIdMapping[reason], false);
          }

          checkDone = true;
          const focusElement = document.querySelector(
            '#call_cf_settings .focus'
          );
          if (focusElement) {
            const disabled = focusElement.hasAttribute('aria-disabled');
            if (!disabled) {
              SettingsSoftkey.init(SoftParams.defaultSelect);
              SettingsSoftkey.show();
            } else {
              SettingsSoftkey.hide();
            }
          }
          if (callback) {
            callback(null);
          }
        });
      }
    }

    function updateSoftKey(evt) {
      const disabled = evt.target.hasAttribute('aria-disabled');
      if (!disabled && checkDone) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      } else {
        SettingsSoftkey.hide();
      }
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        elements = {
          liElements: panel.querySelectorAll('li'),
          header: panel.querySelector('#call-cf-header'),
          headerH1: panel.querySelector('#call-cf-header h1')
        };
        mobileConnection = ApiManager.connections[serviceId];
        voiceServiceClassMask = mobileConnection.ICC_SERVICE_CLASS_VOICE;
        videoServiceClassMask =
          mobileConnection.ICC_SERVICE_CLASS_PACKET |
          mobileConnection.ICC_SERVICE_CLASS_DATA_SYNC;
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        callType = options.type || 'voice';
        mask =
          callType === 'voice' ? voiceServiceClassMask : videoServiceClassMask;

        if (!options.visibilityChange) {
          if (options && options.key) {
            const callForwardingKey = options.key;
            const callForwardingNumber = options.number || '';
            setCallForwarding(callForwardingKey, callForwardingNumber);
          } else if (!Settings.isBackHref) {
            updateCallForwardingSubpanels();
          }
        }

        ListFocusHelper.addEventListener(elements.liElements, updateSoftKey);
        DeviceFeature.ready(() => {
          if (DeviceFeature.getValue('vilte') === 'true') {
            elements.header.setAttribute('data-href', '#call-cfsettings-list');
            if (callType === 'voice') {
              elements.headerH1.setAttribute(
                'data-l10n-id',
                'voice-call-header'
              );
            } else {
              elements.headerH1.setAttribute(
                'data-l10n-id',
                'video-call-header'
              );
            }
          } else {
            elements.header.setAttribute('data-href', '#call');
            elements.headerH1.setAttribute(
              'data-l10n-id',
              'callForwarding-header'
            );
          }
        });
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        ListFocusHelper.removeEventListener(elements.liElements, updateSoftKey);
      }
    });
  };
});
