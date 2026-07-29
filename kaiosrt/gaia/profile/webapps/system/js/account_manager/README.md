# Account Manager

## Supported Accounts

| #   | name                | authenticator ID |
| --- | ------------------- | ---------------- |
| 1   | Google Account      | google           |
| 2   | Exchange ActiveSync | activesync       |
| 3   | KaiOS Account       | kaiaccount       |

## Web Activity Actions

### getAccounts

*Fetch all account information which saved in device DB, order by login time.*

- Sample Code

  ```javascript
  /**
   * Expected Output without Encryption:
   *
   * [{
   *   authenticatorId: "kaiaccount",
   *   accountId: "+886910123456",
   *   userData: { ... }
   * }, {
   *   authenticatorId: "google",
   *   accountId: "example@gmail.com",
   *   userData: { ... }
   * }, {
   *  ...
   * }]
   **/

  activity = new WebActivity('account-manager', {
    action: 'getAccounts',
    publicKey: exportedKey [1],
  });

  activity.start().then(
    result => console.log("WebActivity Success", result),
    error => console.error("WebActivity Failure", error)
  );
  ```

- Failure Return Value

  - access denied

### showLoginPage

*Pop up a login UI for signing in an account, save the credential and information into device DB after login success.*

- Activity Data

  | #   | field           | google   | activesync | kaiaccount |
  | --- | --------------- | -------- | ---------- | ---------- |
  | 1   | authenticatorId | O        | O          | O          |
  | 2   | action          | O        | O          | O          |
  | 3   | publicKey       | O        | O          | O          |
  | 4   | extraInfo       | Optional | Optional   | O          |

  - extraInfo

  | authenticator ID | key          | description / value    |
  | ---------------- | ------------ | ---------------------- |
  | google           | loginHint    | email address to login |
  | activesync       | hideUsedPage | `true` or `false`      |
  | kaiaccount       | loginType    | `phone` or `email`     |

- Sample Code

  ```javascript
  /**
   * Expected Output without Encryption:
   * {
   *   authenticatorId: "kaiaccount",
   *   accountId: "example@gmail.com"
   * }
   **/

  activity = new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showLoginPage',
    publicKey: exportedKey,
    extraInfo: {
      loginType: 'email',
    }
  });

  activity.start().then(
    result => console.log("WebActivity Success", result),
    error => console.error("WebActivity Failure", error)
  );
  ```

- Failure Return Value

  - access denied
  - unknown authenticator id
  - login interrupted
  - no network
  - invalid grant (google only)
  - mismatch state (google only)
  - oauth2 default error (google only)
  - timeout (google only)
  - token redemption failed (google only)
  - badly formed JSON response (google only)
  - get account info failed (google only)

### getCredential

*Get the specific account credential.*

- Activity Data

  | #   | field                   | google | activesync | kaiaccount |
  | --- | ----------------------- | ------ | ---------- | ---------- |
  | 1   | account.authenticatorId | O      | O          | O          |
  | 2   | account.accountId       | O      | O          | Optional   |
  | 3   | action                  | O      | O          | O          |
  | 4   | publicKey               | O      | O          | O          |

- Sample Code

  ```javascript
  /**
   * Expected Output without Encryption:
   *
   * {
   *   username: 'example@kaiostech.com',
   *   password: 'example_password',
   *   configInfo: {
   *     server: 'https://outlook.office365.com/Microsoft-Server-ActiveSync',
   *     deviceId: '...',
   *   }
   * }
   *
   **/

  activity = new WebActivity('account-manager', {
    account: {
      authenticatorId: 'activesync',      // google, activesync, kaiaccount
      accountId: 'example@kaiostech.com'  // The optional field for kaiaccount
    },
    action: 'getCredential',
    publicKey: exportedKey
  });

  activity.start().then(
    result => console.log("WebActivity Success", result),
    error => console.error("WebActivity Failure", error)
  );
  ```

- Success Return Value

  | authenticator ID | value                                                |
  | ---------------- | ---------------------------------------------------- |
  | google           | ['access_token', 'token_type', 'expire_timestamp']   |
  | activesync       | ['username', 'password', 'configInfo']               |
  | kaiaccount       | ['kid', 'mac_key', 'token_type', 'expire_timestamp'] |

- Failure Return Value

  - access denied
  - invalid account

### refreshCredential

*Refresh stored credential, validate account password.*

- Activity Data

  | #   | field                   | google | activesync |
  | --- | ----------------------- | ------ | ---------- |
  | 1   | action                  | O      | O          |
  | 2   | account.authenticatorId | O      | O          |
  | 3   | account.accountId       | O      | O          |
  | 4   | credential              | X      | O          |
  | 5   | publicKey               | O      | O          |

- Sample Code

  ```javascript

  /**
  * Expected Output without Encryption:
  * {
  *   authenticatorId: "activesync",
  *   accountId: "user_name@kaiostech.com"
  * }
  **/

  activity = new WebActivity('account-manager', {
    action: 'refreshCredential',
    account: {
      authenticatorId: 'activesync', // 'google' or 'activesync'
      accountId: 'user_name@kaiostech.com' // 'google' or 'activesync'
    },
    credential: { // only for 'activesync' now
      password: 'example_password',
    },
    publicKey: exportedKey,
  });

  activity.start().then(
    (result) => console.log('activity Success', result),
    (error) => console.error('activity Failure', error)
  );
  ```

- Failure Return Value

  - access denied
  - no network
  - unknown authenticator id
  - invalid account
  - invalid credential (activesync only)
  - incorrect password (activesync only)
  - server error (activesync only)
  - invalid_grant (google only)
  - timeout
  - refresh credential failed

### revokeCredential

*Sign out the specific account and clear the account information from device DB.*

- Activity Data

  | #   | field                   | google | activesync | kaiaccount |
  | --- | ----------------------- | ------ | ---------- | ---------- |
  | 1   | account.authenticatorId | O      | O          | O          |
  | 2   | account.accountId       | O      | O          | Optional   |
  | 3   | action                  | O      | O          | O          |
  | 4   | publicKey               | O      | O          | O          |

- Sample Code

  ```javascript
  activity = new WebActivity('account-manager', {
    account: {
      authenticatorId: 'google',      // google, activesync, kaiaccount
      accountId: 'example@gmail.com'  // The optional field for kaiaccount
    },
    action: 'revokeCredential',
    publicKey: exportedKey,
  });

  activity.start().then(
    result => console.log("WebActivity Success", result),
    error => console.error("WebActivity Failure", error)
  );
  ```

- Failure Return Value

  - access denied
  - no network (google only)
  - invalid account
  - revoke credential failed

### sendRequest

*For now, this action is for KaiOS account only to invoke the specific server request.*

#### Common Usage

  ```javascript
    new WebActivity('account-manager', {
      authenticatorId: 'kaiaccount',
      action: 'sendRequest',
      command: 'requestPhoneVerification|requestEmailVerification',
      args: [ 'phone|email', 'userData.uid' ],
      publicKey: exportedKey,
    });
  ```

##### requestPhoneVerification

*Request an SMS verification code and send to the specific phone number.*

  ```javascript
    new WebActivity('account-manager', {
      authenticatorId: 'kaiaccount',
      action: 'sendRequest',
      command: 'requestPhoneVerification',
      args: [ '+886912345678', 'S92drYffhandcHg7b6ua5Xryr-inhDaHuojNrMNq' ],
      publicKey: exportedKey,
    });
  ```

##### requestEmailVerification

*Request an verification mail and send to the specific email address.*

  ```javascript
    new WebActivity('account-manager', {
      authenticatorId: 'kaiaccount',
      action: 'sendRequest',
      command: 'requestEmailVerification',
      args: [ 'example@gmail.com', 'S92drYffhandcHg7b6ua5Xryr-inhDaHuojNrMNq' ],
      publicKey: exportedKey,
    });
  ```

- Failure Return Value

  - access denied
  - method not found
  - command not supported

### showOtherPage

*For now, this action is for KaiOS account only to invoke the specific UI flow.*

#### Common Usage

  ```javascript
  new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showOtherPage',
    flow: 'changePassword|checkPassword|createAccount|editPersonalInfo|verifyAltPhone',
    args: [ argv1, argv2, ... ],
    publicKey: exportedKey,
  });
  ```

##### changePassword

  ```javascript
  // Change KaiOS account's password
  new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showOtherPage',
    flow: 'changePassword',
    publicKey: exportedKey,
  });
  ```

##### checkPassword

  ```javascript
  // Check KaiOS account's password and update account information
  new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showOtherPage',
    flow: 'checkPassword',
    args: [
      ${userData},    // Whole KaiOS account data object.
      'email'         // update: email, phone, altPhone, deleteAccount
    ],
    publicKey: exportedKey,
  });
  ```

##### createAccount

  ```javascript
  // Sign up KaiOS account
  new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showOtherPage',
    flow: 'createAccount',
    publicKey: exportedKey,
  });
  ```

##### editPersonalInfo

  ```javascript
  // Edit year of birth or gender
  new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showOtherPage',
    flow: 'editPersonalInfo',
    args: [ ${userData} ], // Whole KaiOS account data object
    publicKey: exportedKey,
  });
  ```

##### verifyAltPhone

  ```javascript
  // Verify secondary phone number
  new WebActivity('account-manager', {
    authenticatorId: 'kaiaccount',
    action: 'showOtherPage',
    flow: 'verifyAltPhone',
    args: [
      ${altPhone},        // secondary phone number
      ${uid},             // account unique ID
      ${verificationId}   // verification ID from request verification's response
    ],
    publicKey: exportedKey,
  });
  ```

- Failure Return Value

  - access denied
  - method not found
  - flow not supported

## Setting Values Toggle

Account manager will auto turn on/off these 'enable sync' setting values when google/activesync accounts sign-in/out.

  | key                | purpose          |
  | ------------------ | ---------------- |
  | emailSyncEnable    | for email APP    |
  | contactsSyncEnable | for contact APP  |
  | calendarSyncEnable | for calendar APP |

Use unique key: `${authdicatorId}:${accountId}` to present an account, `true` means toggle on, otherwise means off.

  ```javascript
  {
    [`${authdicatorId}:${accountId}`]: true | false
  }
  ```


[1]: How to generate the public key? please refer to [Generate Asymmetric Key](https://git.kaiostech.com/snippets/235) page.
