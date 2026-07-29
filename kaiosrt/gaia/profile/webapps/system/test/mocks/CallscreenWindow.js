function CallscreenWindow() {}
CallscreenWindow.prototype = {
  hide: jest.fn(),
  ensure: jest.fn(),
  closeWindow: jest.fn(),
  isActive: jest.fn(() => true),
  show: jest.fn(),
  requestOpen: jest.fn(),
  free: jest.fn(),
  isVisible: jest.fn(() => false)
};
global.CallscreenWindow = CallscreenWindow;
