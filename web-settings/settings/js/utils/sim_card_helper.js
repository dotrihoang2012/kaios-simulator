/* globals MobileOperator */

// eslint-disable-next-line
window.SimCardHelper = (function SimCardHelper() {
  // 'ril.data.defaultServiceId'
  const defaultServiceId = 0;
  const simInfos = [
    {
      iccId: null,
      capabilityStatus: '',
      dataStatus: '',
      cardState: ''
    },
    {}
  ];

  function getCardDescription(key) {
    return Constants.CARD_STATE_MAP[key] || key;
  }

  function init() {
    if (!ApiManager.connections) return;
    if (isDoubleSimSlot()) {
      simInfos[0].iccId = ApiManager.connections[0].iccId;
      addListenersForSimCard(0);
      simInfos[1].iccId = ApiManager.connections[1].iccId;
      addListenersForSimCard(1);
    } else {
      simInfos[0].iccId = ApiManager.connections[0].iccId;
      addListenersForSimCard(0);
    }
    ApiManager.telephony.addEventListener('callschanged', () => {
      window.dispatchEvent(new CustomEvent('Telephony-callschanged'));
    });
  }

  function hasValidCard() {
    if (simInfos[0].iccId || simInfos[1].iccId) {
      return true;
    }
    return false;
  }

  function getImsCapability() {
    const { imsHandler } = ApiManager.connections[defaultServiceId];
    if (imsHandler) {
      return imsHandler.capability;
    }
    return null;
  }

  function isDoubleSimSlot() {
    return ApiManager.connections.length > 1;
  }

  function getIccInfo(cardIndex) {
    const { iccId } = ApiManager.connections[cardIndex];
    return ApiManager.iccManager.getIccById(iccId);
  }

  function getOperatorName(mobileConnection) {
    return new Promise(resolve => {
      SettingsDBCache.getSetting('custom.simcards.name').then(value => {
        const { iccId } = mobileConnection;
        const customSimName = value;
        if (customSimName && customSimName[iccId]) {
          resolve(customSimName[iccId]);
        } else {
          const operatorInfo = MobileOperator.userFacingInfo(mobileConnection);
          if (operatorInfo.operator) {
            resolve(operatorInfo.operator);
          } else {
            resolve(l10n.get('no-operator'));
          }
        }
      });
    });
  }

  function addListenersForSimCard(cardIndex) {
    const { imsHandler } = ApiManager.connections[cardIndex];
    if (imsHandler) {
      imsHandler.addEventListener('capabilitychange', status => {
        simInfos[cardIndex].capabilityStatus = status;
        window.dispatchEvent(
          new CustomEvent('SIM-capabilitychange', {
            detail: { index: cardIndex, capabilityStatus: status }
          })
        );
      });
    }
    ApiManager.connections[cardIndex].addEventListener('datachange', status => {
      simInfos[cardIndex].dataStatus = status;
      window.dispatchEvent(
        new CustomEvent('SIM-datachange', {
          detail: { index: cardIndex, status }
        })
      );
    });

    ApiManager.connections[cardIndex].addEventListener(
      'radiostatechange',
      status => {
        simInfos[cardIndex].radiostate = status;
        window.dispatchEvent(
          new CustomEvent('SIM-radiostatechange', {
            detail: { index: cardIndex, status }
          })
        );
      }
    );

    ApiManager.connections[cardIndex].addEventListener(
      'voicechange',
      status => {
        simInfos[cardIndex].dataStatus = status;
        window.dispatchEvent(
          new CustomEvent('SIM-voicechange', {
            detail: { index: cardIndex, status }
          })
        );
      }
    );

    const iccCard = getIccInfo(cardIndex);
    if (!iccCard) {
      return;
    }
    iccCard.addEventListener('cardstatechange', status => {
      simInfos[cardIndex].cardState = status;
      window.dispatchEvent(
        new CustomEvent('SIM-cardstatechange', {
          detail: { index: cardIndex, status }
        })
      );
    });
    ApiManager.iccManager.addEventListener(
      'iccdetected',
      function iccDetectedHandler(evt) {
        if (ApiManager.connections[cardIndex].iccId === evt.iccId) {
          // To do Add listener of this card
        }
      }
    );
    ApiManager.iccManager.addEventListener(
      'iccundetected',
      function iccUndetectedHandler(evt) {
        if (simInfos[cardIndex].iccId === evt.iccId) {
          // To do remove listener of this card
        }
      }
    );
  }

  return {
    init,
    getCardDes: getCardDescription,
    defaultServiceId,
    hasValidCard,
    getImsCapability,
    isDoubleSimSlot,
    getIccInfo,
    getOperatorName
  };
})();
