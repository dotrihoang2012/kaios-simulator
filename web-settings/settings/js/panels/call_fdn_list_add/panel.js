/* global SimCardHelper, FdnContext */

define(['require','modules/settings_panel','modules/fdn/fdn_context'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  require('modules/fdn/fdn_context');

  return function createFixedDialingNumbersPanel() {
    let serviceId = 0;
    let iccManager = null;
    let elements = null;
    let currentContact = null;
    let submitAble = false;
    let listElements = null;
    let actionMode = 'add';

    function focusOnIputItem(item) {
      const input = item.target.querySelector('input');
      if (input) {
        input.focus();
      }
    }

    function isPhoneNumberValid(number) {
      if (number) {
        let tempNumber = number;
        // eslint-disable-next-line
        tempNumber = tempNumber.replace(/[,|.| |#|*]/g, '');
        const re = '^[+]*[0-9]+$';
        const regExp = new RegExp(re, 'u');
        if (regExp.test(tempNumber)) {
          return true;
        }
      }
      return false;
    }

    function updateFdnStatus(cardIndex, contact) {
      const state = iccManager.pin2CardState;
      switch (state) {
        case 'ready':
        case 'pinRequired':
          Settings.setCurrentPanel('sim_dialog', {
            action: 'get_pin2',
            backPanel: '#call_fdn_list',
            fdnContact: contact,
            cardIndex
          });
          break;
        case 'pukRequired':
          Settings.setCurrentPanel('sim_dialog', {
            action: 'unlock_puk2',
            backPanel: '#call_fdn_list',
            cardIndex
          });
          break;
        case 'permanentBlocked':
          Settings.setCurrentPanel('#call_fdn_list', {
            serviceId
          });
          break;
        default:
          break;
      }
    }

    function updateContact(action, name, number) {
      const contact = FdnContext.createAction(action, {
        cardIndex: serviceId,
        contact: {
          id: currentContact && currentContact.id,
          name,
          number
        }
      });

      updateFdnStatus(serviceId, contact);
    }

    function checkContactInputs() {
      if (
        elements.fdnNameInput.value === '' ||
        elements.fdnNumberInput.value === '' ||
        !isPhoneNumberValid(elements.fdnNumberInput.value)
      ) {
        submitAble = false;
      } else {
        submitAble = true;
      }
      initSoftKey(submitAble);
    }

    function initSoftKey(saveSoftkeyEnable) {
      let params = {};
      const pickParams = {
        name: 'pick',
        data: {
          type: 'webcontacts/tel'
        }
      };
      if (saveSoftkeyEnable) {
        params = {
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
                Settings.setCurrentPanel('#call_fdn_list', {
                  serviceId
                });
              }
            },
            {
              name: 'Save',
              l10nId: 'save',
              priority: 2,
              method() {
                updateContact(
                  'add',
                  elements.fdnNameInput.value,
                  elements.fdnNumberInput.value
                );
              }
            },
            {
              name: 'Contact',
              l10nId: 'fdnContact',
              priority: 3,
              method() {
                ActivityHelper.start(pickParams).then(result => {
                  const name = `${result.name}`;
                  const number = `${result.tel[0].value}`;
                  elements.fdnNameInput.value = name.substr(0, 14);
                  elements.fdnNumberInput.value = number.substr(0, 20);
                  checkContactInputs();
                });
              }
            }
          ]
        };
      } else {
        params = {
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
                Settings.setCurrentPanel('#call_fdn_list', {
                  serviceId
                });
              }
            },
            {
              name: 'Contact',
              l10nId: 'fdnContact',
              priority: 3,
              method() {
                ActivityHelper.start(pickParams).then(result => {
                  const name = `${result.name}`;
                  const number = `${result.tel[0].value}`;
                  elements.fdnNameInput.value = name.substr(0, 14);
                  elements.fdnNumberInput.value = number.substr(0, 20);
                  checkContactInputs();
                });
              }
            }
          ]
        };
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        listElements = panel.querySelectorAll('li');
        elements = {
          fdnNameInput: panel.querySelector('.fdnContact-name'),
          fdnNameItem: panel.querySelector('.fdn-name-item'),
          fdnNumberInput: panel.querySelector('.fdnContact-number'),
          fdnNumberItem: panel.querySelector('.fdn-number-item'),
          fdnContactTitle: panel.querySelector('.fdnContact-title')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        iccManager = SimCardHelper.getIccInfo(serviceId);
        if (!options.visibilityChange) {
          currentContact = options.contact;
          actionMode = options.mode || actionMode;
          elements.fdnNameInput.value = options.name || '';
          elements.fdnNumberInput.value = options.number || '';
          if (actionMode === 'add') {
            elements.fdnContactTitle.setAttribute(
              'data-l10n-id',
              'fdnAction-add'
            );
          } else {
            elements.fdnContactTitle.setAttribute(
              'data-l10n-id',
              'fdnAction-edit-header'
            );
          }
        }

        elements.fdnNameInput.addEventListener('input', checkContactInputs);
        elements.fdnNumberInput.addEventListener('input', checkContactInputs);
        ListFocusHelper.addEventListener(listElements, focusOnIputItem);
        checkContactInputs();
      },

      onShow(panel) {
        const input = panel.querySelector('li.focus input');
        if (input) {
          input.focus();
        }
      },

      onBeforeHide() {
        elements.fdnNameInput.removeEventListener('input', checkContactInputs);
        elements.fdnNumberInput.removeEventListener(
          'input',
          checkContactInputs
        );
        ListFocusHelper.removeEventListener(listElements, focusOnIputItem);
      }
    });
  };
});
