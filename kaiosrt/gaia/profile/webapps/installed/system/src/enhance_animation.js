import React from 'react';
import ReactDOM from 'react-dom';
import ReactAnimationComposer from 'react-animation-composer';
import FakeContainer from './fake_container';
import BaseComponent from 'base-component';
import Service from 'service';

var EnhanceAnimation = (ComposedComponent, open, close) => class extends BaseComponent {
  componentDidMount() {
    // XXX: Seems strange.
    this.name = this.refs.composed.name;
    this.refs.composing.EVENT_PREFIX = this.refs.composed.EVENT_PREFIX;
    window.Service.register('open', this);
    window.Service.register('close', this);
    this.refs.composed.isActive = this.refs.composing.isActive.bind(this.refs.composing);
    this.refs.composed.open = this.refs.composing.open.bind(this.refs.composing);
    this.refs.composed.close = this.refs.composing.close.bind(this.refs.composing);
    this.refs.composing.on('opened', () => {this.refs.composed.emit('opened');});
    this.refs.composing.on('closed', () => {this.refs.composed.emit('closed');});
  }

  open() {
    this.refs.composing.open();
  }

  close() {
    this.refs.composing.close();
  }

  render() {
    return <ReactAnimationComposer ref="composing" openAnimation={open} closeAnimation={close} noFocus={true}>
             <ComposedComponent ref="composed" {...this.props} />
           </ReactAnimationComposer>
  }
}

export default EnhanceAnimation;
