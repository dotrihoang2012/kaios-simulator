describe('<pbmap_dialog.js> test', () => {
  beforeAll((done) => {
    require('../mocks/service');
    require('../mocks/l10n');
    require('../../js/pbmap/pbmap_dialog');
    document.body.innerHTML = `<input id="custom-input" />`;
    done();
  });

  beforeEach((done) => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    done();
  });

  test('show function test', (done) => {
    Service.request.mockImplementation((service, obj) => {
      if (typeof obj === 'object') {
        obj.onBack();
        obj.onCancel();
        obj.onOk();
      }
    });

    const options1 = {
      profile: 'PBAP',
      type: 1
    };
    const callback1 = jest.fn();
    PbmapDialog.show(options1, callback1);
    expect(callback1).toBeCalledTimes(3);
    expect(callback1.mock.calls[0][0]).toEqual(false);
    expect(callback1.mock.calls[1][0]).toEqual(false);
    expect(callback1.mock.calls[2][0]).toEqual(true);

    // this._dialogIsShowing === true && this._dialogProfile !== options.profile
    const options2 = {
      profile: '',
      type: 2
    };
    const callback2 = jest.fn();
    PbmapDialog.show(options2, callback2);

    // this._dialogIsShowing === true && this._dialogProfile === options.profile
    const options3 = {
      profile: null,
      type: 2
    };
    const callback3 = jest.fn();
    PbmapDialog._dialogProfile = null;
    PbmapDialog.show(options3, callback3);
    const customInput = document.getElementById('custom-input');
    expect(customInput.getAttribute('maxLength')).toBe('16');
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll((done) => {
    document.body.innerHTML = '';
    done();
  });
});