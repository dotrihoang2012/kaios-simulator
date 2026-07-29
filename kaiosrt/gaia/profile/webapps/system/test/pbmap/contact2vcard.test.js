describe('<contact2vcard.js> test', () => {
  beforeAll((done) => {
    require('../mocks/l10n');
    require('../../js/pbmap/contact2vcard');
    done();
  });

  const b64 =
    'R0lGODlhEAAQAMQfAKxoR8VkLxFw1feVPITSWv+eQv7Qo0Cc6OyIN/v7+3PLTSCZ' +
    'EFy17Wa6XuT1x2bGQ3nNUU6vRXPAa9mLXMTkwJZEHJt7LL5aJ/z8/O2KONx3L/ubP/r6+rtV' +
    'I////////yH5BAEAAB8ALAAAAAAQABAAAAWD4CeOZDlimOitnvlhXefFiyCs3NkZMe9QDMGi' +
    'k3t1BgZDIcZgHCCxHAyxKRQmnYOkoYgaNYMNr3JoEB6dDBGmyWxihwNBgVZz2Js3YB+JWNpr' +
    'HW15YgA2FxkaRB8JgoQxHQEbdiKNg4R5iYuVgpcZmkUjHDEapYqbJRyjkKouoqqhIyEAOw==';

  function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 1024;

    function charCodeFromCharacter(c) {
      return c.charCodeAt(0);
    }

    let byteCharacters = atob(b64Data);
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);
      let byteNumbers = Array.prototype.map.call(slice, charCodeFromCharacter);
      let byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {
      type: contentType
    });
  }

  const photo = b64toBlob(b64, 'image/gif');

  const contact = {
    id: '1',
    updated: new Date(),
    additionalName: ['Green'],
    adr: [
      {
        type: ['home'],
        pref: true,
        countryName: 'Germany',
        locality: 'Chemnitz',
        region: 'Chemnitz',
        postalCode: '09034',
        streetAddress: 'Gotthardstrasse 22'
      }
    ],
    bday: new Date(Date.UTC(2020, 0, 1)),
    email: [
      {
        type: ['personal'],
        value: 'test@test.com'
      },
      {
        type: ['work'],
        value: 'test@work.com',
        pref: true
      }
    ],
    honorificPrefix: ['Mr.'],
    familyName: ['Grillo'],
    givenName: ['Pepito'],
    nickname: ['PG'],
    jobTitle: ['Sr. Software Architect'],
    name: ['Pepito Grillo'],
    org: ['Test ORG'],
    tel: [
      {
        value: '+346578888888',
        type: ['mobile'],
        carrier: 'TEF',
        pref: true
      },
      {
        value: '+3120777777',
        type: ['Home'],
        carrier: 'KPN'
      }
    ],
    url: [
      {
        type: ['fb_profile_photo'],
        value: 'https://abcd1.jpg'
      }
    ],
    category: ['favorite'],
    note: ['Note 1'],
    photo: [photo]
  };

  test('getVcardFilename function test', (done) => {
    global.Normalizer = {
      toAscii: (param) => {
        return param;
      }
    };

    const value = VcardFilename(contact);
    expect(value).toEqual('Pepito_Grillo.vcf');
    done();
  });

  test('ContactToVcard function test', (done) => {
    const append = jest.fn();
    const success = jest.fn();
    ContactToVcard([contact], append, success);
    expect(append).toBeCalledTimes(0);
    expect(success).toBeCalledTimes(0);

    contact.photo = null;
    ContactToVcard([contact], append, success, 98562, false);
    expect(append).toBeCalledTimes(1);
    expect(success).toBeCalledTimes(1);
    expect(append.mock.calls[0][0]).toMatch(/VERSION:3.0/);
    expect(append.mock.calls[0][1]).toEqual(1);
    done();
  });

  test('ContactToVcardBlob function test', (done) => {
    const callback = jest.fn();
    const options = {
      type: 'text/x-vcard'
    };

    ContactToVcardBlob([contact], callback, options);
    expect(callback).toBeCalledTimes(1);
    expect(typeof callback.mock.calls[0][0]).toBe('object');

    const options1 = {
      type: 'text/x-vcard;charset=ISO-8859-1'
    };
    expect(() => {
      ContactToVcardBlob([contact], '', options1);
    }).toThrow();
    done();
  });

  afterAll((done) => {
    global.Normalizer = {};
    done();
  });
});
