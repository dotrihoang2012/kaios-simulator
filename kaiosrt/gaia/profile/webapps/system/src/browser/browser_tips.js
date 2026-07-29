/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import '../../scss/browser_tips.scss';

export default class BrowserTips extends BaseComponent {
  name = 'BrowserTips';
  lastElement = null;
  constructor(props) {
    super(props);
    this.state = {
      pageIndex: 0
    }
    this.zoomPosition = 1; // 0, 1, 2
  }

  componentDidMount() {
    this.updateSoftKeys();
  }

  componentDidUpdate() {
    if (document.activeElement !== this.element &&
      !this.element.contains(document.activeElement)) {
      Service.request('focus');
    } else {
      this.updateSoftKeys();
    }
  }

  onFocus() {
    this.updateSoftKeys();
  }

  updateSoftKeys() {
    if (this.lastElement && this.lastElement !== this.element) {
      SoftKeyStore.unregister(this.lastElement);
    }
    Service.request('SoftKeyStore:register', {
      left: this.state.pageIndex ? 'previous' : null,
      center: 'ok',
      right: this.state.pageIndex < 3 ? 'next' : null
    }, this.element);
    this.lastElement = this.element;
  }

  componentWillUnmount() {
    SoftKeyStore.unregister(this.element);
  }

  goNextPage() {
    if (this.state.pageIndex < 3) {
      this.setState({
        pageIndex: this.state.pageIndex + 1
      });
    }
  }

  goPrevPage() {
    if (this.state.pageIndex) {
      this.setState({
        pageIndex: this.state.pageIndex - 1
      });
    }
  }

  demoScrollFunction(evt) {
    const key = evt.key;
    const STEP_LENGTH = 10;
    const container = this.element.querySelector('.sample-container');
    if (container) {
      if (this.element.classList.contains('scroll-mode')) {
        if (key === 'ArrowDown') {
          container.scrollTop += STEP_LENGTH;
        } else if (key === 'ArrowUp') {
          container.scrollTop -= STEP_LENGTH;
        }
      } else {
        const cursor = this.element.querySelector('.cursor');
        let top = cursor.offsetTop;
        if (key === 'ArrowDown') {
          top += STEP_LENGTH;
        } else if (key === 'ArrowUp') {
          top -= STEP_LENGTH;
        }
        const maxTop =
          container.offsetTop + container.offsetHeight - cursor.offsetHeight;
        top = Math.min(maxTop, Math.max(container.offsetTop, top))
        cursor.style.top = top + 'px';
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }

  onKeyUp(evt) {
    switch (evt.key) {
      case '#':
        // Because hardware_buttons.js & BrowserMenuManager:show also waiting
        // for key up event, so unable preventDefault, and should add timeout.
        window.setTimeout(() => {
          Service.request('BrowserMenuManager:hide');
        }, 100);
        break;
      default:
        break;
    }
  }

  onKeyDown(evt) {
    const key = evt.key;
    if (this.state.pageIndex === 3 &&
      (key === 'ArrowUp' || key === 'ArrowDown')) {
      this.demoScrollFunction(evt);
      return;
    }
    switch (evt.key) {
      case 'ArrowRight':
        if (document.dir === 'rtl') {
          this.goPrevPage();
        } else {
          this.goNextPage();
        }
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case 'SoftRight':
        this.goNextPage();
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case 'Enter':
      case 'Backspace':
        Service.request('BrowserMenuManager:hide');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case 'ArrowLeft':
        if (document.dir === 'rtl') {
          this.goNextPage();
        } else {
          this.goPrevPage();
        }
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case 'SoftLeft':
        this.goPrevPage();
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case '2':
        if (this.state.pageIndex === 1 &&
          !this.sampleContainer.classList.contains('scroll-up')) {
          this.sampleContainer.classList.add('scroll-up');
          this.sampleContainer.classList.remove('scroll-down');
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case '0':
        if (this.state.pageIndex === 1 &&
          !this.sampleContainer.classList.contains('scroll-down')) {
          this.sampleContainer.classList.remove('scroll-up');
          this.sampleContainer.classList.add('scroll-down');
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case '3':
        if (this.state.pageIndex === 2 && this.zoomPosition !== 2) {
          this.sampleContainer.dataset.zoomStep = ++this.zoomPosition;
          this.sampleContainer.classList.add('zoomin');
          this.sampleContainer.classList.remove('zoomout');
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case '1':
        if (this.state.pageIndex === 2 && this.zoomPosition) {
          this.sampleContainer.dataset.zoomStep = this.zoomPosition--;
          this.sampleContainer.classList.remove('zoomin');
          this.sampleContainer.classList.add('zoomout');
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case '5':
        if (this.state.pageIndex === 3) {
          this.sampleContainer.dataset.value += 30;
          this.element.classList.toggle('cursor-mode');
          this.element.classList.toggle('scroll-mode');
          const iconElm =
            this.element.querySelector('.demo-item-icon.center .icon');
          let mode = 'browser-scroller';
          if (this.element.classList.contains('scroll-mode')) {
            mode = 'browser-softkey-cursor';
          }
          iconElm.setAttribute('data-icon', mode);
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      default:
        break;
    }
  }

  getPageContent() {
    const { pageIndex } = this.state;
    if (!pageIndex) {
      return this.getShortcutKeysPageContent();
    }
    const pageConfig = [{
      subTitle: 'topEndSubTitle',
      backgroundImage: './style/browser_frame/images/topEnd.png',
      transform: 'translateY(-30px)',
      leftBt: null,
      rightUpBt: 'go-to-top',
      rightCenterBt: null,
      rightCenterBtText: null,
      rightDownBt: 'go-to-end'
    }, {
      subTitle: 'zoomSubTitle',
      backgroundImage: './style/browser_frame/images/zoom.png',
      transform: 'scale(1.3)',
      leftBt: 'browser-zoomin',
      rightUpBt: null,
      rightCenterBt: 'browser-zoomout',
      rightCenterBtText: '3',
      rightDownBt: null
    }, {
      subTitle: 'switchModeSubTitle',
      backgroundImage: './style/browser_frame/images/switch.png',
      leftBt: null,
      rightUpBt: null,
      rightCenterBt: 'browser-scroller',
      rightCenterBtText: '5',
      rightDownBt: null
    }];
    const {
      subTitle,
      backgroundImage,
      transform,
      leftBt,
      rightUpBt,
      rightCenterBt,
      rightCenterBtText,
      rightDownBt } = pageConfig[pageIndex - 1];
    let scrollDirectionIndicator = '';
    if (pageIndex === 3) {
      scrollDirectionIndicator =
        <div className='sample-scroll-direction-indicator'>
          <div className='sample-scroll-direction-icon top'/>
          <div className='sample-scroll-row'>
            <div className='sample-scroll-direction-icon left'/>
            <div className='empty center'/>
            <div className='sample-scroll-direction-icon right'/>
          </div>
          <div className='sample-scroll-direction-icon bottom'/>
        </div>;
    }
    return (
      <div className='container p-ul'>
        {scrollDirectionIndicator}
        <div className='sub-title' data-l10n-id={subTitle}/>
        <div className='demo-container'>
          <div className='left-button-container'>
            <div className={'demo-item-icon' + (leftBt ? '' : ' hidden')}>
              <div className='icon' data-icon={leftBt}/>
              <div className='text'>1</div>
            </div>
          </div>
          <div className='sample-container'>
            <div className='cursor'/>
            <div className='image-container'
              style={{
                backgroundImage: 'url(' + backgroundImage + ')',
                transform: transform
              }}
              key={this.state.pageIndex}
              ref={(dom)=>{this.sampleContainer=dom}}>
            </div>
          </div>
          <div className='right-button-container'>
            <div className={'demo-item-icon up' + (rightUpBt ? '' : ' hidden')}>
              <div className='icon' data-icon={rightUpBt}/>
              <div className='text'>2</div>
            </div>
            <div className={'demo-item-icon center' + (rightCenterBt ? '' : ' hidden')}>
              <div className='icon' data-icon={rightCenterBt}/>
              <div className='text'>{rightCenterBtText}</div>
            </div>
            <div className={'demo-item-icon down' + (rightDownBt ? '' : ' hidden')}>
              <div className='icon' data-icon={rightDownBt}/>
              <div className='text'>0</div>
            </div>
          </div>
        </div>
      </div>);
  }

  getShortcutKeysPageContent() {
    return (
      <div className='container p-ul'>
        <div className='tips-items-row'>
          <div className='tips-item zoomIn'>
            <div className='tips-item-icon'>
              <div className='icon' data-icon='browser-zoomin'/>
              <div className='text'>1</div>
            </div>
            <div className='tips-item-name' data-l10n-id='zoomout'/>
          </div>
          <div className='tips-item gotoTop center-item'>
            <div className='tips-item-icon'>
              <div className='icon' data-icon='go-to-top'/>
              <div className='text'>2</div>
            </div>
            <div className='tips-item-name' data-l10n-id='gotoTop'/>
          </div>
          <div className='tips-item zoomOut'>
            <div className='tips-item-icon'>
              <div className='icon' data-icon='browser-zoomout'/>
              <div className='text'>3</div>
            </div>
            <div className='tips-item-name' data-l10n-id='zoomin'/>
          </div>
        </div>
        <div className='tips-items-row'>
          <div className='tips-item'/>
          <div className='tips-item center-item scrollMode'>
            <div className='tips-item-icon'>
              <div className='icon' data-icon='browser-scroller'/>
              <div className='text'>5</div>
            </div>
            <div className='tips-item-name' data-l10n-id='scrollMode'/>
          </div>
          <div className='tips-item'/>
        </div>
        <div className='tips-items-row'>
          <div className='tips-item'/>
          <div className='tips-item center-item gotoEnd'>
            <div className='tips-item-icon'>
              <div className='icon' data-icon='go-to-end'/>
              <div className='text'>0</div>
            </div>
            <div className='tips-item-name' data-l10n-id='gotoEnd'/>
          </div>
          <div className='tips-item tips'>
            <div className='tips-item-icon'>
              <div className='icon' data-icon='info'/>
              <div className='text'>#</div>
            </div>
            <div className='tips-item-name' data-l10n-id='tips'/>
          </div>
        </div>
    </div>);
  }

  render() {
    const pageContent = this.getPageContent();
    const { pageIndex } = this.state;
    const title =
      ['shortcutKeys', 'topEndTitle', 'zoomTitle', 'switchModeTitle'];
    if (pageIndex === 2) {
      this.zoomPosition = 1;
    }
    return (
      <div
        id='browser-menu'
        className={pageIndex === 3 ? 'cursor-mode' : ''}
        key={pageIndex ? 'normal-page' : 'shortcut-page'}
        ref={(dom)=>{this.element=dom}}
        tabIndex='-1'
        onFocus={()=>this.onFocus()}
        onKeyDown={(e)=>this.onKeyDown(e)}
        onKeyUp={(e)=>this.onKeyUp(e)}>
        <div className='empty-container'/>
        <div className='menu-container'>
          <div
            id='tips-header'
            className='header h1'
            key='translated-header'
            data-l10n-id={title[pageIndex]}>
          </div>
          {pageContent}
          <div className='pagination'>
            <div className={'page-indicator' + (pageIndex ? '' : ' active')}/>
            <div className={'page-indicator' + (pageIndex === 1 ? ' active' : '')}/>
            <div className={'page-indicator' + (pageIndex === 2 ? ' active' : '')}/>
            <div className={'page-indicator' + (pageIndex === 3 ? ' active' : '')}/>
          </div>
        </div>
        <div className='empty-softkey-bar'/>
      </div>
    );
  }
}
