/* global CellBroadcastUtilsHelper, CellChannelDetail */

define(['require','modules/settings_panel','modules/cell_broadcast_utils','panels/cell_channel_detail/cell_channel_detail'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  require('modules/cell_broadcast_utils');
  require('panels/cell_channel_detail/cell_channel_detail');

  return function createChannelDetailPanel() {
    let serviceId = 0;
    let elements = {};
    let cbMode = null;
    let cbChannel = {};
    let isGsm = null;
    let submitable = false;

    function initSoftkey(submit) {
      const softkeyParams = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Cancel',
            l10nId: 'cancel',
            priority: 1,
            method() {
              Settings.setCurrentPanel('#cell_channels_config', {
                type: cbMode,
                channel: cbChannel
              });
            }
          }
        ]
      };

      const saveItem = {
        name: 'Save',
        l10nId: 'save',
        priority: 3,
        method() {
          const titleInput = elements.channelTitleInput.value;
          let channelName = l10n.get('cb-channel');
          if (titleInput && titleInput.replace(/^\s+|\s+$/g, '').length > 0) {
            channelName = elements.channelTitleInput.value;
          }
          const channelIndex = elements.channelIndexInput.value;
          const enabled = cbMode === 'edit' ? cbChannel.enabled : true;
          const nChannel = {
            simSlot: serviceId,
            channelType: 'custom',
            channelName,
            channelId: channelIndex,
            enabled
          };
          if (channelIndex) {
            if (cbMode === 'edit') {
              CellChannelDetail.editChannel(cbChannel, nChannel).then(
                result => {
                  Settings.setCurrentPanel('#cell_channels_config', {
                    type: 'edit',
                    value: result,
                    channel: result ? nChannel : cbChannel
                  });
                }
              );
            } else if (cbMode === 'add') {
              CellChannelDetail.saveChannel(null, nChannel).then(result => {
                Settings.setCurrentPanel('#cell_channels_config', {
                  type: 'add',
                  value: result,
                  channel: result ? nChannel : cbChannel
                });
              });
            }
          }
        }
      };

      if (submit) {
        softkeyParams.items.push(saveItem);
      }
      Array.prototype.sort.call(softkeyParams.items, (item1, item2) => {
        return item1.priority - item2.priority;
      });

      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    function keydownHandler(evt) {
      switch (evt.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'Enter':
          {
            const input = document.querySelector('li.focus input');
            if (input) {
              const cursorPos = input.value.length;
              input.focus();
              input.setSelectionRange(cursorPos, cursorPos);
            }
          }
          break;
        default:
          break;
      }
    }

    function checkChannelInputs() {
      const reg = '^[0-9]+[-]+[0-9]*$|^[0-9]*$';
      const regExp = new RegExp(reg);
      const titleEle = elements.channelTitleInput;
      const inputEle = elements.channelIndexInput;
      const iParams = inputEle.value;
      const tParams = titleEle.value;
      const matchRegExp = regExp.test(iParams);

      if (iParams === '' && tParams === '') {
        submitable = false;
      } else if (matchRegExp) {
        if (iParams.indexOf('-') > 0) {
          const limitRange = iParams.split('-');
          const minBound = parseInt(limitRange[0], 10);
          const maxBound = parseInt(limitRange[1], 10);
          if (minBound < maxBound) {
            const minMatch = 0 <= minBound && minBound < 65536;
            const maxMatch = 0 <= maxBound && maxBound < 65536;
            if (minMatch && maxMatch) {
              submitable = true;
            } else {
              submitable = false;
            }
          } else {
            submitable = false;
          }
        } else {
          const inputValue = parseInt(iParams, 10);
          if (0 <= inputValue && inputValue < 65536) {
            submitable = true;
          } else {
            submitable = false;
          }
        }
      } else {
        submitable = false;
      }

      if (!submitable) {
        // Input:invalid:focus
        inputEle.style.boxShadow = 'inset 0 -0.1rem 0 #820000';
        inputEle.style.borderBottomColor = '#820000';
        inputEle.style.color = '#b90000';
      } else {
        inputEle.style.boxShadow = '';
        inputEle.style.borderBottomColor = '';
        inputEle.style.color = '';
      }

      initSoftkey(submitable);
    }

    function addFocus(evt) {
      const inputItem = evt.target.querySelector('input');
      if (inputItem) {
        inputItem.focus();
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          header: panel.querySelector('gaia-header h1'),
          channelTitleInput: panel.querySelector('.channel-title'),
          channelIndexInput: panel.querySelector('.channel-index')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        CellBroadcastUtilsHelper.setServiceId(serviceId);
        isGsm = CellChannelDetail.checkGsm(serviceId);
        if (!options.visibilityChange) {
          cbMode = options.type;
          if (cbMode === 'add') {
            elements.header.setAttribute('data-l10n-id', 'add-cell-channel');
            cbChannel = options.channel;
            cbChannel.simSlot = serviceId;
            cbChannel.isGSM = isGsm;
            elements.channelTitleInput.value = l10n.get('cb-channel');
            elements.channelIndexInput.value = '';
            submitable = false;
          }

          if (cbMode === 'edit') {
            elements.header.setAttribute('data-l10n-id', 'edit-cell-channel');
            cbChannel = options.channel;
            cbChannel.simSlot = serviceId;
            cbChannel.isGSM = isGsm;
            elements.channelTitleInput.value = cbChannel.channelName;
            elements.channelIndexInput.value = cbChannel.channelId;
            submitable = true;
          }

          initSoftkey(submitable);
        }

        window.addEventListener('keydown', keydownHandler);
        elements.channelTitleInput.parentNode.addEventListener(
          'focus',
          addFocus
        );
        elements.channelIndexInput.parentNode.addEventListener(
          'focus',
          addFocus
        );
        elements.channelTitleInput.addEventListener(
          'input',
          checkChannelInputs
        );
        elements.channelIndexInput.addEventListener(
          'input',
          checkChannelInputs
        );
        checkChannelInputs();
      },
      onShow(panel, options) {
        if (!options.visibilityChange) {
          const liNodes = panel.querySelectorAll('li.focus');
          Array.prototype.forEach.call(liNodes, liNode => {
            liNode.classList.remove('focus');
          });
          const cursorPos = elements.channelTitleInput.value.length;
          elements.channelTitleInput.focus();
          elements.channelTitleInput.setSelectionRange(cursorPos, cursorPos);
          elements.channelTitleInput.parentNode.classList.add('focus');
        }
      },
      onBeforeHide() {
        window.removeEventListener('keydown', keydownHandler);
        elements.channelIndexInput.removeEventListener(
          'input',
          checkChannelInputs
        );
        elements.channelTitleInput.removeEventListener(
          'input',
          checkChannelInputs
        );
      }
    });
  };
});
