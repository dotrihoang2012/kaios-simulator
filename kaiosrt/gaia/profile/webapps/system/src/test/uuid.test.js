import uuid from '../uuid';

describe('<uuid> test', () => {
  // Test uuid
  test('uuid should be function', done => {
    expect(typeof uuid).toBe('function');
    done();
  })

  // Test uuid return value
  test(' uuid return value should be string & its length should be 9', done => {
    const value = uuid();
    expect(typeof value).toBe('string');
    expect(value.length).toBe(9);
    done();
  })
})
