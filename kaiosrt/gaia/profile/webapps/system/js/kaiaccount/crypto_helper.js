'use strict';

(function (exports) {

  var KaiAccountCryptoHelper =  function KaiAccountCryptoHelper() {
    const BASE_SALT = 'identity.mozilla.com/picl/v1/';
    const PHASE_1_KEYWORD = 'quickStretch';
    const PHASE_2_KEYWORD = 'authPW';

    const getKeyword = function cryptoGetKeyword(context) {
      return BASE_SALT + context;
    };

    const arrayBufferToBase64 = function cryptoArrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      let binary = '';

      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    const strToBuf = function crypto_strToBuf(str) {
      return new TextEncoder('utf-8').encode(str);
    };

    const pbkdf2 = function cryptoPBKDF2(password, salt, iterations, hash, mode) {
      return crypto.subtle.importKey(
        'raw', strToBuf(password), { name: 'PBKDF2' }, false, [ 'deriveKey' ]
      ).then(baseKey =>
        crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: strToBuf(salt), iterations, hash },
          baseKey, mode, true, [ 'sign' ]
        )
      ).then(key =>
        crypto.subtle.exportKey('raw', key)
      );
    };

    const hkdf = function cryptoHKDF(
      phase1Result, algorithm, derivedKeyAlgorithm
    ) {
      return crypto.subtle.importKey(
        'raw', phase1Result, { name: 'HKDF' }, false, [ 'deriveKey' ]
      ).then(baseKey =>
        crypto.subtle.deriveKey(
          algorithm, baseKey, derivedKeyAlgorithm, true, [ 'sign' ]
        )
      ).then(key =>
        crypto.subtle.exportKey('raw', key)
      );
    };

    const encryption = function cryptoEncryption(accountId, password) {
      // phase 1
      const salt = getKeyword(
        `${PHASE_1_KEYWORD}:${accountId.toLowerCase()}`
      );
      const iterations = 1000;
      const hash = 'SHA-256';
      const mode = { name: 'HMAC', hash: { name: 'SHA-256' }, length: 256 };

      return pbkdf2(password, salt, iterations, hash, mode).then(
        phase1Result => {
          // phase 2
          const algorithm = {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: strToBuf(''),
            info: strToBuf(getKeyword(PHASE_2_KEYWORD))
          };
          const derivedKeyAlgorithm = {
            name: 'HMAC',
            hash: { name: 'SHA-256' },
            length: 256
          };

          return hkdf(phase1Result, algorithm, derivedKeyAlgorithm)
            .then(key => arrayBufferToBase64(key));
        }
      );
    };

    return {
      'encryption': encryption
    };
  }();

  exports.KaiAccountCryptoHelper = KaiAccountCryptoHelper;
}(window));
