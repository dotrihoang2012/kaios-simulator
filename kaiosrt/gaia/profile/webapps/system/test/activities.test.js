import MockBrowser from './mocks/mock_browser';
import Service from '../js/service.js';
import MockApplications from './mocks/mock_applications.js';

global.applications = MockApplications;

require('../js/activities');

describe('activities', () => {
  test('activities isInvalidApp', () => {
    const Activities = window.Activities;
    const activities = new Activities();
    expect(activities.isInvalidApp('app://sms.gaiamobile.org/manifest.webapp')).toBe(false);
    expect(activities.isInvalidApp('app://gallery.gaiamobile.org/manifest.webapp')).toBe(true);
  });
});
