/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import ReactDialog from 'react-dialog';
import SoftKeyStore from 'soft-key-store';
import '../../test/mocks/service';
import PermissionDialog from '../permission_dialog';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});
jest.mock('react-dialog', () => {
  const React = require('react');
  class ReactDialog extends React.Component {
    render() {
      return <div id={'react-dialog'}>{this.props.children}</div>
    };
    on = jest.fn();
    show = jest.fn();
    hide = jest.fn()
  }
  return ReactDialog;
});
jest.mock('soft-key-store');

describe('<PermissionDialog /> component test', () => {
  let wrapper = null;
  let instance = null;
  let app = {
    _setVisibleForScreenReader: jest.fn()
  };
  beforeAll(done => {
    wrapper = mount(<PermissionDialog app={app}/>);
    instance = wrapper.instance();
    done();
  });

  test('<PermissionDialog /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state()).toEqual({
      "configs": expect.any(Map),
      "id": "",
      "isApp": false,
      "moreInfoShown": false,
      "name": "",
      "permissions": {}
    });
    expect(instance.softkeys).toEqual({"center": "allow", "left": "deny", "right": "more"});
    expect(instance.element).not.toBeNull();
    expect(instance.moreInfoBox).not.toBeNull();
    expect(instance.container).not.toBeNull();
    expect(wrapper.ref('dialog').on).toHaveBeenCalledTimes(2);
    expect(wrapper.ref('dialog').on.mock.calls[0][0]).toEqual('closed');
    expect(wrapper.ref('dialog').on.mock.calls[1][0]).toEqual('opened');
    done();
  });

  test('componentDidMount function test', done => {
    wrapper.ref('dialog').on.mockImplementation((key, callback) => {callback()});
    const clearSpy = jest.spyOn(instance, 'clear').mockImplementationOnce(() => {});
    jest.spyOn(instance, 'componentDidUpdate').mockImplementationOnce(() => {});
    instance.componentDidMount();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(Service.request).toHaveBeenCalledTimes(2);
    done();
  });

  test('componentDidUpdate function test', done => {
    const updateSoftKeysSpy = jest.spyOn(instance, 'updateSoftKeys').mockImplementationOnce(() => {});
    instance.componentDidUpdate();
    expect(updateSoftKeysSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('updateSoftKeys function test', done => {
    // isSimpleStyle = true
    instance.updateSoftKeys();
    expect(SoftKeyStore.register).toHaveBeenCalledTimes(1);
    expect(instance.softkeys).toEqual({"left": "deny", "right": "allow"});

    // isSimpleStyle = false
    jest.resetAllMocks();
    instance.container.classList.remove('simple-style');
    instance.state.moreInfoShown = true;
    instance.updateSoftKeys();
    expect(SoftKeyStore.register).toHaveBeenCalledTimes(1);
    expect(instance.softkeys).toEqual({"center": "allow", "left": "deny", "right": "less"});
    done();
  });

  test('clear function test', done => {
    instance.clear();
    expect(SoftKeyStore.unregister).toHaveBeenCalledTimes(1);
    expect(wrapper.state()).toEqual({
      "id": "",
      "isApp": false,
      "moreInfoShown": false,
      "name": "",
      "permissions": {},
      "configs": expect.any(Map)
    });
    done();
  });

  test('show function test', done => {
    const config = {
      requestId: 'id_test',
      moreInfoShown: true,
      isApp: true,
      name: 'testApp',
      permissions: {
        "geolocation": {},
        "video-capture": {},
        "audio-capture": {}
      },
      "allow": () => {},
      "deny": () => {}
    };
    instance.show(config);
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state().id).toEqual('id_test');
    expect(wrapper.state().configs.get(wrapper.state().id)).toEqual(config);
    expect(wrapper.ref('dialog').show).toHaveBeenCalledTimes(1);
    expect(app._setVisibleForScreenReader).toHaveBeenCalledWith(false);
    done();
  });

  test('focus function test', done => {
    const focusSpy = jest.spyOn(instance.container, 'focus');
    instance.focus();
    expect(focusSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('scrollMoreInfoBox function test', done => {
    instance.moreInfoBox.scrollTo = jest.fn();
    instance.state.moreInfoShown = true;
    // direction > 0
    instance.scrollMoreInfoBox(1);
    expect(instance.moreInfoBox.scrollTo).toBeCalledWith(0, 0);
    // direction < 0
    jest.resetAllMocks();
    instance.scrollMoreInfoBox(-1);
    expect(instance.moreInfoBox.scrollTo).toBeCalledWith(0, 0);
    instance.state.moreInfoShown = false;
    done();
  });

  test('onFocus function test', done => {
    const updateSoftKeysSpy = jest.spyOn(instance, 'updateSoftKeys').mockImplementationOnce(() => {});
    wrapper.find('.container').simulate('focus');
    expect(updateSoftKeysSpy).toHaveBeenCalledTimes(1);
    done();
  });


  test('hide function test', done => {
    instance.hide();
    expect(app._setVisibleForScreenReader).toHaveBeenCalledWith(true);
    expect(wrapper.ref('dialog').hide).toHaveBeenCalledTimes(1);
    done();
  });

  test('onKeyDown function test', done => {
    const config = {
      requestId: 'id_test',
      moreInfoShown: true,
      isApp: true,
      name: 'testApp',
      permissions: {
        "geolocation": {},
        "video-capture": {},
        "audio-capture": {}
      },
      "allow": () => {},
      "deny": () => {},
      "cancel": () => {}
    };
    instance.show(config);
    wrapper.update();

    const scrollMoreInfoBoxSpy = jest.spyOn(instance, 'scrollMoreInfoBox').mockImplementationOnce(() => {});
    const curConfig = instance.state.configs.get(instance.state.id);
    const hideSpy = jest.spyOn(instance, 'hide');
    const denySpy = jest.spyOn(curConfig, 'deny');
    const allowSpy = jest.spyOn(curConfig, 'allow');

    // evt.key === ArrowDown
    const evt = {
      key: 'ArrowDown'
    };
    wrapper.find('.container').simulate('keydown', evt);
    expect(scrollMoreInfoBoxSpy).toBeCalledWith(1);

    // evt.key === ArrowUp
    const evt1 = {
      key: 'ArrowUp'
    };
    wrapper.find('.container').simulate('keydown', evt1);
    expect(scrollMoreInfoBoxSpy).toBeCalledWith(-1);

    // evt.key === SoftLeft
    const evt2 = {
      key: 'SoftLeft'
    };
    wrapper.find('.container').simulate('keydown', evt2);
    expect(denySpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(1);

    instance.show(config);
    wrapper.update();
    // evt.key === SoftRight
    jest.resetAllMocks();
    const evt3 = {
      key: 'SoftRight'
    };
    // evt.key === SoftRight && this.softkeys.center is object
    instance.softkeys.center = 'allow';
    wrapper.find('.container').simulate('keydown', evt3);
    expect(wrapper.state().moreInfoShown).toBeTruthy();

    // evt.key === SoftRight && this.softkeys.center is undefined
    instance.softkeys.center = undefined;
    wrapper.find('.container').simulate('keydown', evt3);
    expect(allowSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(1);
    instance.softkeys.center = 'allow';

    // evt.key === Enter
    jest.resetAllMocks();
    const evt4 = {
      key: 'Enter'
    };
    wrapper.find('.container').simulate('keyup', evt4);
    expect(allowSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(1);

    instance.show(config);
    wrapper.update();
    // evt.key === BrowserBack
    jest.resetAllMocks();
    const evt5 = {
      key: 'BrowserBack'
    };
    wrapper.find('.container').simulate('keydown', evt5);
    expect(hideSpy).toHaveBeenCalledTimes(1);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    wrapper = null;
    instance = null;
    done();
  });
});
