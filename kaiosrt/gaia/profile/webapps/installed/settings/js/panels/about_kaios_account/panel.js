/* global AccountHelper */

define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAboutKaiosAccountPanel() {
    const URL_TERMS = 'https://www.kaiostech.com/terms-of-service/';
    const URL_PRIVACY = 'https://www.kaiostech.com/privacy-policy/';
    // eslint-disable-next-line
    const regexp = new RegExp('{{([A-Za-z0-9 ]*)}}', 'g');
    let elements = null;
    let url = 'https://www.kaiostech.com/terms-of-service/';

    function initSoftKey(hasSelect) {
      const softkeyParams = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'decline',
            l10nId: 'decline',
            priority: 1,
            method: () => {
              ToastHelper.showToast('agree-account-terms');
              NavigationMap.navigateBack();
            }
          }
        ]
      };
      if (hasSelect) {
        softkeyParams.items.push({
          name: 'select',
          l10nId: 'select',
          priority: 2,
          method: () => {
            window.open(url, '', 'dialog');
          }
        });
      }
      softkeyParams.items.push({
        name: 'accept',
        l10nId: 'accept',
        priority: 3,
        method: () => {
          AccountHelper.showOtherPage().then(
            result => {
              NavigationMap.navigateBack();
              if (result && result.success) {
                ToastHelper.showToast('account-created-success');
              }
            },
            err => {
              DebugHelper.debug(`showOtherPage Failure${err}`);
            }
          );
        }
      });

      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    function replaceText(str, newValueObject) {
      return str.replace(regexp, function getNewValue(matched, key) {
        const trimedKey = key.trim();
        if (!newValueObject[trimedKey]) {
          return matched;
        }
        return newValueObject[trimedKey];
      });
    }

    function setFocus(element) {
      const focused = elements.container.querySelectorAll('.focus');
      if (focused.length > 0) {
        focused[0].classList.remove('focus');
      } else {
        // First show
        initSoftKey(true);
      }
      if (element === elements.focusTerms) {
        url = URL_TERMS;
      }
      if (element === elements.focusPrivacy) {
        url = URL_PRIVACY;
      }

      element.classList.add('focus');
    }

    function removeFocus() {
      const focused = elements.container.querySelectorAll('.focus');
      if (focused.length > 0) {
        focused[0].classList.remove('focus');
      }

      initSoftKey();
    }

    function move(direction) {
      if (direction === 'ArrowDown') {
        elements.container.scrollBy(0, 50);
        if (
          isInView() &&
          !elements.focusPrivacy.classList.contains('focus') &&
          !elements.focusTerms.classList.contains('focus')
        ) {
          setFocus(elements.focusTerms);
        } else if (
          isInView() &&
          elements.focusTerms.classList.contains('focus')
        ) {
          setFocus(elements.focusPrivacy);
        }
      }

      if (direction === 'ArrowUp') {
        if (isInView() && elements.focusTerms.classList.contains('focus')) {
          removeFocus();
          elements.container.scrollBy(0, -50);
        } else if (
          isInView() &&
          !elements.focusTerms.classList.contains('focus')
        ) {
          setFocus(elements.focusTerms);
        } else {
          elements.container.scrollBy(0, -50);
        }
      }
    }

    function isInView() {
      return elements.container.scrollTop === elements.container.scrollTopMax;
    }

    function keyDownHandler(e) {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
          e.stopPropagation();
          e.preventDefault();
          move(e.key);
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          container: panel.querySelector('div'),
          aboutKaiosText3: panel.querySelector('#about-kaios-account-text3')
        };
        elements.aboutKaiosText3.innerHTML = replaceText(
          l10n.get('about-kaios-account-text3-1'),
          {
            terms:
              '<span data-l10n-id="account-about-text-terms" ' +
              'class="text-link focus-terms"></span>',
            privacy:
              '<span data-l10n-id="account-about-text-privacy" ' +
              'class="text-link focus-privacy"></span>'
          }
        );
        elements.focusTerms = panel.querySelector('.focus-terms');
        elements.focusPrivacy = panel.querySelector('.focus-privacy');
      },
      onBeforeShow() {
        elements.container.addEventListener('keydown', keyDownHandler);
        initSoftKey();
      },

      onBeforeHide() {
        elements.container.removeEventListener('keydown', keyDownHandler);
        SettingsSoftkey.hide();
      }
    });
  };
});
