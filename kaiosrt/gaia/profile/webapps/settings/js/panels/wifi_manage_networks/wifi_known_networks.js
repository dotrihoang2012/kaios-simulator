/**
 * WifiKnownNetworks is a singleton that you can use it to
 * get known network list.
 *
 * @module wifi_manage_networks/wifi_known_networks
 */
/* global WifiHelper */

// eslint-disable-next-line
define(['require'],function(require) {
  const wifiManager = WifiHelper.getWifiManager();

  /**
   * @alias module:wifi_manage_networks/wifi_known_networks
   * @class WifiKnownNetworks
   * @requires wifi_helper
   */
  const WifiKnownNetworks = {
    /**
     * We would keep cache known networks list here.
     * @memberof WifiKnownNetworks
     * @type {Object}
     */
    networks: {},

    /**
     * We will use this flag to make sure whether we are scanning or not.
     * @memberof WifiKnownNetworks
     * @type {Boolean}
     */
    scanning: false,

    /**
     * We will keep users' callbacks here when we are scanning. And after that,
     * these callbacks will be called with networks as parameters.
     *
     * @memberof WifiKnownNetworks
     * @type {Array}
     */
    cachedCallbacks: [],

    /**
     * You can call this to get networks directly. If we are scanning when you
     * call this method, we will queue your callbacks and they will be called
     * later when scanning is done.
     *
     * @memberof WifiKnownNetworks
     * @param {Function} callback
     */
    get(callback) {
      // Cache callbacks
      if (this.scanning) {
        this.cachedCallbacks.push(callback);
      } else {
        callback(this.networks);
      }
    },

    /**
     * You can call this method to scan known networks directly and we will
     * return found networks as a parameter to your callback.
     *
     * @memberof WifiKnownNetworks
     * @parameter {Function} callback
     */
    scan(callback) {
      let i = 0;
      const req = wifiManager.getKnownNetworks();
      this.scanning = true;

      req.onsuccess = () => {
        // Clean them first
        this.networks = {};
        this.scanning = false;

        const allNetworks = req.result;

        for (i = 0; i < allNetworks.length; ++i) {
          const network = allNetworks[i];
          // Use ssid + capabilities as a composited key
          const key = `${network.ssid}+${WifiHelper.getSecurity(network)}`;
          this.networks[key] = network;
        }

        let cachedCb = null;
        while (this.cachedCallbacks.length > 0) {
          cachedCb = this.cachedCallbacks.pop();
          cachedCb(this.networks);
        }

        // We can call an additional callback after scanning
        if (callback) {
          callback(this.networks);
        }
      };

      req.onerror = error => {
        this.scanning = false;
        console.warn('Error : ', error);
        console.warn('could not retrieve any known network.');
      };
    }
  };

  // Let's try to scan for the first time
  WifiKnownNetworks.scan();

  return WifiKnownNetworks;
});
