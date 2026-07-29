describe('<js/ttlview.js> test', () => {
  let subject;
  beforeAll((done) => {
    document.body.innerHTML = `
    <div id="screen">
    </div>
   `;

    require('./mocks/SettingsObserver');
    jest
      .spyOn(SettingsObserver, 'observe')
      .mockImplementation((name, defaultValue, callback) => {
        callback(true);
      });
    require('../js/ttlview');
    subject = new TTLView();
    done();
  });

  test('Instance test', (done) => {
    // show function test
    expect(subject.element).not.toBe(null);

    // get visible test
    expect(subject.visible).toBe(false);

    // createElement function test
    expect(subject.element.id).toEqual('debug-ttl');
    expect(subject.element.innerHTML).toEqual('00000');

    // handleEvent --> updateLoadtime test
    const evt1 = {
      type: 'homescreenloadtime',
      detail: {
        time: '20210127',
        type: 'load'
      }
    };
    subject.handleEvent(evt1);
    expect(subject.element.innerHTML).toEqual('20210127 [load]');

    // handleEvent --> resetLoadtime test
    const evt2 = {
      type: 'homescreenopening'
    };
    subject.handleEvent(evt2);
    expect(subject.element.innerHTML).toEqual('00000');

    // hide function test
    subject.hide();
    expect(subject.element.style.visibility).toEqual('hidden');

    // toggle function test
    subject.toggle();
    expect(subject.element.style.visibility).toEqual('visible');
    done();
  });

  afterAll((done) => {
    document.body.innerHTML = '';
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});