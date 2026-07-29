import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import FakeContainer from '../fake_container';

Enzyme.configure({ adapter: new Adapter() });

describe('<FakeContainer /> component test', () => {
  let wrapper = null;
  let instance = null;
  let domComponent = null;
  beforeAll(done => {
    wrapper = mount(<FakeContainer children={(<a id='children' />)}/>);
    instance = wrapper.instance();
    domComponent = wrapper.getDOMNode();
    done();
  });

  beforeEach(done => {
    wrapper.setState(
      {
        transition: 'closed',
        animation: 'immediate'
      }
    );
    done();
  });

  test('transition closed -> opened test', done => {
    instance.open('immediate');
    expect(wrapper.state()).toEqual({transition: 'opened', animation: ''});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('transition opened -> closed test', done => {
    instance.open('immediate');
    instance.close('immediate');
    expect(wrapper.state()).toEqual({transition: 'closed', animation: ''});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('transition closed -> opening test', done => {
    instance.open('test');
    expect(wrapper.state()).toEqual({transition: 'opening', animation: 'test'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('transition opened -> closing test', done => {
    instance.open('immediate');
    instance.close('test');
    expect(wrapper.state()).toEqual({transition: 'closing', animation: 'test'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('invoke open when transition is opened/opening/closing', done => {
    instance.open('immediate');
    instance.open();
    expect(wrapper.state()).toEqual({transition: 'opened', animation: ''});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('invoke close when transition is closed/opening/closing', done => {
    instance.close();
    expect(wrapper.state()).toEqual({
      transition: 'closed',
      animation: 'immediate'
    });
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('isHidden function test', done => {
    let isHidden = undefined;
    isHidden = instance.isHidden();
    expect(isHidden).toBeTruthy();
    instance.open('immediate');
    isHidden = instance.isHidden();
    expect(isHidden).toBeFalsy();
    done();
  });

  test('isActive function test', done => {
    let isActive = undefined;
    isActive = instance.isActive();
    expect(isActive).toBeFalsy();
    instance.open('test');
    isActive = instance.isActive();
    expect(isActive).toBeTruthy();
    done();
  });

  test('isTransitioning function test', done => {
    let isTransitioning = undefined;
    isTransitioning = instance.isTransitioning();
    expect(isTransitioning).toBeFalsy();
    instance.open('test');
    isTransitioning = instance.isTransitioning();
    expect(isTransitioning).toBeTruthy();
    done();
  });

  test('onAnimationEnd(opening -> opened) function test', done => {
    instance.open('test');
    domComponent.dispatchEvent(new CustomEvent('animationend'));
    expect(wrapper.state()).toEqual({transition: 'opened', animation: ''});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('onAnimationEnd(closing -> closed) function test', done => {
    instance.open('immediate');
    instance.close('test');
    domComponent.dispatchEvent(new CustomEvent('animationend'));
    expect(wrapper.state()).toEqual({transition: 'closed', animation: ''});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    done();
  });
});
