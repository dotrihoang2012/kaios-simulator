import BaseEmitter from 'base-emitter';

class SimCardHelper extends BaseEmitter {
  name = 'SimCardHelper';

  constructor() {
    super();
    SimSettingsHelper.observe('outgoingCall', this._handle_outgoingCallChange.bind(this));
    SimSettingsHelper.getCardIndexFrom('outgoingCall', (cardIndex) => {
      this.cardIndex = cardIndex;
      this.emit('ready', cardIndex);
    });
  }

  isAlwaysAsk() {
    return (SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE === this.cardIndex);
  }

  _handle_outgoingCallChange(cardIndex) {
    this.cardIndex = cardIndex;
    this.emit('change', cardIndex);
  }
}

export default (new SimCardHelper());
