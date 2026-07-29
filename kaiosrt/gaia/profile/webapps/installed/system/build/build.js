const utils = require('utils');
const SystemBuilder = require('./system_builder');
const BrowserBuilder = require('./browser_builder');

exports.execute = function (options) {
  utils.copyToStage(options);
  SystemBuilder.execute(options);
  BrowserBuilder.execute(options);
};
