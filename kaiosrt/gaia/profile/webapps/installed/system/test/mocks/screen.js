if (!screen.orientation) {
  screen.orientation = {
    type: 'portrait',
    lock: jest.fn()
  };
}
