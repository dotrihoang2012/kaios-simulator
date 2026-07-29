describe('<crypto_helper.js> test', () => {
  beforeAll((done) => {
    global.TextEncoder = require('util').TextEncoder;
    require('../mocks/mock_crypto');
    require('../../js/kaiaccount/crypto_helper');
    done();
  });

  test('KaiAccountCryptoHelper test', (done) => {
    expect(typeof KaiAccountCryptoHelper).toBe('object');
    done();
  });

  test('encryption function test', async (done) => {
    const {
      encryption
    } = KaiAccountCryptoHelper;

    const importKeySpy = jest
      .spyOn(crypto.subtle, 'importKey')
      .mockResolvedValue({
        algorithm: {
          name: "PBKDF2",
        },
        extractable: false,
        type: "secret",
        usages: ["deriveKey", "deriveBits"]
      });

    const deriveKeySpy = jest
      .spyOn(crypto.subtle, 'deriveKey')
      .mockResolvedValue({
        algorithm: {
          name: "AES-GCM",
          length: 256
        },
        extractable: true,
        type: "secret",
        usages: ["encrypt", "decrypt"]
      });

    const exportKeySpy = jest
      .spyOn(crypto.subtle, 'exportKey')
      .mockResolvedValue(new ArrayBuffer(8));

    const value = await encryption('kaios', 'kaiostech123');

    expect(importKeySpy).toHaveBeenCalledTimes(2);
    expect(deriveKeySpy).toHaveBeenCalledTimes(2);
    expect(exportKeySpy).toHaveBeenCalledTimes(2);
    expect(exportKeySpy.mock.calls[0][0]).toEqual('raw');
    expect(exportKeySpy.mock.calls[1][0]).toEqual('raw');
    expect(importKeySpy.mock.calls[0][2]).toEqual({
      "name": "PBKDF2"
    });
    expect(importKeySpy.mock.calls[1][2]).toEqual({
      "name": "HKDF"
    });
    expect(deriveKeySpy.mock.calls[0]).toContainEqual({
      "hash": {
        "name": "SHA-256",
      },
      "length": 256,
      "name": "HMAC",
    }, true, ["sign"]);

    expect(value).toEqual('AAAAAAAAAAA=');
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});