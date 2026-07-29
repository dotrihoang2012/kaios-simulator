/* exported BinaryUtils */
'use strict';

(function (exports) {
  const BinaryUtils = {
    arrayBufferToString: function (arrayBuffer) {
      var results = [];
      var uint8Array = new Uint8Array(arrayBuffer);

      for (var i = 0, length = uint8Array.length; i < length; i += 200000) {
        results.push(String.fromCharCode.apply(null, uint8Array.subarray(i, i + 200000)));
      }

      return results.join('');
    },
    blobToArrayBuffer: function (blob, callback) {
      var fileReader = new FileReader();
      fileReader.onload = function () {
        if (typeof callback === 'function') {
          callback(fileReader.result);
        }
      };
      fileReader.readAsArrayBuffer(blob);

      return fileReader.result;
    },
    blobToSlicedArrayBuffer: function (blob, requestHeaders) {
      return new Promise((resolve, reject) => {
        const isPartialRequest = !!requestHeaders['Range']
        const fileReader = new FileReader();
        if (isPartialRequest) {
          const rangeArray = requestHeaders['Range'].split(/bytes=([0-9]*)-([0-9]*)/);
          const start = parseInt(rangeArray[1]);
          const CHUNK_SIZE = 256 * 1024; // 256 KBytes
          const blobSize = blob.size
          let end = start + CHUNK_SIZE
          if (end > blobSize) {
            end = blobSize
          }
          fileReader.onloadend = () => {
            const result = fileReader.result
            resolve({result, start, end})
          };
  
          const slice = blob.slice(start, end);
          fileReader.readAsArrayBuffer(slice);
        } else {
          fileReader.onload = function () {
            const result = fileReader.result
            resolve({result})
          }
  
          fileReader.onerror = () => {
            reject('error on readAsArrayBuffer')
          }
  
          try {
            fileReader.readAsArrayBuffer(blob);
          } catch (exception) {
            reject('file is too big')
          }
        }
      });
    }
  }
  exports.BinaryUtils = BinaryUtils;
}(window));
