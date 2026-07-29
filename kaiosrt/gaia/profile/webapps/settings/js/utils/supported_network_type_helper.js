/* exported SupportedNetworkTypeHelper */



(function supportedNetworkType(exports) {
  // The network types displayed on the list for user selection
  const NETWORK_TYPES = [
    'wcdma/gsm',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'cdma/evdo',
    'cdma',
    'evdo',
    'wcdma/gsm/cdma/evdo',
    'lte/cdma/evdo',
    'lte/wcdma/gsm',
    'lte/wcdma/gsm/cdma/evdo',
    'lte',
    'tdscdma',
    'tdscdma/wcdma',
    'tdscdma/lte',
    'tdscdma/gsm',
    'tdscdma/gsm/lte',
    'tdscdma/wcdma/gsm',
    'tdscdma/wcdma/lte',
    'tdscdma/gsm/wcdma/lte',
    'tdscdma/gsm/wcdma/cdma/ecdo',
    'tdscdma/cdma/evdo/gsm/wcdma'
  ];

  /*
   * The string map from network types to user friendly strings, which is
   * the combination of the three categories: 'GSM', 'CDMA', and 'LTE'.
   * The mapping is determined by the hardware supported types.
   */
  const NETWORK_TYPE_STRING_MAP = {
    CDMA: {
      'cdma/evdo': 'operator-networkType-auto',
      cdma: 'operator-networkType-CDMA',
      evdo: 'operator-networkType-EVDO'
    },
    LTE: {
      lte: 'operator-networkType-LTE'
    },
    GSM: {
      'wcdma/gsm': 'operator-networkType-prefer3G',
      gsm: 'operator-networkType-2G',
      wcdma: 'operator-networkType-3G',
      'wcdma/gsm-auto': 'operator-networkType-auto',
      'tdscdma/gsm': 'operator-networkType-TDSCDMA-GSM',
      tdscdma: 'operator-networkType-TDSCDMA-ONLY',
      'tdscdma/wcdma': 'operator-networkType-TDSCDMA-WCDMA',
      'tdscdma/wcdma/gsm': 'operator-networkType-TDSCDMA-WCDMA-GSM'
    },
    'GSM,LTE': {
      'lte/wcdma/gsm': 'operator-networkType-auto',
      gsm: 'operator-networkType-2G',
      wcdma: 'operator-networkType-3G',
      'wcdma/gsm-auto': 'operator-networkType-auto-2G-3G',
      'wcdma/gsm': 'operator-networkType-prefer3G',
      lte: 'operator-networkType-4G',
      tdscdma: 'operator-networkType-TDSCDMA-ONLY',
      'tdscdma/wcdma': 'operator-networkType-TDSCDMA-WCDMA',
      'tdscdma/lte': 'operator-networkType-TDSCDMA-LTE',
      'tdscdma/gsm': 'operator-networkType-TDSCDMA-GSM',
      'tdscdma/gsm/lte': 'operator-networkType-TDSCDMA-GSM-LTE',
      'tdscdma/wcdma/gsm': 'operator-networkType-TDSCDMA-WCDMA-GSM',
      'tdscdma/wcdma/lte': 'operator-networkType-TDSCDMA-WCDMA-LTE',
      'tdscdma/gsm/wcdma/lte': 'operator-networkType-TDSCDMA-GSM-WCDMA-LTE'
    },
    'CDMA,LTE': {
      'lte/cdma/evdo': 'operator-networkType-auto',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      cdma: 'operator-networkType-CDMA',
      evdo: 'operator-networkType-EVDO',
      lte: 'operator-networkType-LTE'
    },
    'GSM,CDMA': {
      'wcdma/gsm': 'operator-networkType-preferWCDMA',
      gsm: 'operator-networkType-GSM',
      wcdma: 'operator-networkType-WCDMA',
      'wcdma/gsm-auto': 'operator-networkType-auto-WCDMA-GSM',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      cdma: 'operator-networkType-CDMA',
      evdo: 'operator-networkType-EVDO',
      'wcdma/gsm/cdma/evdo': 'operator-networkType-auto',
      'tdscdma/gsm': 'operator-networkType-TDSCDMA-GSM',
      tdscdma: 'operator-networkType-TDSCDMA-ONLY',
      'tdscdma/wcdma': 'operator-networkType-TDSCDMA-WCDMA',
      'tdscdma/wcdma/gsm': 'operator-networkType-TDSCDMA-WCDMA-GSM',
      'tdscdma/gsm/wcdma/cdma/ecdo':
        'operator-networkType-TDSCDMA-GSM-WCDMA-CDMA-EVDO-AUTO',
      'tdscdma/cdma/evdo/gsm/wcdma':
        'operator-networkType-TDSCDMA-CDMA-EVDO-GSM-WCDMA'
    },
    'GSM,CDMA,LTE': {
      'wcdma/gsm': 'operator-networkType-preferWCDMA',
      gsm: 'operator-networkType-GSM',
      wcdma: 'operator-networkType-WCDMA',
      'wcdma/gsm-auto': 'operator-networkType-auto-WCDMA-GSM',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      cdma: 'operator-networkType-CDMA',
      evdo: 'operator-networkType-EVDO',
      'wcdma/gsm/cdma/evdo': 'operator-networkType-auto-WCDMA-GSM-CDMA-EVDO',
      lte: 'operator-networkType-LTE',
      'lte/wcdma/gsm': 'operator-networkType-auto-LTE-WCDMA-GSM',
      'lte/cdma/evdo': 'operator-networkType-auto-LTE-CDMA-EVDO',
      'lte/wcdma/gsm/cdma/evdo': 'operator-networkType-auto',
      tdscdma: 'operator-networkType-TDSCDMA-ONLY',
      'tdscdma/wcdma': 'operator-networkType-TDSCDMA-WCDMA',
      'tdscdma/lte': 'operator-networkType-TDSCDMA-LTE',
      'tdscdma/gsm': 'operator-networkType-TDSCDMA-GSM',
      'tdscdma/gsm/lte': 'operator-networkType-TDSCDMA-GSM-LTE',
      'tdscdma/wcdma/gsm': 'operator-networkType-TDSCDMA-WCDMA-GSM',
      'tdscdma/wcdma/lte': 'operator-networkType-TDSCDMA-WCDMA-LTE',
      'tdscdma/gsm/wcdma/lte': 'operator-networkType-TDSCDMA-GSM-WCDMA-LTE',
      'tdscdma/gsm/wcdma/cdma/ecdo':
        'operator-networkType-TDSCDMA-GSM-WCDMA-CDMA-EVDO-AUTO',
      'tdscdma/cdma/evdo/gsm/wcdma':
        'operator-networkType-TDSCDMA-CDMA-EVDO-GSM-WCDMA'
    },
    // Default value, the same as 'GSM,CDMA'.
    '': {
      'wcdma/gsm': 'operator-networkType-preferWCDMA',
      gsm: 'operator-networkType-GSM',
      wcdma: 'operator-networkType-WCDMA',
      'wcdma/gsm-auto': 'operator-networkType-auto-WCDMA-GSM',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      cdma: 'operator-networkType-CDMA',
      evdo: 'operator-networkType-EVDO',
      'wcdma/gsm/cdma/evdo': 'operator-networkType-auto',
      'tdscdma/gsm': 'operator-networkType-TDSCDMA-GSM',
      tdscdma: 'operator-networkType-TDSCDMA-ONLY',
      'tdscdma/wcdma': 'operator-networkType-TDSCDMA-WCDMA',
      'tdscdma/wcdma/gsm': 'operator-networkType-TDSCDMA-WCDMA-GSM',
      'tdscdma/gsm/wcdma/cdma/ecdo':
        'operator-networkType-TDSCDMA-GSM-WCDMA-CDMA-EVDO-AUTO',
      'tdscdma/cdma/evdo/gsm/wcdma':
        'operator-networkType-TDSCDMA-CDMA-EVDO-GSM-WCDMA'
    }
  };

  /**
   * SupportedNetworkTypeHelper helps map the supported network types to user
   * friendly strings.
   *
   * @param {Array} hwSupportedTypes Array of hardware supported types. The
   *                                 posssible values of the type are 'gsm',
   *                                 'cdma', 'wcdma', 'evdo', and 'lte'.
   */
  const SupportedNetworkTypeHelper = function SupportedNetworkTypeHelper(
    hwSupportedTypes
  ) {
    const hwSupportedTypeMap = {
      gsm: hwSupportedTypes.indexOf('gsm') !== -1,
      cdma: hwSupportedTypes.indexOf('cdma') !== -1,
      wcdma: hwSupportedTypes.indexOf('wcdma') !== -1,
      evdo: hwSupportedTypes.indexOf('evdo') !== -1,
      lte: hwSupportedTypes.indexOf('lte') !== -1,
      tdscdma: hwSupportedTypes.indexOf('tdscdma') !== -1,
      ecdo: hwSupportedTypes.indexOf('ecdo') !== -1
    };

    // Get all supported network types based on the hardware supported types.
    const networkTypes = NETWORK_TYPES.filter(type =>
      type
        .split('/')
        .every(subtype => hwSupportedTypeMap[subtype.split('-')[0]])
    );

    // Compose the string for NETWORK_TYPE_STRING_MAP table lookup.
    const stringMap =
      NETWORK_TYPE_STRING_MAP[
        ['GSM', 'CDMA', 'LTE']
          .filter(category => {
            switch (category) {
              case 'GSM':
                return (
                  hwSupportedTypeMap.gsm ||
                  hwSupportedTypeMap.wcdma ||
                  hwSupportedTypeMap.tdscdma
                );
              case 'CDMA':
                return (
                  hwSupportedTypeMap.cdma ||
                  hwSupportedTypeMap.evdo ||
                  hwSupportedTypeMap.ecdo
                );
              case 'LTE':
                return hwSupportedTypeMap.lte;
              default:
              return; // eslint-disable-line
            }
          })
          .toString()
      ];

    return {
      get gsm() {
        return hwSupportedTypeMap.gsm;
      },
      get cdma() {
        return hwSupportedTypeMap.cdma;
      },
      get wcdma() {
        return hwSupportedTypeMap.wcdma;
      },
      get evdo() {
        return hwSupportedTypeMap.evdo;
      },
      get lte() {
        return hwSupportedTypeMap.lte;
      },
      get tdscdma() {
        return hwSupportedTypeMap.tdscdma;
      },
      get networkTypes() {
        return networkTypes;
      },
      l10nIdForType(type) {
        return stringMap[type];
      }
    };
  };

  exports.SupportedNetworkTypeHelper = SupportedNetworkTypeHelper;
})(window);
