'use strict';

/* global KeypadHelper, LazyLoader, Service, SettingsObserver,
          hardwareButtons, lib_procmanager, attentionWindowManager */

const baseUrl = window.AppOrigin.getOrigin('keyboard');
const manifestUrl = window.AppOrigin.getManifestURL('keyboard');
const VOICEINPUT_FTU_COUNT = 7;
const VOICEINPUT_FTU_DURATION = 1000 * 60 * 60 * 24; // 24 hours
const IGNORED_INPUT_TYPES = [
  'select', 'date', 'time', 'datetime', 'datetime-local'
];
const DELAY_TIME = 100;

window.KeyboardManager = {
  _onDebug: false,
  _debug: function km_debug(msg) {
    if (this._onDebug) {
      console.log('[Keyboard Manager] ' + msg);
    }
  },

  name: 'KeyboardManager',

  get _appFrame() {
    return this.keyboard.querySelector('web-view');
  },

  init: function km_init() {
    // To handle keyboard layout switching
    window.addEventListener('inputmethod-contextchange', this);
    window.addEventListener('screenchange', this);
    window.addEventListener('hierarchytopmostwindowchanged', this);

    window.Service.registerState('isActivated', this);
    window.Service.register('kill', this);

    navigator.b2g.setDispatchKeyToContentFirst(true);
    this.keyboard = document.getElementById('keyboard-app');
    this.isActivated = false;
    // Default process ID.
    this.processid = -1;

    SettingsObserver.getValue('voiceInput-ftu-count').then((count) => {
      this.voiceInputFTUCount = count ? parseInt(count) : 0;
    });
    SettingsObserver.getValue('voiceInput-ftu-displayed-time').then((time) => {
      this.voiceInputFTUDisplayedTime = parseInt(time);
    });

    // get enabled keyboard from Settings
    const sharedAppOrigin = window.AppOrigin.getOrigin('shared');
    LazyLoader.load([
      `${sharedAppOrigin}/js/helper/keypad/keypad_helper.js`
    ], () => {
      this.keypadHelper = new KeypadHelper();
      this.keypadHelper.start();
      this.keypadHelper.getActiveLayout().then((layout) => {
        this._setActiveLayout(layout);
        this._launchKeyboard();
      });
      this.keypadHelper.setActiveModeChangedCallback(
        this._publishModeChanged.bind(this)
      );
      this.keypadHelper.setLayoutsChangedCallback(
        this._handleLayoutsChanged.bind(this)
      );
      this.keypadHelper.setActiveLayoutChangedCallback(
        this._handleLayoutChanged.bind(this)
      );
    });
  },

  _launchKeyboard: function() {
    this._unregisterKbEvents();
    this._clearDOMElements();

    const webView = document.createElement('web-view');

    webView.setAttribute('remote', true);
    webView.setAttribute('transparent', true);
    webView.setAttribute('ignoreuserfocus', true);
    webView.setAttribute('src', `${baseUrl}/index.html`);
    webView.setAttribute('mozapp', manifestUrl);

    this.keyboard.appendChild(webView);

    this._registerKbEvents();
    // Since we run the keyboard out of process, request
    // the creation of a new pre-allocated process.
    window.dispatchEvent(new CustomEvent('launch-preallocated-process'));
  },

  _registerKbEvents: function() {
    // (BUG 109000)
    //  Help Gecko get proper info to avoid creating redundant instance
    // [HEADS-UP]
    //  1. All the web-views must have `openWindowInfo` property.
    //  2. The property CAN'T be undefined!
    this._appFrame.openWindowInfo = null;

    this._appFrame.addEventListener('error', this);
    this._appFrame.addEventListener('processready', this);
    this._appFrame.addEventListener('metachange', this);
  },

  _unregisterKbEvents: function km_unregisterKbEvents() {
    if (this._appFrame) {
      this._appFrame.removeEventListener('error', this);
      this._appFrame.removeEventListener('processready', this);
      this._appFrame.removeEventListener('metachange', this);
    }
  },

  _setActiveLayout: function(activeLayout) {
    this.activeLayout = activeLayout;
  },

  _handleLayoutsChanged: function(layouts) {
    let newLanguages = [];
    for (let key in layouts) {
      if (layouts[key]) {
        newLanguages.push(key);
      }
    }

    if (this.activeLayout &&
        newLanguages.indexOf(this.activeLayout) === -1) {
      this.keypadHelper.setActiveLayout(newLanguages[0]);
    }
  },

  _handleLayoutChanged: function(layout) {
    const languages = this.keypadHelper.DISPLAY_LANGUAGES[layout];
    this.activeLayout = layout;
    this._showToaster({ text: languages });
  },

  _publish: function(type, detail) {
    const eventInitDict = {
      bubbles: true,
      cancelable: true,
      detail: detail
    };
    // We dispatch the events at the body level so we are able to intercept
    // them and prevent page resizing where desired.
    const evt = new CustomEvent(type, eventInitDict);
    document.body.dispatchEvent(evt);
  },

  _publishModeChanged: function(value) {
    if (!this.isActivated) {
      return;
    }
    // After IMEConnect has the api to query the prediction library
    // We should use it to decide to show T9 or R9.
    const idMap = {
      'abc': 'ime-lowercase',
      'ABC': 'ime-uppercase',
      '123': 'ime-number',
      'Abc': 'ime-capitalize',
      'T9': 'ime-predictive'
    };
    const displayName = this.keypadHelper.DISPLAY_LANGUAGES[this.activeLayout];
    const iconText =
      this.keypadHelper.LANGUAGES_ICON_TEXT[this.activeLayout];

    this._publish('keyboard-mode-changed', {
      mode: value.mode,
      iconText: iconText,
      activeLayout: this.activeLayout
    });

    // Only show toaster when the mode changed is invoked by users.
    if (value.byUser) {
      const ariaLabel = window.api.l10n.get(idMap[value.mode]);
      if (iconText && value.mode === 'abc') {
        this._showToaster({ text: displayName });
      } else if (value.mode === 'T9') {
        if (this.activeLayout.indexOf('chinese') > -1 ||
            this.activeLayout === 'korean') {
          this._showToaster({
            text: displayName,
            ariaLabel: ariaLabel
          });
        } else {
          this._showToaster({
            text: ariaLabel,
            ariaLabel: ariaLabel
          });
        }
      } else {
        this._showToaster({
          text: value.mode,
          ariaLabel: ariaLabel
        });
      }
    }
  },

  _showToaster: function(option) {
    Service.request('SystemToaster:show', {
      text: option.text,
      ariaLabel: option.ariaLabel,
      onceFlag: 'IME',
      timeout: 1500
    });
  },

  _inputFocusChange: function km_inputFocusChange(evt) {
    if (this.delayingFlag) {
      window.clearTimeout(this.delayingFlag);
    }
    const inputType = String(evt.detail.inputType ||
      evt.detail.type).toLowerCase();
    if (inputType && IGNORED_INPUT_TYPES.includes(inputType)) {
      navigator.b2g.setDispatchKeyToContentFirst(false);
      this._deactivateKeyboard();
    } else {
      if (!evt.detail.isFocus) {
        this.delayingFlag = setTimeout(() => {
          navigator.b2g.setDispatchKeyToContentFirst(true);
          this._deactivateKeyboard();
        }, DELAY_TIME);
      } else if (evt.detail.inputMode === 'native') {
        this._deactivateKeyboard();
      } else {
        if (this.keyboardKilled) {
          this._launchKeyboard();
          this.keyboardKilled = false;
        }
        this._activateKeyboard(evt.detail.voiceInputSupported);
      }
      this._sendInputChangeEvent(evt.detail);
    }
  },

  _updateInputInfo: function(empty) {
    let info = {
      isFromApp: true,
      defaultSoftkeyBar: false,
      timestamp: Date.now(),
      appName: '',
      empty
    }
    const topWindow = Service.query('getTopMostWindow');
    const isSearchBar = Service.query('BrowserSearchView.isActive');
    if (topWindow) {
      info.isFromApp =
        !!topWindow.manifest ||
        // editable element owned by system UI
        document.activeElement.tagName.toLowerCase() !== 'browser';
      info.defaultSoftkeyBar =
        !!topWindow.manifest?.b2g_features?.ime_default_softkey_bar;
      info.appName = topWindow.manifest?.name ||
        (!info.isFromApp || isSearchBar ? 'Internet' : 'System');
    }
    return info;
  },

  _sendInputChangeEvent: function(inputContext) {
    if (this.keyboardKilled) {
      return;
    }
    // Add input context info to keyboard app's hash,
    // keyboard app gets these info through hashchange event
    if (inputContext.isFocus) {
      const ignoreInfo = ['activeEditable', 'choices', 'value',
        'selectionStart', 'selectionEnd', 'max', 'min', 'type'];
      const empty = !inputContext['value']?.length;
      const info = this._updateInputInfo(empty);
      for (let i in info) {
        inputContext[i] = info[i];
      }
      for (let i in inputContext) {
        if (ignoreInfo.indexOf(i) > -1) {
          delete inputContext[i];
        }
      }
    }

    const hash = JSON.stringify(inputContext);
    this._appFrame.src = baseUrl + '/index.html#' + encodeURIComponent(hash);
  },

  _showVoiceInputFTU: function(voiceInput) {
    if (!voiceInput ||
        !Service.query('isVIInstalled')) {
      return;
    }

    // Only show FTU for certain times.
    if (this.voiceInputFTUCount < VOICEINPUT_FTU_COUNT) {
      // Assume we never show it before so diff is the duration.
      let diff = VOICEINPUT_FTU_DURATION;
      // Last displayed time could be NaN if we never show it before.
      if (isNaN(this.voiceInputFTUDisplayedTime)) {
        this.voiceInputFTUDisplayedTime = Date.now();
      } else {
        diff = (Date.now() - this.voiceInputFTUDisplayedTime);
      }

      if (diff < VOICEINPUT_FTU_DURATION) {
        return;
      }

      this.voiceInputFTUCount++;
      SettingsObserver.setValue([{
        name: 'voiceInput-ftu-count',
        value: this.voiceInputFTUCount
      }]);
      this.voiceInputFTUDisplayedTime = Date.now();
      SettingsObserver.setValue([{
        name: 'voiceInput-ftu-displayed-time',
        value: this.voiceInputFTUDisplayedTime
      }]);
      Service.request('DialogService:show', {
        type: 'alert',
        style: 'ime-ftu',
        content: 'ime-voice-input-messsage'
      });
    }
  },

  _activateKeyboard: function(voiceInput) {
    this._setProcessConfig('foreground');
    this.isActivated = true;
    this.keyboard.style.opacity = '1';
    this._publish('keyboard-activated');
    this._showVoiceInputFTU(voiceInput);
    this._appFrame.activateKeyForwarding();
    hardwareButtons.resetState();
  },

  _deactivateKeyboard: function() {
    if (this.isActivated) {
      this._setProcessConfig('background');
      this.isActivated = false;
      this.keyboard.style.opacity = '0';
      this._publish('keyboard-deactivated');
      this._appFrame.deactivateKeyForwarding();
    }
  },

  _setProcessConfig: function(reason) {
    let groupType;

    switch (reason) {
      case 'ready':
      case 'background':
        groupType = lib_procmanager?.GroupType.TRY_TO_KEEP;
        break;
      case 'foreground':
        groupType = lib_procmanager?.GroupType.FOREGROUND;
        break;
      default:
        groupType = -1;
        // TODO: other cases?
    }

    window.dispatchEvent(new CustomEvent('enqueue-procmanager-command', {
      detail: (
        'kill' === reason
          ? {
            type: 'remove-priority',
            pid: this.processid,
          }
          : {
            type: 'set-priority',
            pid: this.processid,
            groupType,
          }
      )
    }));
  },

  _clearDOMElements: function km_clearDOMElements() {
    if (this.keyboard) {
      while (this.keyboard.lastChild) {
        const targetElem = this.keyboard.lastChild;
        targetElem.parentNode.removeChild(targetElem);
      }
    }
  },

  updateDispatchKeyPriority(bScreenOn) {
    const app = attentionWindowManager.getActiveWindow();
    if (app &&
      app.manifestUrl === window.AppOrigin.getManifestURL('clock')) {
      navigator.b2g.setDispatchKeyToContentFirst(true);
    } else {
      navigator.b2g.setDispatchKeyToContentFirst(bScreenOn);
    }
  },

  handleEvent: function km_handleEvent(evt) {
    switch (evt.type) {
      case 'inputmethod-contextchange':
        this._inputFocusChange(evt);
        break;
      case 'processready':
        this.processid = evt.detail.processid;
        this._setProcessConfig(this.isActivated ? 'foreground' : 'ready');
        break;
      case 'error':
        if (evt.detail.type === 'fatal') {
          this.kill();
        }
        break;
      case 'metachange':
        if (evt.detail.name === 'og:kaios:kb-action' &&
            evt.detail.content) {
          const data = JSON.parse(evt.detail.content);
          if (data.action === 'screenshot') {
            window.dispatchEvent(new CustomEvent(data.action));
          } else if (data.action === 'keypadBacklightOn') {
            Service.request('turnKeypadBacklightOn');
          }
        }
        break;
      case 'hierarchytopmostwindowchanged':
        this.updateDispatchKeyPriority(Service.query('screenEnabled'));
        break;
      case 'screenchange': {
          const bScreenOn = evt.detail.screenEnabled;
          this.updateDispatchKeyPriority(bScreenOn);
          if (this.isActivated) {
            if (bScreenOn) {
              this._appFrame.activateKeyForwarding();
            } else {
              this._appFrame.deactivateKeyForwarding();
            }
          }
        }
        break;
    }
  },

  kill: function() {
    this._setProcessConfig('kill');
    this._deactivateKeyboard();
    this.keyboardKilled = true;
    this._unregisterKbEvents();
    this._clearDOMElements();
  }
};
