function MockAudioContext(channel) {
  this.mozAudioChannelType = channel;
  this.currentTime = 0;
  this.sampleRate = 0;
  this.destination = {};
}

MockAudioContext.prototype = {
  createBuffer: () => {
    return {};
  },
  createBufferSource: () => {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  },
  createGain: () => {
    return {
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        setValueCurveAtTime: jest.fn()
      }
    };
  },
  createOscillator: () => {
    return {
      frequency: {
        value: 0
      },
      type: '',
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export default MockAudioContext;