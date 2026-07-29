import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import LockscreenNotification from '../../lockscreen/lockscreen_notification';
import NotificationStore from '../../notification_store';
import BaseComponent from 'base-component';

jest.mock('../../notification_store', () => {
  return {
    __esModule: true,
    default: { newComingCountMap: new Map() }
  }
});

Enzyme.configure({ adapter: new Adapter() });

describe('<LockscreenNotification /> component test', () => {
  let wrapper = null;
  beforeAll(done => {
    NotificationStore.newComingCountMap.set('key1', {"count": 1, "icon": "icon"});
    NotificationStore.newComingCountMap.set('key2', {"count": 2, "icon": "icon2"});
    wrapper = mount(<LockscreenNotification />);
    done();
  });

  test('LockscreenNotification dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('componentDidMount function test', done => {
    window.dispatchEvent(new CustomEvent('notification-add-to-lockscreen'));
    expect(wrapper.state().badgeCountMap.size).toBe(2);
    document.dispatchEvent(new CustomEvent('visibilitychange'));
    expect(wrapper.state().hidden).toBeFalsy();
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('componentDidUpdate function test', done => {
    jest.mock('base-component');
    BaseComponent.prototype.hide = jest.fn();
    BaseComponent.prototype.show = jest.fn();
    wrapper.instance().componentDidUpdate();
    expect(BaseComponent.prototype.hide).toBeCalledTimes(1);
    wrapper = mount(<LockscreenNotification enabled={true}/>);
    wrapper.instance().componentDidUpdate();
    expect(BaseComponent.prototype.show).toBeCalledTimes(1);
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
