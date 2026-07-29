/* global IccHelper */

define('panels/date_time/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createDateTimePanel() {
    const kClockAutoEnabled = 'time.clock.automatic-update.enabled';
    const kClockAutoAvailable = 'time.clock.automatic-update.available';
    const kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';
    const kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';
    const kTimezone = 'time.timezone';
    const MCC_SETTINGS_KEY = 'operatorvariant.mcc';
    const MNC_SETTINGS_KEY = 'operatorvariant.mnc';
    let clockAutoEnabled = false;
    let clockAutoAvailable = false;
    let timezoneAutoAvailable = false;
    let timezone = '';
    let displayDate = '';
    let displayTime = '';

    let updateDateTimeout = null;
    let updateTimeTimeout = null;

    let currentTimeZoneCity = null;
    let currentCountryCode = null;
    let tzList = null;

    const DEFAULT_COUNTRY = 'US';
    const TZ_DEFAULT = 'Europe/London';
    const TIMEZONE_FILE = `${Constants.SHARD_ORIGIN}/resources/tz.json`;
    const APN_TZ_FILE = `${Constants.SHARD_ORIGIN}/resources/apn_tz.json`;
    const MCC_FILE = `${Constants.SHARD_ORIGIN}/resources/mcc.json`;

    const TIMEZONE_DST_KEY = 'time.timezone.dst';
    const listElements = document.querySelectorAll('#date_time li');
    let elements = null;

    const timeZoneChange = function timeZoneChange(value) {
      if (clockAutoEnabled && clockAutoAvailable && timezoneAutoAvailable) {
        getDefaultTimezoneID(updateTimeZoneInfoAuto);
      } else if (value) {
        currentTimeZoneCity = value;
        updateTimezoneCity(currentTimeZoneCity);
        if (tzList) {
          updateTimezoneOffset(tzList, currentTimeZoneCity);
        } else {
          loadJSON(TIMEZONE_FILE, response => {
            tzList = response;
            updateTimezoneOffset(tzList, currentTimeZoneCity);
          });
        }
      } else {
        getDefaultTimezoneID(updateTimeZoneInfo);
      }
    };

    // Update date/clock periodically
    const updateDate = () => {
      elements.dateDesc.textContent = displayDate;
    };

    const updateTime = () => {
      elements.timeDesc.textContent = displayTime;
    };

    const handleSettingsChange = (value, name) => {
      switch (name) {
        case kClockAutoEnabled: {
          clockAutoEnabled = value;
          updateUI();
          const cSet = {};
          cSet[kTimezoneAutoEnabled] = value;
          SettingsDBCache.saveSettings(cSet);
          break;
        }
        case kClockAutoAvailable:
          clockAutoAvailable = value;
          updateUI();
          break;
        case timezoneAutoAvailable:
          timezoneAutoAvailable = value;
          updateUI();
          break;
        case kTimezone:
          timezone = value;
          timeZoneChange(value);
          break;
        default:
          break;
      }
    };

    const handleTimeChange = function handleTimeChange() {
      autoUpdateDate();
      autoUpdateTime();
    };

    const handleClick = function handleClick(evt) {
      evt.stopPropagation();
      const { target } = evt;
      if (target.hasAttribute('aria-disabled')) {
        return;
      }
      switch (target.id) {
        case 'time-item':
          elements.timeInput.value = formatTime(new Date(), true);
          elements.timeInput.focus();
          break;
        case 'date-item':
          elements.dateInput.value = formatDate(new Date(), true);
          elements.dateInput.focus();
          break;
        case 'timezone-item': {
          const config = {};
          config.list = tzList;
          config.defaultCity = currentTimeZoneCity;
          Settings.setCurrentPanel('#timezone_picker', config);
          break;
        }
        default:
          break;
      }
    };

    const handleChange = function handleChange(evt) {
      evt.stopPropagation();
      const { target } = evt;
      const { value } = target;
      switch (target.id) {
        case 'time-input':
          setTime('time', value);
          break;
        case 'date-input':
          setTime('date', value);
          break;
        default:
          break;
      }
    };

    function setTime(type, value) {
      const d = new Date();
      switch (type) {
        case 'date': {
          // Get value from date picker.
          const date = value.split('-');
          const year = parseInt(date[0], 10);
          const month = parseInt(date[1], 10) - 1;
          const day = parseInt(date[2], 10);
          d.setFullYear(year, month, day);
          ApiManager.time.set(d);
          break;
        }
        case 'time': {
          // Get value from time picker.
          const time = value.split(':');
          d.setHours(time[0], time[1]);
          ApiManager.time.set(d);
          break;
        }
        default:
          break;
      }
    }

    function formatDate(d) {
      if (d instanceof Date) {
        const f = d.toLocaleDateString(navigator.language, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return f;
      }
      return d;
    }

    function formatTime(d) {
      if (d instanceof Date) {
        const f = d.toLocaleTimeString(navigator.language, {
          hour: 'numeric',
          minute: 'numeric',
          hour12: window.api.hour12
        });
        return f;
      }
      if (d.indexOf(':') === 1) {
        // Format: 8:05 --> 08:05
        d = `0${d}`;
      }
      return d;
    }

    function loadJSON(href, callback) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', href, true);
      xhr.responseType = 'json';
      xhr.onerror = callback;
      xhr.onload = () => {
        callback(xhr.response);
      };
      xhr.onerror = () => {
        DebugHelper.debug('Error getting file');
        callback(xhr.response);
      };
      xhr.send();
    }

    function updateTimeZoneInfo(defaultTimezone) {
      currentTimeZoneCity = defaultTimezone;
      loadJSON(TIMEZONE_FILE, function loadTZ(response) {
        tzList = response;
        if (!checkCityInList(tzList, currentTimeZoneCity)) {
          currentTimeZoneCity = TZ_DEFAULT;
        }
        updateTimezoneCity(currentTimeZoneCity);
        updateTimezoneOffset(tzList, currentTimeZoneCity);
        setTimezone(currentTimeZoneCity);
      });
    }

    function updateTimeZoneInfoAuto(defaultTimezone) {
      /*
       * Simply guess timeZoneCity by using MCC code. And this is a very rough
       * result.
       */
      currentTimeZoneCity = defaultTimezone;
      loadJSON(TIMEZONE_FILE, function loadTZ(response) {
        tzList = response;
        SettingsDBCache.getSettings([kTimezone, TIMEZONE_DST_KEY], result => {
          const timeZone = result[kTimezone] || TZ_DEFAULT;
          const dst = result[TIMEZONE_DST_KEY] || 0;
          if (!checkCityInList(tzList, timeZone)) {
            const defaultOffset = timeZone.substring(3, timeZone.length);
            for (let i = 0; i < tzList.length; i++) {
              const offsets = tzList[i].offset.split(',');
              if (
                currentCountryCode === tzList[i].cc &&
                offsets[dst === 0 ? 0 : 1] === defaultOffset
              ) {
                DebugHelper.debug(
                  `found city : ${tzList[i].city} with dst : ${dst}`
                );
                currentTimeZoneCity = tzList[i].city;
                updateTimezoneCity(currentTimeZoneCity);
                updateTimezoneOffset(tzList, currentTimeZoneCity);
                setTimezone(currentTimeZoneCity);
                break;
              }
            }
          } else {
            currentTimeZoneCity = timeZone;
            updateTimezoneCity(currentTimeZoneCity);
            updateTimezoneOffset(tzList, currentTimeZoneCity);
          }
        });
      });
    }

    function setTimezone(selected) {
      const cSet = {};
      cSet[kTimezone] = selected;
      SettingsDBCache.saveSettings(cSet);
    }

    function checkCityInList(list, city) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].city === city) {
          return true;
        }
      }
      return false;
    }

    function updateTimezoneCity(city) {
      const key = city.replace(/.*?\//, '');
      elements.timezoneCity.setAttribute('data-l10n-id', key);
    }

    function autoUpdateDate() {
      const d = new Date();
      displayDate = formatDate(d);
      updateDate();

      const remainMillisecond =
        (24 - d.getHours()) * 3600 * 1000 -
        d.getMinutes() * 60 * 1000 -
        d.getMilliseconds();
      window.clearTimeout(updateDateTimeout);
      updateDateTimeout = window.setTimeout(() => {
        autoUpdateDate();
      }, remainMillisecond);
    }

    function autoUpdateTime() {
      const d = new Date();
      displayTime = formatTime(d);
      updateTime();
      const remainMillisecond = (60 - d.getSeconds()) * 1000;
      clearTimeout(updateTimeTimeout);
      updateTimeTimeout = setTimeout(() => {
        autoUpdateTime();
      }, remainMillisecond);
    }

    function updateTimezoneOffset(list, city) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].city === city) {
          const { offset } = list[i];
          /*
           * We don't use UTC DST offset to display, but only UTC offset is
           * correct enough.
           */
          elements.timezoneOffset.textContent = `UTC${offset.substring(
            0,
            offset.indexOf(',')
          )}`;
          break;
        }
      }
    }

    function getCountryCode(mcc) {
      return new Promise(resolve => {
        loadJSON(MCC_FILE, response => {
          let cc = DEFAULT_COUNTRY;
          if (response && response[mcc]) {
            cc = response[mcc].code.toUpperCase();
          }
          resolve(cc);
        });
      });
    }

    function getTimezoneCity(mcc, mnc) {
      return new Promise(resolve => {
        loadJSON(APN_TZ_FILE, response => {
          if (response) {
            const tz = response[mcc];
            if (typeof tz === 'string') {
              resolve(tz);
              return;
            } else if (tz && mnc in tz) {
              resolve(tz[mnc]);
              return;
            }
          }
          resolve(TZ_DEFAULT);
        });
      });
    }

    /**
     * Guess the current timezone from the MCC/MNC tuple
     */
    function getDefaultTimezoneID(callback) {
      if (!callback) {
        return;
      }
      /* eslint-disable prefer-destructuring */
      /*
       * Retrieve MCC/MNC: use the current network codes when available,
       * default to the SIM codes if necessary.
       */
      let mcc = null;
      let mnc = null;

      const { connections } = ApiManager;

      for (let i = 0; i < connections.length; ++i) {
        const conn = connections[i];
        if (conn && conn.voice && conn.voice.network && conn.voice.connected) {
          // We have connection available, so we use it
          mcc = conn.voice.network.mcc;
          mnc = conn.voice.network.mnc;
          break;
        }
      }

      if (!mcc && IccHelper && IccHelper.iccInfo) {
        // We don't have connection available, we rely on the SIM
        mcc = IccHelper.iccInfo.mcc;
        mnc = IccHelper.iccInfo.mnc;
        /*
         * If SIM is not available, mcc and mnc are null,
         * so we wait for a future event where we have access to the SIM.
         */
        if (IccHelper.cardState !== 'ready') {
          IccHelper.addEventListener('iccinfochange', function simReady() {
            if (IccHelper.iccInfo.mcc) {
              IccHelper.removeEventListener('iccinfochange', simReady);
            }
            getDefaultTimezoneID(callback);
          });
        }
        callback(TZ_DEFAULT);
        return;
      }
      /* eslint-enable prefer-destructuring */
      if (!mcc) {
        callback(TZ_DEFAULT);
        return;
      }

      getCountryCode(mcc)
        .then(cc => (currentCountryCode = cc))
        /*
         * Get setting dst here to make sure we don't have surprise
         * during on DST transition day.
         */
        .then(() => getTimezoneCity(mcc, mnc))
        .then(tzCity => callback(tzCity));
    }

    function initSoftKey() {
      const softkeyParams = {
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
              DebugHelper.debug('SettingsSoftkey select');
            }
          }
        ]
      };

      if (
        ActivityHandler.currentActivity &&
        ActivityHandler.activitySource.data.caller === 'ftu'
      ) {
        softkeyParams.items.push({
          name: 'Next',
          l10nId: 'next',
          priority: 3,
          method() {
            ActivityHandler.postResult();
          }
        });
      }

      SettingsSoftkey.init(softkeyParams);
    }

    function updateSoftKey() {
      const item = elements.currentPanel.querySelector('.focus');
      if (!item) {
        return;
      }
      if (elements.currentPanel.dataset.ftu) {
        const params = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: []
        };
        if (!item.classList.contains('none-select')) {
          params.items.push({
            name: 'Select',
            l10nId: 'select',
            priority: 2,
            method() {
              DebugHelper.debug('SettingsSoftkey select');
            }
          });
        }
        params.items.push({
          name: 'Next',
          l10nId: 'next',
          priority: 3,
          method() {
            ActivityHandler.postResult();
          }
        });
        SettingsSoftkey.init(params);
        SettingsSoftkey.show();
      } else if (item && item.classList.contains('none-select')) {
        SettingsSoftkey.hide();
      } else {
        SettingsSoftkey.show();
      }
    }

    function updateUI() {
      elements.timeAutoSwitch.classList.toggle('hidden', !clockAutoAvailable);
      const autoTimeMode = clockAutoEnabled && clockAutoAvailable;

      if (!autoTimeMode) {
        elements.dateItem.removeAttribute('aria-disabled');
        elements.timeItem.removeAttribute('aria-disabled');
        elements.dateItem.classList.remove('none-select');
        elements.timeItem.classList.remove('none-select');
      } else {
        elements.dateItem.setAttribute('aria-disabled', true);
        elements.timeItem.setAttribute('aria-disabled', true);
        elements.dateItem.classList.add('none-select');
        elements.timeItem.classList.add('none-select');
      }

      if (autoTimeMode && timezoneAutoAvailable) {
        elements.timezoneItem.setAttribute('aria-disabled', 'true');
        elements.timezoneItem.classList.add('none-select');
      } else {
        elements.timezoneItem.removeAttribute('aria-disabled');
        elements.timezoneItem.classList.remove('none-select');
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function getDefaults() {
      SettingsDBCache.getSettings(
        [
          kClockAutoEnabled,
          kClockAutoAvailable,
          kTimezoneAutoAvailable,
          kTimezone
        ],
        results => {
          clockAutoEnabled = results[kClockAutoEnabled];
          clockAutoAvailable = results[kClockAutoAvailable];
          timezoneAutoAvailable = results[kTimezoneAutoAvailable];
          timezone = results[kTimezone];
          if (!results[kTimezone]) {
            timezone = TZ_DEFAULT;
            currentTimeZoneCity = timezone;
            setTimezone(currentTimeZoneCity);
          } else if (timezone.startsWith('UTC')) {
            SettingsDBCache.getSettings(
              [MCC_SETTINGS_KEY, MNC_SETTINGS_KEY],
              result => {
                getTimezoneCity(
                  result[MCC_SETTINGS_KEY][0],
                  result[MNC_SETTINGS_KEY][0]
                ).then(tzCity => {
                  currentTimeZoneCity = tzCity;
                  setTimezone(tzCity);
                });
              }
            );
          }
          updateUI();
          updateTimezoneCity(timezone);
          timeZoneChange(timezone);
          autoUpdateDate();
          autoUpdateTime();
        }
      );
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          currentPanel: panel,
          timeAutoSwitch: panel.querySelector('.time-auto'),
          dateTimeHeader: panel.querySelector('#date-time-header'),
          dateTimeRegion: panel.querySelector('#date-time-region'),
          dateItem: panel.querySelector('#date-item'),
          dateInput: panel.querySelector('#date-item input'),
          dateDesc: panel.querySelector('#date-item small'),
          timeItem: panel.querySelector('#time-item'),
          timeInput: panel.querySelector('#time-item input'),
          timeDesc: panel.querySelector('#time-item small'),
          timeZoneHeader: panel.querySelector('#timezone-header'),
          timezoneItem: panel.querySelector('#timezone-item'),
          timezoneCity: panel.querySelector('#timezone-item span'),
          timezoneOffset: panel.querySelector('#timezone-item small')
        };
        ApiManager.time.addEventListener('timeChange', handleTimeChange);
        window.addEventListener('timeformatchange', autoUpdateTime);
        SettingsDBCache.observe(kTimezone, '', handleSettingsChange, true);
        SettingsDBCache.observe(
          kClockAutoEnabled,
          '',
          handleSettingsChange,
          true
        );
        SettingsDBCache.observe(
          kClockAutoAvailable,
          '',
          handleSettingsChange,
          true
        );
        SettingsDBCache.observe(
          kTimezoneAutoAvailable,
          '',
          handleSettingsChange,
          true
        );
      },

      onBeforeShow() {
        getDefaults();

        elements.timezoneItem.addEventListener('click', handleClick);
        elements.dateItem.addEventListener('click', handleClick);
        elements.dateInput.addEventListener('change', handleChange);
        elements.timeItem.addEventListener('click', handleClick);
        elements.timeInput.addEventListener('change', handleChange);

        ListFocusHelper.addEventListener(listElements, updateSoftKey);
        initSoftKey();
        updateSoftKey();
      },

      onBeforeHide() {
        elements.timezoneItem.removeEventListener('click', handleClick);
        elements.dateItem.removeEventListener('click', handleClick);
        elements.dateInput.removeEventListener('change', handleChange);
        elements.timeItem.removeEventListener('click', handleClick);
        elements.timeInput.removeEventListener('change', handleChange);
        ListFocusHelper.removeEventListener(listElements, updateSoftKey);
      },

      onUninit() {
        ApiManager.time.removeEventListener('timeChange', handleTimeChange);
        window.removeEventListener('timeformatchange', autoUpdateTime);
        SettingsDBCache.unobserve(kTimezone, handleSettingsChange);
        SettingsDBCache.unobserve(kClockAutoEnabled, handleSettingsChange);
        SettingsDBCache.unobserve(kClockAutoAvailable, handleSettingsChange);
        SettingsDBCache.unobserve(kTimezoneAutoAvailable, handleSettingsChange);
      }
    });
  };
});

