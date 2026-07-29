/* globals PlacesStore */
/* exported Places */
'use strict';

(function(exports) {

  const DEBOUNCE_TIME = 2000;

  /**
   * Add a recorded visit to the history, we prune them to the last
   * TRUNCATE_VISITS number of visits and store them in a low enough
   * resolution to render the view (one per day)
   */
  const TRUNCATE_VISITS = 10;

  /**
   * Places is the browser history, bookmark and icon management system for
   * B2G. Places monitors app events and syncs information with the Places
   * datastore for consumption by apps like Search.
   * @requires AppWindowManager
   * @class Places
   */
  class Places {
    writeInProgress = false;
    progressQueue = [];
    placeChanges = {};
    timeouts = {};

    start() {
      window.addEventListener('applocationchange', this);
      window.addEventListener('apptitlechange', this);
      window.addEventListener('appiconchange', this);
      window.addEventListener('apploaded', this);

      this.store = new PlacesStore();
      this.store.init();
      window.dispatchEvent(new CustomEvent('places-init'));
    }

    handleEvent(evt) {
      const app = evt.detail;

      // If the app is not a browser, do not track places as tracking places
      // currently has a non-trivial startup cost.
      if (app && app.isBrowser()) {
        switch (evt.type) {
          case 'applocationchange':
            this.onLocationChange(app.config.url);
            break;
          case 'apptitlechange':
            this.onTitleChange(app.config.url, app.title);
            break;
          case 'appiconchange':
            this.onIconChange(app.config.url, app.favicons);
            break;
          case 'apploaded':
            this.debouncePlaceChanges(app.config.url);
            break;
        }
      }
    }

    defaultPlace(url) {
      return {
        url,
        title: url,
        icons: {},
        frecency: 0,
        visits: [], // An array containing previous visits to this url
      };
    }

    editPlace(url, fun) {
      this.store.getPlace(url)
        .then((place) => place || this.defaultPlace(url))
        .then(fun)
        .then((newPlace) => {
          if (this.writeInProgress) {
            return this.progressQueue.push(newPlace);
          }

          this.writeInProgress = true;
          const next = (place) => {
            place = place || this.progressQueue.shift();

            if (!place) {
              this.writeInProgress = false;
              return;
            }

            this.store.put(place).then(next);
          }

          next(newPlace);
        })
    }

    getPlace(url) {
      return this.store.getPlace(url);
    }

    setVisits(url, visits) {
      return this.editPlace(url, (place) => {
        place.visits = place.visits || [];
        place.visits = place.visits.concat(visits);
        place.visits.sort((a, b) => b - a);
        return place;
      });
    }

    addToVisited(place) {
      place.visits = place.visits || [];

      if (!place.visits.length) {
        place.visits.unshift(place.visited);
        return place;
      }

      // If the last visit was within the last 24 hours, remove
      // it as we only need a resolution of one day
      const lastVisit = place.visits[0];
      if (lastVisit > (Date.now() - 60 * 60 * 24 * 1000)) {
        place.visits.shift();
      }

      place.visits.unshift(place.visited);

      if (place.visits.length > TRUNCATE_VISITS) {
        place.visits.length = TRUNCATE_VISITS;
      }

      return place;
    }

    clear() {
      return this.store.clear();
    }

    onLocationChange(url) {
      this.placeChanges[url] = this.placeChanges[url] || this.defaultPlace();
      this.placeChanges[url].visited = Date.now();
      this.placeChanges[url].frecency += 1;
      this.debounce(url);
    }

    onTitleChange(url, title) {
      this.placeChanges[url] = this.placeChanges[url] || this.defaultPlace();
      this.placeChanges[url].title = title;
      this.debounce(url);
    }

    onIconChange(url, icons) {
      this.placeChanges[url] = this.placeChanges[url] || this.defaultPlace();
      for (let iconUri in icons) {
        this.placeChanges[url].icons[iconUri] = icons[iconUri];
      }
      this.debounce(url);
    }

    debounce(url) {
      clearTimeout(this.timeouts[url]);
      this.timeouts[url] = setTimeout(() => {
        this.debouncePlaceChanges(url);
      }, DEBOUNCE_TIME);
    }

    debouncePlaceChanges(url) {
      clearTimeout(this.timeouts[url]);
      this.editPlace(url, (place) => {
        const edits = this.placeChanges[url];
        if (!edits) return;

        // Update the title if it's not the default (matches the URL)
        if (edits.title !== url) {
          place.title = edits.title;
        }

        if (edits.visited) {
          place.visited = edits.visited;
        }

        if (!place.frecency) {
          place.frecency = 0;
        }

        place.frecency += edits.frecency;

        if (!place.icons) {
          place.icons = {};
        }

        for (let iconUri in edits.icons) {
          place.icons[iconUri] = edits.icons[iconUri];
        }

        place = this.addToVisited(place);

        delete this.placeChanges[url];
        return place;
      });
    }
  }

  exports.Places = Places;
}(window));
