const DEBUG = true;
export function debug(...args) {
  if (DEBUG) {
    args.unshift('[ELM]');
    console.log.apply(console, args);
  }
}

/*
* A utility function get values for all of the specified settings.
* settingKeysAndDefaults is an object that maps settings keys to default
* values. We query the value of each of those settings and then create an
* object that maps keys to values (or to the default values) and pass
* that object to the callback function.
*/
export function getSettings(settingKeysAndDefaults, callback) {
  var pendingQueries = 0;
  var results = {};
  for (var key in settingKeysAndDefaults) {
    var defaultValue = settingKeysAndDefaults[key];
    query(key, defaultValue);
    pendingQueries++;
  }

  function query(key, defaultValue) {
    SettingsObserver.getValue(key).then((value) => {
      if (value === undefined || value === null) {
        value = defaultValue;
      }
      results[key] = value;
      pendingQueries--;
      if (pendingQueries === 0) {
        callback(results);
      }
    });
  }
}

export function getItem(key) {
  return new Promise((resolve) => {
    asyncStorage.getItem(key, data => {
      resolve(data);
    });
  })
}

export function setItem(key, data) {
  return new Promise((resolve) => {
    asyncStorage.setItem(key, data, cb => {
      resolve(cb);
    });
  })
}

