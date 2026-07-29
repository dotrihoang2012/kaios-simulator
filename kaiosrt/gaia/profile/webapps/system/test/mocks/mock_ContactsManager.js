const MockContactsManager = {
  FilterByOption: {
    NAME: 0,
    GIVEN_NAME: 1,
    FAMILY_NAME: 2,
    TEL: 3,
    EMAIL: 4,
    CATEGORY: 5,
  },
  FilterOption: {
    EQUALS: 0,
    CONTAINS: 1,
    MATCH: 2,
    STARTS_WITH: 3,
    FUZZY_MATCH: 4,
  },
  find: (params, batchSize) => {
    return Promise.resolve('');
  },
  findBlockedNumbers: (options) => {
    const numbers = ['2226662222', '4348885555'];
    return Promise.resolve(numbers);
  }
};

export default MockContactsManager;