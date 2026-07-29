global.MutationObserver = function() {};
global.MutationObserver.prototype = {
  observe: jest.fn()
};
