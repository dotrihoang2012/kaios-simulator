const UrlHelper = require('../js/url_helper');

describe('url_helper', () => {
  test('getUrlFromInput', (done) => {
    const { UrlHelper } = window;
    expect(UrlHelper.getUrlFromInput('website.com'))
      .toBe('http://localhost/website.com');
    done();
  });

  test('isURL', (done) =>{
    const { UrlHelper } = window;
    expect(UrlHelper.isURL('website.com')).toBe(true);
    expect(UrlHelper.isURL('nonWebsite')).toBe(false);
    expect(UrlHelper.isURL('http://nonWebsite')).toBe(true);
    done();
  })
});
