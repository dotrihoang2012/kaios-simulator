import React from 'react';
import BaseComponent from 'base-component';

export default class BrowserSearchItem extends BaseComponent {
  name = 'BrowserSearchItem';

  escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
  }

  createHighlightHTML(text, keyWords) {
    const noSchemeText = text.replace(/^[a-z\u00a1-\uffff0-9-+]+:(\/\/)?/i, '');

    if (keyWords) {
      const pattern = new RegExp(this.escapeRegStr(keyWords), 'giu');
      const len = keyWords.length;
      let lastIndex = 0;
      let output = '';

      while (pattern.exec(noSchemeText)) {
        const index = pattern.lastIndex - len;
        const str1 = noSchemeText.substring(lastIndex, index);
        const str2 = noSchemeText.substring(index, pattern.lastIndex);
        output += `${this.escapeHTML(str1)}<b>${this.escapeHTML(str2)}</b>`;
        lastIndex = pattern.lastIndex;
      }

      if (lastIndex) {
        output += this.escapeHTML(noSchemeText.substring(lastIndex));
      } else {
        output = this.escapeHTML(noSchemeText);
      }

      return output;
    }

    return this.escapeHTML(noSchemeText);
  }

  escapeRegStr(str) {
    // eslint-disable-next-line no-useless-escape
    return str.replace(/[\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  render() {
    if (this.props.type === 'places') {
      const title =
        this.createHighlightHTML(this.props.title, this.props.searchKey);
      const meta =
        this.createHighlightHTML(this.props.meta, this.props.searchKey);
      
      return (
        <div
          role="link"
          tabIndex="-1"
          className="focusable result list-item"
          aria-label={this.props.title}
          data-url={this.props.url}>
          <div className={this.props.icon ? '' :
            this.props.icon === '' ? 'loading' : 'not-found'}>
            <img
              className={this.props.icon ? '' : 'hidden'}
              src={this.props.icon}
              role="presentation"/>
          </div>
          <div className="description">
            <span
              className="title p-pri"
              dangerouslySetInnerHTML={{__html: title}}>
            </span>
            <small
              dir="ltr"
              className="meta p-sec"
              dangerouslySetInnerHTML={{__html: meta}}>
            </small>
          </div>
        </div>
      );
    }

    if (this.props.type === 'suggestions') {
      const title =
        this.createHighlightHTML(this.props.title, this.props.searchKey);
      return (
        <div
          role="link"
          tabIndex="-1"
          aria-label={this.props.title}
          className="focusable suggestions list-item"
          data-suggestion={this.props.title}>
          <i data-icon="search" aria-hidden="true"></i>
          <div
            className="p-pri"
            dangerouslySetInnerHTML={{__html: title}}>
          </div>
        </div>
      )
    }

    if (this.props.type === 'recent') {
      return (
        <div
          tabIndex="-1"
          className="focusable search-record list-item"
          data-suggestion={this.props.title}>
          <i data-icon="search" aria-hidden="true"></i>
          <div className="p-pri">{this.props.title}</div>
        </div>
      )
    }
  }
}
