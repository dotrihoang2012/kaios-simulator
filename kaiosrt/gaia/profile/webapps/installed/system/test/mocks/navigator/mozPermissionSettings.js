global.navigator.mozPermissionSettings = {
  get: () => {
    return {
      then: jest.fn()
    }
  }
};
