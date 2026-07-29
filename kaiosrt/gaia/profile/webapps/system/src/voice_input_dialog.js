import React from 'react';
import ReactDialog from 'react-dialog';
import '../scss/voice_input_dialog.scss';

const defaultVoiceInputImg = './resources/voice_input/img_voice_input.png';
const providerHeaderBg = './resources/voice_input/ic_provider_assistant.png';
const providerVoiceInputImg =
  './resources/voice_input/img_provider_voice_input.png';

export default class VoiceInputDialog extends ReactDialog {
  name = 'VoiceInputDialog';

  state = {
    isHeaderImageLoaded: false,
    isContentImageLoaded: false
  };

  componentDidMount() {
    super.componentDidMount && super.componentDidMount();
    this.loadProviderHeaderImage();
    this.loadProviderContentImage();
  }

  flat(targetArray) {
    return [].concat(...targetArray);
  }

  insertBetween(targetArray, insertElem) {
    return this.flat(targetArray.map((elem) => [insertElem, elem])).slice(1);
  }

  replaceTextWithComponent(sourceText, placeholder, component) {
    if (!sourceText) { return ''; }
    if (!sourceText.includes(placeholder)) { return sourceText; }
    return (
      <div role="heading">
        {this.insertBetween(sourceText.split(placeholder), component)}
      </div>
    );
  }

  loadProviderHeaderImage() {
    var img = new Image();
    img.src = providerHeaderBg;
    img.onload = () => {
      this.setState({ isHeaderImageLoaded: true });
    };
    img.onerror = () => {
      this.setState({ isHeaderImageLoaded: false });
    };
  }

  loadProviderContentImage() {
    var img = new Image();
    img.src = providerVoiceInputImg;
    img.onload = () => {
      this.setState({ isContentImageLoaded: true });
    };
    img.onerror = () => {
      this.setState({ isContentImageLoaded: false });
    };
  }

  render() {
    var headerClass =
      `voice-assistant-header h1${!this.state.isHeaderImageLoaded ?
      ' hidden' : ''}`;
    var contentImage =
      this.state.isContentImageLoaded ?
      providerVoiceInputImg : defaultVoiceInputImg;
    var microphoneClass =
      `microphone${this.state.isContentImageLoaded ?
      ' provider' : ''}`;
    return (
      <div
        className="dialog-container"
        tabIndex="-1"
        onKeyDown={(e) => this.onKeyDown(e)}
        ref={(dom)=>{this.element=dom}}
        onBlur={()=>{this.onBlur()}}
      >
        <div role="heading" className="dialog">
          <div
            className={headerClass}
            id={'dialog-header-' + this.getInstanceID()}
            style={{ backgroundImage: "url(" + providerHeaderBg + ")" }}
          >
          </div>
          <div className="content p-ul text" tabIndex="-1">
            {this.replaceTextWithComponent(
              window.api.l10n.get(this.props.content),
              '{{ microphone }}',
              <i className={microphoneClass} data-icon="mic" />
            )}
          </div>
          <div
            className="voice-input-image"
            style={{ backgroundImage: "url(" + contentImage + ")" }}
          ></div>
        </div>
     </div>
    );
  }
}
