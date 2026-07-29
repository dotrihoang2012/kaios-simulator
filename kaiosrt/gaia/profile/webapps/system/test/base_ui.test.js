require('../js/base_ui.js');

describe('base_ui', () => {
  let testUI;
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="testDiv">
        <span id="username" />
      </div>
    `;
    const { BaseUI } = window;
    const TestUI = () => {};
    TestUI.prototype = Object.create(BaseUI.prototype);
    TestUI.prototype.CLASS_NAME = 'test-ui';
    TestUI.prototype.ELEMENT_PREFIX = 'test-ui-';
    TestUI.prototype.EVENT_PREFIX = 'test-ui-';
    testUI = new TestUI();
    testUI.containerElement = document.getElementById('testDiv');
  })

  test('base_ui - render', (done) => {
    testUI.render();
    expect(document.getElementsByClassName('test-ui').length).toBe(1);
    done();
  });

  test('base_ui - destroy', (done) => {
    testUI.element = document.getElementById('username');
    testUI.show();
    expect(testUI.element.classList.contains('visible')).toBe(true);
    expect(testUI.isShown()).toBe(true);
    testUI.hide();
    expect(testUI.element.classList.contains('visible')).toBe(false);
    testUI.destroy();
    expect(testUI.element).toBeNull();
    done();
  })
});
