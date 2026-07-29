/**
 * BluetoothDevice:
 *   - BluetoothDevice is an Observable that wraps the platform
 *     BluetoothDevice object.
 *   - It has some observable properties: name, paired, cod
 * BluetoothDevice only update device information and does not involve in any
 *   UI logic.
 *
 * @module BluetoothDevice
 */
/* eslint-disable no-invalid-this */

define(['require','modules/bluetooth/bluetooth_cod_mapper','modules/mvvm/observable'],function(require) {  //eslint-disable-line

  const BtClassOfDeviceMapper = require('modules/bluetooth/bluetooth_cod_mapper');
  const Observable = require('modules/mvvm/observable');

  const DEBUG = false;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [BluetoothDevice]: ${msg}`);
    }
  }

  /**
   * Provide a function to update connection info.
   *
   * @access public
   * @memberOf BluetoothDevice
   * @param {Object} options
   * @param {Boolean} options.connectionStatus - is connected or not
   * @param {Object} options.profiles - profiles of the connection type
   */
  const updateConnectionInfo = function updateConnectionInfo(options) {
    debug(
      `updateConnectionInfo(): this.address = ${this.address}, this.name = ${
        this.name
      }, options = ${JSON.stringify(options)}`
    );
    if (options.connectionStatus) {
      this.connectionStatus = options.connectionStatus;
    }

    if (options.profiles) {
      this.profiles = Object.create(options.profiles);
    }

    debug(
      `updateConnectionInfo(): this.connectionStatus = ${
        this.connectionStatus
      }, this.profiles = ${JSON.stringify(this.profiles)}`
    );
  };

  /**
   * Provide a function to update description text.
   *
   * @access public
   * @memberOf BluetoothDevice
   */
  const updateDescriptionText = function updateDescriptionText() {
    debug('updateDescriptionText():');
    // Define description for found device.
    if (this.paired === false) {
      this.descriptionText = 'pairFailure';
    } else if (this.paired === 'pairing') {
      this.descriptionText = 'pairing';
    } else if (this.paired === true) {
      this.descriptionText = 'paired';
      // Define description for paired device.
      if (this.connectionStatus === 'connecting') {
        this.descriptionText = 'connecting';
      } else if (this.connectionStatus === 'connected') {
        if (this.profiles) {
          const hfpConnected = this.profiles.hfp;
          const a2dpConnected = this.profiles.a2dp;
          if (hfpConnected && a2dpConnected) {
            this.descriptionText = 'connectedWithDeviceMedia';
          } else if (hfpConnected) {
            this.descriptionText = 'connectedWithDevice';
          } else if (a2dpConnected) {
            this.descriptionText = 'connectedWithMedia';
          } else {
            this.descriptionText = 'connectedWithNoProfileInfo';
          }
        } else {
          this.descriptionText = 'connectedWithNoProfileInfo';
        }
      } else if (this.connectionStatus === 'disconnected') {
        this.descriptionText = 'disconnected';
      }
    }
    debug(
      `updateDescriptionText(): this.descriptionText = ${this.descriptionText}`
    );
  };

  /**
   * @class BluetoothDevice
   * @requires module:modules/mvvm/observable
   * @param {BluetoothDevice} device
   * @return {Observable} observableBluetoothDevice
   */
  return function ctorBluetoothDevice(device) {
    const type = BtClassOfDeviceMapper.getDeviceType(device.cod);
    const hasAudioCard = BtClassOfDeviceMapper.hasAudioCard(device.cod);
    const connectionStatus = device.connectionStatus || 'disconnected';
    const observableBluetoothDevice = Observable({
      name: device.name,
      paired: device.paired,
      address: device.address,
      type,
      hasAudioCard,
      connectionStatus,
      profiles: null,
      descriptionText: '',
      get data() {
        return device;
      },
      updateConnectionInfo,
      updateDescriptionText
    });

    /**
     * Observe 'paired', 'connectionStatus', and 'profiles' properties changed
     * event in init function. Once these properties changed, we can update
     * corrected description for the device.
     */
    observableBluetoothDevice.init = function init() {
      this.observe('paired', this.updateDescriptionText.bind(this));
      this.observe('connectionStatus', this.updateDescriptionText.bind(this));
      this.observe('profiles', this.updateDescriptionText.bind(this));
    };

    /**
     * Watch 'onattributechanged' event
     * A function to receive device which is just found via discovery handler.
     * And set a function to handle 'onattributechanged' event.
     */
    device.onattributechanged = function onattributechanged(evt) {
      // eslint-disable-next-line guard-for-in
      for (const i in evt.attrs) {
        debug(`onDeviceAttributeChanged(): ${evt.attrs[i]}`);
        switch (evt.attrs[i]) {
          case 'name':
            observableBluetoothDevice.name = device.name;
            break;
          case 'paired':
            debug(
              `${'onDeviceAttributeChanged(): device.paired = '}${
                device.paired
              }`
            );
            observableBluetoothDevice.paired = device.paired;
            break;
          case 'cod':
            debug(
              `${'onDeviceAttributeChanged(): device.cod = '}${device.cod}`
            );
            observableBluetoothDevice.type = BtClassOfDeviceMapper.getDeviceType(
              device.cod
            );
            observableBluetoothDevice.hasAudioCard = BtClassOfDeviceMapper.hasAudioCard(
              device.cod
            );
            break;
          default:
            break;
        }
      }
    };

    observableBluetoothDevice.init();
    return observableBluetoothDevice;
  };
});
