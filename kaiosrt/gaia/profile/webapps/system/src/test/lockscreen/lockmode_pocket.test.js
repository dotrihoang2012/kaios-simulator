import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import SoftKeyStore from 'soft-key-store';
import LockmodePocket from '../../lockscreen/lockmode_pocket';
import '../../../test/mocks/service';
import BaseComponent from 'base-component';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('base-component');
jest.mock('soft-key-store');
jest.mock('../../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});

describe('<LockmodePocket /> component test', () => {
  let wrapper = null;
  let unlockCB = jest.fn();
  beforeAll(done => {
    document.body.innerHTML = '<div id="screen"></div>';
    wrapper = mount(<LockmodePocket unlock={unlockCB} />);
    done();
  });

  test('LockmodePocket dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(BaseComponent.prototype.debug).toBeCalledTimes(1);
    expect(BaseComponent.prototype.debug.mock.calls[0][0]).toBe('did mount, should be locked by pocketmode');
    expect(wrapper.instance().element).not.toBeNull();
    expect(SoftKeyStore.register).toBeCalledTimes(1);
    expect(document.getElementById('screen').classList.contains('locked')).toBeTruthy();
    done();
  });

  test('onKeyDown function test', done => {
    wrapper.find('.pocketmode-view').simulate('keydown');
    // case 'Enter' test
    jest.resetAllMocks();
    jest.spyOn(Service, 'query').mockReturnValue(true);
    const evt = { key: 'Enter' };
    wrapper.find('.pocketmode-view').simulate('keydown', evt);
    expect(BaseComponent.prototype.debug).toBeCalledTimes(1);
    expect(BaseComponent.prototype.debug.mock.calls[0][0]).toBe('start unlocking by holding Enter button');
    expect(BaseComponent.prototype.publish).toBeCalledTimes(1);
    expect(BaseComponent.prototype.publish.mock.calls[0][0]).toBe('unlocking-start');
    expect(unlockCB).toBeCalledTimes(1);

    // default case test
    jest.resetAllMocks();
    jest.spyOn(Service, 'query').mockReturnValue(true);
    const evt1 = { key: 'ArrowUp' };
    wrapper.find('.pocketmode-view').simulate('keydown', evt1);
    expect(BaseComponent.prototype.debug).toBeCalledTimes(1);
    expect(BaseComponent.prototype.debug.mock.calls[0][0]).toBe("onKeyDown: 'ArrowUp'");
    done();
  });

  test('onKeyUp function test', done => {
    // case 'Enter' test
    jest.resetAllMocks();
    const evt = { key: 'Enter' };
    wrapper.find('.pocketmode-view').simulate('keyup', evt);
    expect(BaseComponent.prototype.debug).toBeCalledTimes(1);
    expect(BaseComponent.prototype.debug.mock.calls[0][0]).toBe('stop unlocking when releasing Enter button');
    expect(BaseComponent.prototype.publish).toBeCalledTimes(1);
    expect(BaseComponent.prototype.publish.mock.calls[0][0]).toBe('unlocking-stop');

    // default case test
    jest.resetAllMocks();
    const evt1 = { key: 'ArrowUp' };
    wrapper.find('.pocketmode-view').simulate('keyup', evt1);
    expect(BaseComponent.prototype.debug).toBeCalledTimes(1);
    expect(BaseComponent.prototype.debug.mock.calls[0][0]).toBe("onKeyUp: 'ArrowUp'");
    done();
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
