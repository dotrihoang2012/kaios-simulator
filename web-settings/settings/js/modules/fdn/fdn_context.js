/**
 * FdnContext is a module that you can easily fetch out FDN related info.
 *
 * @module FdnContext
 */
/* global IccContact */

(function fdnContext(exports) {
  const FdnContext = {
    fdnContacts: [],

    /**
     * We can use this method to get wrapped contacts information.
     *
     * @param {Number} cardIndex
     * @type {Function}
     * @return {Promise}
     */
    getContacts(cardIndex) {
      const promise = new Promise((resolve, reject) => {
        const { iccId } = ApiManager.connections[cardIndex];
        if (!iccId) {
          reject(); // eslint-disable-line
        }

        const icc = ApiManager.iccManager.getIccById(iccId);
        if (!icc) {
          reject(); // eslint-disable-line
        }

        const request = icc.readContacts('fdn');
        request.onerror = error => {
          reject(error);
        };

        request.onsuccess = () => {
          const { result } = request;
          this.fdnContacts[cardIndex] = result;
          const contacts = [];
          for (let i = 0, l = result.length; i < l; i++) {
            contacts.push({
              id: i,
              name: result[i].name || '',
              number: result[i].number || ''
            });
          }
          resolve(contacts);
        };
      });

      return promise;
    },

    /**
     * This function returns a FDN contact object matching the
     * requested action.
     *
     * mozIccManager.updateContact works like this:
     *   - no id: create a new contact
     *   - existing id + name and number: update a contact
     *   - existing id + empty name and number: remove a contact
     *
     * @type {Function}
     * @param {String} action
     * @param {Number} options.cardIndex
     * @param {Object} options.contact
     * @return {mozContact}
     */
    createAction(action, options) {
      let result = {};
      const { contact } = options;
      const { cardIndex } = options;
      switch (action) {
        case 'add':
          result = new IccContact(
            contact.id,
            contact.name,
            contact.number,
            null
          );
          break;
        case 'edit':
        case 'remove':
          result = new IccContact(
            this.fdnContacts[cardIndex][contact.id].id,
            contact.name,
            contact.number,
            null
          );
          break;
        default:
          break;
      }

      return result;
    }
  };
  exports.FdnContext = FdnContext;
})(window);
