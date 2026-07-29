/* global CellBroadcastUtilsHelper */

(function cellChannelDetail(exports) {
  /** GSM or CDMA map table **/
  const NETWORK_TYPE_GSM = 'gsm';
  const NETWORK_TYPE_CDMA = 'cdma';
  const NETWORK_TYPE_UNKNOWN = 'unknown';
  const CB_CHANNEL_TYPE_CUSTOM = 'custom';
  const CB_CHANNEL_TYPE_PRESET = 'preset';
  const CBS_PRESET_KEY = 'ril.cellbroadcast.preset.channelslist';
  const CBS_CUSTOM_KEY = 'ril.cellbroadcast.custom.channelslist';
  const curPanleId = '#cell_channels_config';

  const CellChannelDetail = (function CellChannelDetail() {
    // Compare both object
    function isSameValue(origin, target) {
      if (typeof target === 'object') {
        if (typeof origin !== 'object') {
          return false;
        }

        for (let key of Object.keys(target)) { // eslint-disable-line
          if (!isSameValue(origin[key], target[key])) {
            return false;
          }
        }
        return true;
      }
      return origin === target;
    }

    function updateCbChanelsSet(type, channels, lset) {
      const { oChannel } = channels;
      const { nChannel } = channels;
      DebugHelper.debug(
        `updateCbChanelsSet::oChannel -> ${JSON.stringify(oChannel)}`
      );
      DebugHelper.debug(
        `updateCbChanelsSet::nChannel -> ${JSON.stringify(nChannel)}`
      );
      let updateSet = false;
      const isCustomCb = oChannel.channelType === CB_CHANNEL_TYPE_CUSTOM;
      const isSameCb =
        !isSameValue(oChannel, nChannel) &&
        oChannel.channelId === nChannel.channelId &&
        oChannel.channelType === nChannel.channelType;
      const include = includeExistedChannelInDB(oChannel, nChannel, lset);
      const allowUpdate =
        (isCustomCb && !include) || (type === 'edit' && include && isSameCb);

      DebugHelper.debug(`updateCbChanelsSet::allowUpdate -> ${allowUpdate}`);
      DebugHelper.debug(
        `updateCbChanelsSet::lset before -> ${JSON.stringify(lset)}`
      );
      const cIndex = Array.prototype.findIndex.call(lset, els =>
        isSameValue(els, oChannel)
      );
      const vIndex = Array.prototype.findIndex.call(lset, els =>
        isSameValue(els, nChannel)
      );

      DebugHelper.debug(
        `updateCbChanelsSet::cIndex -> ${cIndex}, vIndex -> ${vIndex}`
      );
      if (cIndex !== -1 && allowUpdate) {
        updateSet = true;
        if (vIndex === -1) {
          lset.splice(cIndex, 1, nChannel);
        } else {
          lset.splice(cIndex, 1);
        }
      }
      DebugHelper.debug(
        `updateCbChanelsSet::lset after-> ${JSON.stringify(lset)}`
      );
      return updateSet;
    }

    function includeExistedChannelInDB(oChannel, nChannel, set) {
      const include = Array.prototype.some.call(set, channel => {
        if (nChannel.channelId && nChannel.channelId.indexOf('-') > 0) {
          const limitRange = nChannel.channelId.split('-');
          const minBound = parseInt(limitRange[0], 10);
          const maxBound = parseInt(limitRange[1], 10);

          if (channel.channelId.indexOf('-') > 0) {
            const olimitRange = channel.channelId.split('-');
            const ominBound = parseInt(olimitRange[0], 10);
            const omaxBound = parseInt(olimitRange[1], 10);

            /* For Example: 3-6, 1-8 */
            const filter1 =
              minBound <= ominBound &&
              maxBound >= omaxBound &&
              nChannel.channelId !== `${ominBound}-${omaxBound}`;

            /* For Example: 3-6, 1-5 */
            const filter2 =
              minBound <= ominBound &&
              maxBound >= ominBound &&
              maxBound <= omaxBound &&
              nChannel.channelId !== `${minBound}-${omaxBound}`;

            /* For Example: 3-6, 5-8 */
            const filter3 =
              minBound >= ominBound &&
              minBound <= omaxBound &&
              maxBound >= omaxBound &&
              nChannel.channelId !== `${ominBound}-${maxBound}`;

            /* For Example: 3-6, 4-5/3-6 */
            const filter4 = ominBound <= minBound && omaxBound >= maxBound;
            return filter1 || filter2 || filter3 || filter4;
          }

          /* For Example: 5, 3-6 */
          const oChannelId = parseInt(channel.channelId, 10);
          return oChannelId >= minBound && oChannelId <= maxBound;
        }
        if (channel.channelId.indexOf('-') > 0) {
          const olimitRange = channel.channelId.split('-');
          const ominBound = parseInt(olimitRange[0], 10);
          const omaxBound = parseInt(olimitRange[1], 10);

          const nChannelId = parseInt(nChannel.channelId, 10);

          /* For Example: 3-6, 5 */
          return nChannelId >= ominBound && nChannelId <= omaxBound;
        }

        /* For Example: 5, 5 */
        return nChannel.channelId === channel.channelId;
      });
      return include;
    }

    function isUpdateCbChannelsDB(key, type, channels) {
      const { nChannel } = channels;
      const oldChannel = channels.oChannel;
      return new Promise(resolve => {
        CellBroadcastUtilsHelper.getSettingsDbData().then(sResult => {
          DebugHelper.debug(
            `isUpdateCbChannelsDB::sResult -> ${JSON.stringify(sResult)}`
          );
          if (!Array.isArray(sResult.allChannels)) {
            return;
          }

          let isContainCb = false;
          let isUpdateCbDb = false;
          let aset = [].concat(sResult.allChannels);
          const cset = [].concat(sResult.custom);
          const pset = [].concat(sResult.preset);
          const iterations = Array.prototype.filter.call(aset, channel => {
            if (type === 'edit') {
              return (
                nChannel.simSlot === channel.simSlot &&
                !isSameValue(oldChannel, channel)
              );
            }
            return nChannel.simSlot === channel.simSlot;
          });
          DebugHelper.debug(`iterations=${JSON.stringify(iterations)}`);

          if (nChannel.channelId && nChannel.channelId.indexOf('-') > 0) {
            Array.prototype.forEach.call(iterations, channel => {
              const limitRange = nChannel.channelId.split('-');
              const minBound = parseInt(limitRange[0], 10);
              const maxBound = parseInt(limitRange[1], 10);
              const filter = channel.channelId !== nChannel.channelId;

              DebugHelper.debug(
                `isUpdateCbChannelsDB::[nChannel, channel] 1 -> [ ${nChannel.channelId}, ${channel.channelId} ]`
              );

              if (channel.channelId.indexOf('-') > 0) {
                const olimitRange = channel.channelId.split('-');
                const ominBound = parseInt(olimitRange[0], 10);
                const omaxBound = parseInt(olimitRange[1], 10);

                /* For Example: 3-6, 1-8 */
                const filter1 =
                  minBound <= ominBound &&
                  maxBound >= omaxBound &&
                  nChannel.channelId !== `${ominBound}-${omaxBound}`;

                /* For Example: 3-6, 1-5 */
                const filter2 =
                  minBound <= ominBound &&
                  maxBound >= ominBound &&
                  maxBound <= omaxBound &&
                  nChannel.channelId !== `${minBound}-${omaxBound}`;

                /* For Example: 3-6, 5-8 */
                const filter3 =
                  minBound >= ominBound &&
                  minBound <= omaxBound &&
                  maxBound >= omaxBound &&
                  nChannel.channelId !== `${ominBound}-${maxBound}`;

                /* For Example: 3-6, 4-5/3-6 */
                const filter4 = ominBound <= minBound && omaxBound >= maxBound;
                const isSameCb =
                  (!isSameValue(channel, nChannel) &&
                    channel.channelId === nChannel.channelId) ||
                  isSameValue(channel, nChannel);

                DebugHelper.debug(
                  `isUpdateCbChannelsDB::filter -> [ ${filter}, ${filter1}, ${filter2}, ${filter3}, ${filter4} ]`
                );

                if (filter1 || filter2 || filter3 || filter4) {
                  if (
                    'add' === type ||
                    ('edit' === type &&
                      isSameCb &&
                      !isSameValue(oldChannel, nChannel))
                  ) {
                    isContainCb = true;
                  } else {
                    const change = updateCbChanelsSet(
                      type,
                      { oChannel: channel, nChannel },
                      iterations
                    );
                    if (filter) {
                      isUpdateCbDb = true;
                    }
                    DebugHelper.debug(
                      `isUpdateCbChannelsDB::change -> ${change}`
                    );
                    isContainCb = !change;
                  }
                }
              } else {
                const oldChannelId = parseInt(channel.channelId, 10);

                /* For Example: 3, 1-5 */
                if (oldChannelId >= minBound && oldChannelId <= maxBound) {
                  const include = includeExistedChannelInDB(
                    channel,
                    nChannel,
                    iterations
                  );
                  DebugHelper.debug(
                    `isUpdateCbChannelsDB::include 1 -> ${include}`
                  );
                  if (include && 'add' === type) {
                    isContainCb = true;
                  } else {
                    const change = updateCbChanelsSet(
                      type,
                      { oChannel: channel, nChannel },
                      iterations
                    );
                    if (filter) {
                      isUpdateCbDb = true;
                    }
                    DebugHelper.debug(
                      `isUpdateCbChannelsDB::change 1 -> ${change}`
                    );
                    isContainCb = !change;
                  }
                }
              }
            });

            aset = pset.concat(cset);
            DebugHelper.debug(
              `isUpdateCbChannelsDB::isContainCb 1 -> ${isContainCb}`
            );
            const returnResult = {
              preset: pset,
              custom: cset,
              channel: isContainCb ? oldChannel : nChannel,
              allChannels: aset,
              allow: !isContainCb,
              update: isUpdateCbDb
            };
            resolve(returnResult);
          } else {
            isContainCb = Array.prototype.some.call(iterations, channel => {
              DebugHelper.debug(
                `isUpdateCbChannelsDB::[nChannel, channel] 2 -> [ ${nChannel.channelId}, ${channel.channelId} ]`
              );
              const filter =
                !isSameValue(nChannel, channel) &&
                channel.channelId === nChannel.channelId;
              DebugHelper.debug(`isUpdateCbChannelsDB::filter 2 -> ${filter}`);
              if (channel.channelId.indexOf('-') > 0) {
                const olimitRange = channel.channelId.split('-');
                const ominBound = parseInt(olimitRange[0], 10);
                const omaxBound = parseInt(olimitRange[1], 10);
                const nlimitBound = parseInt(nChannel.channelId, 10);

                /* For Example: 1-5, 3*/
                if (nlimitBound >= ominBound && nlimitBound <= omaxBound) {
                  // Reject('This channel has exist, must not add/edit it');
                  isContainCb = true;
                  resolve(true);
                } else if (filter) {
                  const change = updateCbChanelsSet(
                    type,
                    { oChannel: channel, nChannel },
                    iterations
                  );
                  isContainCb = !change;
                }
              } else if (
                (isSameValue(channel, nChannel) && 'add' === type) ||
                (filter && 'add' === type) ||
                (isSameValue(channel, nChannel) &&
                  !isSameValue(oldChannel, nChannel) &&
                  'edit' === type) ||
                (filter &&
                  !isSameValue(oldChannel, nChannel) &&
                  'edit' === type)
              ) {
                // Reject('This channel has exist, must not add/edit it');
                resolve(true);
              } else if (filter) {
                const change = updateCbChanelsSet(
                  type,
                  { oChannel: channel, nChannel },
                  iterations
                );
                DebugHelper.debug(
                  `isUpdateCbChannelsDB::change 2 -> ${change}`
                );
                isContainCb = !change;
              }
            });
            aset = pset.concat(cset);
            DebugHelper.debug(
              `isUpdateCbChannelsDB::isContainCb 2 -> ${isContainCb}`
            );
            const returnResult = {
              preset: pset,
              custom: cset,
              channel: isContainCb ? oldChannel : nChannel,
              allChannels: aset,
              allow: !isContainCb,
              update: isUpdateCbDb
            };
            resolve(returnResult);
          }
        });
      });
    }

    function checkGsm() {
      const nType = getNetworkType();
      return nType === NETWORK_TYPE_GSM || nType === NETWORK_TYPE_UNKNOWN;
    }

    function getNetworkType() {
      const serviceId = CellBroadcastUtilsHelper.getCurSimlot();
      const mobileConnection = ApiManager.connections[serviceId];
      const networkType =
        (mobileConnection.voice && mobileConnection.voice.type) ||
        (mobileConnection.data && mobileConnection.data.type);
      DebugHelper.debug(`getNetworkType::networkType -> ${networkType}`);
      const radioAccessTech = Constants.NETWORK_TYPE_MAP[networkType];
      if (radioAccessTech === NETWORK_TYPE_GSM) {
        return NETWORK_TYPE_GSM;
      } else if (radioAccessTech === NETWORK_TYPE_CDMA) {
        return NETWORK_TYPE_CDMA;
      }
      return NETWORK_TYPE_UNKNOWN;
    }

    function repairCbChanel(channel) {
      if (!channel) {
        return null;
      }

      const nType = getNetworkType();
      channel.isGSM =
        nType === NETWORK_TYPE_GSM || nType === NETWORK_TYPE_UNKNOWN;
      const cbChannel = {};
      cbChannel.simSlot = Object.prototype.hasOwnProperty.call(
        channel,
        'simSlot'
      )
        ? channel.simSlot
        : CellBroadcastUtilsHelper.getCurSimlot();
      cbChannel.channelType = Object.prototype.hasOwnProperty.call(
        channel,
        'channelType'
      )
        ? channel.channelType
        : 'custom';
      cbChannel.channelId = Object.prototype.hasOwnProperty.call(
        channel,
        'channelId'
      )
        ? channel.channelId
        : 0;
      cbChannel.channelName = Object.prototype.hasOwnProperty.call(
        channel,
        'channelName'
      )
        ? channel.channelName
        : l10n.get('cb-channel');
      cbChannel.isGSM = Object.prototype.hasOwnProperty.call(channel, 'isGSM')
        ? channel.isGSM
        : true;
      cbChannel.enabled = Object.prototype.hasOwnProperty.call(
        channel,
        'enabled'
      )
        ? channel.enabled
        : true;
      cbChannel.disabled = Object.prototype.hasOwnProperty.call(
        channel,
        'disabled'
      )
        ? channel.disabled
        : false;

      return cbChannel;
    }

    function setChannelsList(key, type, channels) {
      return new Promise(resolve =>
        isUpdateCbChannelsDB(key, type, channels).then(result => {
          const { nChannel } = channels;
          DebugHelper.debug(
            `setChannelsList::result -> ${JSON.stringify(result)}`
          );
          DebugHelper.debug(`setChannelsList::allow -> ${result.allow}`);
          DebugHelper.debug(`setChannelsList::update -> ${result.update}`);
          if (result.allow) {
            const CBS_TYPE =
              key === CBS_PRESET_KEY
                ? CB_CHANNEL_TYPE_PRESET
                : CB_CHANNEL_TYPE_CUSTOM;
            const matchChannelList = result[CBS_TYPE];
            let channelList = [].concat(matchChannelList);
            if (!result.update) {
              channelList.push(nChannel);
            } else if (
              !matchChannelList.length ||
              !matchChannelList.find(channel => channel === result.channel)
            ) {
              channelList = channelList.concat(result.channel);
            }
            const cset = {};
            cset[key] = channelList;
            SettingsDBCache.saveSettings(cset);
            resolve(result);
          } else {
            resolve(result);
          }
        })
      );
    }

    function modifyChannelsList(key, type, channels) {
      return new Promise(resolve =>
        isUpdateCbChannelsDB(key, type, channels).then(result => {
          const { oChannel } = channels;
          const { nChannel } = channels;
          DebugHelper.debug(
            `modifyChannelsList::result -> ${JSON.stringify(result)}`
          );
          DebugHelper.debug(`modifyChannelsList::allow -> ${result.allow}`);
          DebugHelper.debug(`modifyChannelsList::update -> ${result.update}`);
          if (result.allow) {
            const CBS_TYPE =
              key === CBS_PRESET_KEY
                ? CB_CHANNEL_TYPE_PRESET
                : CB_CHANNEL_TYPE_CUSTOM;
            const matchChannelList = result[CBS_TYPE];
            const channelList = [].concat(matchChannelList);
            if (!result.update) {
              Array.prototype.forEach.call(channelList, (curChannel, index) => {
                if (curChannel.channelId === oChannel.channelId) {
                  channelList.splice(index, 1, nChannel);
                }
              });
            }

            DebugHelper.debug(
              `modifyChannelsList::channelList -> ${JSON.stringify(
                channelList
              )}`
            );
            const cset = {};
            cset[key] = channelList;
            SettingsDBCache.saveSettings(cset);
            resolve(result);
          } else {
            resolve(result);
          }
        })
      );
    }

    /**
     * {
     *   "simSlot":0,
     *   "channelType":"custom",
     *   "channelId":"60",
     *   "channelName":"CB channel",
     *   "isGSM":true,
     *   "enabled":true,
     *   "disabled": false
     * }
     */
    function addChannelToCbList(type, oChannel, nChannel) {
      const oChannelCB = repairCbChanel(oChannel);
      const nChannelCB = repairCbChanel(nChannel);
      DebugHelper.debug(
        `addChannelToCbList::oChannelCB -> ${JSON.stringify(oChannelCB)}`
      );
      DebugHelper.debug(
        `addChannelToCbList::nChannelCB -> ${JSON.stringify(nChannelCB)}`
      );
      const CBS_KEY =
        nChannelCB.channelType === CB_CHANNEL_TYPE_CUSTOM
          ? CBS_CUSTOM_KEY
          : CBS_PRESET_KEY;
      DebugHelper.debug(`addChannelToCbList::CBS_KEY -> ${CBS_KEY}`);
      return setChannelsList(CBS_KEY, type, {
        oChannel: oChannelCB,
        nChannel: nChannelCB
      });
    }

    function updateChannelToCbList(type, oChannel, nChannel) {
      DebugHelper.debug(
        `updateChannelToCbList::oChannel -> ${JSON.stringify(oChannel)}`
      );
      DebugHelper.debug(
        `updateChannelToCbList::nChannel -> ${JSON.stringify(nChannel)}`
      );
      const CBS_KEY =
        oChannel.channelType === CB_CHANNEL_TYPE_CUSTOM
          ? CBS_CUSTOM_KEY
          : CBS_PRESET_KEY;
      DebugHelper.debug(`updateChannelToCbList::CBS_KEY -> ${CBS_KEY}`);
      return modifyChannelsList(CBS_KEY, type, { oChannel, nChannel });
    }

    function editChannlePanel(oChannel, nChannel) {
      const parentNodeItem = document.querySelector(`${curPanleId} ul`);
      const oldChildItem = document.querySelector(
        `${curPanleId} li[data-channel-id="${oChannel.channelId}"]`
      );
      const newChildItem = CellBroadcastUtilsHelper.genChannelTemplate(
        nChannel
      );
      newChildItem.querySelector('input').checked = oChannel.enabled;
      if (parentNodeItem) {
        parentNodeItem.replaceChild(newChildItem, oldChildItem);
      }
    }

    function saveChannelToDB(oChannel, nChannel) {
      return new Promise(resolve => {
        return addChannelToCbList('add', oChannel, nChannel).then(result => {
          DebugHelper.debug(
            `saveChannelToDB allow -> ${result.allow}, update -> ${result.update}`
          );
          if (result.allow) {
            if (result.update) {
              resolve(result);
            } else {
              CellBroadcastUtilsHelper.createChannelPanel(nChannel);
              let aset = [].concat(result.allChannels);
              const nset = [].concat(nChannel);
              aset = aset.concat(nset);
              resolve(aset);
            }
          } else {
            ToastHelper.showToast('add-channel-failure');
            resolve();
          }
        });
      });
    }

    function modifyChannelFromDB(oChannel, nChannel) {
      nChannel = repairCbChanel(nChannel);
      return new Promise(resolve => {
        updateChannelToCbList('edit', oChannel, nChannel).then(result => {
          if (result.allow) {
            if (result.update) {
              ToastHelper.showToast('changessaved');
              resolve(result);
            } else {
              editChannlePanel(oChannel, nChannel);
              const aset = [].concat(result.allChannels);

              Array.prototype.forEach.call(aset, (channel, index) => {
                if (isSameValue(channel, oChannel)) {
                  aset.splice(index, 1, nChannel);
                }
              });
              ToastHelper.showToast('changessaved');
              resolve(aset);
            }
          } else {
            ToastHelper.showToast('edit-channel-failure');
            resolve();
          }
        });
      });
    }

    return {
      checkGsm,
      saveChannel: saveChannelToDB,
      editChannel: modifyChannelFromDB
    };
  })();
  exports.CellChannelDetail = CellChannelDetail;
})(window);
