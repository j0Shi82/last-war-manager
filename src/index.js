import initSentry, { Sentry } from 'plugins/sentry';
import {
  siteWindow, gmSetValue,
} from 'config/globals';
import addOns from 'addons/index';
import config from 'config/lwmConfig';
import driveManager from 'plugins/driveManager';
import { throwError } from 'utils/helper';
import { createElementFromHTML } from 'utils/domHelper';
import {
  pageTriggersLoadingSpinner, pageSavesResponse, pagePreservesSubmenu, pageProcessesContent,
} from 'utils/urlHelper';
import { getSpionageInfo, getUebersichtInfo, getTradeOffers } from 'utils/requests';
import { getLoadStatePromise } from 'utils/loadPromises';
import submenu from 'main/submenu';
import process from 'main/process';
import uiChanges from 'global/uiChanges';
import logicChanges from 'global/logicChanges';
import gmConfig from 'plugins/GM_config';
import initGmConfig from 'config/gmConfig';
import hotkeySetup from 'global/hotkeySetup';
import 'assets/styles/main.scss';
import customProgressbarStyles from 'assets/styles/custom-progressbar.lazy.scss';

// add mobile support
if (siteWindow.document.querySelector('meta[name=\'viewport\']') !== null) {
  siteWindow.document.querySelector('meta[name=\'viewport\']').remove();
}
siteWindow.document.querySelector('head').appendChild(createElementFromHTML('<meta name="viewport" content="width=device-width, initial-scale=1.0">'));

const { document, location } = siteWindow;
const docQuery = (query) => document.querySelector(query);

// local helper funcs
const setFirstLoadStatusMsg = (msg) => {
  const el = docQuery('.status.lwm-firstload');
  el.innerHTML = msg;
};

const getLastWarPageIdent = (url) => {
  const matches = url.match(/\/(\w*).php(\?.*)?$/);
  if (matches === null) return null;
  const [, page] = matches;
  return page;
};

const urlHasIgnoreFlag = (url) => url.search(/lwm_ignoreProcess/) !== -1;

// set up the tool
const installMain = () => {
  // coming from login, invalidate gDrive settings
  if (document.referrer.search(/index\.php\?page=Login$/) !== -1) {
    config.lwm.gDriveFileID = null;
    gmSetValue('lwm_gDriveFileID', null);
  }

  // load site jQuery as well, need this to make API calls
  siteWindow.addEventListener('load', () => {
    config.unsafeWindow.changeContent = siteWindow.changeContent;
    config.unsafeWindow.changeInboxContent = siteWindow.changeInboxContent;
    siteWindow.jQuery.ajaxSetup({ cache: true });

    uiChanges();
    logicChanges();

    // set google drive load state to true here so other can listen to it
    config.loadStates.gdrive = true;
    config.loadStates.gameData = true;

    setFirstLoadStatusMsg('LOADING... Game Data...');
    config.getGameData.all();
    if (gmConfig.get('confirm_drive_sync')) {
      setFirstLoadStatusMsg('LOADING... Google Drive...');
      driveManager.init().catch(() => { setFirstLoadStatusMsg('LOADING... ERROR...'); Sentry.captureMessage('Google API fetch failed'); throwError(); });
    } else {
      getLoadStatePromise('gameData').then(() => { config.setGMValues(); }, () => { Sentry.captureMessage('gameData promise rejected'); throwError(); });
    }
    getLoadStatePromise('gdrive').then(() => {
      setFirstLoadStatusMsg('LOADING... Page Setup...');
      // wait for gameData and google because some stuff depends on it
      hotkeySetup();

      // the first ubersicht load is sometimes not caught by our ajax wrapper, so do manually
      process('ubersicht');
    }, () => { setFirstLoadStatusMsg('LOADING... ERROR...'); Sentry.captureMessage('gDrive promise rejected'); throwError(); });

    // this set of pages triggers the loading spinner on ajaxSend
    siteWindow.jQuery(document).ajaxSend((event, xhr, settings) => {
      const page = getLastWarPageIdent(settings.url);

      if (urlHasIgnoreFlag(settings.url) || page === null) return;

      // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
      if (config.firstLoad && page === 'ubersicht') return;

      if (pageTriggersLoadingSpinner(settings.url, page)) {
        // prevent the same page to get processed twice
        if (!config.loadStates.content || config.loadStates.lastLoadedPage !== page) {
          // clear submenu
          if (!pagePreservesSubmenu(page)) submenu.clear();
          // enable loader
          docQuery('#all').style.display = 'none';
          docQuery('.loader').style.display = 'block';
        }
      }
    });

    // save specific responses for later use
    siteWindow.jQuery(document).ajaxComplete((event, xhr, settings) => {
      const page = getLastWarPageIdent(settings.url);

      if (xhr.responseJSON === '500' || xhr.readyState === 0 || page === null) return;

      if (pageSavesResponse(page)) {
        switch (page) {
          case 'get_ubersicht_info':
            // wait until gdrive / setGMValues has been processed
            // otherwise this could lead to overwriting a previously saved config with empty values
            getLoadStatePromise('gdrive').then(() => {
              config.gameData.overviewInfo = xhr.responseJSON;
              addOns.calendar.storeOverview(xhr.responseJSON);
            }, () => { Sentry.captureMessage('gdrive promise rejected while waiting for get_ubersicht_info'); throwError(); });
            break;
          case 'get_production_info': config.getGameData.setProductionInfos(xhr.responseJSON); break;
          case 'get_aktuelle_production_info': addOns.calendar.storeProd(xhr.responseJSON); break;
          case 'get_flottenbewegungen_info':
            config.getGameData.addFleetInfo(xhr.responseJSON);
            // skip on first load because we can't be sure that everything is set up
            if (!config.loadStates.gdrive) addOns.calendar.storeFleets(xhr.responseJSON);
            addOns.showFleetActivityGlobally(config.loadStates.lastLoadedPage);
            break;
          case 'get_inbox_message': config.gameData.messageData = xhr.responseJSON; break;
          case 'get_research_info': config.gameData.researchInfo = xhr.responseJSON; break;
          case 'get_construction_info': config.gameData.constructionInfo = xhr.responseJSON; break;
          case 'get_info_for_observationen_page': config.gameData.observationInfo = xhr.responseJSON; break;
          case 'get_spionage_info': config.gameData.spionageInfos = xhr.responseJSON; break;
          case 'get_new_trade_offer_info': config.gameData.newTradeOfferInfo = xhr.responseJSON; break;
          case 'get_trade_offers':
            config.gameData.tradeInfo = xhr.responseJSON;
            config.getGameData.setTradeData();
            addOns.checkCapacities();
            addOns.calendar.storeTrades(xhr.responseJSON);
            break;
          default:
            break;
        }

        // resource listener logic
        if (gmConfig.get('addon_res')) {
          if ([
            'execute_action', 'bank_transaction', 'put_handelsposten_ships', 'put_flotten', 'put_upgrade_planet_defense', 'put_defense',
            'bank_transaction', 'put_kredit', 'recycling_ships',
          ].includes(page)) {
            // these calls modify res, but do not return the new values
            // so we need to call something that does
            getTradeOffers();
          }

          if ([
            'get_trade_offers', 'put_new_trade_offer', 'delete_trade_offer', 'accept_trade_offer', 'decline_trade_offer', 'get_max_resource_for_new_trade_offer',
            'delete_aktuelle_produktion', 'get_flottenbewegungen_info', 'send_flotten',
            'get_ubersicht_info', 'put_building', 'put_research', 'cancel_building', 'cancel_research',
          ].includes(page)) {
          // resources can be in different keys
            try {
              const response = JSON.parse(xhr.responseText);
              const fe = response.roheisen || response.Roheisen || response.resource.roheisen || response.resource.Roheisen;
              const kris = response.kristall || response.Kristall || response.resource.kristall || response.resource.Kristall;
              const frub = response.frubin || response.Frubin || response.resource.frubin || response.resource.Frubin;
              const ori = response.orizin || response.Orizin || response.resource.orizin || response.resource.Orizin;
              const fruro = response.frurozin || response.Frurozin || response.resource.frurozin || response.resource.Frurozin;
              const gold = response.gold || response.Gold || response.resource.gold || response.resource.Gold;
              if (fe && kris && frub && ori && fruro && gold) {
                config.getGameData.setResources([fe, kris, frub, ori, fruro, gold]);
              } else {
                console.warn('could not parse responseText for setResources function', xhr.responseText);
              }
            } catch (e) {
              console.warn('could not parse responseText for setResources function', xhr.responseText);
            }
          }
        }

        // separate case to refresh drones after a fleet action (which may or may not be a dron action)
        if (['put_fleets', 'delete_fleets', 'put_change_flotten'].includes(page)) {
          getSpionageInfo();
        }

        // get uebersicht info after building and research clicks so that calendar gets updated immediately
        if (['put_building', 'cancel_building', 'put_research', 'cancel_research'].includes(page)) {
          getUebersichtInfo();
        }
      }
    });

    // page processing and tweaking
    // this extends or changes the main content pages
    siteWindow.jQuery(document).ajaxComplete((event, xhr, settings) => {
      const page = getLastWarPageIdent(settings.url);

      if (urlHasIgnoreFlag(settings.url) || xhr.responseJSON === '500' || xhr.readyState === 0 || page === null) return;

      // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
      if (config.firstLoad && page === 'ubersicht') return;

      if (pageProcessesContent(settings.url, page)) {
        // prevent the same page to get processed twice
        if (!config.loadStates.content || config.loadStates.lastLoadedPage !== page) process(page, xhr, pagePreservesSubmenu(page));
      }
    });

    // siteWindow.jQuery(siteWindow).focus(() => { addOns.load(siteWindow.active_page); });
  });
};

// we make sure the user is on https because the extension doesn't work on insecure http
// if (location.protocol === 'https:') {
if (siteWindow.location.href.match(/planetenscanner_view/) !== null || siteWindow.location.href.match(/observationen_view/) !== null) {
  if (document.readyState !== 'loading') {
    addOns.planetData.storeDataFromSpio();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      addOns.planetData.storeDataFromSpio();
    });
  }
} else {
  // initSentry();
  initGmConfig().finally(() => {
    installMain();
    if (gmConfig.get('addon_clock')) {
      customProgressbarStyles.use();
    }
  });
}
// } else {
// location.href = `https:${location.href.substring(location.protocol.length)}`;
// }
