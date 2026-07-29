import '../../test/mocks/lazy_loader.js';
import '../../test/mocks/l10n.js';
import '../../test/mocks/asyncStorage.js';
import '../../test/mocks/mock_appOrigin.js';

if (global.performance) {
  if (!global.performance.mark) {
    global.performance.mark = jest.fn();
  }
} else {
  global.performance = { mark: jest.fn() };
}

require('../js/browser_home');

global.navigator.connection = { type: 'wifi' };

describe('Browser_home', () => {
  test('start-up success', () => {
    expect(global.App).not.toBeUndefined();
  });

  test('load recommendedApps', (done) => {
    global.App.slider = { update: jest.fn() }
    global.App.channelRequest = () => Promise.resolve(null);
    const slider = global.App.slider;

    global.App.loadRecommendedApps().then(() => {
      expect(slider.update.mock.calls.length).toBe(2);
      expect(slider.update.mock.calls[0][0]).toEqual({ status: 'loading' });
      expect(slider.update.mock.calls[1][0]).toEqual({ status: 'server-error' });
      done();
    });
  });
});
