/**
 * BluetoothClassOfDeviceMapper:
 *   - BluetoothClassOfDeviceMapper is a mapper that helps settings/bluetooth
 *     apps to decide the icon type. Since platform exposed the 'number' type
 *     for class of device(Major Service Classes, Major Device Classes,
 *     Minor Device Classes), the helper will map the input number to specific
 *     device type. And the decision is referenced from Baseband.
 *     (Assigned numbers for Baseband identifies the Inquiry Access codes
 *     and Class of Device/Service (CoD) fields.)[3]
 *     According to the specifications described, we define the device type in
 *     Gaia side entirely. And the naming of device type we given is also
 *     mapping to CSS style sheet.
 *
 *   - [1] Bluetooth API v1, BluetoothDevice icon property:
 *     https://developer.mozilla.org/en-US/docs/Web/API/BluetoothDevice.icon
 *   - [2] Bluetooth API v2, BluetoothClassOfDevice object:
 *     https://wiki.mozilla.org/B2G/Bluetooth/WebBluetooth-v2/
 *     BluetoothClassOfDevice
 *   - [3] Bluetooth Class of Device Reference:
 *     https://www.bluetooth.org/en-us/specification/assigned-numbers/baseband
 *   - We can update the mapper if the specifications Baseband is updated.
 *
 * @module BluetoothClassOfDeviceMapper
 */

define([],function() { //eslint-disable-line

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [BluetoothCODMapper]: ${msg}`);
    }
  }

  const MinorDeviceClasses = {
    Computer: {
      0: 'computer', // Uncategorized, code for device not assigned
      1: 'computer', // Desktop workstation
      2: 'computer', // Server-class computer
      3: 'computer', // Laptop
      4: 'pda', // Handheld PC/PDA (clamshell)
      5: 'pda', // Palm-size PC/PDA
      6: 'computer', // Wearable computer (watch size)
      7: 'computer', // Tablet
      reserved: 'computer' // All other values reserved. Default type
      // 'computer' given for reserved case.
    },

    Phone: {
      0: 'phone', // Uncategorized, code for device not assigned
      1: 'phone', // Cellular
      2: 'phone', // Cordless
      3: 'phone', // Smartphone
      4: 'modem', // Wired modem or voice gateway
      5: 'phone', // Common ISDN access
      reserved: 'phone' // All other values reserved. Default type
      // 'phone' given for reserved case.
    },

    AudioVideo: {
      0: 'audio-card', // Uncategorized, code not assigned
      1: 'audio-card', // Wearable Headset Device
      2: 'audio-card', // Hands-free Device
      4: 'audio-input-microphone', // Microphone
      5: 'audio-card', // Loudspeaker
      6: 'audio-card', // Headphones
      7: 'audio-card', // Portable Audio
      8: 'audio-card', // Car audio
      9: 'audio-card', // Set-top box
      10: 'audio-card', // HiFi Audio Device
      11: 'camera-video', // VCR
      12: 'camera-video', // Video Camera
      13: 'camera-video', // Camcorder
      14: 'video-display', // Video Monitor
      15: 'video-display', // Video Display and Loudspeaker
      16: 'video-display', // Video Conferencing
      18: 'audio-card', // Gameing/Toy
      reserved: 'audio-card' // All other values reserved. Default type
      // 'audio-card' given for reserved case.
    },

    Peripheral: {
      1: 'input-gaming', // Joystick
      2: 'input-gaming', // Gamepad
      16: 'input-keyboard', // Keyboard
      17: 'input-keyboard', // Keyboard
      18: 'input-keyboard', // Keyboard
      19: 'input-keyboard', // Keyboard
      20: 'input-keyboard', // Keyboard
      21: 'input-keyboard', // Keyboard
      22: 'input-keyboard', // Keyboard
      23: 'input-keyboard', // Keyboard
      24: 'input-keyboard', // Keyboard
      25: 'input-keyboard', // Keyboard
      26: 'input-keyboard', // Keyboard
      27: 'input-keyboard', // Keyboard
      28: 'input-keyboard', // Keyboard
      29: 'input-keyboard', // Keyboard
      30: 'input-keyboard', // Keyboard
      31: 'input-keyboard', // Keyboard
      32: 'input-mouse', // Pointing device
      33: 'input-mouse', // Pointing device
      34: 'input-mouse', // Pointing device
      35: 'input-mouse', // Pointing device
      36: 'input-mouse', // Pointing device
      37: 'input-tablet', // Digitizer tablet
      38: 'input-mouse', // Pointing device
      39: 'input-mouse', // Pointing device
      40: 'input-mouse', // Pointing device
      41: 'input-mouse', // Pointing device
      42: 'input-mouse', // Pointing device
      43: 'input-mouse', // Pointing device
      44: 'input-mouse', // Pointing device
      45: 'input-mouse', // Pointing device
      46: 'input-mouse', // Pointing device
      47: 'input-mouse' // Pointing device
    },

    Imaging: {
      4: 'video-display', // Display, bit: XXX1XX
      8: 'camera-photo', // Camera, bit: XX1XXX
      16: 'scanner', // Scanner, bit: X1XXXX
      32: 'printer' // Printer, bit: 1XXXXX
    }
  };

  const MajorDeviceClasses = {
    1: MinorDeviceClasses.Computer,
    2: MinorDeviceClasses.Phone,
    3: 'network-wireless', // LAN/Network Access Point Major Class
    4: MinorDeviceClasses.AudioVideo,
    5: MinorDeviceClasses.Peripheral,
    6: MinorDeviceClasses.Imaging
  };

  const BluetoothClassOfDeviceMapper = {
    /**
     * Return true if the device has the capability of playing audio
     *
     * @access public
     * @memberOf BluetoothClassOfDeviceMapper
     * @param {BluetoothClassOfDevice} cod
     * @return {boolean}
     */
    hasAudioCard(cod) {
      /*
       * If the device has either 'Audio' or 'Rendering' major services, it can
       * be considered as an 'audio-card' device.
       * P.S. Audio bit 0x100 is mandatory for HF role of HFP
       *      Rendering bit 0x20 is mandatory for SNK role of A2DP
       */
      // eslint-disable-next-line no-bitwise
      return cod.majorServiceClass & 0x100 || cod.majorServiceClass & 0x20;
    },

    /**
     * The string indicating which kind of icon could be used to represent
     * the device.
     *
     * @access public
     * @memberOf BluetoothClassOfDeviceMapper
     * @param {BluetoothClassOfDevice} cod
     * @return {String}
     */
    getDeviceType(cod) {
      debug(`cod.majorDeviceClass = ${cod.majorDeviceClass}`);
      debug(`cod.majorServiceClass = ${cod.majorServiceClass}`);
      debug(`cod.minorDeviceClass = ${cod.minorDeviceClass}`);

      /*
       * Given an empty string to be default type.
       * Then, we show a default icon for empty type.
       */
      let deviceType = '';
      const majorDeviceClass = MajorDeviceClasses[cod.majorDeviceClass];
      debug(`majorDeviceClass = ${majorDeviceClass}`);
      if (typeof majorDeviceClass === 'string') {
        // Drop in LAN/Network Access Point Major Class
        debug('return in major class, type = network-wireless');
        return majorDeviceClass;
      }

      if (typeof majorDeviceClass === 'object') {
        // Drop in other Major Class
        deviceType =
          majorDeviceClass[cod.minorDeviceClass] ||
          majorDeviceClass.reserved ||
          '';

        if (
          deviceType === 'phone' ||
          deviceType === 'computer' ||
          deviceType === 'pda'
        ) {
          debug(`return in minor class, type = ${deviceType}`);
          return deviceType;
        }
      }

      /*
       * If the device has 'Object Transfer' major services and isn't set to a
       * a proper major device type, treat it as 'computer' for supporting OPP
       * P.S. Object Transfer bit 0x80 is mandatory for OPP
       */
      // eslint-disable-next-line no-bitwise
      if (cod.majorServiceClass & 0x80) {
        debug('return in major service Object Transfer, type = computer');
        return 'computer';
      }

      // Check whether it has audio card based on major service
      if (this.hasAudioCard(cod)) {
        debug('return in major service Audio or Rendering, type = audio-card');
        return 'audio-card';
      }

      debug(`return in the rest device types = ${deviceType}`);
      return deviceType;
    }
  };

  return BluetoothClassOfDeviceMapper;
});
