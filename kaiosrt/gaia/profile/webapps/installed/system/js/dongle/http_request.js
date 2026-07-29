/* exported HTTPRequest */
/* global BinaryUtils HTTPServer*/
'use strict';
(function (exports) {

  const CRLF = '\r\n';

  function HTTPRequest(socket) {
    socket.ondata = (event) => {
      var data = event.data;

      parseHeader(this, data);
      if (this.invalid) {
        this.dispatchEvent('error', this);
        socket.close();
        socket.ondata = null;
        return;
      }
      this.complete = true;
      this.dispatchEvent('complete', this);
    };
  }

  HTTPRequest.prototype = new EventTarget();

  HTTPRequest.prototype.constructor = HTTPRequest;

  function parseHeader(request, data) {
    if (!data) {
      request.invalid = true;
      return null;
    }

    data = BinaryUtils.arrayBufferToString(data);
    const requestParts = data.split(CRLF + CRLF);
    const header = requestParts.shift();
    // const body = requestParts.join(CRLF + CRLF);
    const headerLines = header.split(CRLF);
    const requestLine = headerLines.shift().split(' ');
    const method = requestLine[0];
    const uri = requestLine[1];
    const version = requestLine[2];
    if (version !== HTTPServer.HTTP_VERSION) {
      request.invalid = true;
      return null;
    }
    const headers = {};
    headerLines.forEach((headerLine) => {
      const parts = headerLine.split(': ');
      if (parts.length !== 2) {
        return;
      }

      const name = parts[0];
      const value = parts[1];

      headers[name] = value;
    });
    request.method = method;
    request.path = uri;
    request.headers = headers;
    return null;
  }

  exports.HTTPRequest = HTTPRequest;

}(window));
