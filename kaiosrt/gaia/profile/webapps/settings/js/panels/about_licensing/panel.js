
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAboutLicensingPanel() {
    let licensingIframe = null;
    const url = 'https://www.kaiostech.com/legal-terms/';
    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'openUrl',
          l10nId: 'open-url',
          priority: 2,
          method() {
            DebugHelper.debug('SettingsSoftkey open url');
          }
        }
      ]
    };

    function keyDownHandler(evt) {
      switch (evt.key) {
        case 'Enter':
          window.open(url, '', 'dialog');
          evt.preventDefault();
          break;
        case 'Backspace':
          NavigationMap.navigateBack();
          evt.preventDefault();
          break;
        default:
          break;
      }
    }

    function isExistFile(testURL, callback) {
      const xmlHttp = new XMLHttpRequest();

      xmlHttp.onreadystatechange = () => {
        if (xmlHttp.readyState === 4) {
          if (xmlHttp.status === 200) {
            // File at URL exist
            callback(true);
          } else {
            callback(false);
          }
        }
      };

      xmlHttp.open('GET', testURL);
      try {
        xmlHttp.send();
      } catch (e) {
        callback(false);
      }
    }

    function getLicense() {
      SettingsDBCache.getSetting('language.current').then(value => {
        const lang = value;
        const licensePath = `shared/locales/kaios_license/kaios_license.${lang}.html`;
        const defaultLicensePath =
          'shared/locales/kaios_license/kaios_license.en-US.html';

        isExistFile(licensePath, isExist => {
          licensingIframe.src = isExist ? licensePath : defaultLicensePath;
          licensingIframe.onload = () => {
            licensingIframe.contentDocument.body.setAttribute(
              'style',
              'word-wrap : break-word !important'
            );
            licensingIframe.contentDocument.addEventListener(
              'keydown',
              keyDownHandler
            );
            licensingIframe.focus();
          };
        });
      });
    }

    return SettingsPanel({
      onInit(panel) {
        licensingIframe = panel.querySelector('#os-license');
        licensingIframe.contentDocument.dir = window.document.dir;
        getLicense();
      },

      onBeforeShow() {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      },

      onUninit() {
        licensingIframe.contentDocument.removeEventListener(
          'keydown',
          keyDownHandler
        );
      }
    });
  };
});
