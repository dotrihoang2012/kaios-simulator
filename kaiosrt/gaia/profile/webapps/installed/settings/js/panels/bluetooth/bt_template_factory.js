/**
 * The template function for generating an UI element for an item of Bluetooth
 * paired/remote device.
 *
 * @module bluetooth/bt_template_factory
 */


define([],function() {   //eslint-disable-line

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [BluetoothTemplateFactory]: ${msg}`);
    }
  }

  function btTemplate(deviceType, onItemClick, observableItem) {
    const device = observableItem;

    const nameElement = document.createElement('span');
    updateItemName(nameElement, device.name, device.address);

    const descSmall = document.createElement('small');
    descSmall.classList.add('break-word');
    descSmall.classList.add('bt-item');
    if (deviceType === 'remote') {
      descSmall.setAttribute('data-l10n-id', 'device-status-tap-pair');
    }

    // The Audio bit is 1 of iPhone, so should check the device type
    if (
      deviceType === 'paired' &&
      (device.type === 'audio-card' ||
        device.type === 'input-keyboard' ||
        device.type === 'audio-input-microphone')
    ) {
      if (device.connectionStatus === 'connected') {
        descSmall.setAttribute('data-l10n-id', 'device-status-tap-disconnect');
      } else {
        descSmall.setAttribute('data-l10n-id', 'device-status-tap-connect');
      }
    }

    const li = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.classList.add('break-all');
    li.classList.add('bluetooth-device');

    li.attribute = observableItem;

    // According to Bluetooth class of device to give icon style.
    debug(`device.type = ${device.type}`);
    if (device.type === '') {
      li.classList.add('bluetooth-type-unknown');
    } else {
      li.classList.add(`bluetooth-type-${device.type}`);
    }

    if (device.name) {
      li.dataset.name = device.name;
    }

    if (device.paired) {
      li.dataset.paired = device.paired;
    }

    if (device.address) {
      li.dataset.address = device.address;
    }

    // According to 'descriptionText' property to give description.
    updateItemDescriptionText(li, descSmall, device.descriptionText, device);

    anchor.appendChild(nameElement);
    anchor.appendChild(descSmall); // Should append this first
    li.appendChild(anchor);

    // Register the handler for the click event.
    if (typeof onItemClick === 'function') {
      anchor.onclick = () => {
        onItemClick(observableItem);
      };
    }

    /*
     * Observe name property for update device name
     * while device 'onattributechanged' event is coming.
     */
    device.observe('name', newName => {
      updateItemName(nameElement, newName);
    });

    /*
     * Observe descriptionText property for update device description
     * while the connection status changed.
     */
    device.observe('descriptionText', descriptionText => {
      updateItemDescriptionText(li, descSmall, descriptionText, device);
    });

    return li;
  }

  function updateItemName(element, name, address) {
    if (name === '') {
      element.textContent = address;
    } else {
      element.textContent = name;
    }
  }

  function publishCustomEvent(ne, detail) {
    if (detail) {
      window.dispatchEvent(
        new CustomEvent(ne, {
          detail
        })
      );
    }
  }

  // eslint-disable-next-line max-params
  function updateItemDescriptionText(li, element, descriptionText, device) {
    debug(`updateItemDescriptionText(): descriptionText = ${descriptionText}`);
    switch (descriptionText) {
      case 'tapToConnect':
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'paried-with-device');
        element.setAttribute(
          'data-l10n-args',
          JSON.stringify({
            deviceName: device.name
          })
        );
        break;
      case 'pairing':
        publishCustomEvent('bluetooth-pair-status', descriptionText);
        li.setAttribute('aria-disabled', true);
        li.classList.add('none-select');
        element.setAttribute('data-l10n-id', 'device-status-pairing');
        break;
      case 'paired':
        publishCustomEvent('bluetooth-pair-status', descriptionText);
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'paried-with-device');
        element.setAttribute(
          'data-l10n-args',
          JSON.stringify({
            deviceName: device.name
          })
        );
        break;
      case 'connecting':
        li.setAttribute('aria-disabled', true);
        li.classList.add('none-select');
        element.setAttribute('data-l10n-id', 'device-status-connecting');
        break;
      case 'connectedWithDeviceMedia':
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'device-status-tap-disconnect');
        break;
      case 'connectedWithDevice':
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'device-status-tap-disconnect');
        break;
      case 'connectedWithMedia':
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'device-status-tap-disconnect');
        break;
      case 'connectedWithNoProfileInfo':
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'device-status-connected');
        break;
      case 'disconnected':
        if (device.hasAudioCard || device.type === 'input-keyboard') {
          li.removeAttribute('aria-disabled');
          li.classList.remove('none-select');
          if ('#device_in_area' === Settings.getCurrentPanel()) {
            element.setAttribute('data-l10n-id', 'paried-with-device');
            element.setAttribute(
              'data-l10n-args',
              JSON.stringify({
                deviceName: device.name
              })
            );
          } else {
            element.removeAttribute('data-l10n-id');
            element.setAttribute('data-l10n-id', 'device-status-tap-connect');
          }
        }
        break;
      case 'pairFailure':
        li.removeAttribute('aria-disabled');
        li.classList.remove('none-select');
        element.setAttribute('data-l10n-id', 'device-status-tap-pair');
        break;
      default:
        break;
    }
  }

  return function ctorBtTemplate(deviceType, onItemClick) {
    return btTemplate.bind(null, deviceType, onItemClick);
  };
});
