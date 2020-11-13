import lwmJQ from 'jquery';
import localforage from 'localforage';

localforage.config({
  name: 'LWM',
  version: 1.3,
  storeName: 'lwm_config', // Should be alphanumeric, with underscores.
  description: 'Stores config values of the Last-War Manager',
});

// eslint-disable-next-line no-undef
const siteWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
// eslint-disable-next-line no-undef
const lwmWindow = window;

// Tampermonkey API
// eslint-disable-next-line no-undef
const gmSetValue = (GM && GM.setValue) ? GM.setValue : localforage.setItem;
// eslint-disable-next-line no-undef
const gmGetValue = (GM && GM.getValue) ? GM.getValue : localforage.getItem;

export {
  siteWindow, lwmWindow, gmSetValue, gmGetValue, lwmJQ,
};
