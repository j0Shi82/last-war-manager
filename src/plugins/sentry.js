import * as Sentry from '@sentry/browser';

export { Sentry };

export default () => {
  Sentry.init({
    dsn: 'https://a26d8eec21664f969f5962a60313da95@sentry.io/1450111',
    release: 'last-war-manager@v1.0.1',
    attachStacktrace: 'on',
  });
};
