function MockFileReader() {}
MockFileReader.prototype = {
  readAsArrayBuffer: param => {
    return param;
  },
  readAsText: param => {
    return param;
  },
  set onloadend(cb) {
    cb.call(this);
  },
  set onload(cb) {
    cb.call(this);
  },
  get result() {
    return new ArrayBuffer(16);
  }
};

export default MockFileReader;