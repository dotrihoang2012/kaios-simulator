/* global */

(function cellBroadcastUtilsHelper(exports) {
  const CBS_PRESET_KEY = 'ril.cellbroadcast.preset.channelslist';
  const CBS_CUSTOM_KEY = 'ril.cellbroadcast.custom.channelslist';

  const CellBroadcastUtilsHelper = (function CellBroadcastUtilsHelper() {
    let serviceIndex = 0;

    function setServiceId(serviceId) {
      serviceIndex = serviceId;
    }

    function getCurSimlot() {
      return serviceIndex;
    }

    function getSettingsDbData() {
      return new Promise(resolve => {
        return SettingsDBCache.getSettings(
          [CBS_PRESET_KEY, CBS_CUSTOM_KEY],
          result => {
            const presetResult = result[CBS_PRESET_KEY];
            const customResult = result[CBS_CUSTOM_KEY];
            const channelsList = presetResult.concat(customResult);
            const returnResult = {
              allChannels: channelsList,
              preset: presetResult,
              custom: customResult
            };
            resolve(returnResult);
          }
        );
      });
    }

    function genChannelTemplate(itemData) {
      const liItem = document.createElement('li');
      const lableItem = document.createElement('label');
      const inputItem = document.createElement('input');
      const spanItem = document.createElement('span');
      const smallItem = document.createElement('small');

      liItem.setAttribute('role', 'menuitem');
      liItem.dataset.channelId = itemData.channelId;
      liItem.dataset.channelType = itemData.channelType;
      liItem.dataset.channelName = itemData.channelName;
      if (Object.prototype.hasOwnProperty.call(itemData, 'disabled')) {
        if (itemData.disabled) {
          liItem.setAttribute('class', 'none-select');
          inputItem.setAttribute('disabled', 'true');
        }
      } else {
        itemData.disabled = false;
      }

      lableItem.setAttribute('class', 'pack-checkbox');
      lableItem.classList.add('full-string');
      inputItem.setAttribute('type', 'checkbox');
      if (!Object.prototype.hasOwnProperty.call(itemData, 'enabled')) {
        itemData.enabled = true;
      }
      inputItem.checked = itemData.enabled;
      inputItem.setAttribute('checked', itemData.enabled);
      const channelName = itemData.channelName || l10n.get('cb-channel');
      spanItem.textContent = channelName;
      smallItem.setAttribute('class', 'menu-item-desc');
      smallItem.setAttribute('style', 'width: 80%');
      smallItem.setAttribute('data-l10n-id', 'channel-id');
      smallItem.setAttribute(
        'data-l10n-args',
        JSON.stringify({
          channelId: itemData.channelId
        })
      );

      lableItem.appendChild(inputItem);
      lableItem.appendChild(spanItem);
      lableItem.appendChild(smallItem);
      liItem.appendChild(lableItem);

      return liItem;
    }

    function createChannelPanel(channel) {
      if (!channel) {
        return;
      }

      const root = document.querySelector('#cell_channels_config ul');
      const channelItem = genChannelTemplate(channel);
      const listFragment = document.createDocumentFragment();
      listFragment.appendChild(channelItem);
      if (root) {
        root.appendChild(listFragment);
      }
    }

    return {
      setServiceId,
      getCurSimlot,
      getSettingsDbData,
      createChannelPanel,
      genChannelTemplate
    };
  })();
  exports.CellBroadcastUtilsHelper = CellBroadcastUtilsHelper;
})(window);
