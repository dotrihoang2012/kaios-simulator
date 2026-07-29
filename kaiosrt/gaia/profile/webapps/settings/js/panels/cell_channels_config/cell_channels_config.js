/* global CellBroadcastUtilsHelper */

(function cellChannelsConfig(exports) {
  const CB_CHANNEL_TYPE_CUSTOM = 'custom';
  const CBS_SERACHLIST_KEY = 'ril.cellbroadcast.searchlist';
  const CBS_PRESET_KEY = 'ril.cellbroadcast.preset.channelslist';
  const CBS_CUSTOM_KEY = 'ril.cellbroadcast.custom.channelslist';
  const curPanleId = '#cell_channels_config';

  const CellChannelsConfig = (function CellChannelsConfig() {
    function deepCopy(obj) {
      let newObjct = {};
      if (obj instanceof Array) {
        newObjct = [];
      }

      for (let key in obj) { //eslint-disable-line
        const val = obj[key];
        newObjct[key] = typeof val === 'object' ? deepCopy(val) : val;
      }
      return newObjct;
    }

    /**
     * For example as the follow:
     * [{'gsm' : "1, 2, 4-6", 'cdma' : "1, 50, 99"}, {'cdma' : "3, 6, 8-9"}]
     */
    function observeDbState() {
      SettingsDBCache.observe(CBS_CUSTOM_KEY, [], handleSettingsDbChanged);
      SettingsDBCache.observe(CBS_PRESET_KEY, [], handleSettingsDbChanged);
    }

    function unObserveDbState() {
      SettingsDBCache.unobserve(CBS_CUSTOM_KEY, handleSettingsDbChanged);
      SettingsDBCache.unobserve(CBS_PRESET_KEY, handleSettingsDbChanged);
    }

    function handleSettingsDbChanged() {
      return new Promise(resolve => {
        const lset = [{}, {}];
        CellBroadcastUtilsHelper.getSettingsDbData().then(sResult => {
          DebugHelper.debug(
            `handleSettingsDbChanged::sResult -> ${JSON.stringify(sResult)}`
          );
          if (!Array.isArray(sResult.allChannels)) {
            return;
          }

          Array.prototype.forEach.call(sResult.allChannels, channel => {
            const index = channel.simSlot;
            if (channel.enabled) {
              if (channel.isGSM) {
                if (lset[index].gsm) {
                  lset[index].gsm = `${lset[index].gsm},${channel.channelId}`;
                } else {
                  lset[index].gsm = channel.channelId;
                }
              } else if (lset[index].cdma) {
                lset[index].cdma = `${lset[index].cdma},${channel.channelId}`;
              } else {
                lset[index].cdma = channel.channelId;
              }
            }
          });
          DebugHelper.debug(
            `handleSettingsDbChanged lset -> ${JSON.stringify(lset)}`
          );
          const cset = {};
          cset[CBS_SERACHLIST_KEY] = lset;
          SettingsDBCache.saveSettings(cset);
          resolve(lset);
        });
      });
    }

    function findNeedFocusNode(navId) {
      const focusedNode = document.querySelector(`${curPanleId} li.focus`);
      if (!focusedNode) {
        return null;
      }
      const currentNavId = focusedNode.getAttribute('data-nav-id');
      if (!navId) {
        const previousNavId = focusedNode.style.getPropertyValue('--nav-up');
        const nextNavId = focusedNode.style.getPropertyValue('--nav-down');
        if (currentNavId === previousNavId) {
          return null;
        }
        navId = currentNavId > nextNavId ? previousNavId : nextNavId;
      }
      DebugHelper.debug(`findNeedFocusNode::navId -> ${navId}`);

      const liNodes = document.querySelectorAll(`${curPanleId} ul > li`);
      let needFocusNode = null;
      if (liNodes) {
        for (let i = 0, len = liNodes.length; i < len; i++) {
          DebugHelper.debug(
            `findNeedFocusNode::liNodes[${i}] -> ${liNodes[i].getAttribute(
              'data-nav-id'
            )}`
          );
          if (liNodes[i].getAttribute('data-nav-id') === navId) {
            needFocusNode = liNodes[i];
            break;
          }
        }
      }
      return needFocusNode;
    }

    function getChannelsList(key) {
      return new Promise(resolve => {
        SettingsDBCache.getSetting(key).then(result => {
          resolve(result);
        });
      });
    }

    function delChannelFromCbList(channel) {
      DebugHelper.debug(
        `delChannelFromCbList::channel -> ${JSON.stringify(channel)}`
      );
      return new Promise(resolve => {
        const CBS_KEY =
          channel.channelType === CB_CHANNEL_TYPE_CUSTOM
            ? CBS_CUSTOM_KEY
            : CBS_PRESET_KEY;
        DebugHelper.debug(`delChannelFromCbList::CBS_KEY -> ${CBS_KEY}`);
        return getChannelsList(CBS_KEY).then(cbResult => {
          Array.prototype.forEach.call(cbResult, (curChannel, index) => {
            if (curChannel.channelId === channel.channelId) {
              cbResult.splice(index, 1);
            }
          });
          DebugHelper.debug(
            `delChannelFromCbList::cbResult -> ${JSON.stringify(cbResult)}`
          );
          const cset = {};
          cset[CBS_KEY] = cbResult;
          SettingsDBCache.saveSettings(cset);
          resolve(cbResult);
        });
      });
    }

    function removeChannelFromDB(curChannel) {
      return new Promise(resolve => {
        const dom = document.querySelector(`${curPanleId} ul`);
        const node = document.querySelector(`${curPanleId} li.focus`);
        DebugHelper.debug(
          `removeChannelFromDB::curChannel -> ${JSON.stringify(curChannel)}`
        );
        const nextFocusNode = findNeedFocusNode();
        DebugHelper.debug(
          `removeChannelFromDB::nextFocusNode -> ${JSON.stringify(
            nextFocusNode
          )}`
        );

        if (node) {
          dom.removeChild(node);
        }

        if (nextFocusNode) {
          ListFocusHelper.requestFocus('cell_channels_config', nextFocusNode);
        }

        return delChannelFromCbList(curChannel).then(channel => {
          resolve(channel);
        });
      });
    }

    function clearChannelPanel(id) {
      const dom = document.querySelector(`${id} ul`);
      const liNodes = document.querySelectorAll(`${id} ul li`);
      Array.prototype.forEach.call(liNodes, node => {
        if (node) {
          dom.removeChild(node);
        }
      });
    }

    function createAllChannelPanels(value) {
      return new Promise(resolve => {
        CellBroadcastUtilsHelper.getSettingsDbData().then(result => {
          const channels = value ? value : result.allChannels;
          if (!channels.length) {
            return resolve(channels);
          }

          const fResult = Array.prototype.filter.call(channels, channel => {
            return channel.simSlot === CellBroadcastUtilsHelper.getCurSimlot();
          });

          if (!fResult.length) {
            return resolve(fResult);
          }

          Array.prototype.forEach.call(fResult, (channel, index) => {
            CellBroadcastUtilsHelper.createChannelPanel(channel);
            if (index === fResult.length - 1) {
              return resolve(fResult);
            }
            return resolve();
          });
          return resolve();
        });
      });
    }

    function displayCbChannels(panleId, value) {
      return new Promise(resolve => {
        clearChannelPanel(panleId);
        createAllChannelPanels(value).then(() => {
          return resolve();
        });
      });
    }

    return {
      copy: deepCopy,
      observe: observeDbState,
      unObserve: unObserveDbState,
      getChannels: getChannelsList,
      showCbChannels: displayCbChannels,
      deleteChannel: removeChannelFromDB
    };
  })();
  exports.CellChannelsConfig = CellChannelsConfig;
})(window);
