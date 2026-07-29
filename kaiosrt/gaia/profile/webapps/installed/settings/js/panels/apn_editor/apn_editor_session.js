/**
 * The apn editor session module
 */

define(['require','modules/apn/apn_settings_manager','panels/apn_editor/apn_editor_const','modules/apn/apn_utils'],function(require) { //eslint-disable-line
  const ApnSettingsManager = require('modules/apn/apn_settings_manager');
  const ApnEditorConst = require('panels/apn_editor/apn_editor_const');
  const ApnUtils = require('modules/apn/apn_utils');

  const { APN_PROPERTIES } = ApnEditorConst;
  const { VALUE_CONVERTERS } = ApnEditorConst;

  function ApnEditorSession(obj, inputElements, apnItem) {
    this.serviceId = obj.serviceId;
    this.apnMode = obj.mode;
    this.inputElements = inputElements;
    this.apnItem = apnItem;
  }

  ApnEditorSession.prototype = {
    convertValue(value, converter) {
      if (converter) {
        return converter(value);
      }
      return value;
    },
    exportApnSetting(inputElements) {
      const newApnSetting = {};
      APN_PROPERTIES.forEach(function input(name) {
        const inputElement = inputElements[name];
        if (inputElement && !inputElement.classList.contains('hidden')) {
          newApnSetting[name.toLowerCase()] = this.convertValue(
            inputElement.value,
            VALUE_CONVERTERS.TO_DATA[name]
          );
        }
      }, this);
      return newApnSetting;
    },
    commitNew() {
      const promises = [];
      const newApnSetting = this.exportApnSetting(this.inputElements);
      newApnSetting.types.slice().forEach(function newApn(type) {
        newApnSetting.types = [type];
        promises.push(ApnSettingsManager.addApn(this.serviceId, newApnSetting));
      }, this);
      return Promise.all(promises);
    },
    commitEdit() {
      const promises = [];
      const newApnSetting = this.exportApnSetting(this.inputElements);
      if (newApnSetting.types.length === 1) {
        promises.push(
          ApnSettingsManager.updateApn(
            this.serviceId,
            this.apnItem.id,
            newApnSetting
          )
        );
      } else {
        newApnSetting.types.forEach(function newApn(type) {
          const settingClone = ApnUtils.clone(newApnSetting);
          settingClone.types = [type];
          if (type === this.apnItem.apn.types[0]) {
            promises.push(
              ApnSettingsManager.updateApn(
                this.serviceId,
                this.apnItem.id,
                settingClone
              )
            );
          } else {
            promises.push(
              ApnSettingsManager.addApn(this.serviceId, settingClone)
            );
          }
        }, this);
      }
      return Promise.all(promises);
    },
    commit() {
      switch (this.apnMode) {
        case 'new':
          return this.commitNew();
        case 'edit':
          return this.commitEdit();
        default:
          console.error('invalid mode');
          return Promise.resolve();
      }
    },
    cancel() {
      APN_PROPERTIES.forEach(function input(name) {
        this.inputElements[name].value = '';
      }, this);
      this.apnItem = null;
    },
    get mode() {
      return this.apnMode;
    }
  };

  return function apnEditorSession(obj, inputElements, apnItem) {
    return new ApnEditorSession(obj, inputElements, apnItem);
  };
});
