describe('<message_utils.js> test', () => {
  beforeAll((done) => {
    require('../mocks/navigator/mobileConnections');
    require('../../js/pbmap/message_utils');
    done();
  });

  test('reformatEventObj function test', (done) => {
    const value1 = reformatEventObj({});
    expect(value1).toEqual(
      '<MAP-event-report version = "1.0">\n<event type = undefined handle = "undefined" folder = undefined msg_type = "SMS_GSM" />\n</MAP-event-report>\n'
    );

    navigator.b2g.mobileConnections[0].voice.type = 'is95a';
    const item = {
      type: 'newMessage',
      handle: () => {},
      folder: 'inbox'
    };
    const value2 = reformatEventObj(item);
    expect(value2).toEqual(
      '<MAP-event-report version = "1.0">\n<event type = "NewMessage" handle = "function handle() {}" folder = "TELECOM/MSG/INBOX" msg_type = "SMS_CDMA" />\n</MAP-event-report>\n'
    );
    done();
  });

  test('reformatXMLMsg function test', (done) => {
    jest
      .spyOn(console, 'error')
      .mockImplementationOnce(() => {});

    const messages = [{
        id: 1,
        timestamp: 2268909877665,
        read: true,
        type: 'sms',
        body: 'test1',
        delivery: 'sent',
        receiver: 'test1 receiver'
      }, {
        id: 2,
        timestamp: 2068909877000,
        read: false,
        type: 'mms',
        body: 'test2',
        delivery: 'received',
        receiver: 'test2 receiver'
      },
      {
        id: 3,
        timestamp: 1938909877002,
        read: false,
        type: 'mms',
        body: 'test3',
        delivery: 'sending',
        receiver: 'test3 receiver'
      }, {
        id: 4,
        timestamp: 1928909877001,
        read: true,
        type: 'mms',
        body: 'test4',
        delivery: 'error',
        receiver: 'test4 receiver'
      }
    ];
    const value = reformatXMLMsg(messages);
    expect(value.size).toBe(4);
    expect(value.unreadFlag).toBe(true);
    expect(value.xml).toMatch(/sender_name = \"local\" sender_addressing = \"000000123\"/);
    done();
  });

  test('reformatBMessage function test', (done) => {
    const item = {
      read: true,
      delivery: 'received',
      sender: 'test sender',
      receiver: 'test receiver',
      body: 'test body'
    };
    const value = reformatBMessage(item);
    expect(value).toMatch(/BEGIN:BMSG\r\nVERSION:1.0\r\nSTATUS:READ\r\n/);
    done();
  });

  afterAll((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});