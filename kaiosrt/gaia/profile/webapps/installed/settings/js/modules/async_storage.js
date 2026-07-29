/* global */


define(['require'],function(require) { //eslint-disable-line

  return {
    getItem: function getItem(key) {
      return new Promise(resolve => {
        window.asyncStorage.getItem(key, resolve);
      });
    },
    setItem: function setItem(key, value) {
      return new Promise(resolve => {
        window.asyncStorage.setItem(key, value, resolve);
      });
    }
  };
});
