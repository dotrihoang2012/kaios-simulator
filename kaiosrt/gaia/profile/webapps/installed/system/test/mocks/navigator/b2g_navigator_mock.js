function mockB2gNavigator(globalWin, property, value) {
  globalWin.navigator.b2g[property] = value;
}
exports.mockB2gNavigator = mockB2gNavigator;