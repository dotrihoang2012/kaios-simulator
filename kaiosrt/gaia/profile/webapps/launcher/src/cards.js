/* global AppStore */
import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import '../style/scss/cards.scss';

const CARDS_MANIFEST_URL = window.AppOrigin.getManifestURL('kaios-cards');
const CARDS_INDEX = `${window.AppOrigin.getOrigin('kaios-cards')}/index.html`;
export default class Cards extends BaseComponent {
  name = 'cards';
  constructor(props) {
    super(props);
    this.state = {
      hasCardsApp: false,
      showCardsApp: false
    };
    this.isIframeCardsLoaded = false;
    Service.register('setCardsFocus', this);
    Service.registerState('hasCardsApp', this);
  }

  componentDidMount() {
    AppStore.on('getAllEnd', this.updateCards);
  }

  updateCards = (apps) => {
    this.hasCardsApp = apps.findIndex(
      (app) => app.manifestUrl.includes(CARDS_MANIFEST_URL)) !== -1;
    this.setState(
      {
        hasCardsApp: this.hasCardsApp,
        showCardsApp: this.hasCardsApp
      },
      () => this.hasCardsApp && this.initCards()
    );
  }

  sendMessage(messageName) {
    const cardsWindow = document.querySelector('#cards');
    if (cardsWindow && cardsWindow.contentWindow) {
      cardsWindow.contentWindow.postMessage(
        JSON.stringify(messageName),
        CARDS_INDEX
      );
    }
  }

  initCards() {
    window.addEventListener('message', (evt) => {
      if (!evt.data) {
        return;
      }
      const { type } = JSON.parse(evt.data);
      if ('iframeCardsLoaded' === type) {
        this.isIframeCardsLoaded = true;
      } else if ('closeCards' === type) {
        this.clearFocusForCards();
      }
      this.sendMessage(type);
    });

    window.addEventListener('visibilitychange', () => {
      const isCardsList = 'cards' === Service.query('lastSheet');
      if (document.hidden) {
        clearTimeout(this.cardsTimer);
        if (!isCardsList) {
          this.releaseCardsIframe();
        }
      } else if (!isCardsList) {
        this.cardsTimer = setTimeout(() => {
          this.restoreCardsIframe();
          this.cardsTimer = null;
        }, 500);
      }
    });
  }

  setCardsFocus = () => {
    if (this.state.hasCardsApp && this.isIframeCardsLoaded) {
      Service.request('openSheet', 'cards');
      const mainView = document.querySelector('#main-view');
      const messageName = JSON.stringify({ type: 'ArrowDown' });
      if (this.element.contentWindow) {
        this.element.contentWindow.postMessage(messageName, CARDS_INDEX);
        mainView.blur();
        this.element.focus();
      }
    }
  }

  clearFocusForCards() {
    this.element && this.element.blur();
    Service.request('closeSheet', 'cards');
  }

  restoreCardsIframe() {
    if (this.state.hasCardsApp) {
      this.setState({
        showCardsApp: true
      });
    }
  }

  releaseCardsIframe() {
    if (this.state.hasCardsApp) {
      this.setState({
        showCardsApp: false
      }, () => {
        this.isIframeCardsLoaded = false;
        this.element.contentWindow.close();
      });
    }
  }

  render() {
    return (
      <div id="cards-container">
        {this.state.hasCardsApp && (
          <iframe
            id="cards"
            title="Cards App"
            className="cards-app"
            src={!this.state.showCardsApp ? '' : `${CARDS_INDEX}#home`}
            ref={(node) => { this.element = node; }}
          />
        )}
      </div>
    );
  }
}
