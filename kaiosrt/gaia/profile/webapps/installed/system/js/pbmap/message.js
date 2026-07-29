'use strict';
/* global ContactsManager, DUMP */

(function(exports) {

  function MapMessage() {
     this.msgManager = window.navigator.b2g.mobileMessageManager;
  }

  MapMessage.prototype = {
    messageEventInit: function (adapter) {
      let handler = this.handleEvent.bind(this, adapter);
      this.msgManager.addEventListener('received', handler);
      this.msgManager.addEventListener('deliverysuccess', handler);
      this.msgManager.addEventListener('deliveryerror', handler);
      this.msgManager.addEventListener('retrieving', handler);
      this.msgManager.addEventListener('sent', handler);
      this.msgManager.addEventListener('sending', handler);
      this.msgManager.addEventListener('failed', handler);
      this.msgManager.getMessage(1);
    },

    handleEvent: function (adapter, evt) {
      let evtDetail = {
        detail: {
          type: evt.type,
          message: evt.message
      }};
      let event = new CustomEvent('mapnotifyreq', evtDetail);
      adapter.dispatchEvent(event);
    },

    findContact: async function(value) {
      const options = {
        filterBy: [ContactsManager.FilterByOption.TEL],
        filterValue: value,
        filterOption: ContactsManager.FilterOption.EQUALS,
        onlyMainData: true
      };
      const cursor = await ContactsManager.find(options, 1);
      let contacts = [];

      try {
        let contactsCursor = await cursor.next();
        contacts = contacts.concat(contactsCursor);
      } catch (e) {
        DUMP('Find contact over');
      }
      cursor.release();

      if (contacts.length === 0) {
        return null;
      } else {
        return contacts[0];
      }
    },

    getAllMessages: function (filter) {
      let promise = [];
      let maxCount = filter.maxListCount;
      let startOffset = filter.listStartOffset;
      let count = 0;
      let self = this;
      return new Promise((resolve) => {
        let iterable = this.msgManager.getMessages({}, true).values();

        function circleMap() {
          iterable.next().then((result) => {
            if (!result.done) {
              each(result.value);
              circleMap();
            } else {
              Promise.all(promise).then(messages => {
                resolve(messages);
              });
            }
          });
        }

        function each(message) {
          if (message && count < maxCount + startOffset) {
            if (message.type === filter.type ||
               filter.type === 'no-filtering') {
              if (message.delivery === filter.dir ||
                  filter.type === 'no-filtering') {
                if ((filter.readStatus === 'no-filtering') ||
                    (message.read === true && filter.readStatus === 'read') ||
                    (message.read === false && filter.readStatus === 'unread')) {
                  count++;

                  if(startOffset < count) {
                    let tel = message.sender;
                    let p = new Promise(resolve => {
                      self.findContact(tel).then((contact) => {
                        if (contact) {
                          message.vCard = contact;
                        } else {
                          message.vCard = [];
                        }
                        resolve(message);
                      }, () => {
                        message.vCard = [];
                        resolve(message);
                      });
                    });
                    promise.push(p);
                  }
                }
              }
            }
          }
        }

        circleMap();
      });
    },

    getMessage: function (evt) {
      return new Promise((resolve, reject) => {
        let req = this.msgManager.getMessage(evt.name);
        req.onsuccess = () => {
          let message = req.result;
          let tel = message.sender;
          this.findContact(tel).then((contact) => {
            if (contact) {
              message.vCard = contact;
            } else {
              message.vCard = [];
            }
            resolve(message);
          }, () => {
            message.vCard = [];
            resolve(message);
          });
        }
        req.onerror = function () {
          reject();
        };
      });
    },

    setDeletedStatus: function (evt) {
      return new Promise(resolve => {
        let req = this.msgManager.delete(evt.handleId);
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function () {
          resolve(false);
        };
      });
    },

    setReadStatus: function (evt) {
      return new Promise((resolve) => {
        let req = this.msgManager.markMessageRead(evt.handleId, evt.statusValue);
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function () {
          resolve(false);
        };
      });
    },

    sendMessage: function (evt) {
      return new Promise((resolve, reject) => {
        this.msgManager.onsending = function (sendingEvent) {
          resolve(sendingEvent.message.id);
        };
        this.msgManager.onfailed = function (sendingEvent) {
          reject(sendingEvent.message.id);
        };
        this.msgManager.send(evt.recipient, evt.messageBody);
      });
    },

    getMessagesCount: function (filter) {
      let messagesCount = 0;
      let unreadFlag = false;
      return new Promise((resolve, reject) => {
        let cursor = this.msgManager.getMessages();
        cursor.onsuccess = function() {
          let result = cursor.result;
          if (result) {
            if (result.type === filter.type ||
              filter.type === 'no-filtering') {
              if (result.delivery === filter.dir ||
                filter.type === 'no-filtering') {
                if ((filter.readStatus === 'no-filtering') ||
                  (result.read === true && filter.readStatus === 'read') ||
                  (result.read === false && filter.readStatus === 'unread')) {
                  messagesCount++;

                  if(!result.read) {
                    unreadFlag = true;
                  }
                }
              }
            }
            cursor.continue();
          } else {
            resolve({
              size: messagesCount,
              unreadFlag: unreadFlag
            });
          }
        };
        cursor.onerror = function() {
          reject('Error when get messages');
        };
      });
    }

  };

  exports.MapMessage = MapMessage;
}(window));
