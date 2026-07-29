if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

global.navigator.b2g.authorizationManager = {
  getRestrictedToken: () => Promise.resolve({})
};
