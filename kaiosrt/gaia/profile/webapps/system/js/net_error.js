/* global WebActivity */
(function (exports) {
  'use strict';

  let _forbidFlag = false;

  /**
   * Populates all comment nodes
   */
  function populate(domNode) {
    for (let i = 0; i < domNode.childNodes.length; i++) {
      if (domNode.childNodes[i].nodeType == document.COMMENT_NODE) {
        domNode.innerHTML = domNode.childNodes[i].nodeValue;
        break;
      }
    }
  }

  /**
   * Populate element with localized string
   */
  const localizeElement = window.api.l10n.setAttributes;

  /**
   * Parse the neterror information that's sent to us as part of the documentURI
   * and return an error object.
   *
   * The error object will contain the following attributes:
   * e - Type of error (eg. 'netOffline').
   * u - URL that generated the error.
   * c - Character set for default gecko error message (eg. 'UTF-8').
   * d - Default gecko error message.
   */
  let _error;

  function getErrorFromURI() {
    if (_error) {
      return _error;
    }
    _error = {};
    const uri = document.documentURI;

    // Quick check to ensure it's the URI format we're expecting.
    if (!uri.startsWith('about:neterror?')) {
      // A blank error will generate the default error message (no network).
      return _error;
    }

    // Small hack to get the URL object to parse the URI correctly.
    const url = new URL(uri.replace('about:', 'http://'));

    // Set the error attributes.
    ['e', 'u', 'c', 'd'].forEach(
      function (v) {
        _error[v] = url.searchParams.get(v);
      }
    );

    switch (_error.e) {
    case 'connectionFailure':
    case 'netInterrupt':
    case 'netTimeout':
    case 'netReset':
      _error.e = 'connectionFailed';
      break;

    case 'unknownSocketType':
    case 'unknownProtocolFound':
    case 'cspFrameAncestorBlocked':
      _error.e = 'invalidConnection';
      break;
    }

    return _error;
  }

  /*
   * This method reloads the window if the device is online and in the
   * foreground
   */
  function reloadIfOnline() {
    if (navigator.connection && (navigator.connection.type === 'cellular' ||
      navigator.connection.type === 'wifi') && !document.hidden &&
      !document.body.classList.contains('hidden')) {
      document.body.classList.add('hidden');
      NetError.reload(true);
      window.addEventListener('offline', function onOffline() {
        window.removeEventListener('offline', onOffline);
        document.body.classList.remove('hidden');
      });
    }
  }

  function showSettingsView() {
    if (_forbidFlag) {
      return;
    }
    const activity = new WebActivity('configure', {
        target: 'device',
        section: 'connectivity-settings'
    });
    activity.start();
    _forbidFlag = true;
    window.setTimeout(() => {
      _forbidFlag = false;
    }, 1000);
  }

  function keydown_handle(evt) {
    let direction = 1;
    if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
      if (evt.key === 'ArrowUp') {
        direction = -1;
      }
      let bodyElement = document.getElementById('net-error');
      const btns = bodyElement && bodyElement.querySelectorAll('button');
      if (btns && btns.length) {
        let i = 0;
        for (i = 0; i < btns.length; i++) {
          if (btns[i] === document.activeElement) {
            break;
          }
        }
        if (i === btns.length) {
          i = 0;
        } else {
          i += btns.length + direction;
        }
        i = i % btns.length;
        btns[i].focus();
      }
    }
  }

  function addConnectionHandlers() {
    document.addEventListener('visibilitychange', reloadIfOnline);
    navigator.connection.addEventListener('typechange', reloadIfOnline);
    let bodyElement = document.getElementById('net-error');
    if (bodyElement) {
      bodyElement.addEventListener('keydown', keydown_handle);
    }
  }

  const ErrorView = function (error, title, message) {
    this.error = error;
    this.titleText = title || 'unable-to-connect';
    this.messageText = message || this.error.d || 'unknown-error';
    this.node = document.getElementById('net-error-confirm-dialog');
  };

  ErrorView.prototype = {
    applyStyle: function ew_applyStyle() {
      document.body.classList.add(this.error.e);
    },

    addHandlers: function ew_addHandlers() {
      // Subclasses should add the handlers
      document.body.onclick = function bodyClick() {
        NetError.reload(true);
      };
    },

    populateMessages: function ew_populateMessages() {
      localizeElement(this.title, this.titleText);
      localizeElement(this.message, this.messageText);
    },

    init: function ew_init() {
      populate(this.node);
      this.title = document.getElementById('error-title');
      this.message = document.getElementById('error-message');
      this.applyStyle();
      this.populateMessages();
      this.addHandlers();
    }
  };

  // Dns error view
  const DnsErrorErrorView = function (error, title, message) {
    ErrorView.call(this, error, title, message);
  };

  DnsErrorErrorView.prototype = Object.create(ErrorView.prototype);

  DnsErrorErrorView.prototype.populateMessages =
    function noew_populateMessages() {
      localizeElement(this.title, this.titleText);
      localizeElement(this.message, this.messageText, {
        name: '\u2068' + this.error.u + '\u2069'
      });
  };

  // Offline view
  const NetOfflineErrorView = function (error) {
    ErrorView.call(this, error);
    this.node = document.getElementById('net-error-action-menu');
  };

  NetOfflineErrorView.prototype = Object.create(ErrorView.prototype);

  NetOfflineErrorView.prototype.populateMessages =
    function noew_populateMessages() {
      localizeElement(this.title, '');
      localizeElement(this.message, 'network-error-launching-message');
  };

  NetOfflineErrorView.prototype.addHandlers = function noew_addHandlers() {
    addConnectionHandlers();
    document.getElementById('settings-btn').onclick = showSettingsView;
    document.getElementById('failed-logo').classList.add('offline');
  };

  // Confirm views
  const views = {
    netOffline: {
      'view': NetOfflineErrorView,
    },
    dnsNotFound: {
      'view': DnsErrorErrorView,
      'title': 'server-not-found',
      'message': 'server-not-found-error'
    },
    connectionFailed: {
      'view': ErrorView,
      'title': 'connection-failed',
      'message': 'connection-failed-error'
    },
    notCached: {
      'view': ErrorView,
      'title': 'not-cached',
      'message': 'not-cached-error'
    },
    fileNotFound: {
      'view': ErrorView,
      'title': 'file-not-found',
      'message': 'file-not-found-error'
    },
    invalidConnection: {
      'view': ErrorView,
      'title': 'invalid-connection',
      'message': 'invalid-connection-error'
    },
    malformedURI: {
      'view': ErrorView,
      'title': 'malformed-uri',
      'message': 'malformed-uri-error'
    },
    redirectLoop: {
      'view': ErrorView,
      'title': 'redirect-loop',
      'message': 'redirect-loop-error'
    },
    isprinting: {
      'view': ErrorView,
      'title': 'is-printing',
      'message': 'is-printing-error'
    },
    deniedPortAccess: {
      'view': ErrorView,
      'title': 'denied-port-access',
      'message': 'denied-port-access-error'
    },
    proxyResolveFailure: {
      'view': ErrorView,
      'title': 'proxy-resolve-failure',
      'message': 'proxy-resolve-failure-error'
    },
    proxyConnectFailure: {
      'view': ErrorView,
      'title': 'proxy-connect-failure',
      'message': 'proxy-connect-failure-error'
    },
    contentEncodingError: {
      'view': ErrorView,
      'title': 'content-encoding',
      'message': 'content-encoding-error'
    },
    remoteXUL: {
      'view': ErrorView,
      'title': 'remote-xul',
      'message': 'remote-xul-error'
    },
    unsafeContentType: {
      'view': ErrorView,
      'title': 'unsafe-content-type',
      'message': 'unsafe-content-type-error'
    },
    corruptedContentError: {
      'view': ErrorView,
      'title': 'corrupted-content',
      'message': 'corrupted-content-error'
    },
    phishingBlocked: {
      'view': ErrorView,
      'title': 'phishing-blocked',
      'message': 'phishing-blocked-error'
    },
    malwareBlocked: {
      'view': ErrorView,
      'title': 'malware-blocked',
      'message': 'malware-blocked-error'
    },
    byDefault: {
      'view': ErrorView,
    }
  };

  const ErrorViewFactory = {
    create: function nef_create() {
      const error = getErrorFromURI();
      const typedView = views[error.e] || views.byDefault;
      const view = typedView.view;
      return new view(error, typedView.title, typedView.message);
    }
  };

  /**
   * Initialize the page
   */
  function initPage() {
    _error = null;
    console.error('net-error');
    // Display detailed info about the error.
    ErrorViewFactory.create().init();
  }

  window.api.l10n.once(initPage);

  const NetError = {
    init: initPage,

    reload: function reload(forcedReload) {

      // When reloading a page with POSTDATA the user will be prompted to
      // confirm if he wants to resend the data. If the user accepted to resend
      // the data, during the reload function call the onbeforeunload event is
      // fired, otherwise if the event is not triggered then the last url from
      // the history is loaded.
      let isReloading = false;
      window.addEventListener('beforeunload', function onBeforeunload() {
        isReloading = true;
      });

      window.location.reload(forcedReload);

      if (!isReloading) {
        history.back();
      }
    }
  };

  exports.NetError = NetError;
}(this));
