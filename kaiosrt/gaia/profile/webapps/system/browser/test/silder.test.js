import '../../test/mocks/lazy_loader.js';
import '../../test/mocks/mock_appOrigin.js';
import '../../test/mocks/l10n.js';

import Slider from '../js/elements/slider.js';

describe('Slider', () => {
  const rootNode = document.createElement('div');
  const slider = new Slider(rootNode);

  test('slider list render', () => {
    const results = [{
      manifest_url: '',
      name: '',
      default_locale: 'en-us',
      locales: {'en-US': {name: ''}},
      icons: { 'https://sample.png': '32x32' }
    }];

    slider.render({ status: 'ok', data: results});
    const sliderWrap = slider.root.querySelector('#slider');

    expect(sliderWrap.classList.contains('hidden')).toBeFalsy();
    expect(sliderWrap.children.length).toBe(1);
    expect(sliderWrap.children[0].classList.contains('boundary-left')).toBeTruthy();
  });
});
