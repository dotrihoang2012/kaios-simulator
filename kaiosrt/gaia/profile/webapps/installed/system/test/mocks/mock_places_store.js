function MockPlacesStore() {}

MockPlacesStore.prototype.init = jest.fn();
MockPlacesStore.prototype.put =
  jest.fn().mockImplementation(() => Promise.resolve());
MockPlacesStore.prototype.getPlace =
  jest.fn().mockImplementation(() => Promise.resolve(null));

export default MockPlacesStore;