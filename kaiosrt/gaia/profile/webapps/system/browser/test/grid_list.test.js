import '../../test/mocks/lazy_loader.js';
import '../../test/mocks/mock_appOrigin.js';

import GridList from '../js/elements/grid_list.js';
import config from '../js/browser_config.js';

describe('Grid_list', () => {
  const rootNode = document.createElement('div');
  const gridList = new GridList(rootNode);

  test('grid list render', () => {
    const results = [];
    config.basics.forEach((data) => {
      results.push({ data: data, type: 'basic' });
    });

    new Array(6).fill(null).forEach((data, index) => {
      results.push({ data: data, type: 'pinned', originIndex: index });
    });

    gridList.render(results);
    expect(gridList.root.children.length).toBe(9);
  });
});
