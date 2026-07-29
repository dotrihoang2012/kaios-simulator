import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from "enzyme-to-json";
import Adapter from "enzyme-adapter-react-15.4";
import BaseComponent from 'base-component';
import '../../test/mocks/service';
import Prompt from "../prompt";

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});

describe('<Prompt /> component test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(done => {
    wrapper = mount(<Prompt />);
    instance = wrapper.instance();
    done();
  });

  test('<Prompt /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state().info).toBeNull();
    expect(Service.register).toBeCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toBe('show');
    expect(Service.register.mock.calls[1][0]).toBe('hide');
    done();
  });

  test('show function test', done => {
    jest.mock('base-component');
    BaseComponent.prototype.open = jest.fn();
    jest.spyOn(Service, 'query').mockReturnValueOnce(false);
    const info = {
      icon: 'icon1.png',
      title: 'test_title',
      appName: 'test_appName'
    };
    instance.show(info);
    wrapper.update();
    expect(wrapper.state().info).toEqual({
      "appName": "test_appName",
      "icon": "icon1.png",
      "title": "test_title"
    });
    expect(BaseComponent.prototype.open).toBeCalledTimes(1);
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('hide function test', done => {
    jest.mock('base-component');
    BaseComponent.prototype.close = jest.fn();
    instance.hide();
    wrapper.update();
    expect(wrapper.state().info).toEqual("");
    expect(BaseComponent.prototype.close).toBeCalledTimes(1);
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
