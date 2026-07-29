import BaseEmitter from 'base-emitter';
import DataSource from '../AppStore/DataSource';
import CustomizationTypes from './Types';
import {
  validateCustomizationRule,
  validateShowFolderRule
} from './validator';

class Customization extends BaseEmitter {

  rules = [];
  cachedRulesJson = null;
  customizaed = false;

  static isCustomizedItem(item) {
    return item.source &&
      item.source === DataSource.Customization;
  }

  mount = () => {
    this.fastGetSetting();
    SettingsObserver.observe('home.customization.rules', null,
      this.handleCustomizationRulesUpdate);
  };
  unmount = () => {
    SettingsObserver.unobserve('home.customization.rules',
      this.handleCustomizationRulesUpdate);
  };

  fastGetSetting = () => {
    SettingsObserver.getValue('home.customization.rules')
      .then((value) => {
        this.handleCustomizationRulesUpdate(value);
      });
  };

  handleCustomizationRulesUpdate = (json) => {
    try {
      if (!json || !json.length) {
        // Clean up the rules while received an empty value.
        this.cleanUpCustomizationRules();
        return;
      } else if (JSON.stringify(json) === this.cachedRulesJson) {
        console.warn('Received the same JSON as previous one. Re-render process was skipped.');
        return;
      }
      const updatedRules = json;
      if (!Array.isArray(updatedRules)) {
        throw new Error('Received an invalid customization update, the rule list should be an array.');
      }
      const validatedRules = updatedRules.filter((rule) => {
        validateCustomizationRule(rule);
        switch (rule.type) {
          case CustomizationTypes.ShowFolder:
            validateShowFolderRule(rule);
            return true;
          default:
            throw new Error(`Received an invalid customization rule type: ${rule.type}`);
        }
      });

      this.cachedRulesJson = JSON.stringify(json);
      this.rules = validatedRules;
      this.customizaed = true;
      this.emit('updated');
    } catch (err) {
      console.error(err);
    }
  };

  getCustomFolders = () => {
    return this.rules
      .filter((rule) => rule.type === CustomizationTypes.ShowFolder)
      .map((rule) => rule.params.folder)
      .map((folder) => ({
        ...folder,
        basisname: folder.name.toLowerCase(),
        source: DataSource.Customization
      }));
  };

  cleanUpCustomizationRules = () => {
    this.rules = [];
    this.cachedRulesJson = null;
    this.emit('updated');
  };
}

export default Customization;
