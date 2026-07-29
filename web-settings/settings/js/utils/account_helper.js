
// eslint-disable-next-line
window.AccountHelper = (function AccountHelper() {
  const ASYMMETRIC_ALGORITHM_NAME = 'RSA-OAEP';
  const SYMMETRIC_ALGORITHM_NAME = 'AES-GCM';
  const ACCOUNT_KEY_READY = 'accountKeyReady';
  const textDecoder = new TextDecoder();
  let accountComplete = false;
  let accountInfo = null;
  let kaiAccountInfo = null;
  let kaiAccountLogin = false;
  let accountChanged = false;
  const KEY_MAP = {
    keyPair: null,
    exportedKey: null
  };

  function generateKey() {
    window.crypto.subtle
      .generateKey(
        {
          name: ASYMMETRIC_ALGORITHM_NAME,
          modulusLength: 1024,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: 'SHA-256'
        },
        true, // Extractable
        ['wrapKey', 'unwrapKey'] // KeyUsages
      )
      .then(keyPair => {
        KEY_MAP.keyPair = keyPair;
        window.crypto.subtle
          .exportKey('jwk', KEY_MAP.keyPair.publicKey)
          .then(exportedKey => {
            KEY_MAP.exportedKey = exportedKey;
            window.dispatchEvent(new CustomEvent(ACCOUNT_KEY_READY));
          })
          .catch(err => {
            DebugHelper.log('AccountHelper exportKey: ', err);
          });
      })
      .catch(err => {
        DebugHelper.log('AccountHelper generateKey: ', err);
      });
  }

  function decryptKey(response) {
    return new Promise(resolve => {
      const { encrypted, symmetricKey, iv } = response;
      window.crypto.subtle
        .unwrapKey(
          'raw',
          symmetricKey, // The key you want to unwrap
          KEY_MAP.keyPair.privateKey,
          {
            name: ASYMMETRIC_ALGORITHM_NAME,
            hash: { name: 'SHA-256' }
          },
          {
            name: 'AES-GCM',
            length: 256
          },
          false,
          ['decrypt']
        )
        .then(cryptoKey => {
          window.crypto.subtle
            .decrypt(
              {
                name: SYMMETRIC_ALGORITHM_NAME,
                iv
              },
              cryptoKey,
              encrypted
            )
            .then(decryptedText => {
              resolve(JSON.parse(textDecoder.decode(decryptedText)));
            })
            .catch(err => {
              DebugHelper.log('AccountHelper decryptResponse: ', err);
            });
        })
        .catch(err => {
          DebugHelper.log('AccountHelper unwrapKey: ', err);
        });
    });
  }

  function updateAccount() {
    /*
     * Since the activity can't be used on background, so it will be refresh
     *when account changed and settings back on foreground
     */
    if (accountChanged && !document.hidden) {
      refreshAccount();
    }
  }

  function init() {
    if (KEY_MAP.exportedKey) {
      getAccount();
    } else {
      generateKey();
      window.addEventListener(
        ACCOUNT_KEY_READY,
        () => {
          getAccount();
        },
        { once: true }
      );
    }
  }

  function addObserve() {
    ApiManager.accountManager.observe('activesync', data => {
      DebugHelper.debug(`activesync changed:${JSON.stringify(data)}`);
      accountChanged = true;
      updateAccount();
    });
    ApiManager.accountManager.observe('google', data => {
      DebugHelper.debug(`google changed:${JSON.stringify(data)}`);
      accountChanged = true;
      updateAccount();
    });
    ApiManager.accountManager.observe(
      'kaiaccount',
      data => {
        DebugHelper.debug(`kaiaccount changed:${JSON.stringify(data)}`);
        accountChanged = true;
        updateAccount();
      },
      true
    );
  }

  function getAccount() {
    ActivityHelper.start({
      name: 'account-manager',
      data: {
        action: 'getAccounts',
        publicKey: KEY_MAP.exportedKey
      }
    }).then(
      result => {
        accountChanged = false;
        decryptKey(result).then(value => {
          DebugHelper.debug(`getAccounts Success${JSON.stringify(value)}`);
          accountComplete = true;
          accountInfo = value;
          const kaiAccount = getAccountListByType(['kaiaccount']);
          if (kaiAccount.length > 0) {
            kaiAccountLogin = true;
            kaiAccountInfo = kaiAccount[0]; // eslint-disable-line
          } else {
            kaiAccountLogin = false;
          }
          window.dispatchEvent(new CustomEvent('accountReady'));
        });
      },
      error => {
        DebugHelper.log(`getAccounts Failure${error}`);
      }
    );
  }

  function refreshAccount() {
    accountComplete = false;
    kaiAccountLogin = false;
    getAccount();
  }

  function getAccountListByType(typeArray) {
    const accountList = [];
    for (let i = 0; i < accountInfo.length; i++) {
      if (typeArray.indexOf(accountInfo[i].authenticatorId) > -1) {
        accountList.push(accountInfo[i]);
      }
    }
    return accountList;
  }

  function getAccountInfo(typeArray) {
    return new Promise(resolve => {
      if (!accountComplete) {
        window.addEventListener('accountReady', function onChangeEvent() {
          window.removeEventListener('accountReady', onChangeEvent);
          resolve(getAccountListByType(typeArray));
        });
      } else {
        resolve(getAccountListByType(typeArray));
      }
    });
  }

  function showLoginPage(type) {
    return new Promise(resolve => {
      ActivityHelper.start({
        name: 'account-manager',
        data: {
          authenticatorId: 'kaiaccount',
          action: 'showLoginPage',
          publicKey: KEY_MAP.exportedKey,
          extraInfo: {
            loginType: type
          }
        }
      }).then(
        response => {
          decryptKey(response).then(result => {
            DebugHelper.debug(`Login Success${JSON.stringify(result)}`);
            resolve(result && result.success);
          });
        },
        error => {
          DebugHelper.log(`Login Failure${error}`);
          resolve(false);
        }
      );
    });
  }

  function showOtherPage() {
    return new Promise(resolve => {
      ActivityHelper.start({
        name: 'account-manager',
        data: {
          authenticatorId: 'kaiaccount',
          action: 'showOtherPage',
          publicKey: KEY_MAP.exportedKey,
          flow: 'createAccount'
        }
      }).then(
        response => {
          decryptKey(response).then(result => {
            DebugHelper.debug(`Login Success${JSON.stringify(result)}`);
            resolve(result && result.success);
          });
        },
        error => {
          DebugHelper.log(`Login Failure${error}`);
          resolve(false);
        }
      );
    });
  }

  function showErrorDialog(err) {
    let msgId = null;
    switch (err) {
      case 'no network':
        msgId = 'no-internet-connection';
        break;
      case 'timeout':
        break;
      case 'user cancel':
        break;
      case 'access denied':
        msgId = 'access-denied';
        break;
      case 'incorrect password':
        msgId = 'wrong-password';
        break;
      case 'SERVER_ERROR':
      case 'error':
        msgId = 'server-error';
        break;
      case 'duplicate_account':
        msgId = 'duplicate-account';
        break;
      default:
        break;
    }
    if (msgId) {
      ToastHelper.showToast(msgId);
    }
  }

  return {
    init,
    addObserve,
    decryptKey,
    refreshAccount,
    getAccountInfo,
    updateAccount,
    get publicKey() {
      return KEY_MAP.exportedKey;
    },
    get kaiAccountLogin() {
      return kaiAccountLogin;
    },
    get kaiAccountInfo() {
      return kaiAccountInfo;
    },
    showLoginPage,
    showOtherPage,
    showErrorDialog
  };
})();
window.AccountHelper.init();
