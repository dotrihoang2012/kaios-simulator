import '../../test/mocks/navigator/mobileConnections';
import '../../test/mocks/indexedDB';
import '../../test/mocks/MutationObserver';
import '../../test/mocks/DeviceCapabilityManager';
import '../../test/mocks/navigator/downloadManager';
import '../../test/mocks/navigator/telephony';
import '../../test/mocks/navigator/getDeviceStorage';
import '../../test/mocks/navigator/voicemail';
import '../../test/mocks/navigator/mozApps';
import '../../test/mocks/navigator/getBattery';
import '../../test/mocks/simslot_manager';
import '../../test/mocks/getDataStores';
import '../../test/mocks/Notification';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/speakerManager';
import '../../test/mocks/asyncStorage';
import '../../test/mocks/mock_appOrigin.js';

import '../../test/mocks/screen';
import '../../test/mocks/l10n';
import '../../test/mocks/lazy_loader';
import '../../test/mocks/mock_applications.js';

import React from 'react';
import AppsManager from '../../test/mocks/AppsManager';
import Service from '../../js/service';
import { shallow, mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import App from '../app';

describe('App', () => {
  it('renders without crashing', () => {
    expect(window.Requester).not.toBeUndefined();
  });

  it('window.Service is set', () => {
    expect(global.Service).not.toBeUndefined();
  });
});

