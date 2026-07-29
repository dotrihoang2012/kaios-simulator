describe('<flashlight_helper.js> test', () => {
  let flashlightHelper;
  beforeEach((done) => {
    require('../../test/mocks/navigator/getFlashlightManager');
    flashlightHelper = require('../util/flashlight_helper').default;
    done();
  });

  test('init function test', (done) => {
    expect(flashlightHelper.capability).toBe(true);
    done();
  });

  test('_handle_flashlightchange function test ', (done) => {
    const spy = jest.spyOn(flashlightHelper, 'emit').mockImplementation(() => { });
    flashlightHelper._handle_flashlightchange();
    expect(spy).toBeCalledTimes(1);
    spy.mockRestore();
    done();
  });

  test('toggle function test ', (done) => {
    //1, after instantiation , flashlightEnabled is false
    expect(flashlightHelper.flashlightManager.flashlightEnabled).toBe(false);

    //2, after called  the toggle function, flashlightEnabled is true
    flashlightHelper.toggle();
    expect(flashlightHelper.flashlightManager.flashlightEnabled).toBe(true);
    done();
  });
});
