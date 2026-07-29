import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import DeviceFinancingLock from '../../lockscreen/device_financing_lock';
import '../../../test/mocks/l10n';
import '../../../test/mocks/service';
import '../../../test/mocks/statusbar';

Enzyme.configure({ adapter: new Adapter() });

describe('<DeviceFinancingLock /> component test', () => {
  let wrapper = null;
  beforeAll(done => {
    document.body.innerHTML = '<div id="screen"></div>';
    done();
  });

  test('DeviceFinancingLock dom render test', done => {
    wrapper = mount(<DeviceFinancingLock lockStatus="overdue-modem-lock"/>);
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(Object.prototype.toString.call(wrapper.instance().element)).toBe(
      '[object HTMLDivElement]'
    );
    wrapper.unmount();
    // mock componentDidMount/componentWillUnmount to prevent add/remove event execute multiple times
    jest.spyOn(DeviceFinancingLock.prototype, 'componentDidMount')
      .mockImplementation(() => {});
    jest.spyOn(DeviceFinancingLock.prototype, 'componentWillUnmount')
      .mockImplementation(() => {});
    wrapper = mount(<DeviceFinancingLock lockStatus="inactivation-lock"/>);
    expect(toJson(wrapper)).toMatchSnapshot();
    wrapper.unmount();
    wrapper = mount(<DeviceFinancingLock lockStatus="overdue-level3-lock"/>);
    expect(toJson(wrapper)).toMatchSnapshot();
    wrapper.unmount();
    done();
  });

  test('_handle_screenchange function test', done => {
    wrapper = mount(<DeviceFinancingLock lockStatus="overdue-level3-lock"/>);
    const querySpy = jest.spyOn(Service, 'query')
      .mockReturnValue( true );
    window.dispatchEvent(new CustomEvent('screenchange'));
    expect(querySpy).toBeCalledTimes(1);
    expect(querySpy.mock.calls[0][0]).toEqual('isFtuRunning');
    expect(StatusBar.icons.battery.removeAttribute).toBeCalledTimes(1);
    done();
  });

  test('onKeyDown function test', done => {
    const softRightHandler = jest.fn();
    const softLeftHandler = jest.fn();
    wrapper = mount(
      <DeviceFinancingLock
        lockStatus="overdue-level3-lock"
        softRightHandler={softRightHandler}
        softLeftHandler={softLeftHandler}
      />
    );
    // press SoftRight test
    const evt = {
      key: 'SoftRight'
    };
    wrapper.find('.device-financing-view').simulate('keydown', evt);
    expect(softRightHandler).toBeCalledTimes(1);

    // press SoftLeft test
    const evt1 = {
      key: 'SoftLeft'
    };
    wrapper.find('.device-financing-view').simulate('keydown', evt1);
    expect(softLeftHandler).toBeCalledTimes(1);

    // other key coverage test
    const evt2 = {
      key: 'ArrowUp'
    };
    wrapper.find('.device-financing-view').simulate('keydown', evt2);

    // document.hidden is true
    jest.spyOn(document, 'hidden', 'get').mockReturnValueOnce(true);
    wrapper.find('.device-financing-view').simulate('keydown');
    done();
  });

  test('defaultProps test', done => {
    expect(typeof DeviceFinancingLock.defaultProps.softRightHandler).toBe('function');
    expect(typeof DeviceFinancingLock.defaultProps.softLeftHandler).toBe('function');
    DeviceFinancingLock.defaultProps.softRightHandler();
    DeviceFinancingLock.defaultProps.softLeftHandler();
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
