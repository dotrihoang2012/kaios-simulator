

// eslint-disable-next-line
define(['require','modules/settings_panel','panels/user_dictionary/user_dictionary'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const UserDictionary = require('panels/user_dictionary/user_dictionary');

  return function userDictionaryPanel() {
    let elements = {};
    let cPanel = null;
    let cLang = null;
    const userDictionaryModule = new UserDictionary();

    function updateSoftKey(bEmpty) {
      const params = {
        menuClassName: 'menu-button',
        header: { l10nId: 'message' },
        items: [
          {
            name: 'Add',
            l10nId: 'user-dictionary-add',
            priority: 1,
            method: () => {
              showAddOrEditDialog('add');
            }
          }
        ]
      };
      if (!bEmpty) {
        const nItems = [
          {
            name: 'Edit',
            l10nId: 'user-dictionary-edit',
            priority: 2,
            method: () => {
              showAddOrEditDialog('edit');
            }
          },
          {
            name: 'Remove',
            l10nId: 'user-dictionary-remove',
            priority: 3,
            method: () => {
              showRemoveDialog();
            }
          }
        ];
        // eslint-disable-next-line
        params.items.push.apply(params.items, nItems);
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function showRemoveDialog() {
      const removeElement = document.querySelector(
        '#user_dictionary ul .focus'
      );
      const dialogConfig = {
        title: {
          id: 'user-dictionary-remove',
          args: {}
        },
        body: {
          id: 'user-dictionary-remove-description',
          args: {
            word: removeElement.textContent
          }
        },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1
        },
        confirm: {
          name: 'Remove',
          l10nId: 'user-dictionary-remove',
          priority: 3,
          callback: () => {
            userDictionaryModule.removeUserWord(removeElement).then(bEmpty => {
              if (bEmpty) {
                updateSoftKey(true);
              } else {
                updateFocus();
              }
            });
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function showAddOrEditDialog(action) {
      const titleId =
        action === 'add'
          ? 'user-dictionary-add-title'
          : 'user-dictionary-edit-title';
      let value = '';
      if (action === 'edit') {
        value = document.querySelector('#user_dictionary ul .focus')
          .textContent;
      }
      const dialogConfig = {
        title: {
          id: titleId,
          args: {}
        },
        body: {
          html: `<input type="text" value="${value}" lang="${cLang}"
                        x-inputmode="spell" maxLength="45">`
        },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1
        },
        confirm: {
          name: 'Ok',
          l10nId: 'ok',
          priority: 3,
          callback: word => {
            userDictionaryModule.updateUserWord(action, word).then(data => {
              if (!data.empty) {
                updateSoftKey(false);
                updateFocus(data.index);
              }
            });
          }
        },
        extraClass: 'userDict'
      };
      DialogHelper.show(dialogConfig);
    }

    function updateFocus(index = 0) {
      const state = cPanel.classList.contains('current');
      const list = cPanel.querySelectorAll('li:not(.hidden)');
      if (state && list.length) {
        for (let i = 0; i < list.length; i++) {
          list[i].classList.remove('focus');
          if (i === index) {
            list[i].classList.add('focus');
          }
        }
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    return SettingsPanel({
      onInit: function onInit(panel, options) {
        cPanel = panel;
        cLang = options.Lang;
        elements = {
          list: panel.querySelector('ul'),
          emptyPage: panel.querySelector('.empty-user-dictionary')
        };
        userDictionaryModule.init(elements, options);
      },

      onBeforeShow: function onBeforeShow(panel, options) {
        if (options.visibilityChange) {
          if (NavigationMap.currentActivatedLength > 0 && DialogHelper.dialog) {
            const inputElement = DialogHelper.dialog.querySelector('input');
            if (inputElement) {
              inputElement.focus();
            }
          }
        } else {
          userDictionaryModule.showUserDictionary(options).then(bEmpty => {
            window.dispatchEvent(new CustomEvent('refresh'));
            updateSoftKey(bEmpty);
          });
        }
      }
    });
  };
});
