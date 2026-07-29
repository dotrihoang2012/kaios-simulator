global.crypto = {
  subtle: {
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    exportKey: jest.fn()
  }
};