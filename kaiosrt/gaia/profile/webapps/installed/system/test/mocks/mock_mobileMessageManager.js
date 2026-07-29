const mockMobileMessageManager = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getMessage: (aMessageID) => {
    const result = {
      sender: '2238690',
      vCard: null
    };
    return {
      result,
      set onsuccess(cb) {
        cb();
      }
    };
  },
  getMessages: (filter, reverseOrder) => {
    return {
      get result() {
        return {
          type: 'sms',
          delivery: 'sent',
          read: false
        };
      },
      set onsuccess(cb) {
        cb();
      },
      set onerror(cb) {
        cb();
      },
      continue: jest.fn(),
      values: () => {
        return {
          next: () => {
            const result = {
              done: true,
              value: {
                type: 'mms',
                delivery: 'send',
                read: true,
                sender: '2238690'
              }
            };
            return Promise.resolve(result);
          }
        }
      }
    };
  },
  delete: (param) => {
    return {
      set onsuccess(cb) {
        cb();
      },
      get result() {
        return true;
      }
    };
  },
  markMessageRead: (id, isRead) => {
    return {
      set onsuccess(cb) {
        cb();
      },
      get result() {
        return true;
      }
    };
  },
  send: (recipients, message) => {
    const result = Array.isArray(recipients) ?
      recipients.map(() => {
        return {};
      }) : {};
    return result;
  }
};

export default mockMobileMessageManager;