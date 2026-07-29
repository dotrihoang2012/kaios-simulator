/* global SimCardHelper */

define('panels/simcard_manager/panel',['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createSimManagerPanel() {
    let isDialogShow = false;
    let listElements = null;
    const conns = ApiManager.connections;
    let currentPanel = null;
    let elements = null;
    const SimSettingsValue = {
      EMPTY_OPTION_TEXT: '--',
      EMPTY_OPTION_VALUE: -2,
      ALWAYS_ASK_OPTION_VALUE: -1
    };

    function outgoingDataHandleKeyDown(evt) {
      if (evt.key === 'Enter' && isDialogShow) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    }

    function handleConfirmDlgEvents(evt) {
      switch (evt.type) {
        case 'gaia-confirm-open':
          isDialogShow = true;
          break;
        case 'gaia-confirm-close':
          isDialogShow = false;
          break;
        default:
          break;
      }
    }

    function updateSimCardUI(cardIndex) {
      const selectors = ['name', 'operator'];
      const cardSelector = `#sim-card-${cardIndex}`;
      const cardDom = elements.simCardContainer.querySelector(cardSelector);

      selectors.forEach(selector => {
        const targetSelector = `${cardSelector} .sim-card-${selector}`;
        const element = elements.simCardContainer.querySelector(targetSelector);

        if (selector === 'name') {
          l10n.setAttributes(element, 'sim-with-index', {
            index: cardIndex + 1
          });
          return;
        }

        const conn = conns[cardIndex];
        const icc = SimCardHelper.getIccInfo(cardIndex);

        if (!icc) {
          element.textContent = '';
          element.setAttribute(
            'data-l10n-id',
            SimCardHelper.getCardDes('absent')
          );

          cardDom.classList.add('none-select');
          cardDom.setAttribute('aria-disabled', true);
          return;
        }

        const { cardState } = icc;
        if (cardState !== 'ready') {
          element.setAttribute(
            'data-l10n-id',
            SimCardHelper.getCardDes(cardState || 'null')
          );

          cardDom.classList.add('none-select');
          cardDom.setAttribute('aria-disabled', true);
          return;
        }

        SimCardHelper.getOperatorName(conn).then(name => {
          element.textContent = name;
        });
        cardDom.classList.remove('none-select');
        cardDom.setAttribute('aria-disabled', false);

        cardDom.setAttribute('id', `sim-card-${cardIndex}`);
      });
    }

    function updateSelectOptionsUI() {
      const iccCard1 = SimCardHelper.getIccInfo(0);
      const iccCard2 = SimCardHelper.getIccInfo(1);
      const cardState1 = iccCard1 && iccCard1.cardState;
      const cardState2 = iccCard2 && iccCard2.cardState;
      const isReady =
        (cardState1 === 'ready' && cardState2 === 'ready') || false;

      const list = [
        'limit.ril.data.defaultServiceId',
        'carrier.sim.match.result',
        'ril.telephony.defaultServiceId',
        'ril.sms.defaultServiceId',
        'ril.data.defaultServiceId'
      ];
      SettingsDBCache.getSettings(list, values => {
        const isLimit = values['limit.ril.data.defaultServiceId'] || false;
        const matchResult = values['carrier.sim.match.result'] || [
          false,
          false
        ];
        if (isReady) {
          if (isLimit && !(matchResult[0] && matchResult[1])) {
            disableDataItem(true);
          } else {
            disableDataItem(false);
          }
        } else {
          disableDataItem(true);
        }
        disableOtherItems(!isReady);

        const outgoingCallIndex = values['ril.telephony.defaultServiceId'] || 0;
        const outgoingMessagesIndex = values['ril.sms.defaultServiceId'] || 0;
        const outgoingDataIndex = values['ril.data.defaultServiceId'] || 0;
        updateSelectOptionUI(
          'outgoingCall',
          outgoingCallIndex,
          elements.outgoingCallSelect
        );
        updateSelectOptionUI(
          'outgoingMessages',
          outgoingMessagesIndex,
          elements.outgoingMessagesSelect
        );
        updateSelectOptionUI(
          'outgoingData',
          outgoingDataIndex,
          elements.outgoingDataSelect
        );
      });
    }

    function disableDataItem(enabled) {
      if (
        !(
          enabled === false &&
          !elements.outgoingCallSelect.disabled &&
          elements.outgoingDataSelect.disabled
        )
      ) {
        elements.outgoingDataSelect.disabled = enabled;
        elements.dataContainer.setAttribute('aria-disabled', enabled);
        if (enabled) {
          elements.dataContainer.classList.add('none-select');
        } else {
          elements.dataContainer.classList.remove('none-select');
        }
      }
    }

    function disableOtherItems(enabled) {
      elements.outgoingCallSelect.disabled = enabled;
      elements.callsContainer.setAttribute('aria-disabled', enabled);

      elements.outgoingMessagesSelect.disabled = enabled;
      elements.messagesContainer.setAttribute('aria-disabled', enabled);
      if (enabled) {
        elements.callsContainer.classList.add('none-select');
        elements.messagesContainer.classList.add('none-select');
      } else {
        elements.callsContainer.classList.remove('none-select');
        elements.messagesContainer.classList.remove('none-select');
      }
    }

    function updateSelectOptionUI(storageKey, selectedCardIndex, selectDOM) {
      // We have to remove old options first
      while (selectDOM.firstChild) {
        selectDOM.removeChild(selectDOM.firstChild);
      }

      // Then insert the new ones
      conns.forEach((conn, index) => {
        const option = document.createElement('option');
        option.value = index;
        if (SimCardHelper.hasValidCard() || isSimCardBlocked()) {
          option.value = SimSettingsValue.EMPTY_OPTION_VALUE;
          option.text = SimSettingsValue.EMPTY_OPTION_TEXT;
        } else {
          SimCardHelper.getOperatorName(conn).then(name => {
            l10n.setAttributes(option, 'sim-with-index-and-carrier', {
              carrier: name,
              index
            });
          });
        }

        if (index === selectedCardIndex) {
          option.selected = true;
        }
        selectDOM.add(option);
      });

      // We will add `always ask` option these two select
      if (storageKey === 'outgoingCall' || storageKey === 'outgoingMessages') {
        const option = document.createElement('option');
        option.value = SimSettingsValue.ALWAYS_ASK_OPTION_VALUE;
        option.setAttribute('data-l10n-id', 'sim-manager-always-ask');

        if (SimSettingsValue.ALWAYS_ASK_OPTION_VALUE === selectedCardIndex) {
          option.selected = true;
        }
        selectDOM.add(option);
      }
    }

    function isSimCardBlocked(cardState) {
      const uselessState = ['permanentBlocked'];
      return uselessState.indexOf(cardState) !== -1;
    }

    function initSimCardManagerUI() {
      updateSelectOptionsUI();
      for (let cardIndex = 0; cardIndex < conns.length; cardIndex++) {
        updateSimCardUI(cardIndex);
      }
    }

    function updateUI(evt) {
      const { type } = evt;
      const cardIndex = evt.detail.index;

      switch (type) {
        case 'SIM-datachange':
        case 'SIM-voicechange':
          updateSimCardUI(cardIndex);
          break;
        case 'SIM-cardstatechange':
          updateSimCardUI(cardIndex);
          /*
           * If we make PUK locked for more than 10 times,
           * we sould get `permanentBlocked` state, in this way
           * we have to update select/options
           */
          if (isSimCardBlocked(SimCardHelper.getIccInfo().cardState)) {
            updateSelectOptionsUI();
          }
          break;
        default:
          break;
      }
    }

    function handleClick(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      const focusLi = currentPanel.querySelector('.focus');
      if (!focusLi.hasAttribute('aria-disabled')) {
        if (focusLi.id === 'sim-card-0') {
          Settings.setCurrentPanel('#simcard_name', {
            serviceId: 0
          });
        } else if (focusLi.id === 'sim-card-1') {
          Settings.setCurrentPanel('#simcard_name', {
            serviceId: 1
          });
        }
      }
    }

    function handleEvent(evt) {
      const cardIndex = Number(evt.target.value);
      if (cardIndex === SimSettingsValue.EMPTY_OPTION_VALUE) {
        return;
      }

      switch (evt.target) {
        case elements.outgoingCallSelect:
          {
            const obj = {};
            obj['ril.telephony.defaultServiceId.iccId'] = null;
            obj['ril.voicemail.defaultServiceId.iccId'] = null;
            obj['ril.telephony.defaultServiceId'] = cardIndex;
            obj['ril.voicemail.defaultServiceId'] = cardIndex;
            SettingsDBCache.saveSettings(obj);
          }
          break;
        case elements.outgoingMessagesSelect:
          {
            const obj = {};
            obj['ril.sms.defaultServiceId.iccId'] = null;
            obj['ril.mms.defaultServiceId.iccId'] = null;
            obj['ril.sms.defaultServiceId'] = cardIndex;
            obj['ril.mms.defaultServiceId'] = cardIndex;
            SettingsDBCache.saveSettings(obj);
          }
          break;
        default:
          break;
      }
    }

    function outgoingDataChangeEvent(cardIndex) {
      elements.outgoingDataSelect.value = cardIndex;
    }

    function outgoingDataChangeHdr() {
      const lastChangeValue = elements.outgoingDataSelect.value;

      function onCancel() {
        elements.outgoingDataSelect.blur();
        SettingsDBCache.getSetting('ril.data.defaultServiceId').then(value => {
          const cardIndex = value || 0;
          updateSelectOptionUI(
            'outgoingData',
            cardIndex,
            elements.outgoingDataSelect
          );
        });
      }

      function onContinue() {
        elements.outgoingDataSelect.blur();
        elements.outgoingDataSelect.value = lastChangeValue;

        const newCardIndex = Number(elements.outgoingDataSelect.value);

        const obj = {};
        obj['ril.data.defaultServiceId'] = newCardIndex;
        const conn = conns[newCardIndex];
        const iccId = conn && conn.iccId;
        if (iccId) {
          SettingsDBCache.saveSettings(obj);
        }
      }

      const dialogConfig = {
        title: {
          id: 'confirmation',
          args: {}
        },
        body: {
          id: 'change-outgoing-data-confirm',
          args: {}
        },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            onCancel();
          }
        },
        confirm: {
          name: 'Continue',
          l10nId: 'continue',
          priority: 3,
          callback: () => {
            onContinue();
            elements.outgoingDataSelect.disabled = true;
            elements.dataContainer.setAttribute('aria-disabled', true);
            elements.dataContainer.classList.add('none-select');
            setTimeout(() => {
              elements.outgoingDataSelect.disabled = false;
              elements.dataContainer.setAttribute('aria-disabled', false);
              elements.dataContainer.classList.remove('none-select');
              SettingsSoftkey.show();
            }, 10000);
          }
        },

        backcallback: () => {
          onCancel();
        }
      };

      DialogHelper.show(dialogConfig);
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          simCardContainer: panel.querySelector('.sim-card-container'),
          simSettingsHeader: panel.querySelector(
            '.sim-manager-settings-header'
          ),
          simSettingsList: panel.querySelector('.sim-manager-select-list'),
          callsContainer: document.getElementById('outgoing-calls-container'),
          outgoingCallSelect: panel.querySelector(
            '.sim-manager-outgoing-call-select'
          ),
          messagesContainer: document.getElementById(
            'outgoing-messages-container'
          ),
          outgoingMessagesSelect: panel.querySelector(
            '.sim-manager-outgoing-messages-select'
          ),
          dataContainer: document.getElementById('outgoing-data-container'),
          outgoingDataSelect: panel.querySelector(
            '.sim-manager-outgoing-data-select'
          ),
          sim1Selector: panel.querySelector('#sim-card-0'),
          sim2Selector: panel.querySelector('#sim-card-1')
        };

        if (SimCardHelper.isDoubleSimSlot()) {
          initSimCardManagerUI();
        } else {
          elements.simCardContainer.classList.add('hidden');
          elements.simSettingsList.classList.add('hidden');
        }
      },

      onBeforeShow(panel) {
        if (SimCardHelper.isDoubleSimSlot()) {
          currentPanel = panel;
          window.addEventListener('SIM-datachange', updateUI);
          window.addEventListener('SIM-voicechange', updateUI);
          window.addEventListener('SIM-cardstatechange', updateUI);

          panel.addEventListener('click', handleClick);

          window.addEventListener('gaia-confirm-open', handleConfirmDlgEvents);
          window.addEventListener('gaia-confirm-close', handleConfirmDlgEvents);
          elements.dataContainer.addEventListener(
            'keydown',
            outgoingDataHandleKeyDown
          );

          elements.outgoingCallSelect.addEventListener('change', handleEvent);
          elements.outgoingMessagesSelect.addEventListener(
            'change',
            handleEvent
          );
          elements.outgoingDataSelect.addEventListener(
            'change',
            outgoingDataChangeHdr
          );

          SettingsDBCache.observe(
            'ril.data.defaultServiceId',
            null,
            outgoingDataChangeEvent
          );
        }

        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        ListFocusHelper.updateSoftkey(panel);
        listElements = document.querySelectorAll('#simcard_manager li');
        ListFocusHelper.addEventListener(listElements);
      },

      onBeforeHide() {
        if (SimCardHelper.isDoubleSimSlot()) {
          window.removeEventListener('SIM-datachange', updateUI);
          window.removeEventListener('SIM-voicechange', updateUI);
          window.removeEventListener('SIM-cardstatechange', updateUI);

          window.removeEventListener(
            'gaia-confirm-open',
            handleConfirmDlgEvents
          );
          window.removeEventListener(
            'gaia-confirm-close',
            handleConfirmDlgEvents
          );
          elements.dataContainer.removeEventListener(
            'keydown',
            outgoingDataHandleKeyDown
          );

          currentPanel.removeEventListener('click', handleClick);
          elements.outgoingCallSelect.removeEventListener(
            'change',
            handleEvent
          );
          elements.outgoingMessagesSelect.removeEventListener(
            'change',
            handleEvent
          );
          elements.outgoingDataSelect.removeEventListener(
            'change',
            outgoingDataChangeHdr
          );
        }
        SettingsSoftkey.hide();
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});

