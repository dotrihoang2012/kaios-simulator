/**
 * The apn list panel
 */


define(['require','modules/mvvm/list_view','modules/settings_panel','modules/apn/apn_settings_manager','panels/apn_list/apn_template_factory'],function(require) { //eslint-disable-line
  const ListView = require('modules/mvvm/list_view');
  const SettingsPanel = require('modules/settings_panel');
  const ApnSettingsManager = require('modules/apn/apn_settings_manager');
  const ApnTemplateFactory = require('panels/apn_list/apn_template_factory');

  return function createApnSettingsPanel() {
    let focusId = 0;
    const itemsOBJ = {};
    let serviceIdNum = 0;
    let apnType = 'default';
    let rootElement = null;
    let mainHeader = null;
    let header = null;
    let apnListViewRoot = null;
    let apnListView = null;
    let role = null;
    let listElements = [];
    const HEADER_L10N_MAP = {
      default: 'dataSettings-header',
      mms: 'messageSettings-header',
      ims: 'imsSettings-header2',
      supl: 'suplSettings-header',
      dun: 'dunSettings-header'
    };

    const returnTop = () => {
      Settings.setCurrentPanel('#apn_settings');
    };

    const onApnItemEdit = focusItem => {
      Settings.setCurrentPanel('#apn_editor', {
        mode: 'edit',
        serviceId: serviceIdNum,
        type: apnType,
        item: focusItem
      });
    };

    const onApnItemDefaultSet = (serviceId, type, radio, focusItem) => {
      const setActive = () => {
        focusItem.active = true;
        radio.checked = true;
        ApnSettingsManager.setActiveApnId(serviceId, type, focusItem.id);
        ToastHelper.showToast('changessaved');
      };

      SettingsDBCache.getSetting('ril.data.roaming_enabled').then(value => {
        if (value === true) {
          // Only display the warning when roaming is enabled.
          setActive();
        } else {
          /*
           * XXX: We need to make this to the next tick to the UI gets updated
           * because we've prevented the default behavior in the handler.
           */
          setTimeout(() => {
            setActive();
          });
        }
      });
    };

    /**
     * Get the focused li element's index
     *
     */
    function getFocusPos(Element) {
      if (!Element) return -1;
      const liList = Element.querySelectorAll('li');
      for (let i = 0; i < liList.length; i++) {
        if (
          liList[i].classList.contains('focus') ||
          liList[i].classList.contains('focus1')
        ) {
          focusId = i;
          return focusId;
        }
      }
      return -1;
    }

    const onApnAddAction = (serviceId, type, root) => {
      focusId = getFocusPos(root);
      Settings.setCurrentPanel('#apn_editor', {
        mode: 'new',
        serviceId,
        type
      });
    };

    const onBackBtnClick = () => {
      if (role === 'activity') {
        role = null;
        Settings.finishActivityRequest();
      } else {
        Settings.setCurrentPanel('#apn_settings');
      }
    };

    function registerSoftkey() {
      const softkeyAdd = {
        name: 'Add Apn',
        l10nId: 'add-apn',
        priority: 1,
        method: () => {
          onApnAddAction(serviceIdNum, apnType, rootElement);
        }
      };
      const softkeySelect = {
        name: 'Select',
        l10nId: 'select',
        priority: 2,
        method: () => {
          if (!rootElement.querySelector('.focus label')) {
            return;
          }
          const dataItemId = rootElement.querySelector('.focus label').dataset
            .id;
          const radioElement = rootElement.querySelector('.focus input');
          onApnItemDefaultSet(
            serviceIdNum,
            apnType,
            radioElement,
            itemsOBJ[dataItemId]
          );
          SettingsSoftkey.hide();
          returnTop();
        }
      };
      const softkeyOption = [
        {
          name: 'Edit',
          l10nId: 'edit',
          priority: 7,
          method: () => {
            focusId = getFocusPos(rootElement);
            const dataItemId = rootElement.querySelector('.focus label').dataset
              .id;
            onApnItemEdit(itemsOBJ[dataItemId]);
          }
        },
        {
          name: 'Delete',
          l10nId: 'delete-apn',
          priority: 8,
          method: () => {
            const dataItemId = rootElement.querySelector('.focus label').dataset
              .id;
            const focusItem = itemsOBJ[dataItemId];
            const dialogConfig = {
              title: { id: 'confirmation', args: {} },
              body: {
                id: 'delete-apn-confirm',
                args: {
                  apnName: focusItem.apn.carrier
                }
              },
              cancel: {
                l10nId: 'cancel',
                priority: 1
              },
              confirm: {
                l10nId: 'delete-apn',
                priority: 3,
                callback: () => {
                  if (focusItem.apn.deletedCpApn === false) {
                    focusItem.apn.deletedCpApn = true;
                    ApnSettingsManager.updateApn(
                      serviceIdNum,
                      focusItem.id,
                      focusItem.apn
                    )
                      .then(() => {
                        onApnDelete(rootElement, focusItem.apn.carrier);
                      })
                      .then(() => {
                        updateUI();
                      });
                  } else {
                    ApnSettingsManager.removeApn(serviceIdNum, focusItem.id)
                      .then(() => {
                        onApnDelete(rootElement, focusItem.apn.carrier);
                      })
                      .then(() => {
                        updateUI();
                      });
                  }
                }
              }
            };
            DialogHelper.show(dialogConfig);
          }
        }
      ];

      const softkeyParams = {
        header: { l10nId: 'options' },
        items: []
      };
      let focusLabel = rootElement.querySelector('.focus label');
      if (!focusLabel) {
        focusLabel = rootElement.querySelector('li label');
      }
      softkeyParams.items.push(softkeyAdd);

      if (focusLabel) {
        softkeyParams.items.push(softkeySelect);
        const dataItemId = focusLabel.dataset.id;
        const focusItem = itemsOBJ[dataItemId];
        if (
          focusItem.itemCategory !== 'preset' ||
          focusItem.itemApn.carrier !== 'Jio 4G'
        ) {
          // eslint-disable-next-line
          softkeyParams.items.push.apply(softkeyParams.items, softkeyOption);
        }
      }
      SettingsSoftkey.init(softkeyParams);
    }

    function updateSoftkey() {
      registerSoftkey();
      SettingsSoftkey.show();
    }

    function updateUI() {
      ApnSettingsManager.queryApns(serviceIdNum, apnType).then(apnItems => {
        let find = false;
        Object.keys(apnItems).forEach(key => {
          if (apnItems[key].active) {
            const activeApnItem = rootElement.querySelector(
              `[data-id="${apnItems[key].id}"]`
            );
            if (activeApnItem) {
              activeApnItem.querySelector('input').checked = true;
              ListFocusHelper.requestFocus(
                'apn_list',
                activeApnItem.parentNode
              );
              find = true;
            }
          }
        });
        if (!find) {
          window.dispatchEvent(new CustomEvent('refresh'));
        }
      });
    }

    function getElementByType(type, root, id) {
      const liList = root.querySelectorAll('li');
      let i = 0;
      if (type === 'edit') {
        for (; i < liList.length; i++) {
          if (i === id) {
            return liList[i];
          }
        }
      } else {
        for (; i < liList.length; i++) {
          const radio = liList[i].querySelector('input');
          if (radio.checked === true) {
            return liList[i];
          }
        }
      }
      return liList[0];
    }

    /*
     * After we deleted an apn , we should remove it from apn-list
     * and reset focus && navigation map && refresh softkeys
     */
    function onApnDelete(root, apnName) {
      return new Promise(resolve => {
        const focusElement = root.querySelector('li.focus');

        ListFocusHelper.removeEventListener(listElements, updateSoftkey);
        focusElement.parentNode.removeChild(focusElement);
        listElements = document.querySelectorAll('.apn-list li');
        ListFocusHelper.addEventListener(listElements, updateSoftkey);
        updateSoftkey();
        ToastHelper.showToast('apn-deleted', {
          apnName
        });
        resolve();
      });
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        rootElement = panel;
        mainHeader = rootElement.querySelector('gaia-header');
        header = mainHeader.querySelector('h1');
        apnListViewRoot = rootElement.querySelector('.apn-list');
        mainHeader.addEventListener('action', onBackBtnClick);
      },

      onBeforeShow: function onBeforeShow(panel, options) {
        role = options.role || role;
        if (options.type) {
          focusId = 0;
        }
        /*
         * When back from apn editor, there is no type and serviceId specified
         * so that we use the original type and service id.
         */
        apnType = options.type || apnType;
        serviceIdNum =
          (options.serviceId === typeof options.serviceId) === 'undefined'
            ? serviceIdNum
            : options.serviceId;

        header.setAttribute('data-l10n-id', HEADER_L10N_MAP[apnType]);

        const apnTemplate = ApnTemplateFactory(apnType, null, null, itemsOBJ);

        ApnSettingsManager.queryApns(serviceIdNum, apnType).then(apnItems => {
          updateSoftkey();
          const filterapnItems = apnItems.filter(apnItem => {
            return apnItem.apn.deletedCpApn !== true;
          });
          apnListView = ListView(apnListViewRoot, filterapnItems, apnTemplate);
          const needFocused = getElementByType(
            options.action,
            rootElement,
            focusId
          );
          ListFocusHelper.requestFocus(rootElement, needFocused);
          listElements = document.querySelectorAll('.apn-list li');
          ListFocusHelper.addEventListener(listElements, updateSoftkey);
          updateSoftkey();
        });
      },

      onBeforeHide: function onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements, updateSoftkey);
      },

      onHide: function onHide() {
        if (apnListView) {
          apnListView.destroy();
          apnListView = null;
        }
      }
    });
  };
});
