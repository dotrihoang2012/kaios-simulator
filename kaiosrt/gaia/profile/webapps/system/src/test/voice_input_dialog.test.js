/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { shallow, mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/l10n';
import VoiceInputDialog from '../voice_input_dialog';

Enzyme.configure({ adapter: new Adapter()});

describe('<VoiceInputDialog /> component test', () => {
  let wrapper = null;
  const blur = jest.fn();
  jest.spyOn(console, 'error').mockImplementationOnce(() => {});
  beforeAll(done => {
    wrapper = shallow(
      <VoiceInputDialog content={'{{ microphone }}'} onBlur={(blur)}/>,
      { disableLifecycleMethods: true }
    );
    done();
  });

  test('<VoiceInputDialog /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('onKeyDown function test', done => {
    const evt = {
      key: 'ArrowDown',
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    };
    wrapper.find('.dialog-container').simulate('keydown', evt);
    expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    done();
  });


  test('onBlur function test', done => {
    wrapper.find('.dialog-container').simulate('blur');
    expect(blur).toHaveBeenCalledTimes(1);
    done();
  });

  test('ref callback function test', done => {
    // Use mount function to test ref callback.
    // Note: Due to ReactDOM.findDOMNode(this) will occur error
    // when invoke parent component's componentDidMount.
    // So, must mock componentDidMount in child component
    // to override parent component's componentDidMount
    const spy = jest
      .spyOn(VoiceInputDialog.prototype, 'componentDidMount')
      .mockImplementation(() => {});
    const component = mount(<VoiceInputDialog />);
    const component2 = mount(<VoiceInputDialog content={'test'}/>);
    expect(Object.prototype.toString.call(component.instance().element)).toBe(
      '[object HTMLDivElement]'
    );
    expect(Object.prototype.toString.call(component2.instance().element)).toBe(
      '[object HTMLDivElement]'
    );
    expect(toJson(component2)).toMatchSnapshot();
    expect(spy).toHaveBeenCalledTimes(2);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    component.unmount();
    component2.unmount();
    done();
  });
});
