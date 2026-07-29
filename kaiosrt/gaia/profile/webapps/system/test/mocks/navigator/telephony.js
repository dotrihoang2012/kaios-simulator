if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

global.navigator.b2g.telephony = {
  addEventListener: jest.fn(),
  calls: [],
  conferenceGroup: {
    addEventListener: jest.fn(),
    state: '',
    calls: []
  },
  dial: jest.fn(),
  sendUSSD: jest.fn(),
  cancelUSSD: jest.fn()
};

global.TelephonyManager = {
  setCallState: jest.fn()
};
