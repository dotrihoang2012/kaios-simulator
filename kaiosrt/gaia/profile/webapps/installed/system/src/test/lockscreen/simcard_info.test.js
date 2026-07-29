import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import SimcardInfo from '../../lockscreen/simcard_info';
import '../../../test/mocks/simslot_manager';
import '../../../test/mocks/navigator/mobileConnections';
import '../../../test/mocks/navigator/iccManager';
import '../../../test/mocks/SettingsObserver';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('../../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});

describe('<SimcardInfo /> component test', () => {
  let wrapper = null;
  beforeAll(done => {
    jest.spyOn(SIMSlotManager, 'isMultiSIM')
      .mockReturnValue(true);
    wrapper = mount(<SimcardInfo />);
    done();
  });

  test('SimcardInfo dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('_initCardInfos function test', done => {
    const addEventSpy = jest.spyOn(window, 'addEventListener');
    SIMSlotManager.ready = false;
    wrapper.instance()._initCardInfos();
    expect(addEventSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_observe_custom.simcards.name function test', done => {
    const updateCardInfosSpy = jest.spyOn(wrapper.instance(), '_updateCardInfos')
      .mockImplementationOnce(() => {});
    wrapper.instance()['_observe_custom.simcards.name']('Test_cardsName');
    expect(wrapper.instance().simCardsName).toBe('Test_cardsName');
    expect(updateCardInfosSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_observe_airplaneMode.enabled function test', done => {
    wrapper.instance()['_observe_airplaneMode.enabled'](true);
    expect(wrapper.state().isAirplaneMode).toBeTruthy();
    wrapper.instance()['_observe_airplaneMode.enabled'](false);
    expect(wrapper.state().isAirplaneMode).toBeFalsy();
    done();
  });

  test('_handle_datachange function test', done => {
    const updateCardInfosSpy = jest.spyOn(wrapper.instance(), '_updateCardInfos')
      .mockImplementationOnce(() => {});
    wrapper.instance()['_handle_datachange']();
    expect(updateCardInfosSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_voicechange function test', done => {
    const updateCardInfosSpy = jest.spyOn(wrapper.instance(), '_updateCardInfos')
      .mockImplementationOnce(() => {});
    wrapper.instance()['_handle_voicechange']();
    expect(updateCardInfosSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_signalstrengthchange function test', done => {
    const updateCardInfosSpy = jest.spyOn(wrapper.instance(), '_updateCardInfos')
      .mockImplementationOnce(() => {});
    wrapper.instance()['_handle_signalstrengthchange']();
    expect(updateCardInfosSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_capabilitychange function test', done => {
    const updateCardInfosSpy = jest.spyOn(wrapper.instance(), '_updateCardInfos')
      .mockImplementationOnce(() => {});
    wrapper.instance()['_handle_capabilitychange']();
    expect(updateCardInfosSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_simslotready function test', done => {
    const removeEventSpy = jest.spyOn(window, 'removeEventListener');
    const initCardInfosSpy = jest.spyOn(wrapper.instance(), '_initCardInfos')
      .mockImplementationOnce(() => {});
    wrapper.instance()['_handle_simslotready']();
    expect(removeEventSpy).toHaveBeenCalledTimes(1);
    expect(initCardInfosSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_updateCardInfos function test', done => {
    const testObj = {
      getCardState: () => { return 'ready' }
    };
    jest.spyOn(SIMSlotManager, 'getSlots')
      .mockReturnValueOnce([{
        getCardState: () => { return 'getCardState' }
      }, testObj, {}, testObj, testObj, testObj]);

    jest.spyOn(navigator.b2g.iccManager, 'getIccById')
      .mockReturnValueOnce({
        iccInfo: {
          isDisplaySpnRequired: true,
          spn: true,
          isDisplayNetworkNameRequired: true
        }
      });
    const conn1 = {
      iccId: 'test_iccId',
      voice: { connected: true, network: 'test_network' },
      data: { state: 'registered' },
      signalStrength: { level: 10 }
    };
    const conn2 = {
      iccId: 'test_iccId2',
      voice: { connected: true, relSignalStrength: 20 }
    };
    const conn3 = {
      data: { state: 'registered' },
      signalStrength: 30
    };
    const conn4 = {
      iccId: 'test_iccId4',
      signalStrength: 30,
      voice: { connected: false, state: 'searching'}
    };
    const conn5 = {
      iccId: 'test_iccId5',
      signalStrength: 30,
      voice: { connected: false, state: 'searching11'},
      imsHandler: { capability: 'voice-over-wifi'}
    };
    const conns = [conn1, conn2, conn3, conn4, conn5];
    navigator.b2g.mobileConnections = conns;
    wrapper.instance()['_updateCardInfos']();
    expect(wrapper.state().cardInfos).toEqual([
      {"carrierName": undefined, "isVoWifi": undefined, "signalLevel": 11, "stateL10nId": "lockedSim"},
      {"carrierName": undefined, "isVoWifi": undefined, "signalLevel": 1, "stateL10nId": "noService"},
      {"carrierName": undefined, "isVoWifi": undefined, "signalLevel": NaN, "stateL10nId": "noSimCard"},
      {"carrierName": undefined, "isVoWifi": undefined, "signalLevel": 0, "stateL10nId": "searching"},
      {"carrierName": true, "isVoWifi": true, "signalLevel": 0, "stateL10nId": undefined}
    ]);
    expect(wrapper.state().hasVoWifi).toBeTruthy();
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
