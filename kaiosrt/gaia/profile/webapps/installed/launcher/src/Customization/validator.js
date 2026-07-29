function throwErrorIfNotExisted(reference, fieldName) {
  if (!reference) {
    throw new Error(`The \`${fieldName}\` field is required.`);
  }
}

export const validateCustomizationRule = (rule) => {
  throwErrorIfNotExisted(rule.type, 'rule.type');
  throwErrorIfNotExisted(rule.params, 'rule.params');
};

export const validateShowFolderRule = (rule) => {
  throwErrorIfNotExisted(rule.params.folder, 'rule.params.folder');
  throwErrorIfNotExisted(rule.params.folder.name, 'rule.params.folder.name');
  throwErrorIfNotExisted(rule.params.folder.enabled, 'rule.params.folder.enabled');
  throwErrorIfNotExisted(rule.params.folder.manifest, 'rule.params.folder.manifest');
  throwErrorIfNotExisted(rule.params.folder.items, 'rule.params.folder.items');
};

