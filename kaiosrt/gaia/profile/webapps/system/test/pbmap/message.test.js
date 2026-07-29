import mockMobileMessageManager from '../mocks/mock_mobileMessageManager';
import mockContactsManager from '../mocks/mock_ContactsManager';

describe('<message.js> test', () => {
  beforeAll((done) => {
    global.ContactsManager = mockContactsManager;
    const {
      mockB2gNavigator
    } = require('../mocks/navigator/b2g_navigator_mock');
    global.navigator.b2g = {};
    mockB2gNavigator(global, 'mobileMessageManager', mockMobileMessageManager);
    done();
  });

  let mapMessage;
  beforeEach((done) => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    require('../../js/pbmap/message');
    mapMessage = new MapMessage();
    done();
  });

  test('messageEventInit function test', (done) => {
    mapMessage.messageEventInit();
    expect(mockMobileMessageManager.addEventListener).toBeCalledTimes(7);
    done();
  });

  test('handleEvent function test', (done) => {
    const adapter = window;
    const evt = {
      type: 'sent',
      message: 'test message'
    };
    const spy = jest.spyOn(window, 'dispatchEvent');
    mapMessage.handleEvent(adapter, evt);
    expect(spy).toBeCalledTimes(1);
    expect(spy.mock.calls[0][0].type).toEqual('mapnotifyreq');
    done();
  });

  test('findContact function test', async (done) => {
    const find_cursor = {
      next: jest.fn(),
      release: jest.fn()
    };

    jest.spyOn(mockContactsManager, 'find').mockResolvedValue(find_cursor);

    jest.spyOn(find_cursor, 'next').mockResolvedValue({
      name: 'HP',
      tel: [{
        atype: 'student',
        value: '888555',
        pref: true,
        carrier: 'china mobile'
      }]
    });

    const value = mapMessage.findContact('2238690');
    await expect(value).resolves.toEqual({
      name: 'HP',
      tel: [{
        atype: 'student',
        carrier: 'china mobile',
        pref: true,
        value: '888555'
      }]
    });
    done();
  });

  test('getAllMessages function test', async (done) => {
    const filter = {
      maxListCount: 5,
      listStartOffset: 0,
      type: 'no-filtering',
      readStatus: 'read'
    };
    const value = await mapMessage.getAllMessages(filter);
    expect(value).toEqual([]);
    done();
  });

  test('getMessage function test', async (done) => {
    const spy = jest.spyOn(mapMessage, 'findContact');
    const evt = {
      name: 'received'
    };
    //resolved
    const value = await mapMessage.getMessage(evt);
    expect(spy).toBeCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual('2238690');
    expect(value).toEqual({
      sender: '2238690',
      vCard: []
    });
    done();
  });

  test('setDeletedStatus function test', async (done) => {
    const evt = {
      name: 'received',
      handleId: 1
    };
    //resolved
    const value1 = await mapMessage.setDeletedStatus(evt);
    expect(value1).toBe(true);

    //rejected
    jest.spyOn(mockMobileMessageManager, 'delete').mockReturnValueOnce({
      set onerror(cb) {
        cb();
      }
    });
    const value2 = await mapMessage.setDeletedStatus(evt);
    expect(value2).toBe(false);
    done();
  });

  test('setReadStatus function test', async (done) => {
    const evt = {
      handleId: 1,
      statusValue: 'test'
    };
    //resolved
    const value1 = await mapMessage.setReadStatus(evt);
    expect(value1).toBe(true);

    //rejected
    jest.spyOn(mockMobileMessageManager, 'markMessageRead').mockReturnValueOnce({
      set onerror(cb) {
        cb();
      }
    });
    const value2 = await mapMessage.setReadStatus(evt);
    expect(value2).toBe(false);
    done();
  });

  test('sendMessage function test', async (done) => {
    const evt = {
      recipient: 1,
      messageBody: 'test'
    };
    const value1 = mapMessage.sendMessage(evt);
    //onsending --> resolve
    mockMobileMessageManager.onsending({
      message: {
        id: 1
      }
    });
    await expect(value1).resolves.toEqual(1);

    //onfailed --> reject
    const value2 = mapMessage.sendMessage(evt);
    mockMobileMessageManager.onfailed({
      message: {
        id: 1
      }
    });
    await expect(value2).rejects.toEqual(1);
    done();
  });

  test('getMessagesCount function test', async (done) => {
    const filter = {
      type: 'no-filtering',
      dir: '',
      readStatus: 'unread'
    };
    const value = mapMessage.getMessagesCount(filter);
    await expect(value).rejects.toEqual('Error when get messages');
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});