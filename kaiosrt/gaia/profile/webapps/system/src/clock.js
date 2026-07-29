import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import '../scss/clock.scss';
import '../scss/common.scss';

export default class Clock extends BaseComponent {
  name = 'Clock';

  constructor(props) {
    super(props);

    this.state = {};

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

  componentDidMount() {
    Service.register('start', this);
    Service.register('stop', this);
    this.start();

    window.addEventListener('timechange', this);
    window.addEventListener('screenchange', this);
    window.addEventListener('timeformatchange', this);
    window.addEventListener('localized', this);
  }

  _handle_timechange(evt) {
    this.stop();
    this.start();
  }

  _handle_localized(evt) {
    this.refresh();
  }

  _handle_timeformatchange(evt) {
    this.refresh();
  }

  _handle_screenchange(evt) {
    if (evt.detail.screenEnabled) {
      this.stop();
      this.start();
    }
  }

  componentWillUnmount() {
    this.stop();
    window.removeEventListener('timechange', this);
    window.removeEventListener('screenchange', this);
    window.removeEventListener('timeformatchange', this);
    window.removeEventListener('localized', this);
  }

  start() {
    let now = new Date();
    this.refresh();

    this.timer = setTimeout(() => {
      this.start();
    }, (60 - now.getSeconds()) * 1000);
  }

  refresh() {
    window.api.l10n.once(() => {
      var now = new Date();

      // TODO: workaround for bug 33400 Date.prototype.toLocaleString API
      let clockDateFormat = navigator.language.startsWith('zh') ? '%-m月%e日 %a' : '%a, %b %e';

      // time format ref: http://pubs.opengroup.org/onlinepubs/007908799/xsh/strftime.html
      let hourFormat = window.api.hour12 ? '%I' : '%H';
      let strForTime = new window.api.l10n.DateTimeFormat();

      let allTimeStr = strForTime.localeFormat(
        now,
        `${clockDateFormat} | %p | ${hourFormat} | %M`
      );

      let [nowDateStr, nowPM, nowHour, nowMinute] = allTimeStr.split(' | ');

      nowHour = `00${nowHour}`.slice(-2).split('');
      nowMinute = nowMinute.split('');

      this.setState({
        datetime: strForTime.localeFormat(now, '%Y-%m-%dT%T'),
        timeForReadout: strForTime.localeFormat(now,
          `lockscreen %I:%M ${window.api.hour12 ? '%p' : ''}, %A %B %e`),
        date: nowDateStr,
        h1: (window.api.hour12 && nowHour[0] === '0') ? '' : nowHour[0],
        h2: nowHour[1],
        m1: nowMinute[0],
        m2: nowMinute[1],
        ampm: nowPM
      });
    });
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  render() {
    const lockClassName = SIMSlotManager.isMultiSIM() ? 'multi-sim': '';

    return (
      <div id="clock-view" className={`${lockClassName} ${this.props.className}`}>
        <time
          {...{
            className: 'ClockComponent',
            dateTime: this.state.datetime,
            role: 'menuitem',
            'aria-label': this.state.timeForReadout
          }}
        >
        <div className="clock-upper">
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
          <div
            className="clock-ampm primary"
            data-hour-24={!window.api.hour12}
          >
            {this.state.ampm}
          </div>
        </div>

        <hr className="clock-divider" />

        <div className="date primary">
          {this.state.date}
        </div>
        </time>
      </div>
    );
  }
}
