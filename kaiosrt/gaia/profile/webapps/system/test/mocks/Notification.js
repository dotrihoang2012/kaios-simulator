const mockNotification = jest.fn();

mockNotification.prototype = {
  close: jest.fn(),
  set onclick(callback){
    callback();
  },
  data: {},
  addEventListener: jest.fn()
};

mockNotification.get = jest.fn(() => Promise.resolve({}));

global.Notification = mockNotification;
