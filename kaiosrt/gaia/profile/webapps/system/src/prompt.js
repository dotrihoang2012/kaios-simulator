/* global Service */
import React from 'react';
import BaseComponent from 'base-component';
import '../scss/prompt.scss';

import EnhanceAnimation from './enhance_animation';

class Prompt extends BaseComponent {
  name = 'Prompt';
  EVENT_PREFIX = 'prompt';
  constructor(props) {
    super(props);
    this.state = {
      info: null
    }
  }

  componentDidMount() {
    Service.register('show', this);
    Service.register('hide', this);
  }

  show(info) {
    if (Service.query('remoteLockEnabled')) {
      return;
    }
    this.setState({
      info: info
    });
    this.open();
  }

  hide() {
    this.setState({
      info: ''
    });
    this.close();
  }

  render() {
    let prompt = '';
    if (this.state.info) {
      const { icon, title, appName } = this.state.info;
      prompt = <div className="container"
                 data-app-name={appName}>
                 <div className="icon">
                   <div className="background" />
                   <img src={icon} />
                 </div>
                 <div className="content">
                   <div className='primary'>{title}</div>
                 </div>
               </div>
    }
    return <div id="prompt">
             {prompt}
           </div>
  }
}

export default EnhanceAnimation(Prompt, 'slide-from-top', 'fade-out');
