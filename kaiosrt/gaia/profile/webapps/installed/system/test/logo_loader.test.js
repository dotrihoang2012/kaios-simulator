import {
  MockPng,
  MockVideo
} from '../test/mocks/mock_media_files';

describe('<logo_loader.js> test', () => {
  const video = MockVideo;
  const image = MockPng;
  const invalidURL = 'INVALID_URL';
  const oldImage = window.Image;
  const mockImage = {
    src: null,
    onload: () => {},
    onerror: () => {}
  };
  window.Image = () => {
    return mockImage;
  };

  beforeEach((done) => {
    jest.useFakeTimers();
    require('../js/logo_loader');
    done();
  });

  test('image logo --> onload test', (done) => {
    const subject = new LogoLoader({
      video: invalidURL,
      image: image
    });
    subject.onload = () => {};
    jest.advanceTimersByTime(8000);
    expect(subject.ready).toBe(false);
    expect(subject.found).toBe(false);
    mockImage.onload();
    expect(subject.ready).toBe(true);
    expect(subject.found).toBe(true);
    done();
  });

  test('image logo --> onerror test', (done) => {
    const subject = new LogoLoader({
      video: video,
      image: invalidURL
    });
    subject._noVideo = true;
    subject.onnotfound = () => {};
    jest.advanceTimersByTime(8000);
    expect(subject._noImage).toBe(false);
    mockImage.onerror();
    expect(subject._noImage).toBe(true);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll((done) => {
    window.Image = oldImage;
    done();
  });
});