import DeviceCapabilityManager from '../../test/mocks/DeviceCapabilityManager';
import Service from '../../js/service';
import FeatureDetector from '../feature_detector';
jest.useFakeTimers();

describe('FeatureDetector', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks()
  });

  it('start', () => {
    FeatureDetector.start();
  });
});
