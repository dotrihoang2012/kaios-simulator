import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';

export default class FakeContainer extends BaseComponent {
  static defaultProps = {
    openAnimation: 'immediate',
    closeAnimation: 'immediate'
  };
  static propTypes = {
    openAnimation: React.PropTypes.string,
    closeAnimation: React.PropTypes.string
  };
  isHidden() {
    return this.state.transition !== 'opened';
  };
  constructor(props) {
    super(props);
    this.state = {
      transition: 'closed',
      animation: 'immediate'
    }
  }
  isActive() {
    return this.state.transition === 'opened' ||
           this.state.transition === 'opening';
  };
  isTransitioning() {
    return this.state.transition === 'opening' ||
           this.state.transition === 'closing';
  };
  onAnimationEnd() {
    switch (this.state.transition) {
      case 'opening':
        this.setState({transition: 'opened', animation: ''});
        break;
      case 'closing':
        this.setState({transition: 'closed', animation: ''});
        break;
    }
  };
  componentDidMount() {
    ReactDOM.findDOMNode(this).addEventListener('animationend', this.onAnimationEnd.bind(this), false);
  };
  /**
   * Public open method. This will be used by Service request or the parent component.
   * @param  {String} [animation] The className of the open animation.
   */
  open(animation) {
    animation = animation || this.props.openAnimation;
    switch (this.state.transition) {
      case 'opened':
      case 'opening':
      case 'closing':
        break;
      case 'closed':
        if ('immediate' === animation || !animation) {
          this.setState({transition: 'opened', animation: ''});
        } else {
          this.setState({transition: 'opening', animation: animation});
        }
        break;
    }
  };
  /**
   * Public close method. This will be used by Service request or the parent component.
   * @param  {String} [animation] The className of the close animation.
   */
  close(animation) {
    animation = animation || this.props.closeAnimation;
    switch (this.state.transition) {
      case 'closed':
      case 'opening':
      case 'closing':
        break;
      case 'opened':
        if ('immediate' === animation || !animation) {
          this.setState({transition: 'closed', animation: ''});
        } else {
          this.setState({transition: 'closing', animation: animation});
        }
        break;
    }
  };
  render() {
    return <div data-transition-state={this.state.transition}>{this.props.children}</div>
  }
}
