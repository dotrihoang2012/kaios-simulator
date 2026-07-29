/* global CellBroadcastUtilsHelper, CellChannelsConfig */

define(['require','modules/settings_panel','modules/cell_broadcast_utils','panels/cell_channels_config/cell_channels_config'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  require('modules/cell_broadcast_utils');
  require('panels/cell_channels_config/cell_channels_config');

  return function createChannelConfigPanel() {
    let serviceId = 0;
    const CBS_CUSTOM_KEY = 'ril.cellbroadcast.custom.channelslist';
    const curPanleId = '#cell_channels_config';
    let listElements = null;
    let elements = {};

    const aSoftkeyParams = {
      menuClassName: 'menu-button',
      header: { l10nId: 'options' },
      items: [
        {
          name: 'Add channel',
          l10nId: 'add-channel',
          priority: 1,
          method() {
            const channelItem = getCurrentChannel();
            Settings.setCurrentPanel('#cell_channel_detail', {
              type: 'add',
              channel: channelItem
            });
          }
        }
      ]
    };

    const cSoftkeyParams = {
      menuClassName: 'menu-button',
      header: { l10nId: 'options' },
      items: [
        {
          name: 'Edit channel',
          l10nId: 'edit-channel',
          priority: 5,
          method() {
            const channelItem = getCurrentChannel();
            Settings.setCurrentPanel('#cell_channel_detail', {
              type: 'edit',
              channel: channelItem
            });
          }
        },
        {
          name: 'Delete channel',
          l10nId: 'delete-channel',
          priority: 6,
          method() {
            showConfirmDialog();
          }
        }
      ]
    };

    const deselectSoftkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'options'
      },
      items: [
        {
          name: 'Deselect',
          l10nId: 'deselect',
          priority: 2,
          method() {
            handleSelectChange();
          }
        }
      ]
    };
    const selectSoftkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'options'
      },
      items: [
        {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            handleSelectChange();
          }
        }
      ]
    };

    function showConfirmDialog() {
      const dialogConfig = {
        title: { id: 'cell-channels-delete', args: {} },
        body: { id: 'cell-channels-confirm', args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1
        },
        confirm: {
          name: 'Delete',
          l10nId: 'delete',
          priority: 3,
          callback() {
            const channelItem = getCurrentChannel();
            CellChannelsConfig.deleteChannel(channelItem).then(() => {
              updateSoftkey();
            });
          }
        }
      };

      DialogHelper.show(dialogConfig);
    }

    function getCurrentChannel() {
      const focusedElement = document.querySelector(`${curPanleId} li.focus`);
      let channelItem = {};
      if (focusedElement) {
        const input = focusedElement.querySelector('input');
        channelItem = {
          channelType: 'custom',
          channelName: focusedElement.dataset.channelName,
          channelId: focusedElement.dataset.channelId,
          enabled: input.checked,
          disabled: false
        };
      }
      return channelItem;
    }

    function dispalyEmptyContainer() {
      const lists = document.querySelectorAll(`${curPanleId} li`);
      if (!lists.length) {
        elements.emptyListNode.classList.remove('hidden');
      } else {
        elements.emptyListNode.classList.add('hidden');
      }
    }

    function genNewSoftkeyParams(softkeyParams, newSoftkey) {
      const newSoftkeyParams = CellChannelsConfig.copy(softkeyParams);
      if (!newSoftkey.items) {
        return softkeyParams;
      }

      newSoftkeyParams.items = newSoftkeyParams.items.concat(newSoftkey.items);
      Array.prototype.sort.call(newSoftkeyParams.items, (item1, item2) => {
        return item1.priority - item2.priority;
      });

      return newSoftkeyParams;
    }

    function updateSoftkey() {
      dispalyEmptyContainer();

      const focusedElement = document.querySelector(`${curPanleId} li.focus`);
      const channelType = focusedElement && focusedElement.dataset.channelType;
      if (
        focusedElement &&
        focusedElement.classList &&
        focusedElement.classList.contains('none-select')
      ) {
        SettingsSoftkey.init(aSoftkeyParams);
        SettingsSoftkey.show();
        return;
      }

      const softkeyParams = CellChannelsConfig.copy(aSoftkeyParams);
      switch (channelType) {
        case 'custom':
          softkeyParams.items = softkeyParams.items.concat(
            cSoftkeyParams.items
          );
          break;
        case 'preset':
          break;
        default:
          break;
      }

      if (focusedElement) {
        if (
          focusedElement.querySelector('input') &&
          focusedElement.querySelector('input').checked
        ) {
          SettingsSoftkey.init(
            genNewSoftkeyParams(softkeyParams, deselectSoftkeyParams)
          );
        } else {
          SettingsSoftkey.init(
            genNewSoftkeyParams(softkeyParams, selectSoftkeyParams)
          );
        }
      } else {
        SettingsSoftkey.init(softkeyParams);
      }
      SettingsSoftkey.show();
    }

    function getFocusedNode(curChannel) {
      if (!curChannel) {
        return null;
      }
      const liNodes = document.querySelectorAll(`${curPanleId} ul > li`);
      let needFocusNode = null;
      if (liNodes) {
        for (let i = 0, len = liNodes.length; i < len; i++) {
          if (
            liNodes[i].dataset.channelId === curChannel.channelId &&
            liNodes[i].dataset.channelType === curChannel.channelType
          ) {
            needFocusNode = liNodes[i];
            break;
          }
        }
      }
      return needFocusNode;
    }

    function handleSelectChange() {
      const focusedElement = document.querySelector(`${curPanleId} li.focus`);
      const { channelId } = focusedElement.dataset;
      const target = focusedElement.querySelector('input');
      CellChannelsConfig.getChannels(CBS_CUSTOM_KEY).then(cbResult => {
        Array.prototype.forEach.call(cbResult, (curChannel, index) => {
          if (
            curChannel.channelId === channelId &&
            curChannel.simSlot === serviceId
          ) {
            cbResult[index].enabled = target.checked;
            updateSoftkey();
          }
        });
        const cset = {};
        cset[CBS_CUSTOM_KEY] = cbResult;
        SettingsDBCache.saveSettings(cset);
      });
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          emptyListNode: panel.querySelector('#empty-list')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        CellBroadcastUtilsHelper.setServiceId(serviceId);
        if (!options.visibilityChange) {
          let values = null;
          if (options && options.type) {
            values = options.value;
          }
          CellChannelsConfig.showCbChannels(curPanleId, values).then(() => {
            listElements = panel.querySelectorAll('li');
            ListFocusHelper.addEventListener(listElements, updateSoftkey);
            ListFocusHelper.updateSoftkey(panel);
            updateSoftkey();
          });
        }

        CellChannelsConfig.observe();
      },

      onShow(panel, options) {
        if (!options.visibilityChange) {
          let curChannel = null;
          if (options && options.type) {
            curChannel = options.channel;
          }
          const focusNode = getFocusedNode(curChannel);
          if (focusNode) {
            const focusedElement = panel.querySelector('.focus');
            if (focusedElement) {
              focusedElement.classList.remove('focus');
            }
            focusNode.classList.add('focus');
            NavigationMap.scrollToElement(focusNode, false);
            const input = focusNode.querySelector('input');
            if (input) {
              input.focus();
            }
          }
        }
      },

      onBeforeHide() {
        listElements = document.querySelectorAll('li');
        ListFocusHelper.removeEventListener(listElements, updateSoftkey);
        CellChannelsConfig.unObserve();
      }
    });
  };
});
