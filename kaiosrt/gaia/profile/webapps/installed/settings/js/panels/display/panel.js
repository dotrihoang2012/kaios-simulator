/* global WallpaperProcessor ObjectURL */

define('panels/display/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createDisplayPanel() {
    const WALLPAPER_KEY = 'wallpaper.image';
    const DM_WALLPAPER_KEY = 'dm.wallpaper.image';
    const BRIGHTNESS_KEY = 'screen.brightness';
    let brightnessValue = 0.7 * 100;
    let elements = {};
    let listElements = null;

    function setBrightness(value) {
      const settingObject = {};
      settingObject[BRIGHTNESS_KEY] = value === 0 ? 0.1 : value / 100;
      SettingsDBCache.saveSettings(settingObject);
    }

    function handleWallpaperPicker(evt) {
      if (evt.key === 'Enter') {
        evt.stopPropagation();
        evt.preventDefault();
        ActivityHelper.start({
          name: 'pick',
          data: {
            type: ['wallpaper', 'image/*'],
            appname: 'setting'
          }
        }).then(result => {
          if (result.filename.indexOf(Constants.SHARD_ORIGIN) >= 0) {
            SettingsDBCache.saveSettings({
              'wallpaper.image': result.filename
            });
            ToastHelper.changeSaved();
          } else {
            WallpaperProcessor.setWallpaperByBlob(
              result.blob,
              () => {
                ToastHelper.changeSaved();
                DebugHelper.debug('set wallpaper success');
              },
              err => {
                DebugHelper.debug(`Save error${JSON.stringify(err)}`);
              }
            );
          }
        });
      }
    }

    function handleBrightness(evt) {
      const isRtl = window.document.dir === 'rtl';
      const arrowLR = isRtl
        ? ['ArrowRight', 'ArrowLeft']
        : ['ArrowLeft', 'ArrowRight'];

      switch (evt.key) {
        case arrowLR[0]:
          setBrightness(brightnessValue <= 10 ? 10 : brightnessValue - 10);
          evt.stopPropagation();
          evt.preventDefault();
          break;

        case arrowLR[1]:
          setBrightness(brightnessValue >= 100 ? 100 : brightnessValue + 10);
          evt.stopPropagation();
          evt.preventDefault();
          break;
        default:
          break;
      }
    }

    function getBlobUrlForWallpaper(value) {
      return new Promise(resolve => {
        WallpaperProcessor.getFileBlob(value).then(blob => {
          resolve(ObjectURL.createURLByBlob(blob));
        });
      });
    }

    function handleChange(value, key) {
      switch (key) {
        case WALLPAPER_KEY:
          ObjectURL.revokeObjectByURL(elements.wallpaperPreview.src);
          if (value.indexOf(Constants.SHARD_ORIGIN) >= 0) {
            elements.wallpaperPreview.src = value;
          } else {
            getBlobUrlForWallpaper(value).then(url => {
              elements.wallpaperPreview.src = url;
            });
          }
          break;
        case DM_WALLPAPER_KEY:
          elements.wallpaper.classList.toggle('hidden', !!value);
          elements.wallpaperSelect.classList.toggle('hidden', !!value);
          window.dispatchEvent(new CustomEvent('refresh'));
          break;
        default:
          break;
      }
    }

    function setSliderValue(value) {
      elements.brightnessInput.value = value * 100;
      brightnessValue = value * 100;
      if (elements.brightnessInput.style.opacity !== 1) {
        elements.brightnessInput.style.opacity = 1;
      }
      l10n.setAttributes(elements.brightnessLabel, 'display-percent', {
        percent: brightnessValue
      });
      elements.brightnessLabel.setAttribute('aria-live', 'assertive');
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        listElements = panel.querySelectorAll('li');
        elements = {
          brightnessContainer: panel.querySelector('.slider-container'),
          brightnessInput: panel.querySelector('.slider-container input'),
          brightnessLabel: panel.querySelector('.slider-container span.level'),
          wallpaper: panel.querySelector('.wallpaper'),
          wallpaperPreview: panel.querySelector('.wallpaper-preview'),
          wallpaperSelect: panel.querySelector('.wallpaper-select')
        };
      },

      onBeforeShow: function onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        Customization.initUIForItem(['screen-timeout', 'auto-lock']);
        Customization.addListener([
          'screen.timeout.settings.ui',
          'dm.screen.timeout.settings.ui',
          'pocketmode.autolock.settings.ui',
          'dm.pocketmode.autolock.settings.ui'
        ]);

        SettingsDBCache.observe('dm.wallpaper.image', null, handleChange);
        SettingsDBCache.observe('wallpaper.image', null, handleChange);
        elements.wallpaperSelect.addEventListener(
          'keydown',
          handleWallpaperPicker
        );
        SettingsDBCache.observe(BRIGHTNESS_KEY, 0.7, setSliderValue);
        elements.brightnessContainer.addEventListener(
          'keydown',
          handleBrightness
        );
        ListFocusHelper.addEventListener(listElements);
      },

      onShow: function onShow(panel) {
        if (panel.dataset.brightness) {
          ListFocusHelper.requestFocus(panel, elements.brightnessContainer);
        }
        if (
          window.performance.getEntriesByName('settings-display-start', 'mark')
            .length > 0
        ) {
          window.performance.mark('settings-display-end');
          window.performance.measure(
            'performance-settings-display',
            'settings-display-start',
            'settings-display-end'
          );
          window.performance.clearMarks('settings-display-start');
          window.performance.clearMarks('settings-display-end');
          window.performance.clearMeasures('performance-settings-display');
        }
      },

      onBeforeHide: function onBeforeHide() {
        Customization.removeListener([
          'screen.timeout.settings.ui',
          'dm.screen.timeout.settings.ui',
          'pocketmode.autolock.settings.ui',
          'dm.pocketmode.autolock.settings.ui'
        ]);
        SettingsDBCache.unobserve('dm.wallpaper.image', handleChange);
        SettingsDBCache.unobserve('wallpaper.image', handleChange);
        elements.wallpaperSelect.removeEventListener(
          'keydown',
          handleWallpaperPicker
        );
        elements.brightnessContainer.removeEventListener(
          'keydown',
          handleBrightness
        );
        ListFocusHelper.removeEventListener(listElements);
        ObjectURL.revokeObjectByURL(elements.wallpaperPreview.src);
      }
    });
  };
});

