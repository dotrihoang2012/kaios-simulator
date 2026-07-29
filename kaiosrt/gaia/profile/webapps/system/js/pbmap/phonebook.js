'use strict';

/* jshint nonew: false */
/* global ContactsManager, WebActivity, DUMP */
(function(exports) {
  let _debug = true;

  function PbapPhonebook() {
    this._version;
    this._isPhoneBook;
    this._phonepbCache = [];
    this._phoneicCache = [];
    this._phoneocCache = [];
    this._phonemcCache = [];
    this._phoneccCache = [];
    this._simCache = [];
    this._path;
    this._maxListCount = 0;
  }


  PbapPhonebook.prototype = {

    pullPhoneBook: function(evt) {
      let propSel = evt.propSelector;
      let vcardSel = evt.vcardSelector;
      let vcardOp = evt.vcardSelectorOperator;
      let vcardVersion = evt.format;
      this._version = vcardVersion;

      this.updatePath(evt.name);
      this.updateMaxCount(evt.maxListCount);
      return this.getContactsFromPath().then((contacts) => {
        contacts = window.filterByCardSelector(vcardSel, vcardOp, contacts);
        window.filterByPropSelector(vcardVersion, propSel, contacts);
        return contacts;
      });
    },

    pullVcardEntry: function(evt) {
      let path = evt.name.replace(/\.vcf$/i, '');
      let handleId = path[(path.length-1)];
      let vcardVersion = evt.format;
      let propSel = evt.propSelector;

      this.debug('name: ' + evt.name);
      this.updatePath(evt.name);

      return new Promise((resolve) => {
        if (this._path === 'pb') {
          if (handleId === '0') {
            let ownerContact = this.getOwnerContact();
            resolve([ownerContact]);
          } else {
            let ctsId = this._phonepbCache[handleId].ctsId;
            ContactsManager.getContactByID(ctsId).then(contact => {
              resolve([contact]);
            }, () => {
              resolve([]);
            });
          }
        } else {
          let entry = this.getEntry(handleId);
          resolve([entry.contact]);
        }
      }).then((contacts) => {
        window.filterByPropSelector(vcardVersion, propSel, contacts);
        return contacts;
      });
    },

    pullVcardListing: function(evt) {
      let vcardSel = evt.vcardSelector;
      let vcardOp = evt.vcardSelectorOperator;

      this.updatePath(evt.name);
      this.updateMaxCount(evt.maxListCount);

      return this.getContactsFromPath().then((contacts) => {
        contacts = window.filterByCardSelector(vcardSel, vcardOp, contacts);
        return contacts;
        }).then((contacts) => {
          return this.generateListingCache(contacts);
        }).then((cacheList) => {
          return this.generateVcardList(cacheList);
        });
    },

    generateListingCache: function(contacts) {
      let cache = [];
      let self = this;

      this.cleanCache();

      contacts.forEach((item) => {
        let cacheItem = {};
        if (self._path === 'pb') {
          cacheItem.ctsId = item.id;
        } else {
          cacheItem.contact = item;
        }
        if (self._path !== 'pb' && self._path !== 'sim') {
          cacheItem.name = item.name[0] +';';
        } else {
          cacheItem.name = item.familyName + ';' + item.givenName;
        }
        this.pushCache(cacheItem);
        cache.push(cacheItem);
      });

      return cache;
    },

    generateVcardList: function(cacheList) {
      function getCardLine(handle, name) {
        return '<card handle = "' + handle + '" name = "' + name + '"/>';
      }

      const XML_HEADER = '<?xml version="1.0"?>\n' +
        '<!DOCTYPE vcard-listing SYSTEM "vcard-listing.dtd">\n' +
        '<vCard-listing version="1.0">\n';
      const XML_FOOTER = '</vCard-listing>\n';

      let lines = [];
      let count = 0;

      cacheList.forEach((item) => {
        let handle = count++ + '.vcf';
        lines.push(getCardLine(handle, item.name));
      });

      let content = XML_HEADER + lines.join('\n') + '\n' + XML_FOOTER;

      return {
        xml: content,
        size: cacheList.length
      };
    },

    getEntry: function (id) {
      switch (this._path) {
        case 'sim':
          return this._simCache[id];
        case 'ic':
          return this._phoneicCache[id];
        case 'mc':
          return this._phonemcCache[id];
        case 'oc':
          return this._phoneocCache[id];
        case 'cc':
          return this._phoneccCache[id];
      }
    },

    cleanCache: function () {
      switch (this._path) {
        case 'sim':
          this._simCache = [];
          break;
        case 'pb':
          this._phonepbCache = [];
          break;
        case 'ic':
          this._phoneicCache = [];
          break;
        case 'mc':
          this._phonemcCache = [];
          break;
        case 'oc':
          this._phoneocCache = [];
          break;
        case 'cc':
          this._phoneccCache = [];
          break;
      }
    },

    pushCache: function (item) {
      switch (this._path) {
        case 'sim':
          this._simCache.push(item);
          break;
        case 'pb':
          this._phonepbCache.push(item);
          break;
        case 'ic':
          this._phoneicCache.push(item);
          break;
        case 'mc':
          this._phonemcCache.push(item);
          break;
        case 'oc':
          this._phoneocCache.push(item);
          break;
        case 'cc':
          this._phoneccCache.push(item);
          break;
      }
    },

    getPhoneContacts: function() {
      return new Promise((resolve) => {
        let allContacts = [];
        let ownerContact = this.getOwnerContact();
        allContacts.push(ownerContact);

        getAllContacts().then((contacts) => {
          if (this._maxListCount === 0   ||
            this._maxListCount === 65535 ||
            this._maxListCount > contacts.length ) {
              contacts.forEach(item => allContacts.push(item));
            } else {
              for (let i = 0; i < this._maxListCount; i++) {
                allContacts.push(contacts[i])
              }
            }

            resolve(allContacts);
        });

        async function getAllContacts() {
          const options = {
            sortBy: ContactsManager.SortOption.FAMILY_NAME,
            sortOrder: ContactsManager.Order.ASCENDING,
            sortLanguage: navigator.language,
          };

          const cursor = await ContactsManager.getAll(options,
            10, true);
          let contacts = [];

          try {
            let contactsCursor = await cursor.next();
            while (contactsCursor.length) {
              contacts = contacts.concat(contactsCursor);
              contactsCursor = await cursor.next(); // eslint-disable-line
            }
          } catch (e) {
            DUMP('Find contact over');
          }
          cursor.release();
          return contacts;
        }

      });
    },

    getPhoneCallLog: function() {
      let promise = [];
      return new Promise((resolve) => {
        function getCallLog(calllogArray) {

          Date.prototype.yyyymmdd = function() {
            let YYYY = this.getFullYear().toString();
            let MM = (this.getMonth() + 1).toString();
            let DD  = this.getDate().toString();
            return YYYY + (MM[1]? MM : '0' + MM[0]) +
              (DD[1]? DD : '0' + DD[0]);
          };
          Date.prototype.hhmmss = function() {
            let hh = this.getHours().toString();
            let mm = this.getMinutes().toString();
            let ss = this.getSeconds().toString();
            return (hh[1]? hh : '0' + hh[0]) + (mm[1]? mm : '0' + mm[0]) +
              (ss[1]? ss : '0' + ss[0]);
          };

          function add(data) {
            let currentCallLog = data;
            let type;
            let tel = currentCallLog.number;
            let name = tel;

            if (currentCallLog.callType.startsWith('incoming')) {
              type = 'ic';
            } else if (currentCallLog.callType.startsWith('missed')) {
              type = 'mc';
            } else if (currentCallLog.callType.startsWith('outgoing')) {
              type = 'oc';
            }

            let currentDate = new Date(currentCallLog.date);
            let time = currentDate.yyyymmdd() + 'T' + currentDate.hhmmss();

            let callLogObj = {
              time: time,
              name: name,
              fn: name,
              tel: tel,
              type: type
            };

            let p = new Promise( (resolve) => {
              findContact(tel).then((contact) => {
                if (contact) {
                  callLogObj.name = contact.name[0];
                  callLogObj.fn = contact.name[0];
                }
                resolve(callLogObj);
              });
            });

            promise.push(p);
          }

          async function findContact(value) {
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
          }

          calllogArray.forEach((item) => {
            add(item);
          });
          resolve(promise);
        }

        const activity = new WebActivity('getCallLogList', {
          type: ['calllog/tel']
        });

        activity.start().then((result) => {
          this.debug('launcher calllog activity successful');
          getCallLog(result);
        }, (err) => {
          console.error('bluetooth launcher calllog activity error: ' + err);
        });

      });
    },

    updatePath: function (path) {
      this.debug('upatePath: ' + path);
      let type;
      if (path.indexOf('SIM1') !== -1) {
        type = 'sim';
      } else {
        if (path.indexOf('pb') !== -1) {
          type = 'pb';
        } else if (path.indexOf('ic') !== -1) {
          type = 'ic';
        } else if (path.indexOf('oc') !== -1) {
          type = 'oc';
        } else if (path.indexOf('mc') !== -1) {
          type = 'mc';
        } else if (path.indexOf('cc') !== -1) {
          type = 'cc';
        }
      }
      this._path = type;
    },

    updateMaxCount: function (maxCount) {
      if (maxCount < 0 || maxCount > 65535) {
        this._maxListCount = 65535;
      } else  {
        this._maxListCount = maxCount;
      }
    },

    getSimContacts: function() {
      return new Promise((resolve) => {
        const iccManager = navigator.b2g.iccManager;
        const iccid = iccManager && iccManager.iccIds[0];
        const icc = iccManager && iccManager.getIccById(iccid);
        let requestAdn;
        let contacts = [];

        if (icc && icc.readContacts) {
          requestAdn = icc.readContacts('adn');
        } else {
          resolve(contacts);
        }

        requestAdn.onsuccess = function() {
          contacts = requestAdn.result || [];
          resolve(contacts);
        };
        requestAdn.onerror = function() {
          resolve(contacts);
        };
      }).then(contacts =>{
        let max = 0;
        if (this._maxListCount === 0     ||
            this._maxListCount === 65535 ||
            this._maxListCount > contacts.length) {
          max = contacts.length;
        } else {
          max = this._maxListCount;
        }
        for (let i = 0; i < max; i++) {
          contacts[i].familyName = contacts[i].name;
          contacts[i].givenName = [''];
        }
        return contacts;
      });
    },

    getContactsFromPath: function() {
      this.debug('path: ' + this._path);
      switch (this._path) {
        case 'pb':
          return this.getPhoneContacts();
        case 'sim':
          return this.getSimContacts();
        case 'ic':
        case 'oc':
        case 'mc':
        case 'cc':
          return this.getPhoneCallLog().then((promise) => {
            return new Promise((resolve) => {
              return Promise.all(promise).then((callLogs) => {
                return resolve(callLogs);
              });
            });
          }).then((callLogs) => {
            this.debug('callLogs len: ' + callLogs.length);
            return window.genCallLogObj(callLogs, this._version);
          });
        case 'unknow':
          return Promise.resolve([]);
      }
    },

    getPhoneNumber: function() {
      const _conns = navigator.b2g.mobileConnections;
      if (!_conns) {
        return;
      }

      let phoneNumber = null;

      Array.prototype.some.call(_conns, function(conn) {
        let iccId = conn.iccId;
        if (!iccId) {
          return;
        }

        const iccObj = navigator.b2g.iccManager &&
          navigator.b2g.iccManager.getIccById(iccId);
        if (!iccObj) {
          return;
        }

        let iccInfo = iccObj.iccInfo;
        if (!iccInfo) {
          return;
        }

        phoneNumber = iccInfo.msisdn || iccInfo.mdn;

        if (phoneNumber) {
          return true;
        }
      });

      return phoneNumber;
    },

    getOwnerContact: function() {
      let phoneNumber = this.getPhoneNumber();

      return {
        'tel': [{ 'atype': 'mobile','value': phoneNumber }],
        'name': 'MyPhone',
        'givenName': 'MyPhone',
        'familyName': '',
        'category': ['DEVICE', 'KAICONTACT']
      };
    },

    debug: function(msg) {
      if (_debug) {
        console.log('[Bluetooth PBAP] -- ' + msg);
      }
    }
  };

  exports.PbapPhonebook = PbapPhonebook;
}(window));
