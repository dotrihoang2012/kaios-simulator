global.indexedDB = {
  open: () => {
    return {
      onsuccess: jest.fn(),
      onerror: jest.fn()
    }
  }
};
