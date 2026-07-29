/* global SimCardHelper, FdnContext */

define(['require','modules/settings_panel','modules/fdn/fdn_context'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  require('modules/fdn/fdn_context');

  return function createFixedDialingNumbersListPanel() {
    let serviceId = 0;
    let elements = null;
    let removeEnable = false;
    let currentContact = null;
    let contactArray = [];
    let iccManager = null;

    function updateContact(action, options) {
      /*
       * `action' is either `add', `edit' or `remove': these three actions all
       * rely on the same ApiManager.iccManager.updateContact() method.
       */
      options = options || {};
      const { name } = options;
      const { number } = options;

      setCurrentContact();
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

    function renderFdnContact(id, contact) {
      const li = document.createElement('li');
      const nameContainer = document.createElement('span');
      const numberContainer = document.createElement('small');
      li.id = id;
      nameContainer.dir = 'auto';
      nameContainer.textContent = contact.name;
      numberContainer.dir = 'auto';
      numberContainer.textContent = contact.number;
      li.appendChild(numberContainer);
      li.appendChild(nameContainer);
      return li;
    }

    function renderAuthorizedNumbers() {
      elements.contactsContainer.innerHTML = '';
      contactArray = [];
      return FdnContext.getContacts(serviceId).then(
        contacts => {
          for (let i = 0, l = contacts.length; i < l; i++) {
            const li = renderFdnContact(i, contacts[i]);
            elements.contactsContainer.appendChild(li);
            contactArray[i] = contacts[i];
          }
          if (contacts.length) {
            removeEnable = true;
          } else {
            removeEnable = false;
          }
          initSoftKey();
          window.dispatchEvent(new CustomEvent('refresh'));
        },
        () => {
          const dialogConfig = {
            title: { id: 'fdn-authorizedNumbers-header', args: {} },
            body: { id: 'fdn-authorizedNumbers-open-error', args: {} },
            accept: {
              name: 'Ok',
              l10nId: 'ok',
              priority: 1,
              callback() {
                Settings.setCurrentPanel('#call_fdn_settings', {
                  serviceId
                });
              }
            }
          };
          DialogHelper.show(dialogConfig);
        }
      );
    }

    function setCurrentContact() {
      const li = document.querySelector('#call_fdn_list li.focus');
      if (li) {
        const { id } = document.activeElement;
        currentContact = contactArray[id];
      }
    }

    function initSoftKey() {
      const params = {
        menuClassName: 'menu-button',
        header: { l10nId: 'message' },
        items: [
          {
            name: 'Add',
            l10nId: 'add',
            priority: 1,
            method() {
              setCurrentContact();
              Settings.setCurrentPanel('#call_fdn_list_add', {
                serviceId,
                mode: 'add',
                contact: currentContact
              });
            }
          }
        ]
      };
      if (removeEnable) {
        params.items.push({
          name: 'Remove',
          l10nId: 'fdnRemove',
          priority: 3,
          method() {
            updateContact('remove', {
              name: '',
              number: ''
            });
          }
        });
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        elements = {
          contactsContainer: panel.querySelector('#fdn-contactsContainer')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        iccManager = SimCardHelper.getIccInfo(serviceId);
        if (!options.visibilityChange) {
          renderAuthorizedNumbers();
        }
      }
    });
  };
});
