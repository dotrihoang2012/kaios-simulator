/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

"use strict";

(function (exports) {

  const DEBUG = false;
  function debug(s) { if(DEBUG) console.log("-*- PhoneNumberutils: " + s + "\n"); }

  var PhoneNumberUtils = {
    parse: function(aNumber) {
      return new Promise( (resolve, reject) => {
        var file = 'js/phoneutils/data.json';
        if (window.testPhoneNumberUtils) {
          file = 'data.json';
        }
        this.loadJSON(file).then( data => {
          if (DEBUG) debug("parseWithMCC " + aNumber);
          PhoneNumber.loadData(data);
          let pNum = PhoneNumber.Parse(aNumber);
          PhoneNumber.unloadData();
          resolve(pNum);
        })
      });
    },

    parseWithMCC: function(aNumber, aMCC) {
      return new Promise( (resolve, reject) => {
        var file = 'js/phoneUtils/data.json';
        if (window.testPhoneNumberUtils) {
          file = 'data.json';
        }
        this.loadJSON(file).then( data => {
          if (DEBUG) debug("parseWithMCC " + aNumber + ", " + aMCC);
          let countryName = MCC_ISO3166_TABLE[aMCC];
          if (DEBUG) debug("found country name: " + countryName);
          PhoneNumber.loadData(data);
          let pNum = PhoneNumber.Parse(aNumber, countryName);
          PhoneNumber.unloadData();
          resolve(pNum);
        })
      });
    },

    loadJSON: function (file) {
      return new Promise( (resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'json';
        xhr.open('GET', file, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4 && xhr.status == 200) {
            resolve((xhr.response));
          }
        }
        xhr.send(null);
      });
    }
  };
  exports.PhoneNumberUtils = PhoneNumberUtils;
}(window));
