import lwmJQ from 'jquery';

// eslint-disable-next-line no-undef
const siteWindow = unsafeWindow;
// eslint-disable-next-line no-undef
const lwmWindow = window;
// eslint-disable-next-line no-undef
const gmConfig = GM_config; // this is a Tampermonkey plugin

// Tampermonkey API
// eslint-disable-next-line no-undef
const gmSetValue = GM.setValue;
// eslint-disable-next-line no-undef
const gmGetValue = GM.getValue;

export {
  siteWindow, lwmWindow, gmConfig, gmSetValue, gmGetValue, lwmJQ,
};
