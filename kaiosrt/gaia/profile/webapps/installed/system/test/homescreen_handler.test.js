require('./mocks/service');
require('../js/homescreen_handler');

describe('homescreen handler', () => {
  test('isInHomescreenMainView', (done) => {
    Service.set('getTopMostUI', {name: 'AppWindowManager'});
    Service.currentApp = {app: 'testapp'};
    expect(homescreenHandler.isInHomescreenMainView()).toBe(false);

    Service.set('getTopMostUI', {name: 'AttentionWindowManager'});
    Service.currentApp = {app: 'testapp', getTopMostWindow() {
      return {isHomescreen: false};
    }};
    expect(homescreenHandler.isInHomescreenMainView()).toBe(false);
    Service.set('getTopMostUI', {name: 'AppWindowManager'});
    Service.currentApp = {app: 'testapp', isHomescreen: true, getTopMostWindow() {
      return {isHomescreen: true};
    }};
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html'
            }
          }
        }
      }
    }));
    expect(homescreenHandler.isInHomescreenMainView()).toBe(true);
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html#mainView'
            }
          }
        }
      }
    }));
    expect(homescreenHandler.isInHomescreenMainView()).toBe(true);
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html#appList'
            }
          }
        }
      }
    }));
    expect(homescreenHandler.isInHomescreenMainView()).toBe(false);
    done();
  });
  test('keyDown ArrowUp', (done) => {
    Service.set('getTopMostUI', {name: 'AppWindowManager'});
    Service.currentApp = {app: 'testapp', isHomescreen: true, getTopMostWindow() {
      return {isHomescreen: true};
    }};
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html'
            }
          }
        }
      }
    }));
    var event = new KeyboardEvent('keydown', {'key': 'ArrowUp'});
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalledWith('InstantSettings:open');
    done();
  });
  test('keyDown SoftLeft', (done) => {
    Service.set('getTopMostUI', {name: 'AppWindowManager'});
    Service.currentApp = {app: 'testapp', isHomescreen: true, getTopMostWindow() {
      return {isHomescreen: true};
    }};
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html'
            }
          }
        }
      }
    }));
    var event = new KeyboardEvent('keydown', {'key': 'SoftLeft'});
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalledWith('NotificationView:open');
    done();
  });
  test('keyDown backSpace', (done) => {
    jest.useFakeTimers();
    Service.set('getTopMostUI', {name: 'AppWindowManager'});
    Service.currentApp = {app: 'testapp', isHomescreen: true, getTopMostWindow() {
      return {isHomescreen: true};
    }};
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html'
            }
          }
        }
      }
    }));
    var event = new KeyboardEvent('keydown', {'key': 'Backspace'});
    window.dispatchEvent(event);
    jest.advanceTimersByTime(1000);
    expect(Service.request).toHaveBeenCalledWith('showSleepMenu');
    done();
  });
  test('keyDown clear timeout', (done) => {
    jest.useFakeTimers();
    Service.set('getTopMostUI', {name: 'AppWindowManager'});
    Service.currentApp = {app: 'testapp', isHomescreen: true, getTopMostWindow() {
      return {isHomescreen: true};
    }};
    dispatchEvent(new CustomEvent('homescreenlocationchange', {
      detail: {
        browser: {
          element: {
            dataset: {
              url: 'index.html'
            }
          }
        }
      }
    }));
    var event = new KeyboardEvent('keydown', {'key': 'Backspace'});
    window.dispatchEvent(event);
    jest.advanceTimersByTime(300);
    var event = new KeyboardEvent('keyup', {'key': 'Backspace'});
    window.dispatchEvent(event);
    jest.advanceTimersByTime(300);
    expect(Service.request).toHaveBeenCalledTimes(3);
    var event = new KeyboardEvent('keydown', {'key': 'Backspace'});
    window.dispatchEvent(event);
    jest.advanceTimersByTime(300);
    var event = new KeyboardEvent('keydown', {'key': 'Enter'});
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalledTimes(3);
    var event = new KeyboardEvent('keydown', {'key': 'Backspace'});
    window.dispatchEvent(event);
    jest.advanceTimersByTime(501);
    var event = new KeyboardEvent('keyup', {'key': 'Backspace'});
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalledTimes(4);
    expect(Service.request).toHaveBeenCalledWith('showSleepMenu');
    done();
  });
});
