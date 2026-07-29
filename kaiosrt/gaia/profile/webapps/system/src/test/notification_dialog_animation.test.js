/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from "enzyme-to-json";
import Adapter from "enzyme-adapter-react-15.4";
import { enhanceDialogAnimation } from '../notification_dialog_animation';

Enzyme.configure({ adapter: new Adapter()});

describe('notification_dialog_animation.js test', () => {
  let wrapper = null;
  let instance = null;
  class testComponent extends React.Component{
    render() {
      return (<div id={'testComponent'}></div>);
    }
  }

  beforeAll(done => {
    testComponent.prototype.hide = jest.fn();
    testComponent.prototype.show = jest.fn();
    testComponent.prototype.componentDidMount = jest.fn();
    const EnhanceDialogComponent = enhanceDialogAnimation(testComponent);
    wrapper = mount(<EnhanceDialogComponent ref={'dialog'} app={'app'} notice={'notice'} className={'container'} />);
    instance = wrapper.instance();

    document.body.innerHTML = '<div id="notice-body"><p>notice</p></div>';
    done();
  });

  test('Dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state()).toEqual({"effect": "up-to-bottom"});
    expect(testComponent.prototype.componentDidMount).toBeCalledTimes(2);
    expect(testComponent.prototype.hide).toBeCalledTimes(1);
    done();
  });

  test('open function test', done => {
    instance.open();
    expect(wrapper.state()).toEqual({"effect": "bottom-to-up"});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(testComponent.prototype.show).toBeCalledTimes(1);
    done();
  });

  test('close function test', done => {
    jest.useFakeTimers();
    instance.close();
    jest.runAllTimers();
    expect(wrapper.state()).toEqual({"effect": "up-to-bottom"});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(testComponent.prototype.hide).toBeCalledTimes(1);
    done();
  });

  afterAll(() => {
    wrapper.unmount();
  });
});
