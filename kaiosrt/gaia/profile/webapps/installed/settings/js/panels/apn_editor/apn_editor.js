/**
 * The apn editor module
 */

define(['require','panels/apn_editor/apn_editor_const','panels/apn_editor/apn_editor_session'],function(require) { //eslint-disable-line
  const ApnEditorConst = require('panels/apn_editor/apn_editor_const');
  const ApnEditorSession = require('panels/apn_editor/apn_editor_session');

  const { APN_PROPERTIES } = ApnEditorConst;
  const { APN_PROPERTY_DEFAULTS } = ApnEditorConst;
  const { VALUE_CONVERTERS } = ApnEditorConst;

  function ApnEditor(rootElement) {
    this.inputElements = {};
    APN_PROPERTIES.forEach(function input(name) {
      this.inputElements[name] = rootElement.querySelector(`.${name}`);
    }, this);
  }

  ApnEditor.prototype = {
    convertValue(value, converter) {
      if (converter) {
        return converter(value);
      }
      return value;
    },
    fillInputElements(inputElements, apn) {
      APN_PROPERTIES.forEach(function input(name) {
        const inputElement = inputElements[name];
        if (inputElement) {
          const value =
            (apn && apn[name.toLowerCase()]) || APN_PROPERTY_DEFAULTS[name];
          inputElement.value = this.convertValue(
            value,
            VALUE_CONVERTERS.TO_STRING[name]
          );
        }
      }, this);
    },
    createApn(serviceId, apnItem) {
      this.fillInputElements(this.inputElements, apnItem.apn);
      return ApnEditorSession(
        { serviceId, mode: 'new' },
        this.inputElements,
        apnItem
      );
    },
    editApn(serviceId, apnItem) {
      this.fillInputElements(this.inputElements, apnItem.apn);
      return ApnEditorSession(
        { serviceId, mode: 'edit' },
        this.inputElements,
        apnItem
      );
    }
  };

  return function apnEditor(rootElement) {
    return new ApnEditor(rootElement);
  };
});
