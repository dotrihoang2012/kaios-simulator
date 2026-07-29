import React from 'react';
import BaseComponent from 'base-component';
import EnhanceAnimation from 'enhance-animation';
import Service from 'service';
import Folder from './index';

class FolderContainer extends BaseComponent {
  name = 'folders';

  static defaultProps = {
    viewMode: 'grid',
    col: 3,
    row: 3
  };

  constructor(props) {
    super(props);
    this.state = {
      folders: [],
      currentShowFolder: ''
    };
    this.folders = [];
  }

  componentDidMount() {
    Service.register('addFolder', this);
    Service.register('openFolder', this);
  }

  componentWillUnmount() {
    Service.unregister('addFolder', this);
    Service.unregister('openFolder', this);
  }

  onKeyDown = (evt) => {
    switch (evt.key) {
      case 'EndCall':
      case 'BrowserBack':
      case 'Backspace':
        Service.request('closeSheet', 'folder');
        break;
      default:
        break;
    }
  }

  addFolder(option) {
    let isExist = false;
    this.folders.forEach((item) => {
      if (item && item.name === option.name) {
        isExist = true;
        item.url = option.url;
      }
    });
    if (!isExist) {
      this.folders.push(option);
    }

    this.setState({
      folders: this.folders
    });
  }

  openFolder(url) {
    this.setState({
      currentShowFolder: url,
      viewMode: localStorage.getItem('app-view-mode')
    });
  }

  render() {
    const _className = this.props.viewMode === 'grid' ?
      'folder-grid-container' : '';
    return (
      <div className={_className} tabIndex="-1" onKeyDown={this.onKeyDown}>
        {this.state.folders.map((item) => (
          <Folder
            key={item.name}
            name={item.name}
            manifestUrl={item.url}
            isShow={item.url === this.state.currentShowFolder}
            viewMode={this.state.viewMode}
            col={this.props.col}
          />
        ))}
      </div>
    );
  }
}

export default EnhanceAnimation(FolderContainer, 'immediate', 'immediate');
