import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import Service from 'service';
import { toL10n, insertBetween } from '../util/utils';
import './tutorial.scss';

const storageKey = 'tutorial-has-viewed';
let steps = [
  { enabled: false },    // Step1: Tutorial for side-menu
  { enabled: true },    // Step2: Tutorial for instant-settings
  { enabled: false },   // Step3: Tutorial for notices
  { enabled: true },    // Step4: Tutorial for google-assistant
  { enabled: true },    // Step5: Tutorial for voice-input
  { enabled: true }     // Step6: Tutorial for find-sotre
];
function replaceTextWithComponent(sourceText, placeholder, component) {
  if (!sourceText) { return ''; }
  if (!sourceText.includes(placeholder)) { return sourceText; }
  return (
    <div>
      {insertBetween(sourceText.split(placeholder), component)}
    </div>
  );
}

export default class Tutorial extends BaseComponent {
  name = 'Tutorial';

  constructor(props) {
    super(props);
    this.state = {
      l10n: {},
      hasViewed: ('v0.2' === localStorage.getItem(storageKey)),
      step: 0
    };

    this.tutorialReady = false;
    this.readyFlagCount = 0;
    Service.register('focus', this);
    Service.registerState('hasViewed', this);
    if (!this.state.hasViewed) {
      Service.register('updateDefaultTutorial', this);
      Service.register('updateCustomTutorial', this);
      window.addEventListener('localized', this.updateStepL10n);
    }
    // Update l10n values once window.api.l10n is ready.
    window.api.l10n.once(() => this.updateStepL10n());
  }

  get hasViewed() { return this.state.hasViewed; }

  componentDidMount() {
    window.addEventListener('unload', this.unloadHandler);
    this.updateSoftKeys();
  }

  componentDidUpdate() {
    this.updateSoftKeys();
  }

  // Update customized step.
  updateCustomTutorial(customSteps) {
    if (customSteps && customSteps.length) {
      steps = customSteps;
      this.tutorialReady = true;
    }
    this.readyFlagCount++;
    if (this.readyFlagCount > 1) {
      this.tutorialReady = true;
    }
  }

  // Update default step.
  updateDefaultTutorial(defaultSteps) {
    if (this.tutorialReady) return;
    if (defaultSteps && defaultSteps.length) {
      steps = defaultSteps;
    }
    this.readyFlagCount++;
    if (this.readyFlagCount > 1) {
      this.tutorialReady = true;
    }
  }

  updateStepL10n = () => {
    this.setState({
      l10n: {
        step1: toL10n('tutorial-for-side-menu-1'),
        step2: toL10n('tutorial-for-instant-settings-1'),
        step3: toL10n('tutorial-for-notices'),
        step4: toL10n('tutorial-for-google-assistant-1'),
        step5: toL10n('tutorial-for-voice-input-1'),
        step6: toL10n('tutorial-for-find-kaistore-2')
      }
    });
  }

  unloadHandler = () => {
    window.removeEventListener('unload', this.unloadHandler);
    window.removeEventListener('localized', this.updateStepL10n);
    SoftKeyStore.unregister(this.element);
  }

  updateSoftKeys() {
    let softkeys = null;
    if (this.state.step >= steps.length) {
      softkeys = {
        left: 'back',
        center: 'ok',
        right: ''
      };
    } else if (this.state.step === 2) {
      softkeys = {
        left: '',
        center: '',
        right: 'next'
      };
    } else {
      softkeys = {
        left: 'back',
        center: '',
        right: 'next'
      };
    }

    SoftKeyStore.register(softkeys, this.element);
  }

  focus() {
    if (this.state.hasViewed) {
      return;
    }

    this.element.focus();
    this.setState({
      step: 2
    });
  }

  exit() {
    Service.request('closeSheet', 'tutorial');

    this.setState({
      hasViewed: true,
      step: 0
    });

    this.setLocalStorage(storageKey, 'v0.2');
    if (!localStorage.getItem('experienceRemind')) {
      this.setLocalStorage('experienceRemind', { time: Date.now(), times: 1 });
    }

    Service.unregister('focus', this);
    Service.unregisterState('hasViewed', this);
    Service.unregister('updateDefaultTutorial', this);
    Service.unregister('updateCustomTutorial', this);
    window.removeEventListener('localized', this.updateStepL10n);
  }

  perv() {
    this.setState((prevState) => {
      const pervStepArr =
        steps.map((step, index) => {
          if (index + 1 < prevState.step && step.enabled) {
            return index + 1;
          }
          return false;
        })
        .filter(Boolean);
      const nextEnabledStep = pervStepArr[pervStepArr.length - 1];
      return {
        step: nextEnabledStep
      };
    });
  }

  next() {
    this.setState((prevState) => {
      const nextEnabledStep =
        steps.findIndex((step, index) => (
          index + 1 > prevState.step &&
          step.enabled)
        ) + 1;
      return {
        step: nextEnabledStep
      };
    }, () => {
      if (this.state.step === 0) {
        this.exit();
      }
    });
  }

  setLocalStorage(name, value) {
    try {
      localStorage.setItem(name, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (err) {
      console.error('Set localstorage err!', err);
    }
  }

  onKeyDown = (evt) => {
    if (!this.tutorialReady) return;
    switch (evt.key) {
      case 'SoftRight':
        if (this.state.step < steps.length) {
          this.next();
        }
        break;
      case 'SoftLeft':
        if (this.state.step !== 2) {
          this.perv();
        }
        break;
      default:
        break;
    }
  };

  onKeyUp = (evt) => {
    if (!this.tutorialReady) return;
    switch (evt.key) {
      // Redirect to AllApps
      case 'Enter':
        if (this.state.step === steps.length && this.state.step !== 2) {
          this.exit();
        }
        break;
      default:
        break;
    }
  };

  render() {
    return (
      <div
        id="Tutorial"
        className="Tutorial"
        tabIndex="-1"
        data-has-viewed={this.state.hasViewed}
        data-step={this.state.step}
        onKeyDown={this.onKeyDown}
        onKeyUp={this.onKeyUp}
        ref={(node) => { this.element = node; }}
      >
        <div className="Tutorial__step Tutorial__step--1">
          <div className="Tutorial__fingertip" />
          <div className="Tutorial__text">
            {replaceTextWithComponent(
              this.state.l10n.step1,
              '{{ left }}',
              <span key="step1" className="Tutorial__capital">{toL10n('tutorial-for-left')}</span>
            )}
          </div>
        </div>
        <div className="Tutorial__step Tutorial__step--2">
          <div className="Tutorial__fingertip" />
          <div className="Tutorial__text">
            {replaceTextWithComponent(
              this.state.l10n.step2,
              '{{ up }}',
              <span key="step2" className="Tutorial__capital">{toL10n('tutorial-for-up')}</span>
            )}
          </div>
        </div>
        <div className="Tutorial__step Tutorial__step--3">
          <div className="Tutorial__fingertip" />
          <div className="Tutorial__text">
            {this.state.l10n.step3}
          </div>
        </div>
        <div className="Tutorial__step Tutorial__step--4">
          <div className="Tutorial__fingertip" />
          <div className="Tutorial__text">
            {replaceTextWithComponent(
              this.state.l10n.step4,
              '{{ microphone }}',
              <span key="step4" className="Tutorial__capital">{toL10n('ok')}</span>
            )}
          </div>
        </div>
        <div className="Tutorial__step Tutorial__step--5">
          <div className="Tutorial__fingertip" />
          <div className="Tutorial__text">
            {replaceTextWithComponent(
              this.state.l10n.step5,
              '{{ microphone }}',
              <span key="step5" className="Tutorial__capital">{toL10n('ok')}</span>
            )}
          </div>
        </div>
        <div className="Tutorial__step Tutorial__step--6">
          <div className="Tutorial__text">
            {this.state.l10n.step6}
          </div>
        </div>
      </div>
    );
  }
}
