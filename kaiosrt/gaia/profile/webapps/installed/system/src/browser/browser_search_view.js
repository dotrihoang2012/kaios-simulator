/* global LazyLoader, UrlHelper, Service, SearchProvider, SettingsObserver */

import React from 'react';
import BaseComponent from 'base-component';
import BrowserSearchItem from './browser_search_item.js';
import BrowserRecentStore from './browser_recent_store.js';
import BrowserIconStore from '../../browser/js/browser_icon_store.js';
import BlackWhiteList from './black_white_list.js';
import '../../scss/browser_search_view.scss';

export default class BrowserSearchView extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      inputFocused: false,
      recentSearches: null,
      places: null,
      suggestions: null
    };

    this.name = 'BrowserSearchView';
    this.EVENT_PREFIX = 'BrowserSearchView';
    this.MAX_LATEST_VISTITS_NUM = 10;
    this.MAX_AWESOME_RESULTS = 4;
    this.suggestionsEnabled = false;
    this.focusIndex = -1;
    this.SEARCH_DELAY = 300;
    this.debounceTimer = null;
    this.searchKey = '';
    this.reactivate = false;
    this.observeSettings();
    
    window.addEventListener('screenchange', this);
    window.addEventListener('apploading', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('attentionopening', this);
    window.addEventListener('attentionopened', this);
    window.addEventListener('appforeground', this);
    window.addEventListener('appopened', this);
    window.addEventListener('homescreenopened', this);
    window.addEventListener('activityrequesting', this);
    window.addEventListener('activityterminated', this);
    window.addEventListener('lockscreen-appopened', this);

    this.inputRef = this.inputRef.bind(this);
    this.elementRef = this.elementRef.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.handleInputFocus = this.handleInputFocus.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
  }

  observeSettings() {
    if (SettingsObserver) {
      SettingsObserver.observe(
        'search.suggestions.enabled', 
        true,
        (value) => {
          this.suggestionsEnabled = value;
        }
      );
    }
  }

  inputRef(dom) {
    this.input = dom;
  }

  elementRef(dom) {
    this.element = dom;
  }

  show(value) {
    this.input.value = value;
    this.searchKey = '';
    this.selectAll();
    this.setState({
      active: true
    });

    this.respondValueChange(value, !!value);
  }

  hide() {
    if (this.state.active) {
      if (Service.query('getTopMostUI').name === 'DialogService') {
        Service.request('DialogService:hide');
      }

      this.setState({
        active: false
      });

      this.focusIndex = -1;
    }
  }

  focus(element) {
    let csk = '';
    let rsk = ''

    if (element instanceof HTMLElement) {
      element.focus();
      this.scrollToElement(element, this.searchResultsContainer);

      if (element === this.input) {
        csk = this.input.value ? 'go' : '';

        if (Service.query('VoiceAssistant.isVAEnabled')) {
          if (Service.query('getVAInAppIcon')) {
            rsk = 'style=' + JSON.stringify({
              background: 'url(' +
                Service.query('getVAInAppIcon') +
                ') right center / 2.2rem 2.2rem no-repeat'
            });
          } else {
            rsk = 'icon=mic';
          }
        }
      } else if (element.classList.contains('search-record')) {
        rsk = 'clear-all';
        csk = 'go';
      } else {
        csk = 'go';
      }

      Service.request('SoftKeyStore:register', {
        left: 'cancel',
        center: csk,
        right: rsk
      }, this.element, 'light');
    }
  }

  scrollToElement(element, container) {
    if (!container || !container.contains(element)) {
      return;
    }

    if (this.focusIndex <= 0) {
      container.scrollTop = 0;
      return;
    }

    const rect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (rect.top < containerRect.top) {
      container.scrollTop -= (containerRect.top - rect.top);
    } else if (rect.bottom > containerRect.bottom) {
      container.scrollTop += (rect.bottom - containerRect.bottom);
    }
  }

  onKeyDown(evt) {
    const target = evt.target;
    let prevetEvents = true;
    switch (evt.key) {
      case 'Enter':
        if (target.dataset.url && target.dataset.url !== 'undefined') {
          this.navigate(target.dataset.url);
        } else if (target.dataset.suggestion) {
          BrowserRecentStore.addRecentRecord(target.dataset.suggestion)
            .then(() => {
              this.generateURLFromSearchTerm(target.dataset.suggestion)
                .then((url) => {
                  this.navigate(url);
                });
            });
        } else if (target === this.input) {
          let value = this.input.value;
          if (!value) return;

          // Not a valid URL, could be a search term
          if (UrlHelper.isNotURL(value)) {
            BrowserRecentStore.addRecentRecord(value)
              .then(() => {
                this.generateURLFromSearchTerm(value)
                  .then((url) => {
                    this.navigate(url);
                  });
              });

            return;
          }

          const hasScheme = UrlHelper.hasScheme(value);

          // No scheme, prepend basic protocol and return
          if (!hasScheme) {
            value = 'http://' + value;
          }

          this.navigate(value);
        }

        break;
      case 'ArrowDown':
        this.focusIndex = (this.focusIndex + 1) % this.candidates.length;
        this.focus(this.candidates[this.focusIndex]);
        break;
      case 'ArrowUp':
        this.focusIndex = Math.max(this.focusIndex - 1, -1);
        
        if (this.focusIndex === -1) {
          this.focus(this.input);
        } else {
          this.focus(this.candidates[this.focusIndex]);
        }

        break;
      case 'SoftRight':
        if (target === this.input && Service.query('VoiceAssistant.isVAEnabled')) {
          const activity = new WebActivity('voice-assistant', { from: 'Internet' });
          activity.start();
          this.hide();
        }

        if (target.classList.contains('search-record')) {
          Service.request('DialogService:show', {
            id: 'clear-recent-search',
            header: window.api.l10n.get('confirmation'),
            content: window.api.l10n.get('confirm-to-clear-recent-searches'),
            translated: true,
            type: 'confirm',
            ok: 'clear',
            cancel: 'cancel',
            onOk: () => {
              BrowserRecentStore.clear()
                .then(() => {
                  this.setState({recentSearches: []});
                  this.focus(this.input);
                });;
              Service.request('DialogService:hide', 'clear-recent-search');
            }
          });
        }

        break;
      case 'SoftLeft':
        this.hide();
        break;
      case 'BrowserBack':
      case 'Backspace':
        if (target.classList.contains('focusable')) {
          this.focusIndex = -1;
          this.focus(this.input);
        } else if (this.input.value) {
          prevetEvents = false
        } else {
          this.hide();
        }

        break;
      default:
        prevetEvents = false;
        break;
    }

    if (prevetEvents) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  _handle_screenchange() {
    // enable it when system stable.
    if (false && !evt.detail.screenEnabled && this.state.active) {
      this.hide();
    }
  }

  _handle_apploading(evt) {
    if (evt.detail && evt.detail.stayBackground) {
      return;
    }

    this.hide();
  }

  _handle_launchapp(evt) {
    if (evt.detail && evt.detail.stayBackground) {
      return;
    }

    this.hide();
  }

  '_handle_open-app'(evt) {
    if (evt.detail && !evt.detail.showApp) {
      return;
    }

    this.hide();
  }

  _hadle_attentionopening() {
    this.hide();
  }

  _handle_attentionopened() {
    this.hide();
  }

  _hadle_appforeground() {
    this.hide();
  }

  _handle_appopened() {
    this.hide();
  }

  _handle_homescreenopened(evt) {
    this.hide();
  }

  _handle_lockscreen() {
    this.hide();
  }

  _handle_activityrequesting(evt) {
    if (this.isActive() &&
      evt.detail &&
      evt.detail.name &&
      evt.detail.name === 'voice-input') {
      // Reactivate searchbar when voice-input inline activity is closed.
      this.reactivate = true;
      this.hide();
    }
  }

  _handle_activityterminated(evt) {
    if (this.reactivate &&
      evt.detail &&
      evt.detail.manifest &&
      evt.detail.manifest.activities &&
      evt.detail.manifest.activities['voice-input']) {
      this.setState({ active: true });
      this.reactivate = false;
    }
  }

  handleChange(evt) {
    let rsk = '';
    const value = evt.target.value;
    this.respondValueChange(value);

    if (Service.query('VoiceAssistant.isVAEnabled')) {
      if (Service.query('getVAInAppIcon')) {
        rsk = 'style=' + JSON.stringify({
          background: 'url(' +
            Service.query('getVAInAppIcon') +
            ') right center / 2.2rem 2.2rem no-repeat'
        });
      } else {
        rsk = 'icon=mic';
      }
    }

    Service.request('SoftKeyStore:register', {
      left: 'cancel',
      center: this.input.value ? 'go' : '',
      right: rsk
    }, this.element, 'light');
  }

  handleInputFocus() {
    this.setState({ inputFocused: true });
  }

  handleInputBlur() {
    this.setState({ inputFocused: false });
  }

  respondValueChange(value, useHistory = false) {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (value) {
      if (useHistory) {
        this.getHistory();
      } else {
        this.debounceTimer = setTimeout(() => {
          if (this.searchKey === value) {
            return;
          }

          this.searchKey = value;
          this.getPlaces(value);
          this.getSuggestions(value);
        }, this.SEARCH_DELAY);
      }
    } else if (value === '') {
      this.searchKey = '';
      this.loadRecentSearches();
    }
  }

  updateFocusIndex() {
    this.candidates = Array.from(this.element.querySelectorAll('.focusable'));
    const currentFocused = document.activeElement;
    if (currentFocused === this.input) {
      this.focusIndex = -1;
    } else {
      this.candidates.some((item, index) => {
        if (item === currentFocused) {
          this.focusIndex = index;
          return true;
        }

        return false;
      });
    }
  }

  formatPlaces(places, query) {
    if (places && places.length > 0) {
      return places.map((place, index) => {
        let icon = BrowserIconStore.getIcon(place);
        if (typeof icon !== 'string') {
          const url = place.url;
          icon.then((uri) => {
            this.setState((state) => {
              if (state.places &&
                state.places[index] &&
                state.places[index].url === url) {
                state.places[index].icon = uri;
                return { places: state.places }; 
              }
            });
          });

          icon = '';
        }

        return {
          type: 'places',
          url: place.url,
          title: place.title || '',
          meta: place.url,
          icon,
          searchKey: query
        }
      });
    }

    return null;
  }

  formatSuggestions(suggestions, query) {
    if (suggestions) {
      return suggestions.map((item) => {
        return {
          type: 'suggestions',
          title: item,
          searchKey: query
        }
      });
    }
  }

  formatRecentSearches(recentSearches) {
    if (recentSearches) {
      return recentSearches.map((item) => {
        return {
          type: 'recent',
          title: item
        }
      });
    }
  }

  getHistory() {
    window.places.store.readStore(
      'visits',
      'date',
      this.MAX_LATEST_VISTITS_NUM,
      null,
      { type: 'host' }
    )
      .then((results) => this.formatPlaces(results))
      .then((results) => {
        this.setState({
          places: results,
          recentSearches: null,
          suggestions: null
        });
      });
  }

  getPlaces(value) {
    const filter = (result, query, ignoreFrecency) => {
      if (!result || !ignoreFrecency && result.frecency <= 0) {
        return false;
      }

      query = query.toLocaleLowerCase();

      if (result.title && result.title.toLocaleLowerCase().includes(query)) {
        return true;
      }

      const pureUrl =
        result.url.replace(/^(?:[a-z\u00a1-\uffff0-9-+]+)(?::(?:\/\/)?)/i, '');
      return pureUrl.toLocaleLowerCase().includes(query);
    };

    window.places.store.readStore(
      'places',
      'frecency',
      this.MAX_AWESOME_RESULTS, 
      (result) => filter(result, value)
    )
      .then((results) => {
        if (!results || results.length < this.MAX_AWESOME_RESULTS) {
          if (window.browserPinSitesStore) {
            window.browserPinSitesStore.getPinSites()
              .then((pinnedResults) => {
                if (pinnedResults) {
                  pinnedResults.forEach((result) => {
                    if (results.length < this.MAX_AWESOME_RESULTS &&
                      filter(result, value, true)) {
                      results.push(result);
                    }
                  });
                }

                results = this.formatPlaces(results, value);
                if (this.debounceTimer) {
                  this.setState({
                    places: results,
                    recentSearches: null
                  });
                }
              });
          }
        } else {
          results = this.formatPlaces(results, value);
          if (this.debounceTimer) {
            this.setState({
              places: results,
              recentSearches: null
            });
          }
        }
      });
  }

  getSuggestions(value) {
    if (UrlHelper.isURL(value) ||
      !this.suggestionsEnabled ||
      navigator.connection.type === 'none') {
      this.setState({
        suggestions: value.trim() ? this.formatSuggestions([value], value) : [],
        recentSearches: null
      });

      return;
    }

    SearchProvider.ready()
      .then(() => {
        const url = SearchProvider('suggestUrl')
          .replace('{searchTerms}', encodeURIComponent(value));

        LazyLoader.getJSON(url, true)
          .then((result) => {
            if (result.length && result[1].length > 0) {
              if (this.debounceTimer) {
                this.setState({
                  suggestions: this.formatSuggestions(result[1], value),
                  recentSearches: null
                });
              }
            } else {
              this.setState({
                suggestions: value.trim() ? this.formatSuggestions([value], value) : [],
                recentSearches: null
              });
            }
          })
          .catch((err) => {
            this.setState({
              suggestions: value.trim() ? this.formatSuggestions([value], value) : [],
              recentSearches: null
            });

            console.error('load remote suggestions failed. err: ', err);
          });
      });
  }

  loadRecentSearches() {
    BrowserRecentStore.getRecentRecords()
      .then((results) => {
        if (results && results.length > 0) {
          this.setState({
            recentSearches: this.formatRecentSearches(results),
            places: null,
            suggestions: null
          });
        } else {
          this.setState({
            recentSearches: [],
            places: null,
            suggestions: null
          });
        }
      });
  }

  navigate(url) {
    BlackWhiteList.match(url).then((matchWhiteList) => {
      if (matchWhiteList) {
        const activeApp = Service.currentApp;
        if (activeApp && (activeApp.isBrowser() || activeApp.isSearch())) {
          activeApp.navigate(url);
          return;
        }
      } else {
        Service.request('DialogService:show', {
          id: 'browser-dialog',
          header: window.api.l10n.get('browser'),
          content: window.api.l10n.get('forbid-access-web', { url }),
          ok: 'ok',
          type: 'alert',
          translated: true,
          noClose: true,
          onOk: () => {
            Service.request('DialogService:hide', 'browser-dialog');
          }
        });
      }
    });

    this.hide();
  }

  generateURLFromSearchTerm(term) {
    if (term) {
      // this.metrics.report('websearch', SearchProvider('title'));
      return SearchProvider.ready().then(() => {
        return SearchProvider('searchUrl')
          .replace('{searchTerms}', encodeURIComponent(term));
      });
    }
  }

  isActive() {
    return !!this.state.active;
  }

  setHierarchy(value) {
    if (value) {
      if (this.focusIndex === -1) {
        this.focus(this.input);
      } else {
        this.focus(this.candidates[this.focusIndex]);
      }
    } else {
      Service.query('getTopMostUI').name !== 'DialogService' && this.hide();
    }
  }

  respondToHierarchyEvent(evt) {
    if (evt.type === 'home' && this.state.active) {
      this.hide();
    }
    return !this.isActive();
  }

  selectAll() {
    if (this.input.value.length > 0) {
      this.input.setSelectionRange(0, this.input.value.length, 'forward');
    }
  }

  componentDidMount() {
    // set non-standard property here to advoid react-unknown-prop error.
    this.input.setAttribute('x-inputmode', 'verbatim');
    Service.request('registerHierarchy', this);
    Service.register('navigate', this);
    Service.register('show', this);
    Service.register('hide', this);
    Service.registerState('isActive', this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.active !== prevState.active) {
      if (!this.state.active) {
        this.publish('-deactivated');
      } else {
        this.publish('-activated');
      }
    }

    this.updateFocusIndex();
  }

  componentWillUnmount() {
    Service.request('SoftKeyStore:unregister', this.element, false);
    window.removeEventListener('screenchange', this);
    window.removeEventListener('apploading', this);
    window.removeEventListener('launchapp', this);
    window.removeEventListener('attentionopening', this);
    window.removeEventListener('attentionopened', this);
    window.removeEventListener('appforeground', this);
    window.removeEventListener('appopened', this);
    window.removeEventListener('homescreenopened', this);
    window.removeEventListener('activityrequesting', this);
    window.removeEventListener('activityterminated', this);
    window.removeEventListener('lockscreen-appopened', this);
    window.removeEventListener('keyboard-mode-changed', this);
    this.element = null;
  }

  render() {
    let recentSearchesResults = <div id="no-recent" data-l10n-id="no-recent"></div>;
    let placesResults = null;
    let suggestionsResults = <div id="loading"></div>;
    
    if (this.state.active) {
      if (this.state.recentSearches && this.state.recentSearches.length > 0) {
        recentSearchesResults = this.state.recentSearches.map((result, index) => {
          return <BrowserSearchItem key={index} {...result} />
        });

        // eslint-disable-next-line jsx-a11y/heading-has-content
        const header = <h3 key="separator" data-l10n-id="recent-searches"></h3>
        recentSearchesResults.unshift(header);
      }

      if (this.state.places && this.state.places.length > 0) {
        placesResults = this.state.places.map((result, index) => {
          return <BrowserSearchItem key={index} {...result} />
        });
      }

      if (this.state.suggestions && this.state.suggestions.length > 0) {
        suggestionsResults = this.state.suggestions.map((result, index) => {
          return <BrowserSearchItem key={index} {...result} />
        });
      }
    }

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        id='browser-search-view'
        tabIndex="-1"
        className={this.state.active ? '' : 'hidden'}
        onKeyDown={this.onKeyDown}
        ref={this.elementRef}>
        <div
          id="searchbar"
          className={this.state.inputFocused ? 'focus' : ''}>
          <div>
            <input
              type="search"
              className="p-pri"
              placeholder="Search or enter URL"
              data-l10n-id="search-or-enter-url"
              maxLength="2000"
              onChange={this.handleChange}
              onFocus={this.handleInputFocus}
              onBlur={this.handleInputBlur}
              ref={this.inputRef}
              />
          </div>
        </div>
        <div
          id="search-results-container"
          data-z-index-level="searchbar-results"
          ref={(dom) => {this.searchResultsContainer = dom;}}>
          <div
            id='recent-searches'
            className={this.state.recentSearches ? '' : 'hidden'}>
            {recentSearchesResults}
          </div>
          <div
            id="search-results"
            className={!this.state.recentSearches ? '' : 'hidden'}>
            <div id="places" className={this.state.places ? '' : 'hidden'}>
              {placesResults}
            </div>
            <div id="suggestions" className={this.state.suggestions ? '' : 'hidden'}>
              {suggestionsResults}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
