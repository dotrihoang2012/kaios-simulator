/* eslint-disable prefer-destructuring */
/**
 * The Bluetooth panel
 *
 */



define(['require','modules/bluetooth/bluetooth_context','modules/settings_panel'],function(require) { //eslint-disable-line

  const BtContext = require('modules/bluetooth/bluetooth_context');
  const SettingsPanel = require('modules/settings_panel');

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [Bluetooth][Panel]: ${msg}`);
    }
  }

  return function ctorBluetooth() {
    let elements = null;
    const listElements = document.querySelectorAll('#bluetooth li');

    return SettingsPanel({
      onInit(panel) {
        debug('onInit():');

        // Init bounding instances for observe/un-observe property.
        this.boundUpdateEnableCheckbox = this.updateEnableCheckbox.bind(this);
        this.boundUpdateBluetoothList = this.updateBluetoothList.bind(this);
        this.boundUpdatePhoneName = this.updatePhoneName.bind(this);
        this.boundUpdateVisibleCheckbox = this.updateVisibleCheckbox.bind(this);

        elements = {
          panel,
          enableMsg: panel.querySelector('#bluetooth-enable-msg'),
          enableCheckbox: panel.querySelector('.bluetooth-status input'),
          bluetoothEnable: panel.querySelector('#bluetooth-enabled-radio'),
          bluetoothDisable: panel.querySelector('#bluetooth-disable-radio'),

          visibleItem: panel.querySelector('#device-visible'),
          visibleCheckBox: panel.querySelector('.device-visible input'),
          visibleSelect: panel.querySelector('#device-visible select'),

          myPhoneNameItem: panel.querySelector('#myPhone-name'),
          phoneName: panel.querySelector('#bluetooth-device-name'),

          pairedDevicesItem: panel.querySelector('#bluetooth-paired-device'),

          nearbyDeviceItem: panel.querySelector('#bluetooth-devices-nearby'),

          items: panel.querySelectorAll('li')
        };
      },

      onBeforeShow() {
        debug('onBeforeShow():');

        this.initSoftkey();

        // Enable/disable
        BtContext.observe('state', this.boundUpdateEnableCheckbox);
        this.updateEnableCheckbox(BtContext.state);

        BtContext.observe('discoverable', this.boundUpdateVisibleCheckbox);
        this.updateVisibleCheckbox(BtContext.discoverable);

        BtContext.observe('state', this.boundUpdateBluetoothList);
        this.updateBluetoothList(BtContext.state);

        BtContext.observe('name', this.boundUpdatePhoneName);
        this.updatePhoneName(BtContext.name);

        window.addEventListener('keydown', this.keyDownHandler);
        ListFocusHelper.addEventListener(listElements);

        elements.bluetoothEnable.addEventListener(
          'change',
          this.onEnableCheckboxClick
        );
        elements.bluetoothDisable.addEventListener(
          'change',
          this.onDisableCheckboxClick
        );

        elements.visibleSelect.addEventListener(
          'change',
          this.onVisibleCheckBoxClick
        );
      },

      onShow(panel, options) {
        debug('onShow():');
        if (!options.visibilityChange) {
          this.updateEnableHigtlight(BtContext.state);
        }
      },

      onBeforeHide() {
        debug('onBeforeHide():');
        BtContext.unobserve('state', this.boundUpdateEnableCheckbox);
        BtContext.unobserve('discoverable', this.boundUpdateVisibleCheckbox);
        BtContext.unobserve('name', this.boundUpdatePhoneName);
        BtContext.unobserve('state', this.boundUpdateBluetoothList);
        window.removeEventListener('keydown', this.keyDownHandler);
        ListFocusHelper.removeEventListener(listElements);

        elements.visibleSelect.removeEventListener(
          'change',
          this.onVisibleCheckBoxClick
        );

        elements.bluetoothEnable.removeEventListener(
          'change',
          this.onEnableCheckboxClick
        );
        elements.bluetoothDisable.removeEventListener(
          'change',
          this.onDisableCheckboxClick
        );
      },

      onHide() {
        debug('onHide():');
      },

      onEnableCheckboxClick() {
        debug('onEnableCheckboxClick');
        BtContext.setEnabled(true).then(
          () => {
            ToastHelper.showToast(`bluetooth-current-status-on`);
            debug(`onEnableCheckboxClick(): setEnabled successfully`);
          },
          reason => {
            debug(
              `onEnableCheckboxClick(): setEnabled failed, reason = ${reason}`
            );
          }
        );
      },

      onDisableCheckboxClick() {
        debug('onDisableCheckboxClick');
        BtContext.setEnabled(false).then(
          () => {
            ToastHelper.showToast(`bluetooth-current-status-off`);
            debug(`onDisableCheckboxClick(): setEnabled  successfully`);
          },
          reason => {
            debug(
              `onDisableCheckboxClick(): setEnabled failed, reason = ${reason}`
            );
          }
        );
      },

      onVisibleCheckBoxClick() {
        const checkbox = elements.visibleSelect.value === 'true';
        debug(`onVisibleCheckBoxClick(): checked = ${checkbox}`);
        const status = checkbox ? 'on' : 'off';
        BtContext.setDiscoverable(checkbox).then(
          () => {
            ToastHelper.showToast(`bluetooth-visible-status-${status}`);
            debug(
              `onVisibleCheckBoxClick(): setDiscoverable ${checkbox} successfully`
            );
          },
          reason => {
            debug(
              `onVisibleCheckBoxClick(): setDiscoverable ${checkbox} failed, reason = ${reason}`
            );
          }
        );
      },

      updateBluetoothList(state) {
        const booleanFlag = state !== 'enabled';

        if (booleanFlag) {
          elements.visibleItem.classList.add('hidden');
          elements.myPhoneNameItem.classList.add('hidden');
          elements.nearbyDeviceItem.classList.add('hidden');
          elements.pairedDevicesItem.classList.add('hidden');
          elements.enableMsg.classList.remove('hidden');
        } else {
          elements.visibleItem.classList.remove('hidden');
          elements.myPhoneNameItem.classList.remove('hidden');
          elements.nearbyDeviceItem.classList.remove('hidden');
          elements.pairedDevicesItem.classList.remove('hidden');
          elements.enableMsg.classList.add('hidden');
        }

        if (state === 'enabled' || state === 'disabled') {
          if (Settings.getCurrentPanel() === '#bluetooth') {
            window.dispatchEvent(new CustomEvent('refresh'));
          }
        }
      },

      updateEnableCheckbox(state) {
        if (state === 'enabled') {
          elements.bluetoothEnable.checked = true;
          elements.bluetoothDisable.checked = false;
        } else {
          elements.bluetoothDisable.checked = true;
          elements.bluetoothEnable.checked = false;
        }
      },

      updateVisibleCheckbox(discoverable) {
        elements.visibleSelect.options[0].selected = discoverable;
        elements.visibleSelect.options[1].selected = !discoverable;
      },

      updatePhoneName(name) {
        elements.phoneName.textContent = name;
      },

      updateEnableHigtlight(state) {
        let liItem = null;
        if (state === 'enabled') {
          liItem = elements.items[0];
        } else {
          liItem = elements.items[1];
        }
        ListFocusHelper.requestFocus(elements.panel, liItem);
      },

      initSoftkey() {
        const params = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: [
            {
              name: 'Select',
              l10nId: 'select',
              priority: 2,
              method() {
                /* Do nothing */
              }
            }
          ]
        };
        SettingsSoftkey.init(params);
        SettingsSoftkey.show();
      },

      // eslint-disable-next-line func-names
      keyDownHandler(e) {
        const checkboxValue = document.querySelector('.focus input');
        switch (e.key) {
          case 'Accept':
          case 'Enter':
            if (
              checkboxValue &&
              checkboxValue.value === 'false' &&
              checkboxValue.checked
            ) {
              Settings.setCurrentPanel('root');
            }
            break;
          default:
            break;
        }
      }
    });
  };
});
