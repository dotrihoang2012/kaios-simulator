import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/lazy_loader';
import '../../test/mocks/asyncStorage';
import '../../test/mocks/mock_appOrigin.js';
import '../../js/url_helper.js';
import Service from '../../js/service';
import BrowserPinView from '../browser/browser_pin_view';

Enzyme.configure({ adapter: new Adapter() });

global.places = { store: { getPlace: jest.fn(() => Promise.resolve({})) } };
global.browserPinSitesStore = {
  getPinSites: jest.fn(() => Promise.resolve(new Array(6))),
  replace: jest.fn(() => Promise.resolve())
};

describe('BrowserPinView', () => {
  test('BrowserPinView show', (done) => {
    const wrapper = mount(<BrowserPinView />);
    wrapper.instance().show();

    process.nextTick(() => {
      wrapper.update();
      expect(wrapper.find('.browser-pin-item').length).toBe(6);
      done();
    });
  });

  test('BrowserPinView pin', (done) => {
    const wrapper = mount(<BrowserPinView />);
    wrapper.instance().show().then(() => {
      wrapper.update();
      wrapper.find('.browser-pin-item').at(0)
        .simulate('keydown', { key: 'Enter' });
      process.nextTick(() => {
        expect(global.browserPinSitesStore.replace).toHaveBeenCalled();
        done();
      });
    });
  });
});
