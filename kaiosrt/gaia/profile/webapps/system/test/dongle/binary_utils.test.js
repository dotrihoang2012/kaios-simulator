import mockFileReader from '../mocks/mock_FileReader';

describe('<binary_utils.js> test', () => {
  const oldFileReader = window.FileReader;

  beforeAll((done) => {
    window.FileReader = mockFileReader;
    require('../../js/dongle/binary_utils');
    done();
  });

  test('BinaryUtils test', (done) => {
    expect(typeof BinaryUtils).toBe('object');

    const {
      arrayBufferToString,
      blobToArrayBuffer,
      blobToSlicedArrayBuffer
    } = BinaryUtils;

    expect(typeof arrayBufferToString).toBe('function');
    expect(typeof blobToArrayBuffer).toBe('function');
    expect(typeof blobToSlicedArrayBuffer).toBe('function');
    done();
  });

  test('arrayBufferToString function test', (done) => {
    const {
      arrayBufferToString
    } = BinaryUtils;

    const buffer = new ArrayBuffer(16);
    const value = arrayBufferToString(buffer);

    expect(typeof value).toBe('string');
    done();
  });

  test('blobToArrayBuffer function test', (done) => {
    const {
      blobToArrayBuffer
    } = BinaryUtils;
    const blob = new Blob(['test1,test2'], {
      type: 'text/plain'
    });
    const callback = jest.fn();
    const value = blobToArrayBuffer(blob, callback);

    expect(value.byteLength).not.toBe(0);
    done();
  });

  //!!requestHeaders['Range'] === true
  test('blobToSlicedArrayBuffer function test   when !!requestHeaders["Range"] === true', async (done) => {
    const {
      blobToSlicedArrayBuffer
    } = BinaryUtils;
    const blob = new Blob(['test1,test2'], {
      type: 'text/plain'
    });
    const requestHeaders = {
      Range: 'bytes=0-1023'
    };
    const value = await blobToSlicedArrayBuffer(blob, requestHeaders);

    expect(value.end).toBe(11);
    expect(value.start).toBe(0);
    done();
  });

  //!!requestHeaders['Range'] === false
  test('blobToSlicedArrayBuffer function test  when !!requestHeaders["Range"] === false', async (done) => {
    const {
      blobToSlicedArrayBuffer
    } = BinaryUtils;

    const blob = new Blob(['test1,test2'], {
      type: 'text/plain'
    });
    const requestHeaders = {};
    const value = await blobToSlicedArrayBuffer(blob, requestHeaders);

    expect(value.result.byteLength).not.toBe(0);
    done();
  });

  afterAll(() => {
    window.FileReader = oldFileReader;
  });
});