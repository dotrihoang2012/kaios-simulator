'use strict';

// Utilities for sending data to the FxOS Telemetry Server

(function(exports) {
  const TR = TelemetryRequest;

  // Set to true to enable debugging
  TR.DEBUG = false;

  // Create an XHR for back-end server.
  // Arguments:
  //   data: Arbitrary JSON serializable data that will be recorded by Telemetry
  //   url: URL for the telemetry server
  function TelemetryRequest(data, url) {
    if (!url || url === '') {
      throw new Error('No URL given');
    }

    if (!Object.keys(data).length) {
      throw new Error('Empty data object');
    }

    this.data = data;
    this.url = url;
  }

  function debug(...args) {
    if (TR.DEBUG) {
      args.unshift('[Telemetry]');
      console.log.apply(console, args);
    }
  }

  // Open and send the underlying XMLHttpRequest
  // xhrAttrs: attributes to set on the XHR
  //   - timeout: The timeout for the request
  //   - onload / onerror / onabort / ontimeout: callbacks
  TelemetryRequest.prototype.send = function(xhrAttrs) {
    var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });

    xhr.open('POST', this.url, true);
    debug(this.url);

    if (xhrAttrs && xhrAttrs.timeout) {
      xhr.timeout = xhrAttrs.timeout;
    }

    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.responseType = 'text';

    var data = JSON.stringify(this.data);
    xhr.send(data);
    debug(data);

    if (xhrAttrs) {
      xhr.onload = xhrAttrs.onload;
      xhr.onerror = xhrAttrs.onerror;
      xhr.onabort = xhrAttrs.onabort;
      xhr.ontimeout = xhrAttrs.ontimeout;
    }

    return xhr;
  };

  exports.TelemetryRequest = TelemetryRequest;
}(window));
