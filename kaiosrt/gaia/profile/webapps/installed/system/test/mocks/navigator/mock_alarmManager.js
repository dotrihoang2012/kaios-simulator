if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

global.navigator.b2g.alarmManager = {
  add: () => Promise.resolve(),
  remove: jest.fn()
};