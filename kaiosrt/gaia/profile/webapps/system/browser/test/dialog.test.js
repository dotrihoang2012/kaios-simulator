import Dialog from '../js/elements/dialog.js';

describe('Dialog', () => {
  const rootNode = document.createElement('div');
  rootNode.className = 'hidden';
  const dialog = new Dialog(rootNode);

  test('show dialog', () => {
    dialog.show();
    expect(dialog.root.classList.contains('hidden')).toBeFalsy();
  });

  test('hide dialog', () => {
    const options = { onCancel: jest.fn() }; 
    dialog.show(options);
    dialog.handleEvent({ type: 'keydown', key: 'SoftLeft' });
    expect(dialog.root.classList.contains('hidden')).toBeTruthy();
    expect(options.onCancel).toHaveBeenCalled();
  });
});