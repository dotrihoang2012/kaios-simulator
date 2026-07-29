/* global emitter */
import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import * as utils from './util/utils';
import '../style/scss/clock.scss';
import '../style/scss/common.scss';

export default class Clock extends BaseComponent {
  name = 'Clock';

  initState = {
    datetime: '',
    timeForReadout: '',
    date: '',
    weekday: '',
    h1: '0',
    h2: '0',
    m1: '0',
    m2: '0',
    ampm: '',
    visible: ('true' === localStorage.getItem('home.clock.visible'))
  };

  constructor(props) {
    super(props);

    this.state = { ...this.initState };

    window.api.l10n.once(() => {
      this.ready = true;
      // get cached window.api.hour12 value for performance
      if (null === window.api.hour12) {
        window.api.hour12 = ('true' === localStorage.getItem('locale.hour12'));
      }
      this.refresh();
    });

    this.digiKey = 0;
    this.digiIcons = (weight = 'bold', total = 10) => {
      this.digiKey += 1;
      return [...Array(total)].map((v, i) => {
        return (
          <i
            key={`key_${i}_${weight}_${this.digiKey}`}
            data-icon={`numeric_${i}_${weight}`}
            aria-hidden="true"
          />);
      });
    };

    this.iconsHtml = {
      'bold': this.digiIcons('rounded_semibold'),
      'light': this.digiIcons('light')
    };
  }

  // Not focusable
  focus() {}

  componentWillMount() {
    SettingsObserver.observe('home.clock.visible', null,
      this['_observe_home.clock.visible']);
    SettingsObserver.observe('locale.hour12', null,
      this['_observe_locale.hour12']);
  }

  componentDidMount() {
    Service.register('start', this);
    Service.register('stop', this);
    Service.register('forcedRefresh', this);
    TimeService.addEventListener('timeChange', this._handle_timechange.bind(this));
  }

  _handle_timechange() {
    Service.request('timeUpdate');
    this.stop();
    this.start();
  }

  _handle_timeformatchange() {
    this.refresh();
  }

  _handle_visibilitychange() {
    if ('visible' === document.visibilityState) {
      this.start();
    } else {
      this.stop();
    }
  }

  sendUpdateTime() {
    clearTimeout(this.updateTime);
    this.updateTime = setTimeout(() => {
      emitter.emit('clockTimeUpdate');
    }, 1000);
  }

  start() {
    let now = new Date();
    this.refresh();
    // this.sendUpdateTime();

    this.timer = setTimeout(() => {
      this.start();
    }, (60 - now.getSeconds()) * 1000);
  }

  refresh(isForced) {
    if (!this.state.visible && !isForced) {
      return;
    }

    window.api.l10n.once(() => {
      var now = new Date();
      let lang = window.api.l10n.language.code;

      // time format ref: http://pubs.opengroup.org/onlinepubs/007908799/xsh/strftime.html
      let hourFormat = window.api.hour12 ? '%I' : '%H';
      let strForTime = new window.api.l10n.DateTimeFormat();
      let allTimeStr = strForTime.localeFormat(
        now,
        `%p | ${hourFormat} | %M`
      );

      let [nowPM, nowHour, nowMinute] = allTimeStr.split(' | ');

      nowHour = `00${nowHour}`.slice(-2).split('');
      nowMinute = nowMinute.split('');
      this.setState({
        datetime: strForTime.localeFormat(now, '%Y-%m-%dT%T'),
        timeForReadout: strForTime.localeFormat(now,
          `homescreen %I:%M ${window.api.hour12 ? '%p' : ''}, %A %B %e`),
        date: new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' }).format(now),
        weekday: new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(now),
        h1: (window.api.hour12 && nowHour[0] === '0') ? '' : nowHour[0],
        h2: nowHour[1],
        m1: nowMinute[0],
        m2: nowMinute[1],
        ampm: nowPM
      });
    });
  }

  forcedRefresh() {
    this.refresh(true);
  }

  '_observe_locale.hour12' = (value) => {
    utils.setLocalStorage('locale.hour12', value);
  }

  '_observe_home.clock.visible' = (value) => {
    utils.setLocalStorage('home.clock.visible', value);
    this.setState({
      visible: value
    });

    this.stop();
    if (value) {
      // restart if switching on
      this.start();
      window.addEventListener('moztimechange', this);
      window.addEventListener('timeformatchange', this);
      window.addEventListener('visibilitychange', this);
    } else {
      window.removeEventListener('moztimechange', this);
      window.removeEventListener('timeformatchange', this);
      window.removeEventListener('visibilitychange', this);
    }
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  render() {
    if (!this.state.visible || !this.ready) {
      return null;
    }

    return (
      <time
        {...{
          className: 'ClockComponent',
          dateTime: this.state.datetime,
          role: 'menuitem',
          'aria-label': this.state.timeForReadout
        }}
      >
        <div className="clock-upper">
          <div
            className="clock-ampm secondary"
            data-hour-24={!window.api.hour12}
          >
            {this.state.ampm}
          </div>
          <bdi className="clockDigi-container">
            <span className="hour clockDigi-box">
              <span className="clockDigi clockDigi--time" data-now={this.state.h1}>
                {this.iconsHtml.bold}
              </span>

              <span className="clockDigi clockDigi--time" data-now={this.state.h2}>
                {this.iconsHtml.bold}
              </span>
            </span>

            <div className="clock-colon" />

            <span className="minute clockDigi-box">
              <span className="clockDigi clockDigi--time" data-now={this.state.m1}>
                {this.iconsHtml.bold}
              </span>

              <span className="clockDigi clockDigi--time" data-now={this.state.m2}>
                {this.iconsHtml.bold}
              </span>
            </span>
          </bdi>
        </div>

        <div className="date primary">
          {this.state.weekday}
          <br />
          {this.state.date}
        </div>
      </time>
    );
  }
}
