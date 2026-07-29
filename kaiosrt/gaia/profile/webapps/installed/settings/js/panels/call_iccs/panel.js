/* global SimCardHelper */

define(['require','modules/settings_panel'],function (require) { //eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createCallIccsPanel() {
    let elements = null;
    let iccIdOnCall = null;
    const { telephony } = ApiManager;
    const listElements = document.querySelectorAll('#call_iccs li');

    function showICCCardDetails(cardIndex) {
      const desc =
        cardIndex === 0 ? elements.callSIM1Desc : elements.callSIM2Desc;
      desc.style.fontStyle = 'italic';

      const mobileConnection = ApiManager.connections[cardIndex];

      const iccCard = SimCardHelper.getIccInfo(cardIndex);
      if (!iccCard) {
        desc.removeAttribute('data-l10n-id');
        desc.textContent = '';
        disableItems(cardIndex, true);
        return;
      }

      if (mobileConnection.radioState !== 'enabled') {
        /*
         * Airplane is enabled. Well, radioState property could be changing but
         * let's disable the items during the transitions also.
         */
        desc.setAttribute('data-l10n-id', SimCardHelper.getCardDes('null'));
        disableItems(cardIndex, true);
        return;
      }
      if (mobileConnection.radioState === 'enabled') {
        desc.removeAttribute('data-l10n-id');
        desc.textContent = '';
        disableItems(cardIndex, false);
      }

      const { cardState } = iccCard;
      if (cardState !== 'ready') {
        desc.setAttribute(
          'data-l10n-id',
          SimCardHelper.getCardDes(cardState || 'null')
        );
        disableItems(cardIndex, true);
        return;
      }

      desc.style.fontStyle = 'normal';
      SimCardHelper.getOperatorName(mobileConnection).then(value => {
        desc.textContent = value.toString();
      });

      disableItems(
        cardIndex,
        !!(ApiManager.connections[cardIndex].iccIds !== iccIdOnCall)
      );
    }

    function disableItems(cardIndex, disable) {
      if (cardIndex === 0) {
        if (disable) {
          elements.callSIM1Item.setAttribute('aria-disabled', true);
        } else {
          elements.callSIM1Item.removeAttribute('aria-disabled');
        }
        elements.callSIM1Item.classList.toggle('none-select', disable);
      } else {
        if (disable) {
          elements.callSIM2Item.setAttribute('aria-disabled', true);
        } else {
          elements.callSIM2Item.removeAttribute('aria-disabled');
        }
        elements.callSIM2Item.classList.toggle('none-select', disable);
      }
    }

    function callsChangedHandler() {
      if (!telephony.active && !iccIdOnCall) {
        return;
      }
      if (telephony.active) {
        iccIdOnCall = ApiManager.connections[telephony.active.serviceId].iccId;
      } else {
        iccIdOnCall = null;
      }

      for (let i = 0; i < ApiManager.connections.length; i++) {
        const mobileConnection = ApiManager.connections[i];
        if (mobileConnection.iccId) {
          showICCCardDetails(i);
        }
      }
    }

    function cardStatusChange(evt) {
      const { type } = evt;
      const cardIndex = evt.detail.index;
      switch (type) {
        case 'SIM-datachange':
          showICCCardDetails(cardIndex);
          break;
        case 'SIM-cardstatechange':
          showICCCardDetails(cardIndex);
          break;
        case 'SIM-radiostatechange':
          showICCCardDetails(cardIndex);
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          callSIM1Item: panel.querySelector('#call-sim1-item'),
          callSIM1Desc: elements.callSIM1Item.querySelector('small'),
          callSIM2Item: panel.querySelector('#call-sim2-item'),
          callSIM2Desc: elements.callSIM2Item.querySelector('small')
        };

        callsChangedHandler();
      },

      onBeforeShow() {
        for (let i = 0; i < ApiManager.connections.length; i++) {
          const mobileConnection = ApiManager.connections[i];
          if (!mobileConnection.iccId) {
            disableItems(i, true);
            continue;
          }
          showICCCardDetails(i);
        }

        window.addEventListener('SIM-cardstatechange', cardStatusChange);
        window.addEventListener('SIM-datachange', cardStatusChange);
        window.addEventListener('SIM-radiostatechange', cardStatusChange);
        window.addEventListener('Telephony-callschanged', callsChangedHandler);

        ListFocusHelper.addEventListener(listElements);
      },

      onBeforeHide() {
        window.removeEventListener('SIM-cardstatechange', cardStatusChange);
        window.removeEventListener('SIM-datachange', cardStatusChange);
        window.removeEventListener('SIM-radiostatechange', cardStatusChange);
        window.removeEventListener(
          'Telephony-callschanged',
          callsChangedHandler
        );
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
