import React from 'react';
import * as utils from './util/utils';

const DIALOG_DURATION = 350;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const enhanceDialogAnimation = (WrappedComponent) => {
  return class extends WrappedComponent {
    constructor(props) {
      super(props);
      this.state = {
        effect: 'up-to-bottom'
      };
    }

    componentDidMount() {
      super.componentDidMount && super.componentDidMount();
      this.hide();
    }

    componentDidUpdate() {
      const content = document.querySelector('#notice-body p');
      utils.ellipsisTextContent(content);
    }

    close = async() => {
      this.setState({
        effect: 'up-to-bottom'
      });
      await delay(DIALOG_DURATION);
      this.hide();
    }

    open() {
      this.setState({
        effect: 'bottom-to-up'
      });
      this.show();
    }

    render() {
      let className = this.state.effect;
      if (this.props.className) {
        className = className.concat(` ${this.props.className}`);
      }
      const props = {...this.props, className };
      return <WrappedComponent {...props} />;
    }
  }
};
