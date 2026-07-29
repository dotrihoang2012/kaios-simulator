import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import Clock from "../clock";
import '../../test/mocks/simslot_manager';
import '../../test/mocks/l10n';

Enzyme.configure({ adapter: new Adapter() });

describe('<Clock /> component test', () => {
  let component = null;
  beforeAll(done => {
    window.api.hour12 = true;
    jest.useFakeTimers();
    window.api.l10n.DateTimeFormat.mockImplementation(() => {
      function localeFormat(d, format){
        return '2020 | 10 | 09 | 16:31';
      }
      return { localeFormat };
    });
    component = mount(<Clock />);
    done();
  });

  test('Clock dom render test', done => {
    jest.runOnlyPendingTimers();

    expect(toJson(component)).toMatchSnapshot();
    expect(window.api.l10n.DateTimeFormat).toBeCalledTimes(2);
    expect(setTimeout).toBeCalledTimes(2);
    expect(component.state()).toEqual({
      datetime: '2020 | 10 | 09 | 16:31',
      timeForReadout: '2020 | 10 | 09 | 16:31',
      date: '2020',
      h1: '',
      h2: '9',
      m1: '1',
      m2: '6',
      ampm: '10'
    });
    done();
  });

  test('timechange should change state value and change dom', done => {
    jest.resetAllMocks();
    window.api.l10n.DateTimeFormat.mockImplementation(() => {
      function localeFormat(d, format){
        return '2019 | 11 | 10 | 13:22';
      }
      return { localeFormat };
    });
    window.dispatchEvent(new CustomEvent('timechange'));
    // Trigger force update to bypass async set state,
    // Otherwise, the dom won't re-render.
    component.update();
    expect(toJson(component)).toMatchSnapshot();
    expect(clearInterval).toBeCalledTimes(1);
    expect(window.api.l10n.DateTimeFormat).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledTimes(1);
    expect(component.state()).toEqual({
      "ampm": "11",
      "date": "2019",
      "datetime": "2019 | 11 | 10 | 13:22",
      "h1": "1",
      "h2": "0",
      "m1": "1",
      "m2": "3",
      "timeForReadout": "2019 | 11 | 10 | 13:22"
    });
    done();
  });

  test('screenchange should change state value and change dom', done => {
    jest.resetAllMocks();
    window.api.l10n.DateTimeFormat.mockImplementation(() => {
      function localeFormat(d, format){
        return '2018 | 12 | 11 | 14:33';
      }
      return { localeFormat };
    });
    window.dispatchEvent(new CustomEvent('screenchange', {
      detail: {
        screenEnabled: true
      }
    }));
    // Trigger force update to bypass async set state,
    // Otherwise, the dom won't re-render.
    component.update();
    expect(toJson(component)).toMatchSnapshot();
    expect(clearInterval).toBeCalledTimes(1);
    expect(window.api.l10n.DateTimeFormat).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledTimes(1);
    expect(component.state()).toEqual({
      "ampm": "12",
      "date": "2018",
      "datetime": "2018 | 12 | 11 | 14:33",
      "h1": "1",
      "h2": "1",
      "m1": "1",
      "m2": "4",
      "timeForReadout": "2018 | 12 | 11 | 14:33"
    });
    done();
  });

  test('timeformatchange should change state value and change dom', done => {
    jest.resetAllMocks();
    window.api.l10n.DateTimeFormat.mockImplementation(() => {
      function localeFormat(d, format){
        return '2015 | 13 | 16 | 20:59';
      }
      return { localeFormat };
    });
    window.dispatchEvent(new CustomEvent('timeformatchange'));
    // Trigger force update to bypass async set state,
    // Otherwise, the dom won't re-render.
    component.update();
    expect(toJson(component)).toMatchSnapshot();
    expect(window.api.l10n.DateTimeFormat).toBeCalledTimes(1);
    expect(component.state()).toEqual({
      "ampm": "13",
      "date": "2015",
      "datetime": "2015 | 13 | 16 | 20:59",
      "h1": "1",
      "h2": "6",
      "m1": "2",
      "m2": "0",
      "timeForReadout": "2015 | 13 | 16 | 20:59"
    });
    done();
  });

  test('componentWillUnmount test', () => {
    const spy = jest.spyOn(window, 'removeEventListener');
    component.unmount();
    expect(clearInterval).toBeCalledTimes(1);
    expect(spy).toBeCalledTimes(4);
    expect(spy.mock.calls[0][0]).toEqual('timechange');
    expect(spy.mock.calls[1][0]).toEqual('screenchange');
    expect(spy.mock.calls[2][0]).toEqual('timeformatchange');
    expect(spy.mock.calls[3][0]).toEqual('localized');
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    window.api.hour12 = undefined;
    done();
  });
});
