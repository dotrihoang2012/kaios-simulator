// A HTTP server for gaia
/* exported HTTPServer */
/* global SettingsObserver HTTPRequest HTTPResponse */
'use strict';

(function (exports) {
  const DEFAULT_PORT = 611;
  const DEFAULT_TIMEOUT = 30000;

  function HTTPServer(options) {
    options = options || {};
    for (var option in options) {
      this[option] = options[option];
    }

    this.running = false;
  }

  HTTPServer.HTTP_VERSION = 'HTTP/1.1';
  HTTPServer.prototype = new EventTarget();
  HTTPServer.prototype.constructor = HTTPServer;
  HTTPServer.prototype.timeout = DEFAULT_TIMEOUT;
  HTTPServer.prototype.start = function () {
    if (this.running) {
      return;
    }

    var startHttpServer = () => {
      var socket = navigator.mozTCPSocket.listen(this.port, {
        binaryType: 'arraybuffer'
      });

      socket.onconnect = (connectEvent) => {
        var socket = connectEvent.socket || connectEvent;
        var request = new HTTPRequest(socket);
        request.addEventListener('complete', () => {
          var response = new HTTPResponse(socket, this.timeout);
          this.dispatchEvent('request', {
            request: request,
            response: response,
            socket: socket
          });
        });

        request.addEventListener('error', () => {
          console.warn('Invalid request received');
        });
      };

      socket.onerror = () => {
        if (navigator.dongleManager.dongleStatus) {
          console.log('restart the socket server!!');
          this.stop()
          this.start()
        }
      }

      this.socket = socket;
      this.running = true;
    }

    if (this.port) {
      startHttpServer()
      return
    }
    //  TCPServerSocket Note:
    //  Only certified apps can accept incoming connections on a port below 1024.
    SettingsObserver.observe('dongle.http.server.port', DEFAULT_PORT, function (value) {
      this.port = (+value);
      startHttpServer();
    }.bind(this));
  };

  HTTPServer.prototype.stop = function () {
    if (!this.running) {
      return;
    }
    this.socket.close();
    this.running = false;
  };

  exports.HTTPServer = HTTPServer;
}(window));
