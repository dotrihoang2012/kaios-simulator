function MessageChannel() {}
MessageChannel.prototype = {
  port1: {
    onmessage: jest.fn()
  }
};
global.MessageChannel = MessageChannel;
