/* exported AccountManagerCryptoHelper */

/* global AccountManagerConstants */
'use strict';

(function (exports) {
  function log() {
    console.log('[system][AccountManagerCryptoHelper]', ...arguments);
  }

  function generateSymmetricKey(message) {
    window.crypto.subtle
      .generateKey(
        {
          // algorithm
          name:
            AccountManagerConstants.CRYPTO_ALGORITHM.SYMMETRIC_ALGORITHM_NAME,
          length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt'] // usages
      )
      .then((symmetricKey) => {
        log('symmetricKey: ', symmetricKey);
        encryptWithSymmetricKey(message, symmetricKey);
      })
      .catch((err) => {
        log('generateSymmetricKey err: ', err);
      });
  }

  function encryptWithSymmetricKey(message, symmetricKey) {
    const enc = new TextEncoder();
    const { activityResult } = message;
    const encodedMessage = enc.encode(JSON.stringify(activityResult));
    log('encryptWithSymmetricKey encodedMessage: ', encodedMessage);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    window.crypto.subtle
      .encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        symmetricKey,
        encodedMessage
      )
      .then((encrypted) => {
        log('encryptWithSymmetricKey: ', encrypted);
        importPublicKey(message, symmetricKey, encrypted, iv);
      })
      .catch((err) => {
        log('encryptWithSymmetricKey err: ', err);
      });
  }

  function importPublicKey(message, symmetricKey, encrypted, iv) {
    const { publicKey } = message;
    window.crypto.subtle
      .importKey(
        'jwk', // format
        publicKey, // keyData
        {
          // algorithm
          name:
            AccountManagerConstants.CRYPTO_ALGORITHM.ASYMMETRIC_ALGORITHM_NAME,
          hash: 'SHA-256',
        },
        true, // extractable
        ['wrapKey'] // usages
      )
      .then((pKey) => {
        wrapSymmetricKey(message, pKey, symmetricKey, encrypted, iv);
      })
      .catch((err) => {
        log('importKey: ', err);
      });
  }

  function wrapSymmetricKey(message, publicKey, symmetricKey, encrypted, iv) {
    const enc = new TextEncoder();
    const encodedMessage = enc.encode(JSON.stringify(symmetricKey));
    log('wrapSymmetricKey encodedMessage: ', encodedMessage);
    window.crypto.subtle
      .wrapKey('raw', symmetricKey, publicKey, {
        name:
          AccountManagerConstants.CRYPTO_ALGORITHM.ASYMMETRIC_ALGORITHM_NAME,
        hash: { name: 'SHA-256' },
      })
      .then(function (wrapped) {
        const packedData = {
          symmetricKey: wrapped,
          iv,
          encrypted,
        };
        log('packedData: ', packedData);
        const result = {
          ...message,
          activityResult: packedData,
        };
        log('postPackedResponse: ', result);
        postPackedResponse(result);
      })
      .catch(function (err) {
        log(err);
      });
  }

  function postPackedResponse(result) {
    const iframeSwProxy = window.document.getElementById('sw-proxy');
    const proxySrc = iframeSwProxy.src;
    const packedMessage = { type: 'activity-result', ...result };
    log(`packedMessage: ${JSON.stringify(packedMessage)}`);
    iframeSwProxy.contentWindow.postMessage(packedMessage, proxySrc);
  }

  const AccountManagerCryptoHelper = {
    postActivityResult: (result) => {
      const { publicKey, isError } = result;
      if (publicKey && !isError) {
        generateSymmetricKey(result);
      } else {
        postPackedResponse(result);
      }
    },
  };

  exports.AccountManagerCryptoHelper = AccountManagerCryptoHelper;
})(window);
