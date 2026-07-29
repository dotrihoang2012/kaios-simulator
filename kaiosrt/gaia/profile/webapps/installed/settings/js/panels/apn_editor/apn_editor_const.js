/**
 * The apn editor const
 */

define([],() => {
  const APN_PROPERTY_DEFAULTS = {
    carrier: '',
    apn: '',
    user: '',
    password: '',
    proxy: '',
    port: '',
    mmsc: '',
    mmsproxy: '',
    mmsport: '',
    authtype: 'notDefined',
    types: ['default'],
    protocol: 'notDefined',
    roaming_protocol: 'notDefined' //eslint-disable-line
  };

  const APN_PROPERTIES = Object.keys(APN_PROPERTY_DEFAULTS);

  const VALUE_CONVERTERS = {
    TO_STRING: {
      types(types) {
        if (types && Array.isArray(types) && types.length) {
          return types.join(', ');
        }
        return 'default';
      }
    },
    TO_DATA: {
      types(string) {
        return string.split(',').map(str => str.trim());
      }
    }
  };

  return {
    get APN_PROPERTIES() {
      return APN_PROPERTIES;
    },
    get APN_PROPERTY_DEFAULTS() {
      return APN_PROPERTY_DEFAULTS;
    },
    get VALUE_CONVERTERS() {
      return VALUE_CONVERTERS;
    }
  };
});
