/* exported HTTPResponse */
/* global BinaryUtils HTTPStatus*/

'use strict';
(function (exports) {

  const CRLF = '\r\n';
  const BUFFER_SIZE = 256 * 1024; // 256 KBytes

  function HTTPResponse(socket, timeout) {
    this.socket = socket;
    this.timeout = timeout;

    this.headers = {};
    this.headers['Content-Type'] = 'text/html';
    this.headers['Connection'] = 'close';
    this.headers['Cache-Control'] = 'no-cache';

    if (this.timeout) {
      this.timeoutHandler = setTimeout(() => {
        this.send(null, 500);
      }, this.timeout);
    }
  }

  HTTPResponse.prototype = new EventTarget();

  HTTPResponse.prototype.constructor = HTTPResponse;

  HTTPResponse.prototype.send = function (body, status) {
    return createResponse(body, status, this.headers, (response) => {

      let offset = 0;
      let remaining = response.byteLength;
      const sendNextPart = () => {
        if (this.socket.readyState !== 'open') {
          console.warn('the socket state is: ', this.socket.readyState);
          return
        }
        const length = Math.min(remaining, BUFFER_SIZE);
        const safeToSend = this.socket.send(response, offset, length);
        offset += length;
        remaining -= length;

        if (remaining > 0) {
          if (safeToSend) {
            sendNextPart();
          }
        }
        // close the socket only when the last packet is safe to send with tcpsocket, or it will meet error when ondrain next time
        else if (remaining === 0 && safeToSend) {
          clearTimeout(this.timeoutHandler);
          this.socket.close();
        }
      };

      this.socket.ondrain = sendNextPart;
      this.socket.onerror = (evt) => {
        this.socket.close();
        console.error('socket.onerror: ', evt);
      }

      sendNextPart();
    });
  };

  HTTPResponse.prototype.sendFile = function (file, requestHeaders) {
    if (file instanceof File) {
      BinaryUtils.blobToSlicedArrayBuffer(file, requestHeaders).then(
        (data) => {
          let status = 200
          if (requestHeaders['Range']) {
            status = 206
            this.headers['Content-Range'] = `bytes ${data.start}-${data.end-1}/${file.size}`
          }
          this.send(data.result, status);
        },
        (errorMessage) => {
          console.error(errorMessage);
          this.send(null, 500);
        }
      )
    }
  };

  function createResponseHeader(status, headers) {
    var header = HTTPStatus.getStatusLine(status);

    for (var name in headers) {
      header += name + ': ' + headers[name] + CRLF;
    }

    return header;
  }

  function createResponse(body, status, headers, callback) {
    body = body || '';
    status = status || 200;
    headers = headers || {};
    headers['Content-Length'] = body.byteLength;
    headers['Accept-Ranges'] = 'bytes'

    var response = new Blob([
      createResponseHeader(status, headers),
      CRLF,
      body
    ]);

    return BinaryUtils.blobToArrayBuffer(response, callback);
  }

  exports.HTTPResponse = HTTPResponse;

}(window));
