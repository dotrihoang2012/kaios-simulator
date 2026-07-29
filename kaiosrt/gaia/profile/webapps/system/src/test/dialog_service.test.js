/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/service';
import ReactDialog from 'react-dialog';
import VoiceInputDialog from '../voice_input_dialog';
import DialogService from '../dialog_service';
import uuid from '../uuid';

Enzyme.configure({ adapter: new Adapter()});
jest.mock('../voice_input_dialog');
jest.mock('react-dialog');
jest.mock('../uuid');

describe('<DialogService /> component test', () => {
  describe('<DialogService /> component test for child VoiceInputDialog', () => {
    let wrapperforVoiceInputDialog = null;
    let spy = jest.spyOn(window, 'addEventListener');
    beforeAll(done => {
      VoiceInputDialog.mockImplementation(() => {
        return {
          focus: jest.fn(),
          show: jest.fn(),
          hide: jest.fn(),
          render: () => {
            return (<div id={'voice_input_dialog'}></div>);
          }
        };
      });
      wrapperforVoiceInputDialog = mount(<DialogService />);
      wrapperforVoiceInputDialog.instance().show({
        id: 'voiceinput',
        style: 'voiceinput'
      });
      wrapperforVoiceInputDialog.update();
      done();
    });

    test('<DialogService /> dom render test', done => {
      expect(Service.register).toHaveBeenCalledTimes(2);
      expect(Service.register.mock.calls[0][0]).toEqual('show');
      expect(Service.register.mock.calls[1][0]).toEqual('hide');
      expect(Service.request).toHaveBeenCalledTimes(3);
      expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');
      expect(Service.request.mock.calls[1][0]).toEqual('turnScreenOn');
      expect(Service.request.mock.calls[2][0]).toEqual('focus');
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1][0]).toEqual('hierarchychanged');
      expect(wrapperforVoiceInputDialog.instance().dialog.show)
        .toHaveBeenCalledTimes(1);
      expect(toJson(wrapperforVoiceInputDialog)).toMatchSnapshot();
      done();
    });

    test('setHierarchy function test', done => {
      wrapperforVoiceInputDialog.instance().setHierarchy(true);
      expect(wrapperforVoiceInputDialog.instance().dialog.focus)
        .toHaveBeenCalledTimes(1);
      done();
    });

    test('isActive function test', done => {
      const isActive = wrapperforVoiceInputDialog.instance().isActive();
      expect(isActive).toBeTruthy();
      done();
    });

    test('hide function test', done => {
      wrapperforVoiceInputDialog.instance().hide();
      wrapperforVoiceInputDialog.instance().hide('reactid');
      expect(wrapperforVoiceInputDialog.instance().dialog.hide)
        .toHaveBeenCalledTimes(1);
      done();
    });

    test('goNextDialog function test when id equals state.id', done => {
      wrapperforVoiceInputDialog.instance().hide('voiceinput');
      done();
    });

    test('clear function test', done => {
      wrapperforVoiceInputDialog.instance().clear();
      expect(wrapperforVoiceInputDialog.state()).toEqual({
        "active": false,
        "configs": new Map(),
        "id": null
      });
      done();
    });

    test('_handle_hierarchychanged function test', done => {
      wrapperforVoiceInputDialog.instance().clear();
      jest.spyOn(Service, 'query')
        .mockReturnValueOnce({ isHomescreen: true })
        .mockReturnValueOnce({ isHomescreen: true })
        .mockReturnValueOnce({ name: 'WindowManager' });
      window.dispatchEvent(new CustomEvent('hierarchychanged'));
      done();
    });

    afterAll(done => {
      wrapperforVoiceInputDialog.unmount();
      done();
    });
  });

  describe('<DialogService /> component test for child ReactDialog', () => {
    let wrapperforReactDialog = null;
    beforeAll(done => {
      ReactDialog.mockImplementation(() => {
        return {
          show: jest.fn(),
          render: () => {
            return (<div id={'react_dialog'} ></div>);
          }
        };
      });
      uuid.mockReturnValue('reactid');
      wrapperforReactDialog = mount(<DialogService />);
      wrapperforReactDialog.instance().show({ });
      wrapperforReactDialog.update();
      done();
    });

    test('<DialogService /> dom render test', done => {
      expect(wrapperforReactDialog.instance().dialog.show)
        .toHaveBeenCalledTimes(1);
      expect(toJson(wrapperforReactDialog)).toMatchSnapshot();
      done();
    });

    afterAll(done => {
      wrapperforReactDialog.unmount();
      done();
    });
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
