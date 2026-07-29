import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import BgCallNotice from '../bg_call_notice';
import '../../test/mocks/service';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/mock_attentionWindowManager';
import * as utils from '../util/utils';
import EnhanceAnimation from '../enhance_animation';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});

describe('<BgCallNotice /> component test', () => {
  let wrapper = null;
  beforeAll(done => {
    wrapper = mount(<BgCallNotice />);
    done();
  });

  test('BgCallNotice initial dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.instance().element).not.toBeNull();
    expect(Service.register).toHaveBeenCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('show');
    expect(Service.register.mock.calls[1][0]).toEqual('close');
    done();
  });

  describe('Dom render test when state change', () => {
    beforeEach(done => {
      attentionWindowManager.isActive.mockReturnValue(true);
      jest.spyOn(Service, 'query')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({url: 'http://network-alerts.localhost'});
      done();
    });

    test('show function test with title', done => {
      const config = {
        title: 'title'
      };
      wrapper.instance().show(config);
      expect(Service.request).toHaveBeenCalledTimes(1);
      expect(Service.request.mock.calls[0][0]).toEqual('turnScreenOn');
      expect(wrapper.state()).toEqual({
        "ariaLabel": "",
        "text": "",
        "textL10n": "",
        "title": "title",
        "titleL10n": ""
      });
      wrapper.update();
      expect(toJson(wrapper)).toMatchSnapshot();
      done();
    });

    test('show function test with titleL10n', done => {
      jest.spyOn(utils, 'toL10n')
        .mockImplementation((val) => {return val});
      const config = {
        titleL10n: 'titleL10n'
      };
      wrapper.instance().show(config);
      expect(Service.request).toHaveBeenCalledTimes(1);
      expect(Service.request.mock.calls[0][0]).toEqual('turnScreenOn');
      expect(wrapper.state()).toEqual({
        "ariaLabel": "",
        "text": "",
        "textL10n": "",
        "title": "",
        "titleL10n": "titleL10n"
      });
      wrapper.update();
      expect(toJson(wrapper)).toMatchSnapshot();
      done();
    });
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    done();
  });
});
