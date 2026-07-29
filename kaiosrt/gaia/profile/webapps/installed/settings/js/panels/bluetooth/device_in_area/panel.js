/**
 * The Bluetooth panel
 */
/* global  */

define(['require','modules/bluetooth/bluetooth_context','modules/bluetooth/bluetooth_connection_manager','panels/bluetooth/bt_template_factory','modules/mvvm/list_view','modules/settings_panel'],function(require) { //eslint-disable-line

  const BtContext = require('modules/bluetooth/bluetooth_context');
  const BtConnectionManager = require('modules/bluetooth/bluetooth_connection_manager');
  const BtTemplateFactory = require('panels/bluetooth/bt_template_factory');
  const ListView = require('modules/mvvm/list_view');
  const SettingsPanel = require('modules/settings_panel');

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [Bluetooth][Panel]: ${msg}`);
    }
  }

  return function ctorBluetooth() {
    let elements = null;
    let searchingBar = null;
    let searchCompleteBar = null;
    let noDevicesBar = null;
    let pairedBar = null;
    let currentFocusItem = null;
    let currentPairingDevice = null;

    return SettingsPanel({
      onInit(panel) {
        // To record current bluetooth status
        this.status = 'init';
        debug('Init bluetooth nearby devices.');
        this.boundUpdateSearchingStatus = this.updateSearchingStatus.bind(this);
        this.boundUpdateSearchingSoftkey = this.updateSearchingSoftkey.bind(
          this
        );
        this.refreshSoftkey = this.focusChanged.bind(this);
        this.boundUpdatePairedSoftkey = this.updatePairedSoftkey.bind(this);
        this.boundBluetoothState = this.updateBluetoothState.bind(this);

        elements = {
          panel,
          foundDevicesList: panel.querySelector('#bluetooth-devices'),
          searchingItem: panel.querySelector('#bluetooth-searching'),
          nearbyDevicesDesc: panel.querySelector('#nodevices-nearby')
        };
        const cskSelect = {
          name: 'select',
          l10nId: 'select',
          priority: 2,
          method() {
            /* Do nothing */
          }
        };
        const rskRescan = {
          name: 'Rescan',
          l10nId: 'rescan',
          priority: 3,
          method: this.searchAgain.bind(this)
        };
        searchingBar = { items: [cskSelect] };
        searchCompleteBar = { items: [cskSelect, rskRescan] };
        noDevicesBar = { items: [rskRescan] };
        pairedBar = { items: [rskRescan] };

        // Found devices list item click events
        const foundDeviceTemplate = BtTemplateFactory(
          'remote',
          this.onFoundDeviceItemClick.bind(this)
        );

        // Create found devices list view
        ListView(
          elements.foundDevicesList,
          BtContext.getRemoteDevices(),
          foundDeviceTemplate
        );

        BtContext.observe('state', this.boundBluetoothState);
      },

      onBeforeShow() {
        debug('onBeforeShow():');

        document.addEventListener('focusChanged', this.refreshSoftkey);
        BtContext.observe('discovering', this.boundUpdateSearchingStatus);
        BtContext.observe('hasFoundDevice', this.boundUpdateSearchingSoftkey);
        BtContext.observe('paired', this.boundUpdatePairedSoftkey);
      },

      onShow() {
        debug('onShow');
        if ('pairing' === this.status || 'pairFailed' === this.status) {
          return;
        }

        if ('remotePairing' === this.status) {
          this.status = 'idle';
          this.updateSoftkey(searchCompleteBar);
          return;
        }

        this.searchAgain();
      },

      onBeforeHide() {
        debug('onBeforeHide():');
        BtContext.unobserve('discovering', this.boundUpdateSearchingStatus);
        BtContext.unobserve('hasFoundDevice', this.boundUpdateSearchingSoftkey);
        BtContext.unobserve('paired', this.boundUpdatePairedSoftkey);
        document.removeEventListener('focusChanged', this.refreshSoftkey);
      },

      onHide() {
        debug('onHide():');
        BtContext.stopDiscovery();
        if (this.status === 'discovering') {
          this.status = 'idle';
        }
      },

      onRequestPairingFromSystemMessage() {
        if ('device_in_area' === document.querySelector('.current').id) {
          if ('pairing' !== this.status) {
            this.status = 'remotePairing';
          }
        }
        debug('onRequestPairingFromSystemMessage():');
      },

      onFoundDeviceItemClick(deviceItem) {
        const softkey = SettingsSoftkey.getSoftkey();
        if (softkey.buttonCsk.innerHTML !== '') {
          this.toPairDevice(deviceItem);
        }
      },

      toPairDevice(deviceItem) {
        debug(`toPairDevice(): deviceItem.address = ${deviceItem.address}`);
        currentPairingDevice = deviceItem;

        // Update device pairing status first.
        deviceItem.paired = 'pairing';
        this.status = 'pairing';
        SettingsSoftkey.hide();
        // Pair with the remote device.
        BtContext.pair(deviceItem.address).then(
          () => {
            debug(`paired with ${deviceItem.name} success.`);

            // Connect the device which is just paired.
            this.connectHeadsetDevice(deviceItem);

            // Reload current nearby devices page
            this.status = 'idle';
            deviceItem.paired = true;
            this.updatePairedSoftkey(true);
          },
          reason => {
            debug(`${'toPairDevice(): pair failed, reason = '}${reason}`);

            /*
             * Reset the paired status back to false,
             * since the 'pairing' status is given in Gaia side.
             */
            deviceItem.paired = false;
            this.status = 'pairFailed';
            this.showConfirmDialog(deviceItem);
            this.updateSoftkey(searchCompleteBar);
          }
        );
      },

      connectHeadsetDevice(deviceItem) {
        if (
          deviceItem.type === 'audio-card' ||
          deviceItem.type === 'input-keyboard' ||
          deviceItem.type === 'audio-input-microphone'
        ) {
          BtConnectionManager.connect(deviceItem.data).then(
            () => {
              debug('connectHeadsetDevice(): connect device successfully');
            },
            reason => {
              debug(
                `${'connectHeadsetDevice(): connect device failed, ' +
                  'reason = '}${reason}`
              );
            }
          );
        }
      },

      updateSearchingStatus(discovering) {
        debug(
          `${'_updateSearchingItem(): ' +
            'callback from observe "discovering" = '}${discovering}`
        );
        elements.searchingItem.classList.toggle('hidden', !discovering);
        const devicesNearby = BtContext.getRemoteDevices();
        if (discovering === false) {
          if (devicesNearby.length === 0) {
            elements.nearbyDevicesDesc.classList.add('visible');
            this.updateSoftkey(noDevicesBar);
          } else if (this.status === 'pairing') {
            SettingsSoftkey.hide();
          } else {
            this.updateSoftkey(searchCompleteBar);
          }
        }

        if (this.status !== 'pairing') {
          this.status = 'idle';
        }
      },

      updateSearchingSoftkey(hasFoundDevice) {
        if (hasFoundDevice === true) {
          this.updateSoftkey(searchingBar);
        } else {
          SettingsSoftkey.hide();
        }
      },

      updatePairedSoftkey(paired) {
        debug(`updatePairedSoftkey: ${paired}`);
        if (paired) {
          if (currentFocusItem) {
            const p = currentFocusItem.attribute.paired;
            this.updateSoftkeyByPaired(p);
          } else {
            const focusItem = elements.panel.querySelector('li.focus')
              .attribute;
            this.updateSoftkeyByPaired(focusItem.paired);
          }
        }
      },

      searchAgain() {
        SettingsSoftkey.hide();
        elements.nearbyDevicesDesc.classList.remove('visible');
        BtContext.startDiscovery().then(
          () => {
            this.status = 'discovering';
            debug('searchAgain(): startDiscovery successfully');
          },
          reason => {
            debug(
              `${'searchAgain(): startDiscovery failed, ' +
                'reason = '}${reason}`
            );
          }
        );
      },

      showConfirmDialog(deviceItem) {
        const that = this;
        const dialogConfig = {
          title: { id: 'error-pair-title', args: {} },
          body: {
            id: 'error-pair-fail',
            args: { devicename: deviceItem.name }
          },
          desc: { id: 'error-pair-checkpin', args: {} },
          cancel: {
            l10nId: 'cancel',
            priority: 1,
            callback() {
              that.status = 'idle';
            }
          },
          confirm: {
            l10nId: 'pair',
            priority: 3,
            callback() {
              that.toPairDevice(deviceItem);
            }
          },
          backcallback() {
            that.status = 'idle';
          }
        };
        DialogHelper.show(dialogConfig);
      },

      focusChanged(evt) {
        currentFocusItem = evt.detail.focusedElement;
        // eslint-disable-next-line prefer-destructuring
        const paired =
          currentFocusItem.attribute && currentFocusItem.attribute.paired;
        debug(`status: ${this.status}`);

        if (this.status === 'pairing') {
          SettingsSoftkey.hide();
        } else if (this.status === 'discovering') {
          this.updateSoftkey(searchingBar);
        } else {
          this.updateSoftkeyByPaired(paired);
        }
      },

      updateSoftkeyByPaired(paired) {
        if (paired) {
          this.updateSoftkey(pairedBar);
        } else {
          this.updateSoftkey(searchCompleteBar);
        }
      },

      updateSoftkey(params) {
        if (NavigationMap.currentSection === '#device_in_area') {
          SettingsSoftkey.init(params);
          SettingsSoftkey.show();
        }
      },

      updateBluetoothState(state) {
        /*
         *Bug 52993: when device is pairing, the bluetoothd is killed,
         *The pairing can not be finished, it need clean status.
         */
        if (state === 'disabled' && this.status === 'pairing') {
          this.status = 'idle';
          currentPairingDevice.paired = false;
          this.updateSoftkeyByPaired(false);
        }
      }
    });
  };
});
