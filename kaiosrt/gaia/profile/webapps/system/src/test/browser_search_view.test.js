import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/lazy_loader';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/asyncStorage';
import '../../test/mocks/mock_appOrigin.js';
import '../../test/mocks/navigator/mock_connection.js'
import '../../test/mocks/service.js';
import '../../js/url_helper.js';
import BrowserRecentStore from '../browser/browser_recent_store';
import BrowserSearchView from '../browser/browser_search_view';

jest.mock('../browser/browser_recent_store');

Enzyme.configure({ adapter: new Adapter() });

global.Service.mockValues.getTopMostUI = {};
global.places = { store: { readStore: jest.fn(() => Promise.resolve()) } };
global.browserPinSitesStore = { getPinSites: jest.fn(() => Promise.resolve()) };
global.SearchProvider = () => '';
global.SearchProvider.ready = () => Promise.resolve()

describe('BrowserSearchView', () => {
  test('BrowserSearchView show with recent words', (done) => {
    const recnetWords = ['wiki', 'facebook'];
    BrowserRecentStore.getRecentRecords.mockResolvedValue(recnetWords);

    const wrapper = mount(<BrowserSearchView />);
    wrapper.instance().show('');

    process.nextTick(() => {
      wrapper.update();
      expect(wrapper.find('.search-record').length).toBe(2);
      expect(wrapper.find('.search-record').at(0)
        .getDOMNode().dataset.suggestion).toBe('wiki');
      BrowserRecentStore.getRecentRecords.mockReset();
      done();
    });
  });

  test('BrowserSearchView input word', (done) => {
    const wrapper = mount(<BrowserSearchView />);
    wrapper.instance().suggestionsEnabled = false;
    wrapper.setState({ active: true }).find('input').at(0)
      .simulate('change', { target: { value: 'fox' } });

    setTimeout(() => {
      wrapper.update();
      expect(wrapper.find('.focusable').length).toBe(1);
      done();
    }, wrapper.instance().SEARCH_DELAY);
  });

  test('BrowserSearchView hide by lsk', () => {
    const wrapper = mount(<BrowserSearchView />);
    wrapper.setState({ active: true }).find('#browser-search-view').at(0)
      .simulate('keydown', { key: 'SoftLeft' });
    expect(wrapper.state('active')).toBe(false);
  });
});
