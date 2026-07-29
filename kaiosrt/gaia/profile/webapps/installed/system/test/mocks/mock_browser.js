import browserEnv from 'browser-env';

browserEnv();

const element = document.createElement('iframe');
element.download = () => {};
const MockBrowser = { element };

export default MockBrowser;
