/**
 * The Bluetooth panel
 *
 */
/* global */

define(['require','modules/bluetooth/bluetooth_context','modules/bluetooth/bluetooth_connection_manager','panels/bluetooth/bt_template_factory','modules/mvvm/list_view','modules/settings_panel'],function(require) {  //eslint-disable-line


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
    let pairedDeviceTemplate = null;
    // eslint-disable-next-line no-unused-vars
    let pairedDevicesListView = null;

    let phoneDeviceBar = null;
    let connectableDeviceBar = null;

    return SettingsPanel({
      onInit(panel) {
        debug('onInit():');

        this.boundUpdatePairedDesc = this.updatePairedDesc.bind(this);
        this.boundUpdateSoftkeyByType = this.updateSoftkeyByDeviceType.bind(
          this
        );

        elements = {
          panel,
          pairedDevicesList: panel.querySelector('#bluetooth-paired-devices'),
          nopairedDesc: panel.querySelector('#nopaired-devices')
        };

        pairedDeviceTemplate = BtTemplateFactory(
          'paired',
          this.onPairedDeviceItemClick.bind(this)
        );

        pairedDevicesListView = ListView(
          elements.pairedDevicesList,
          BtContext.getPairedDevices(),
          pairedDeviceTemplate
        );

        const cskSelect = {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            /* Do nothing */
          }
        };

        const rskForget = {
          l10nId: 'device-option-unpair',
          priority: 3,
          method: this.showUnpairDialog.bind(this)
        };

        phoneDeviceBar = { items: [rskForget] };
        connectableDeviceBar = { items: [cskSelect, rskForget] };
      },

      onBeforeShow() {
        debug('onBeforeShow():');
        BtContext.observe('numberOfPairedDevices', this.boundUpdatePairedDesc);
        this.updatePairedDesc(BtContext.numberOfPairedDevices);
        document.addEventListener(
          'focusChanged',
          this.boundUpdateSoftkeyByType
        );
      },

      onBeforeHide() {
        debug('onBeforeHide():');
        BtContext.unobserve(
          'numberOfPairedDevices',
          this.boundUpdatePairedDesc
        );
        document.removeEventListener(
          'focusChanged',
          this.boundUpdateSoftkeyByType
        );
      },

      onShow() {
        this.refreshSoftkey();
      },

      refreshSoftkey() {
        if (BtContext.numberOfPairedDevices > 0) {
          const deviceItem = elements.panel.querySelector('li.focus').attribute;
          if (deviceItem) {
            if (
              deviceItem.type === 'audio-card' ||
              deviceItem.type === 'input-keyboard' ||
              deviceItem.type === 'audio-input-microphone'
            ) {
              this.updateSoftkey(connectableDeviceBar);
            } else {
              this.updateSoftkey(phoneDeviceBar);
            }
          }
        }
      },

      onPairedDeviceItemClick(deviceItem) {
        // Connect audio-card, audio-input-microphone and keyboard devices
        if (
          deviceItem.type === 'audio-card' ||
          deviceItem.type === 'input-keyboard' ||
          deviceItem.type === 'audio-input-microphone'
        ) {
          if (deviceItem.connectionStatus === 'connected') {
            BtConnectionManager.disconnect(deviceItem.data).then(
              () => {
                debug('paired_device: disconnect device successfully');
                ToastHelper.showToast('success-disconnected-toast');
              },
              reason => {
                debug(
                  `${'paired_device: disconnect device failed, ' +
                    'reason = '}${reason}`
                );
                ToastHelper.showToast('error-disconnect-toast');
              }
            );
          } else if (deviceItem.connectionStatus === 'disconnected') {
            BtConnectionManager.connect(deviceItem.data).then(
              () => {
                debug('paired_device: connect device successfully');
                ToastHelper.showToast('success-connect-toast', {
                  deviceName: deviceItem.name
                });
              },
              reason => {
                debug(
                  `${'paired_device: connect device failed, ' +
                    'reason = '}${reason}`
                );
                ToastHelper.showToast('error-connect-toast');
              }
            );
          }
        }
      },

      showUnpairDialog() {
        const that = this;
        const deviceItem = elements.panel.querySelector('li.focus').attribute;
        const title = 'device-option-unpair-confirmation';
        const msg = 'device-option-unpair-device';
        const dialogConfig = {
          title: { id: title, args: {} },
          body: { id: msg, args: { deviceName: deviceItem.name } },
          cancel: {
            l10nId: 'cancel',
            priority: 1,
            callback() {
              // Do nothing
            }
          },
          confirm: {
            l10nId: 'device-option-unpair',
            priority: 3,
            callback: () => {
              that.comfirmToUnpair(deviceItem);
            }
          }
        };
        DialogHelper.show(dialogConfig);
      },

      comfirmToUnpair(deviceItem) {
        debug(`confirmToUnpair(): deviceItem.address = ${deviceItem.address}`);
        BtContext.unpair(deviceItem.address).then(
          () => {
            ToastHelper.showToast('paried-device-forgotten');
            this.refreshSoftkey();
            debug('comfirmToUnpair(): unpair successfully');
          },
          reason => {
            debug(`comfirmToUnpair(): unpair failed, ${reason}`);
          }
        );
      },

      updatePairedDesc(numberOfPairedDevices) {
        if (numberOfPairedDevices === 0) {
          SettingsSoftkey.hide();
          elements.nopairedDesc.classList.add('visible');
          elements.pairedDevicesList.classList.add('hidden');
        } else {
          elements.nopairedDesc.classList.remove('visible');
          elements.pairedDevicesList.classList.remove('hidden');
        }
      },

      updateSoftkey(params) {
        SettingsSoftkey.init(params);
        SettingsSoftkey.show();
      },

      updateSoftkeyByDeviceType(evt) {
        const focusedItem = evt.detail.focusedElement;
        if (!focusedItem.attribute) {
          return;
        }
        debug(focusedItem.attribute.type);

        if (
          focusedItem.attribute.type === 'audio-card' ||
          focusedItem.attribute.type === 'audio-input-microphone' ||
          focusedItem.attribute.type === 'input-keyboard'
        ) {
          SettingsSoftkey.init(connectableDeviceBar);
          SettingsSoftkey.show();
        } else {
          SettingsSoftkey.init(phoneDeviceBar);
          SettingsSoftkey.show();
        }
      }
    });
  };
});
