describe('<vcard_utils.js> test', () => {
  beforeAll((done) => {
    require('../../js/pbmap/vcard_utils');
    done();
  });

  test('filterByCardSelector function test', (done) => {
    const value1 = filterByCardSelector([], 'OR', ['223568']);
    const value2 = filterByCardSelector([14], 'OR', ['223568']);
    const value3 = filterByCardSelector([3], 'AND', [{
      photo: ['test.jpg']
    }]);
    const value4 = filterByCardSelector([7], '', [{
      tel: ['9999181']
    }]);

    expect(value1).toEqual(['223568']);
    expect(value2).toEqual([]);
    expect(value3).toEqual([{
      photo: ['test.jpg']
    }]);
    expect(value4).toEqual([]);
    done();
  });

  test('filterByPropSelector function test', (done) => {
    const contacts = [{
      givenName: 'LTed',
      email: [{
        atype: 'office',
        value: 'hp@mail.com',
        pref: false
      }],
      tel: [{
        atype: 'student',
        value: '999999',
        pref: true,
        carrier: 'china unicom'
      }],
      org: ['kaios']
    }];

    // !propSel.length === true -->return
    filterByPropSelector('', []);

    // vcardVersion === 'vCard21'
    filterByPropSelector('vCard21', [
      'logo', 'org'
    ], contacts);
    expect(contacts).toEqual([{
      adr: null,
      bday: null,
      category: null,
      email: null,
      givenName: null,
      key: null,
      nickname: null,
      note: null,
      org: ['kaios'],
      photo: null,
      tel: [{
        atype: 'student',
        carrier: 'china unicom',
        pref: true,
        value: '999999'
      }],
      url: null,
      xirmc: null
    }]);

    // vcardVersion === 'vCard30'
    expect(contacts[0].org).toEqual(['kaios']);
    filterByPropSelector('vCard30', [
      'n', 'label', 'role'
    ], contacts);
    expect(contacts[0].org).toEqual(null);
    done();
  });

  test('genCallLogObj function test', (done) => {
    const callArray = [{
      name: 'Ted',
      fn: 'Li',
      type: 'ic',
      time: new Date(2766533584773),
      tel: [{
        atype: 'student',
        value: '999999',
        pref: true,
        carrier: 'china unicom'
      }, {
        atype: 'test',
        value: '6666666',
        pref: true,
        carrier: 'china telecom'
      }]
    }];

    const value = genCallLogObj(callArray, 'vCard30');
    expect(value[0].xirmc).toMatch(/TYPE=RECEIVED/)
    expect(value[0].familyName).toEqual('Li');
    done();
  });
});