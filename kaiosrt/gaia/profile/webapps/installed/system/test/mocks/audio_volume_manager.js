global.AudioVolumeManager = {
  AudioVolumeState: {
    VOLUME_DOWN: 0,
    VOLUME_UP: 1,
    VOLUME_SHOW: 2,
  },
  observeAudioVolumeChanged: jest.fn(),
  unobserveAudioVolumeChanged: jest.fn(),
  requestUp: jest.fn(),
  requestDown: jest.fn(),
};
