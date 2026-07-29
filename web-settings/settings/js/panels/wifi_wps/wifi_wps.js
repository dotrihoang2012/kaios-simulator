/**
 * WifiWps is a module that stores some functions that would be called
 * when doing wps related operations
 *
 * @module wifi_wps/wifi_wps
 */


// eslint-disable-next-line
define(['require'],function(require) {
  // eslint-disable-next-line
  const WifiWps = function() {
    return {
      /**
       * To make sure wps pin is valid or not
       * @param {String} pin - value of pin
       * @returns {Boolean}
       */
      _isValidWpsPin(pin) {
        // eslint-disable-next-line
        if (pin.match(/[^0-9]+/)) {
          return false;
        }
        if (pin.length === 4) {
          return true;
        }
        if (pin.length !== 8) {
          return false;
        }
        const num = pin - 0;
        return this.pinChecksum(Math.floor(num / 10)) === num % 10;
      },
      /**
       * This is an inner function that we can use it to get
       * pin's checksum
       *
       * @param {Number} pin - value of pin
       * @returns {Number}
       */
      pinChecksum(pin) {
        let accum = 0;
        while (pin > 0) {
          accum += 3 * (pin % 10);
          pin = Math.floor(pin / 10);
          accum += pin % 10;
          pin = Math.floor(pin / 10);
        }
        return (10 - (accum % 10)) % 10;
      }
    };
  };

  return WifiWps;
});
