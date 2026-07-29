import '../../test/mocks/lazy_loader.js';
import '../../test/mocks/mock_appOrigin.js';
import HistoryList from '../js/elements/history_list.js';

describe('History_list', () => {
  const rootNode = document.createElement('div');
  document.body.appendChild(rootNode);
  const historyList = new HistoryList(rootNode);

  test('history list render without record', () => {
    const results = [];
    historyList.render(results);
    expect(historyList.defaultFocus.id).toBe('no-sites');
  });

  test('history list render with 1 record', () => {
    const results = [
      {
        data: {
          label: 'today'
        },
        type: 'separator'
      }, {
        data: {
          url: 'https://www.sample.com',
          title: 'test',
          icons: {}
        }
      }
    ];

    historyList.render(results);
    expect(historyList.candidates.length).toBe(1);
    expect(historyList.defaultFocus.classList.contains('result')).toBeTruthy();
  });
});
