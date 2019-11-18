import { lwmJQ } from 'config/globals';
import config from 'config/lwmConfig';

const getPageLoadPromise = () => new Promise(((resolve, reject) => {
  let count = 0;
  let interval;

  // all loadStates must be false for site to finish loading
  if (lwmJQ.map(config.loadStates, (state) => state).indexOf(true) === -1) {
    resolve();
  } else {
    interval = setInterval(() => {
      if (lwmJQ.map(config.loadStates, (state) => state).indexOf(true) === -1) {
        clearInterval(interval);
        resolve();
      }
      count += 1;
      if (count > config.promises.interval.count - 1) {
        clearInterval(interval);
        reject();
      }
    }, config.promises.interval.ms);
  }
}));

const getLoadStatePromise = (type) => {
  let res; let
    rej;

  const promise = new Promise(((resolve, reject) => {
    res = resolve;
    rej = reject;

    if (typeof config.loadStates[type] === 'undefined') reject();

    let count = 0;
    let interval;

    if (!config.loadStates[type]) {
      resolve();
    } else {
      interval = setInterval(() => {
        if (!config.loadStates[type]) {
          clearInterval(interval);
          resolve();
        }
        count += 1;
        if (count > config.promises.interval.count - 1) {
          clearInterval(interval);
          reject();
        }
      }, config.promises.interval.ms);
    }
  }));

  promise.resolve = res;
  promise.reject = rej;

  return promise;
};

const getPromise = (searchSelector) => {
  let res; let
    rej;

  const promise = new Promise(((resolve, reject) => {
    res = resolve;
    rej = reject;

    if (!searchSelector) reject();

    let count = 0;
    let interval;

    if (lwmJQ(searchSelector).length && lwmJQ.map(lwmJQ(searchSelector), (sel) => lwmJQ(sel).html()).join(' ').search(/\w/) !== -1) {
      resolve();
    } else {
      interval = setInterval(() => {
        if (lwmJQ(searchSelector).length && lwmJQ.map(lwmJQ(searchSelector), (sel) => lwmJQ(sel).html()).join(' ').search(/\w/) !== -1) {
          clearInterval(interval);
          resolve();
        }
        count += 1;
        if (count > config.promises.interval.count - 1) {
          clearInterval(interval);
          reject();
        }
      }, config.promises.interval.ms);
    }
  }));

  promise.resolve = res;
  promise.reject = rej;

  return promise;
};

export {
  getLoadStatePromise, getPageLoadPromise, getPromise,
};
