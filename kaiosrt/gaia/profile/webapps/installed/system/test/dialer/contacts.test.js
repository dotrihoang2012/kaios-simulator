import mockContactsManager from '../mocks/mock_ContactsManager';
import mockSimplePhoneMatcher from '../mocks/mock_SimplePhoneMatcher';

describe('<contacts.js> test', () => {
  beforeAll((done) => {
    global.ContactsManager = mockContactsManager;
    global.SimplePhoneMatcher = mockSimplePhoneMatcher;
    require('../../js/dialer/contacts');
    done();
  });

  test('Contacts test', (done) => {
    expect(typeof Contacts).toBe('object');
    done();
  });

  test('findByNumber function test', async (done) => {
    const {
      findByNumber
    } = Contacts;
    const cb = jest.fn();
    const find_cursor = {
      next: jest.fn(),
      release: jest.fn()
    };
    const generateVariantsSpy = jest
      .spyOn(mockSimplePhoneMatcher, 'generateVariants');

    jest
      .spyOn(console, 'error')
      .mockImplementationOnce(() => {});

    jest
      .spyOn(mockContactsManager, 'find')
      .mockResolvedValue(find_cursor);

    jest.spyOn(find_cursor, 'next')
      .mockResolvedValueOnce({
        name: "HP",
        tel: [{
            atype: "student",
            value: "888555",
            pref: true,
            carrier: "china mobile"
          },
          {
            atype: "student",
            value: "18819190002",
            pref: true,
            carrier: "china mobile"
          }
        ],
        length: 2
      })
      .mockResolvedValueOnce('');

    //!!number === false
    await findByNumber('', cb);
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toEqual(null);

    //number.length  < 7
    await findByNumber('888555', cb);
    expect(mockContactsManager.find).toBeCalledTimes(1);
    expect(mockContactsManager.find.mock.calls[0][1]).toEqual(5);
    
    done();
  });

  test('isBlockedNumber function test', async (done) => {
    const {
      isBlockedNumber
    } = Contacts;
    const value = isBlockedNumber('2226662222');

    await expect(value).resolves.toEqual(true);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
