/* eslint-disable no-undef */
import '../../test/mocks/navigator/mobileConnections';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/service';
import '../../test/mocks/simslot_manager';
import '../../test/mocks/l10n';
import SimLockStore from '../sim_lock_manager';

describe('sim_lock_manager.js test', () => {
  test('constructor test', done => {
    expect(SimLockStore.mobileConnections).not.toBeUndefined();
    expect(SimLockStore.customNckBehavior).not.toBeUndefined();
    expect(Service.register).toHaveBeenCalledTimes(1);
    expect(Service.register.mock.calls[0][0]).toBe('setNckSkipped');
    expect(window.slm).not.toBeUndefined();
    expect(window.SIMSlotManager).not.toBeUndefined();
    done();
  });

  test('start function test', done => {
    let addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    SimLockStore.start();
    expect(addEventListenerSpy).toHaveBeenCalledTimes(8);
    expect(addEventListenerSpy.mock.calls[0][0]).toBe('simslotready');
    expect(addEventListenerSpy.mock.calls[1][0]).toBe('ftucomms');
    expect(addEventListenerSpy.mock.calls[2][0]).toBe('ftuskip');
    expect(addEventListenerSpy.mock.calls[3][0]).toBe('ftudone');
    expect(addEventListenerSpy.mock.calls[4][0]).toBe('appopened');
    expect(addEventListenerSpy.mock.calls[5][0]).toBe('simslot-updated');
    expect(addEventListenerSpy.mock.calls[6][0]).toBe('simslot-cardstatechange');
    expect(addEventListenerSpy.mock.calls[7][0]).toBe('simslot-iccinfochange');
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('setNckSkipped test', done => {
    let isMultiSIMSpy = jest.spyOn(SIMSlotManager, 'isMultiSIM')
      .mockReturnValueOnce(true);
    SimLockStore.setNckSkipped(0);
    expect(isMultiSIMSpy).toHaveBeenCalledTimes(1);
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toBe('updateDefaultServiceSettings');
    done();
  });

  test('_handle_simslotready function test', done => {
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    window.dispatchEvent(new CustomEvent('simslotready'));
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_simslot-updated function test', done => {
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    window.dispatchEvent(new CustomEvent('simslot-updated'));
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_simslot-iccinfochange function test', done => {
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    window.dispatchEvent(new CustomEvent('simslot-iccinfochange'));
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_simslot-cardstatechange function test', done => {
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    window.dispatchEvent(new CustomEvent('simslot-cardstatechange'));
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_ftucomms function test', done => {
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    const evt = {
      detail: {
        url: 'http://test.com#url'
      }
    };
    window.dispatchEvent(new CustomEvent('ftucomms', evt));
    expect(SimLockStore._skipSimDialog).toBeFalsy();
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    expect(SimLockStore._ShowInFtu).toBeFalsy();
    done();
  });

  test('_handle_ftuskip function test', done => {
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    window.dispatchEvent(new CustomEvent('ftuskip'));
    expect(SimLockStore._skipSimDialog).toBeFalsy();
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_ftudone function test', done => {
    window.dispatchEvent(new CustomEvent('ftudone'));
    expect(SimLockStore._skipSimDialog).toBeFalsy();
    done();
  });

  test('_handle_appopened function test', done => {
    jest.useFakeTimers();
    let showIfLockedSpy = jest.spyOn(SimLockStore, 'showIfLocked')
      .mockImplementationOnce(() => {});
    const evt = {
      detail: {
        manifest: {
          permissions: { 'telephony': {}}
        }
      }
    };
    window.dispatchEvent(new CustomEvent('appopened', evt));
    jest.runAllTimers();
    expect(showIfLockedSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('isBothSlotsLocked function test', done => {
    SimLockStore.isBothSlotsLocked();
    jest.spyOn(SIMSlotManager, 'isMultiSIM')
      .mockReturnValueOnce(true);
    const simSlots = [{
      isUnknownState: () => { return true },
      isLocked: () => { return true }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots);
    const isBothLocked = SimLockStore.isBothSlotsLocked();
    expect(isBothLocked).toBeTruthy();
    const simSlots1 = [{
      isUnknownState: () => { return true },
      isLocked: () => { return false }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots1);
    const isBothLocked1 = SimLockStore.isBothSlotsLocked();
    expect(isBothLocked1).toBeFalsy();
    done();
  });

  test('getCustomBehavior function test', done => {
    const cardsState = ['non_carrier', 'non_carrier2'];
    // index = 1 && case 'toast':
    SimLockStore.customNckBehavior = {
      'non_carrier': 'toast'
    };
    const behavior = SimLockStore.getCustomBehavior(cardsState);
    expect(behavior).toEqual({
      index: 1,
      toast: true,
      nckSkipButton: false,
      showAttentionInNck: false
    });

    // index = 1 && case 'attentionDialog':
    SimLockStore.customNckBehavior = {
      'non_carrier': 'attentionDialog'
    };
    const behavior1 = SimLockStore.getCustomBehavior(cardsState);
    expect(behavior1).toEqual({
      index: 1,
      toast: false,
      nckSkipButton: true,
      showAttentionInNck: true
    });

    // index = 1 && case 'inputDialog':
    SimLockStore.customNckBehavior = {
      'non_carrier': 'inputDialog'
    };
    const behavior2 = SimLockStore.getCustomBehavior(cardsState);
    expect(behavior2).toEqual({
      index: 1,
      toast: false,
      nckSkipButton: true,
      showAttentionInNck: false
    });

    // index = 1 && case 'attentionDialogNoskip':
    SimLockStore.customNckBehavior = {
      'non_carrier': 'attentionDialogNoskip'
    };
    const behavior3 = SimLockStore.getCustomBehavior(cardsState);
    expect(behavior3).toEqual({
      index: 1,
      toast: false,
      nckSkipButton: false,
      showAttentionInNck: true
    });

    // index = 1 && case 'inputDialogNoskip':
    SimLockStore.customNckBehavior = {
      'non_carrier': 'inputDialogNoskip'
    };
    const behavior4 = SimLockStore.getCustomBehavior(cardsState);
    expect(behavior4).toEqual({
      index: 1,
      nckSkipButton: false,
      showAttentionInNck: false,
      toast: false
    });

    // index = 2 && case 'toast':
    const cardsState1 = ['cardsState1', 'cardsState2'];
    SimLockStore.customNckBehavior = {
      'cardsState1-cardsState2': 'toast'
    };
    jest.spyOn(SIMSlotManager, 'isMultiSIM')
      .mockReturnValueOnce(true);
    const behavior5 = SimLockStore.getCustomBehavior(cardsState1);
    expect(behavior5).toEqual({
      index: 2,
      nckSkipButton: false,
      showAttentionInNck: false,
      toast: true
    });
    done();
  });

  test('showIfLocked function test', async done => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    // SIMSlotManager.ready is false
    const bool = SimLockStore.showIfLocked();
    expect(bool).toBeFalsy();

    // Service.query('supportDFC') === undefined
    SIMSlotManager.ready = true;
    const bool1 = SimLockStore.showIfLocked();
    expect(bool1).toBeFalsy();

    // Service.query('supportDFC') != undefined
    jest.spyOn(Service, 'query').mockReturnValue('supportDFC');
    const simSlots = [{}];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": false,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": []
    });

    // slot.simCard is true && case: null
    const simSlots1 = [{
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return null }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots1);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": false,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": []
    });

    // case: networkSubsetLocked
    const simSlots2 = [{
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return 'networkSubsetLocked' }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots2);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": false,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": []
    });

    // case: networkLocked
    const simSlots3 = [{
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return 'networkLocked' }
    }, {
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return 'networkLocked' }
    }];
    SIMSlotManager.getSlots.mockReturnValue(simSlots3);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": false,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": []
    });

    jest.spyOn(Service, 'query')
      .mockReturnValue({})
      .mockReturnValue(false);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": true,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": [simSlots3[1]]
    });

    // case: networkSubsetLocked
    const simSlots4 = [{
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return 'permanentBlocked' }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots4);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": true,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": [simSlots4[0]]
    });

    // case: networkSubsetLocked
    const simSlots5 = [{
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return 'pinRequired' }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots5);
    await SimLockStore.showIfLocked();
    expect(SimLockStore.state).toEqual({
      "active": true,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": [simSlots5[0]]
    });

    // case: default
    const simSlots6 = [{
      index: 1,
      simCard: {
        cardState: 'cardState'
      },
      getCardState: () => { return 'test' }
    }];
    SIMSlotManager.getSlots.mockReturnValueOnce(simSlots6);
    const customBehavior = {
      toast: true
    };
    jest.spyOn(SimLockStore, 'getCustomBehavior').mockReturnValueOnce(customBehavior);
    const bool2 = await SimLockStore.showIfLocked();
    expect(Service.request).toHaveBeenCalledWith('SystemToaster:show', {"text": "xcklockContent"});
    expect(Service.request).toHaveBeenCalledWith('updateDefaultServiceSettings', true);
    expect(bool2).toBeFalsy();
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
