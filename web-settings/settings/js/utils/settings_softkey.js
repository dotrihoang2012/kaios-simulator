/* global SoftkeyPanel FORM_ID */


(function SettingsSoftKey(exports) {
  let lastParams = null;
  let softkey = null;
  LazyLoader.load(
    `${Constants.SHARD_ORIGIN}/js/helper/softkey/softkey_panel.js`,
    () => {
      softkey = new SoftkeyPanel({
        menuClassName: 'menu-button',
        items: [
          {
            name: 'create',
            l10nId: '',
            priority: 1,
            method() {
              console.log('SettingsSoftkey created');
            }
          }
        ]
      });
    }
  );

  const SettingsSoftkey = {
    get visible() {
      const softKeyPanel = document.querySelector(`#${FORM_ID}`);
      if (softKeyPanel && softKeyPanel.classList.contains('visible'))
        return true;
      return false;
    },

    init(params) {
      if (
        params &&
        params.items &&
        params.items.length &&
        (params.items[0].l10nId || params.header !== 'empty')
      ) {
        lastParams = params;
      }
      softkey.initSoftKeyPanel(params);
    },

    show() {
      if (
        !SettingsSoftkey.visible &&
        softkey.actions &&
        !softkey.actions[0].l10nId &&
        softkey.header === 'empty' &&
        lastParams
      ) {
        SettingsSoftkey.init(lastParams);
      }
      softkey.show();
    },

    hide() {
      if (SettingsSoftkey.visible) {
        const params = {
          header: 'empty',
          items: [
            {
              name: '',
              l10nId: '',
              priority: 1,
              method: () => {}
            }
          ]
        };
        SettingsSoftkey.init(params);
      }
      /**
       * When the app becomes invisible, we shouldn't make the soft key hide to
       * avoid soft key displayed slower when app becomes visible.
       */
      if (document.hidden) {
        return;
      }
      softkey.hide();
    },

    menuVisible() {
      return softkey.menuVisible;
    },

    getSoftkey() {
      return softkey;
    }
  };

  const SoftParams = {
    get defaultSelect() {
      return {
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
    }
  };
  exports.SettingsSoftkey = SettingsSoftkey;
  exports.SoftParams = SoftParams;
})(window);
