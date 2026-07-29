
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createSourceCodePanel() {
    let scIframe = null;

    function handleEvent(evt) {
      switch (evt.key) {
        case 'Enter':
        case 'Backspace':
          NavigationMap.navigateBack();
          evt.preventDefault();
          break;
        default:
          break;
      }
    }

    function updateIframe() {
      scIframe.contentDocument.dir = window.document.dir;
      if (scIframe.contentDocument.readyState === 'complete') {
        scIframe.focus();
        scIframe.contentDocument.addEventListener('keydown', handleEvent);
      } else {
        scIframe.contentDocument.addEventListener(
          'readystatechange',
          function readyStateChange() {
            if (document.readyState === 'complete') {
              document.removeEventListener(
                'readystatechange',
                readyStateChange
              );
              scIframe.focus();
              scIframe.contentDocument.addEventListener('keydown', handleEvent);
            }
          }
        );
      }
    }

    return SettingsPanel({
      onInit(panel) {
        scIframe = panel.querySelector('#obtain-sc');
      },

      onBeforeShow() {
        SettingsSoftkey.hide();
        document.addEventListener('focusChanged', updateIframe);
      },

      onBeforeHide() {
        document.removeEventListener('focusChanged', updateIframe);
        scIframe.contentDocument.removeEventListener('keydown', handleEvent);
      }
    });
  };
});
