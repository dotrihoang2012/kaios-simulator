const MockIACHandler = {
  getPort: jest.fn(() => {
    return {
      postMessage: jest.fn()
    }
  })
};

export default MockIACHandler;
