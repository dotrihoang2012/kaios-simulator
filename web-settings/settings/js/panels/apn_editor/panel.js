/**
 * The apn editor panel
 */

define(['require','modules/settings_panel','panels/apn_editor/apn_editor','modules/apn/apn_settings_manager'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const ApnEditor = require('panels/apn_editor/apn_editor');
  const ApnSettingsManager = require('modules/apn/apn_settings_manager');

  return function apnEditorPanel() {
    let leftApp = false;
    let apnItem = null;
    let apnType = null;
    let id = null;
    let apnEditor = null;
    let editType = null;
    let rootElement = null;
    let editorSession = null;
    let mandatoryItems = {};
    let inputs = null;
    let valueSelectors = [];
    let apnChanged = false;

    function updateSoftKey(enableSaveSoftkey) {
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
              openWarningDialog();
            }
          }
        ]
      };

      if (enableSaveSoftkey) {
        softkeyParams.items.push({
          name: 'Save',
          l10nId: 'save',
          priority: 3,
          method() {
            onApnSave();
          }
        });
      }

      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    function keyDownHandler(evt) {
      if (
        (evt.key === 'Backspace' || evt.key === 'EndCall') &&
        Settings.getCurrentPanel() === '#apn_editor'
      ) {
        evt.preventDefault();
        evt.stopPropagation();
        openWarningDialog();
      }
    }

    function checkMandatoryItems() {
      const name = mandatoryItems.apnName.value;
      const type = mandatoryItems.apnType.value;
      const carrier = mandatoryItems.apnCarrier.value;

      return name !== '' && type !== '' && carrier !== '';
    }

    function back() {
      apnChanged = false;
      Settings.setCurrentPanel('#apn_list', {
        serviceId: id,
        action: editType
      });
    }

    const showApnChangeWarningDialog = () => {
      return new Promise(resolve => {
        const dialogConfig = {
          title: { id: 'confirmation', args: {} },
          body: { id: 'change-apn-warning-message', args: {} },
          desc: { id: 'change-apn-warning-question', args: {} },
          cancel: {
            name: 'Cancel',
            l10nId: 'cancel',
            priority: 1,
            callback() {
              resolve(false);
            }
          },
          confirm: {
            name: 'Ok',
            l10nId: 'ok',
            priority: 3,
            callback() {
              resolve(true);
            }
          }
        };
        DialogHelper.show(dialogConfig);
      });
    };

    function onApnSave() {
      if (!editorSession) {
        back();
        return;
      }

      /*
       * Display the warning only when Data roaming is turned on and it is
       * the current APN in use that’s being edited.
       */
      Promise.all([
        ApnSettingsManager.getActiveApnId(id, apnType),
        new Promise(resolve => {
          SettingsDBCache.getSetting('ril.data.roaming_enabled').then(value => {
            resolve(value);
          });
        })
      ])
        .then(results => {
          const [activeApnId, dataRoamingEnabled] = results;
          if (activeApnId === apnItem.id && dataRoamingEnabled) {
            return showApnChangeWarningDialog();
          }
          return true;
        })
        .then(result => {
          if (result) {
            editorSession.commit().then(() => {
              back();
              ToastHelper.showToast('changessaved');
            });
            editorSession = null;
          }
        });
    }

    function openWarningDialog() {
      if (!apnChanged) {
        back();
        return;
      }

      const dialogConfig = {
        title: { id: 'confirmation', args: {} },
        body: { id: 'apn-editor-warning-body', args: {} },
        desc: { id: 'apn-editor-warning-desc', args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1
        },
        confirm: {
          name: 'Discard',
          l10nId: 'discard',
          priority: 3,
          callback() {
            back();
          }
        }
      };

      if (checkMandatoryItems()) {
        dialogConfig.accept = {
          name: 'Save',
          l10nId: 'save',
          priority: 2,
          callback() {
            onApnSave();
          }
        };
      }

      DialogHelper.show(dialogConfig);
    }

    function onItemInput() {
      updateSoftKey(checkMandatoryItems());
    }

    function addTextInputEvent() {
      for (let item in mandatoryItems) { //eslint-disable-line
        mandatoryItems[item].addEventListener('input', onItemInput);
      }
    }

    function removeTextInputEvent() {
      for (let item in mandatoryItems) { //eslint-disable-line
        mandatoryItems[item].removeEventListener('input', onItemInput);
      }
    }

    function setCursorToEnd(el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      if (el.setSelectionRange) {
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }

    function onItemFocus(item) {
      const input = item.target.querySelector('input');
      if (input) {
        input.focus();
      }
      if ('INPUT' === document.activeElement.tagName) {
        setCursorToEnd(document.activeElement);
      }
    }

    function addInputFocusEvent() {
      const liElements = rootElement.querySelectorAll('li');
      for (let i = 0; i < liElements.length; i++) {
        liElements[i].addEventListener('focus', onItemFocus);
      }
    }

    function removeInputFocusEvent() {
      const liElements = rootElement.querySelectorAll('li');
      for (let i = 0; i < liElements.length; i++) {
        liElements[i].removeEventListener('focus', onItemFocus);
      }
    }

    function initUI(options) {
      /*
       * If this flag has been set, which means that users have been left
       * the app before so we should keep the original state instead of
       * refreshing it.
       */
      if (leftApp) {
        leftApp = false;
        return;
      }

      const mode = options.mode || 'new';
      apnItem = options.item || {};
      apnType = options.type || 'default';
      id = options.serviceId;

      const enableSaveSoftkey = mode === 'edit';
      updateSoftKey(enableSaveSoftkey);

      switch (mode) {
        case 'new': {
          const defaultApnItem = {
            apn: {
              types: [apnType]
            }
          };
          editType = 'new';
          editorSession = apnEditor.createApn(id, defaultApnItem);
          break;
        }
        case 'edit':
          editType = 'edit';
          editorSession = apnEditor.editApn(id, apnItem);
          break;
        default:
          break;
      }
    }

    function ApnChange() {
      apnChanged = true;
    }

    function ObserveDMProtocol(protocol) {
      let hidden = true;
      const protocolLi = rootElement.querySelector('li .apn-protocol-select')
        .parentNode;
      const roamingProtocolLi = rootElement.querySelector(
        'li .apn-roaming-protocol'
      ).parentNode;
      if (!protocol) {
        // Is undefined/null/''
        hidden = false;
      }
      if (protocolLi.classList.contains('hidden') !== hidden) {
        protocolLi.classList.toggle('hidden', hidden);
        roamingProtocolLi.classList.toggle('hidden', hidden);
        window.dispatchEvent(new CustomEvent('refresh'));
      }
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        rootElement = panel;
        mandatoryItems = {
          apnType: rootElement.querySelector('input.types'),
          apnCarrier: rootElement.querySelector('input.carrier'),
          apnName: rootElement.querySelector('input.apn')
        };
        apnEditor = new ApnEditor(rootElement);
        inputs = document.querySelectorAll('#apn_editor input');
        valueSelectors = document.querySelectorAll('#apn_editor select');
      },

      onBeforeShow: function onBeforeShow(panel, options) {
        initUI(options);
        addInputFocusEvent();
        window.addEventListener('keydown', keyDownHandler, true);
        SettingsDBCache.observe(
          'dm.apnSettings.protocol',
          '',
          ObserveDMProtocol
        );
        for (let i = 0; i < inputs.length; i++) {
          inputs[i].addEventListener('input', ApnChange);
        }
        for (let i = 0; i < valueSelectors.length; i++) {
          valueSelectors[i].addEventListener('change', ApnChange);
        }
      },

      onBeforeHide: function onBeforeHide() {
        removeInputFocusEvent();
        window.removeEventListener('keydown', keyDownHandler, true);
        SettingsDBCache.unobserve('dm.apnSettings.protocol', ObserveDMProtocol);
        for (let i = 0; i < inputs.length; i++) {
          inputs[i].removeEventListener('input', ApnChange);
        }
        for (let i = 0; i < valueSelectors.length; i++) {
          valueSelectors[i].removeEventListener('change', ApnChange);
        }
      },

      onShow: function onShow() {
        addTextInputEvent();
      },

      onHide: function onHide() {
        removeTextInputEvent();
        leftApp = document.hidden;
        if (!leftApp && editorSession) {
          editorSession.cancel();
        }
      }
    });
  };
});
