/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from "enzyme-to-json";
import Adapter from "enzyme-adapter-react-15.4";
import NotificationItem from '../notification_item';
import '../../test/mocks/l10n';

Enzyme.configure({ adapter: new Adapter()});

describe('<NotificationItem /> component test', () => {
  let wrapper = null;
  beforeEach(done => {
    jest.spyOn(Date.prototype, 'getTime').mockImplementation(() => 1608530615437);
    window.api.l10n.DateTimeFormat.mockImplementation(() => {
      return {
        fromNow: () => {return 'August 31, 11:59 PM'}
      }
    });
    done();
  });

  test('<NotificationItem /> dom render test', done => {
    const detail = {
      id: 'label#id',
      icon: '?icon/',
      dismissable: true,
      sizeText: 'sizeText',
      title: 'title',
      text: 'text'
    };
    wrapper = mount(<NotificationItem {...detail}/>);
    expect(toJson(wrapper)).toMatchSnapshot();
    const detail1 = {
      id: 'label:#id:',
      icon: 'blob://',
      dismissable: true,
      progress: true,
      type: 'type',
      data: { bluetoothSize: 'bluetoothSize'},
      title: 'title',
      text: 'text'
    };
    wrapper = mount(<NotificationItem {...detail1}/>);
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  describe('functions test', () => {
    let inner = null;
    beforeEach(done => {
      const detail = {
        id: 'label#id',
        icon: '?icon/',
        dismissable: true,
        sizeText: 'sizeText',
        title: 'title',
        text: 'text'
      };
      inner = mount(<NotificationItem {...detail} title={'testTitle'}/>);
      window.accessibility = {
        settings: { 'accessibility.screenreader': false }
      };
      done();
    });

    test('componentDidMount function test', done => {
      jest.spyOn(inner.instance().primary, 'scrollWidth', 'get').mockReturnValue(10);
      inner.instance().componentDidMount();
      expect(inner.instance().element).not.toBeUndefined();
      expect(inner.instance().primary).not.toBeUndefined();
      expect(inner.instance().isLongText).toBeTruthy();
      expect(inner.instance().scrollWidth).toBe(10);
      done();
    });

    test('componentDidUpdate function test', done => {
      jest.spyOn(inner.instance().primary, 'scrollWidth', 'get').mockReturnValue(10);
      inner.instance().componentDidUpdate();
      expect(inner.instance().primaryText).toBe('testTitle');
      expect(inner.instance().isLongText).toBeTruthy();
      done();
    });

    test('updateTextContent function test', done => {
      inner.instance().updateTextContent();
      done();
    });

    test('updateTimestamps function test', done => {
      inner.instance().updateTimestamps();
      done();
    });

    test('onFocus function test', done => {
      const showMarqueeSpy = jest.spyOn(inner.instance(), 'showMarquee').mockImplementation(() => {});
      jest.useFakeTimers();
      inner.instance().isLongText = true;

      inner.find('.notification').simulate('focus');
      jest.runOnlyPendingTimers();
      expect(inner.instance().primary.style.textOverflow).toBe('unset');
      expect(inner.instance().primary.innerText).toBe("undefined              undefined");
      expect(showMarqueeSpy).toBeCalledTimes(1);
      done();
    });

    test('onBlur function test', done => {
      const hideMarqueeSpy = jest.spyOn(inner.instance(), 'hideMarquee').mockImplementation(() => {});
      inner.instance().isLongText = true;
      inner.find('.notification').simulate('blur');
      expect(hideMarqueeSpy).toBeCalledTimes(1);
      done();
    });

    test('showMarquee function test', done => {
      // isRtl is false
      const hideMarqueeSpy = jest.spyOn(inner.instance(), 'hideMarquee').mockImplementation(() => {});
      inner.instance().showMarquee();
      expect(hideMarqueeSpy).toBeCalledTimes(1);

      // isRtl is true
      jest.useFakeTimers();
      document.dir = 'rtl';
      inner.instance().scrollWidth = 0;
      inner.instance().showMarquee();
      const showMarqueeSpy = jest.spyOn(inner.instance(), 'showMarquee').mockImplementation(() => {});
      jest.runOnlyPendingTimers();
      expect(showMarqueeSpy).toBeCalledTimes(1);
      expect(inner.instance().primary.scrollLeft).toBe(-6);
      done();
    });

    test('hideMarquee function test', done => {
      jest.useFakeTimers();
      inner.instance().hideMarquee();
      expect(inner.instance().primary.innerText).toBe(undefined);
      expect(inner.instance().primary.style.textOverflow).toBe('ellipsis');
      expect(inner.instance().primary.scrollLeft).toBe(0);
      expect(clearTimeout).toBeCalledTimes(2);
      done();
    });

    afterAll(done => {
      inner.unmount();
      window.accessibility = undefined;
      done();
    });
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
