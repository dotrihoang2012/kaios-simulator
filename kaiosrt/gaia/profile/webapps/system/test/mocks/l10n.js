if (!window.api) {
  window.api = {};
}

window.api.l10n = {
  get: (value) => {
    return value;
  },

  once: (fn) => fn(),
  change: (fn) => fn(),
  DateTimeFormat: jest.fn(),
  setAttributes: jest.fn(),
  language: {}
};

