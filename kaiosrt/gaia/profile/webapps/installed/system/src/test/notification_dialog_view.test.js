/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/SettingsURL';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/service';
import '../../test/mocks/l10n';
import '../../test/mocks/ScreenManager';
import MockApplications from '../../test/mocks/mock_applications';
import NotificationStore from '../notification_store';
import NotificationDialogView from '../notification_dialog_view';
import SoftKeyStore from 'soft-key-store';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});

jest.mock('../notification_dialog_animation', () => {
  return {
    enhanceDialogAnimation: (ComposedComponent) => { return ComposedComponent; }
  }
});

jest.mock('../notification_store', () => {
  return {
    __esModule: true,
    default: { on: jest.fn() }
  }
});
jest.mock('soft-key-store');

describe('<NotificationDialogView /> component test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(done => {
    global.applications = MockApplications;
    wrapper = mount(<NotificationDialogView />);
    instance = wrapper.instance();
    done();
  });

  test('<NotificationDialogView /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state()).toEqual({
      isOpen: false,
      id: '',
      mozbehavior: {},
      app: { icon: '', title: '' },
      notice: { image: '', icon: '', title: '', text: '' },
      actions: []
    });
    expect(typeof instance.onAction).toBe('function');
    expect(typeof instance.onDismiss).toBe('function');
    expect(typeof instance.onStopRingtoneAndVibration).toBe('function');

    expect(Service.register).toBeCalledTimes(3);
    expect(Service.register.mock.calls[0][0]).toEqual('show');
    expect(Service.register.mock.calls[1][0]).toEqual('hide');
    expect(Service.register.mock.calls[2][0]).toEqual('maybeHide');

    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');

    expect(NotificationStore.on).toBeCalledTimes(1);
    expect(NotificationStore.on.mock.calls[0][0]).toEqual('deleted');

    expect(instance.element).not.toBeUndefined();
    expect(instance.dialog).not.toBeUndefined();
    done();
  });

  test('_handle_visibilitychange function test', done => {
    const hideSpy = jest.spyOn(instance, 'hide').mockImplementationOnce(() => {});
    jest.spyOn(document, 'hidden', 'get').mockReturnValueOnce(true);
    instance.state.isOpen = true;
    window.dispatchEvent(new CustomEvent('visibilitychange'));
    expect(hideSpy).toBeCalledTimes(1);
    instance.state.isOpen = false;
    done();
  });

  test('_handle_screenchange function test', done => {
    jest.resetAllMocks();
    window.dispatchEvent(new CustomEvent('screenchange', {detail: { screenEnabled: false}}));
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('NotificationDialogView:hide');
    done();
  });

  test('setHierarchy function test', done => {
    const focusSpy = jest.spyOn(instance, 'focus').mockImplementationOnce(() => {});
    instance.setHierarchy(true);
    expect(focusSpy).toBeCalledTimes(1);
    done();
  });

  test('getSoftKeys function test', done => {
    const actions = [{ text: 'leftText' }, { text: 'rightText' }];
    const softKeys = instance.getSoftKeys(actions);
    expect(softKeys).toEqual({"center": "", "left": "leftText", "right": "rightText"});
    done();
  });

  test('mapNotificationActionToDialogAction function test', done => {
    const notificationAction = {title: 'titleText', action: 'actionText'};
    const result = instance.mapNotificationActionToDialogAction('id', notificationAction);
    expect(result.text).toBe("titleText");
    expect(typeof result.callback).toBe("function");
    done();
  });

  test('mapDetailToActions function test', done => {
    // detail.actions.length is 2
    const detail = {
      id: 'id111',
      actions:[
        { title: 'titleText11', action: 'actionText11' },
        { title: 'titleText22', action: 'actionText11' }
      ]
    };
    const dialogActions = instance.mapDetailToActions(detail);
    expect(dialogActions.length).toBe(2);
    expect(dialogActions[0].text).toBe("titleText11");
    expect(typeof dialogActions[0].callback).toBe("function");
    expect(dialogActions[1].text).toBe("titleText22");
    expect(typeof dialogActions[1].callback).toBe("function");

    // detail.actions is undefined
    const detail1 = {
      id: 'id111'
    };
    const dialogActions1 = instance.mapDetailToActions(detail1);
    expect(dialogActions1.length).toBe(1);
    expect(dialogActions1[0].text).toBe("dismiss");
    expect(typeof dialogActions1[0].callback).toBe("function");
    done();
  });

  test('mapDetailToDialog function test', done => {
    jest.spyOn(MockApplications, 'getByManifestURL').mockReturnValue({
      manifest: {name: 'system'}
    });
    jest.spyOn(Service, 'query')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const detail = {
      id: 'id111',
      appIcon: 'appIcon11',
      manifestURL: 'testUrl',
      image: 'testImage',
      icon: 'testIcon',
      title: 'testTitle',
      text: 'testText'
    };
    const dialogProps = instance.mapDetailToDialog(detail, true);
    expect(dialogProps.id).toBe('id111');
    expect(dialogProps.mozbehavior).toEqual({"silent": true});
    expect(dialogProps.app).toEqual({"icon": "appIcon11", "title": "system"});
    expect(dialogProps.notice).toEqual({
      "icon": "testIcon",
      "image": "testImage",
      "text": "notice-other-content",
      "title": "notice-other-title"
    });
    expect(dialogProps.actions.length).toBe(1);
    expect(dialogProps.actions[0].text).toBe("dismiss");
    expect(typeof dialogProps.actions[0].callback).toBe("function");
    done();
  });

  test('closeOverlay function test', done => {
    const closeSpy = jest.spyOn(instance, 'close').mockImplementationOnce(() => {});
    instance.state.isOpen = true;
    instance.closeOverlay();
    expect(closeSpy).toBeCalledTimes(1);
    instance.state.isOpen = false;
    done();
  });

  test('openOverlay function test', done => {
    jest.useFakeTimers();
    const openSpy = jest.spyOn(instance, 'open').mockImplementationOnce(() => {});
    instance.openOverlay();
    jest.runAllTimers();
    expect(openSpy).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledTimes(1);
    done();
  });

  test('closeDialog function test', async done => {
    const isActiveSpy = jest.spyOn(instance.dialog, 'isActive').mockReturnValue(true);
    const closeSpy = jest.spyOn(instance.dialog, 'close').mockImplementationOnce(() => {});
    const stopVibrationSpy = jest.spyOn(instance, 'stopVibration').mockImplementationOnce(() => {});
    const stopRingtoneSpy = jest.spyOn(instance, 'stopRingtone').mockImplementationOnce(() => {});
    await instance.closeDialog();
    expect(isActiveSpy).toBeCalledTimes(1);
    expect(closeSpy).toBeCalledTimes(1);
    expect(stopVibrationSpy).toBeCalledTimes(1);
    expect(stopRingtoneSpy).toBeCalledTimes(1);
    done();
  });

  test('openDialog function test', done => {
    jest.resetAllMocks();
    jest.spyOn(instance, 'mapDetailToDialog')
      .mockReturnValue({
        mozbehavior: {silent: true}
      });
    jest.spyOn(Service, 'query').mockReturnValueOnce({name: 'SystemUpdateView'});
    const openSpy = jest.spyOn(instance.dialog, 'open').mockImplementationOnce(() => {});
    const vibrateSpy = jest.spyOn(instance, 'vibrate').mockImplementationOnce(() => {});
    const playRingtoneSpy = jest.spyOn(instance, 'playRingtone').mockImplementationOnce(() => {});
    const detail = {
      id: 'id111',
      appIcon: 'appIcon11',
      manifestURL: 'testUrl',
      image: 'testImage',
      icon: 'testIcon',
      title: 'testTitle',
      text: 'testText',
      silent: true
    };
    instance.openDialog(detail, true);
    expect(openSpy).toBeCalledTimes(1);
    expect(vibrateSpy).toBeCalledTimes(1);
    expect(playRingtoneSpy).toBeCalledTimes(1);
    expect(Service.request).toBeCalledTimes(1);
    done();
  });

  test('maybeHide function test', done => {
    const hideSpy = jest.spyOn(instance, 'hide').mockImplementationOnce(() => {});
    const detail = {
      requireInteraction: false,
      id: ''
    };
    instance.maybeHide(detail);
    expect(hideSpy).toBeCalledTimes(1);
    done();
  });

  test('hide function test', async done => {
    instance.state.isOpen = true;
    const closeDialogSpy = jest.spyOn(instance, 'closeDialog').mockImplementationOnce(() => {});
    const closeOverlaySpy = jest.spyOn(instance, 'closeOverlay').mockImplementationOnce(() => {});
    await instance.hide();
    expect(SoftKeyStore.unregister).toBeCalledTimes(1);
    expect(closeDialogSpy).toBeCalledTimes(1);
    expect(closeOverlaySpy).toBeCalledTimes(1);
    instance.state.isOpen = false;
    done();
  });

  test('show function test', async done => {
    const closeDialogSpy = jest.spyOn(instance, 'closeDialog').mockImplementation(() => {});
    const openDialogSpy = jest.spyOn(instance, 'openDialog').mockImplementation(() => {});
    const openOverlaySpy = jest.spyOn(instance, 'openOverlay').mockImplementation(() => {});
    const focusSpy = jest.spyOn(instance, 'focus').mockImplementation(() => {});

    // instance.state.isOpen = true
    instance.state.isOpen = true;
    await instance.show({}, true);
    expect(closeDialogSpy).toBeCalledTimes(1);
    expect(openDialogSpy).toBeCalledTimes(1);
    expect(SoftKeyStore.register).toBeCalledTimes(1);
    expect(focusSpy).toBeCalledTimes(1);

    // instance.state.isOpen = false;
    instance.state.isOpen = false;
    instance.show({}, false);
    expect(openOverlaySpy).toBeCalledTimes(1);
    done();
  });

  test('onAction function test', done => {
    const hideSpy = jest.spyOn(instance, 'hide').mockImplementationOnce(() => {});
    const action = {
      callback: jest.fn()
    };
    instance.state.actions = [action];
    const evt = {
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    };
    instance.onAction(0, evt);
    expect(evt.stopPropagation).toBeCalledTimes(1);
    expect(evt.preventDefault).toBeCalledTimes(1);
    expect(action.callback).toBeCalledTimes(1);
    expect(hideSpy).toBeCalledTimes(1);
    instance.state.actions = [];
    done();
  });

  test('onDismiss function test', done => {
    const hideSpy = jest.spyOn(instance, 'hide').mockImplementationOnce(() => {});
    const evt = {
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    };
    instance.onDismiss(evt);
    expect(evt.stopPropagation).toBeCalledTimes(1);
    expect(evt.preventDefault).toBeCalledTimes(1);
    expect(hideSpy).toBeCalledTimes(1);
    done();
  });

  test('onStopRingtoneAndVibration function test', done => {
    const stopVibrationSpy = jest.spyOn(instance, 'stopVibration').mockImplementationOnce(() => {});
    const stopRingtoneSpy = jest.spyOn(instance, 'stopRingtone').mockImplementationOnce(() => {});
    const evt = {
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    };
    instance.onStopRingtoneAndVibration(evt);
    expect(stopVibrationSpy).toBeCalledTimes(1);
    expect(stopRingtoneSpy).toBeCalledTimes(1);
    expect(evt.stopPropagation).toBeCalledTimes(1);
    expect(evt.preventDefault).toBeCalledTimes(1);
    done();
  });

  test('onKeyDown function test', async done => {
    const onDismissSpy = jest.spyOn(instance, 'onDismiss').mockImplementationOnce(() => {});
    const onActionSpy = jest.spyOn(instance, 'onAction').mockImplementationOnce(() => {});
    const onStopRingtoneAndVibrationSpy = jest.spyOn(instance, 'onStopRingtoneAndVibration').mockImplementation(() => {});
    // this.actions.length == 0
    await wrapper.find('#notification-dialog-container').simulate('keydown', { key: 'EndCall'});

    expect(onDismissSpy).toBeCalledTimes(1);

    // this.actions.length == 1
    const action = {
      callback: jest.fn()
    };
    instance.state.actions = [action];
    await wrapper.find('#notification-dialog-container').simulate('keydown', { key: 'Call'});
    // After reverting Bug 79288,
    // `action1` WON'T be triggered while the `Call` key is pressed.
    expect(onActionSpy).toBeCalledTimes(0);

    // this.actions.length == 2
    instance.state.actions = [action, action];
    await wrapper.find('#notification-dialog-container').simulate('keydown', { key: 'ArrowDown'});
    expect(onStopRingtoneAndVibrationSpy).toBeCalledTimes(1);
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
    done();
  });
});
