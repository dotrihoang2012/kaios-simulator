import MockPlaceStore from './mocks/mock_places_store';
require('../js/places.js');

global.PlacesStore = MockPlaceStore;

describe('Places', () => {
  const places = new window.Places();
  places.start();

  test('Store a new place.', (done) => {
    places.handleEvent({
      type: 'applocationchange',
      detail: {
        isBrowser: () => true,
        config: {
          url: 'https://www.kaiostech.com/'
        }
      }
    });

    setTimeout(() => {
      expect(places.store.put).toHaveBeenCalled();
      done();
    }, 3000);
  });
});
