import '../js/service.js';
require('../js/visibility_manager');

describe('VisibilityManager', () => {
  const visibilityManager = new window.VisibilityManager();
  visibilityManager.start();

  test('Normal audio channel is on.', (done) => {
    visibilityManager.handleEvent({
      type: 'visibleaudiochannelchanged',
      detail: {
        channel: 'normal'
      }
    });
    expect(visibilityManager._normalAudioChannelActive).toBe(true);
    done();
  });

  test('Normal audio channel is off.', (done) => {
    visibilityManager.handleEvent({
      type: 'visibleaudiochannelchanged',
      detail: {
        channel: 'none'
      }
    });
    expect(visibilityManager._normalAudioChannelActive).toBe(false);
    done();
  });
});
