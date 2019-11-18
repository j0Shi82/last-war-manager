// import initSentry, { Sentry } from 'plugins/sentry';
import {
  siteWindow, lwmJQ, gmSetValue, lwmWindow, gmConfig,
} from 'config/globals';
import addOns from 'addons/index';
import config from 'config/lwmConfig';
import driveManager from 'plugins/driveManager';
import { throwError } from 'utils/helper';
import { getSpionageInfo } from 'utils/requests';
import { getLoadStatePromise } from 'utils/loadPromises';
import submenu from 'main/submenu';
import process from 'main/process';
import uiChanges from 'global/uiChanges';
import initGmConfig from 'config/gmConfig';
import hotkeySetup from 'global/hotkeySetup';
import 'assets/styles/main.scss';

const { document, location } = siteWindow;

const siteManager = () => {
  const installMain = () => {
    // coming from login, invalidate gDrive settings
    if (document.referrer.search(/index\.php\?page=Login$/) !== -1) {
      config.lwm.gDriveFileID = null;
      gmSetValue('lwm_gDriveFileID', null);
    }

    // load site jQuery as well, need this to make API calls
    lwmJQ(lwmWindow).on('load', () => {
      config.unsafeWindow.changeContent = siteWindow.changeContent;
      config.unsafeWindow.changeInboxContent = siteWindow.changeInboxContent;
      siteWindow.jQuery.ajaxSetup({ cache: true });

      uiChanges();

      // set google drive load state to true here so other can listen to it
      config.loadStates.gdrive = true;
      config.loadStates.gameData = true;

      lwmJQ('.status.lwm-firstload').text('LOADING... Game Data...');
      config.getGameData.all();
      siteWindow.jQuery.getScript('//apis.google.com/js/api.js').then(() => {
        lwmJQ('.status.lwm-firstload').text('LOADING... Google Drive...');
        driveManager.init(siteWindow.gapi);
      }, () => { lwmJQ('.status.lwm-firstload').text('LOADING... ERROR...'); /* Sentry.captureMessage('Google API fetch failed'); */ throwError(); });
      getLoadStatePromise('gdrive').then(() => {
        lwmJQ('.status.lwm-firstload').text('LOADING... Page Setup...');
        // wait for gameData and google because some stuff depends on it
        hotkeySetup();
        if (!gmConfig.get('confirm_drive_sync')) config.setGMValues();

        // the first ubersicht load is sometimes not caught by our ajax wrapper, so do manually
        process('ubersicht');
      }, () => { lwmJQ('.status.lwm-firstload').text('LOADING... ERROR...'); /* Sentry.captureMessage('gDrive promise rejected'); */ throwError(); });

      // we're hooking into ajax requests to figure out on which page we are and fire our own stuff
      const processPages = ['get_inbox_message', 'get_message_info', 'get_galaxy_view_info', 'get_inbox_load_info', 'get_make_command_info',
        'get_info_for_flotten_pages', 'get_change_flotten_info', 'get_trade_offers', 'get_flotten_informations_info', 'get_spionage_info',
        'get_bank_info'];
      const ignorePages = ['spionage', 'inbox', 'trade_offer', 'make_command', 'galaxy_view', 'change_flotten', 'flottenkommando',
        'flottenbasen_all', 'fremde_flottenbasen', 'flottenbasen_planet', 'flotten_informations', 'bank'];
      const preserveSubmenuPages = ['get_inbox_message', 'get_message_info'];

      siteWindow.jQuery(document).ajaxSend((event, xhr, settings) => {
        const matches = settings.url.match(/\/(\w*).php(\?.*)?$/);

        if (matches === null) return;

        const [, page] = matches;

        if (settings.url.search(/lwm_ignoreProcess/) !== -1) {
          // console.log('lwm_ignoreProcess... skipping');
          return;
        }
        // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
        if (config.firstLoad && page === 'ubersicht') return;

        // console.log(page);
        const processPages2 = ['get_inbox_message', 'get_message_info', 'get_galaxy_view_info', 'get_inbox_load_info', 'get_make_command_info',
          'get_info_for_flotten_pages', 'get_change_flotten_info'];
        const ignorePages2 = ['make_command', 'galaxy_view', 'change_flotten', 'flottenkommando', 'flottenbasen_all', 'fremde_flottenbasen', 'flottenbasen_planet'];

        if ((settings.url.match(/content/) || processPages2.indexOf(page) !== -1) && ignorePages2.indexOf(page) === -1) {
          // prevent the same page to get processed twice
          if (!config.loadStates.content || config.loadStates.lastLoadedPage !== page) {
            // console.log(page);
            if (!preserveSubmenuPages.includes(page)) submenu.clear();
            lwmJQ('#all').hide();
            lwmJQ('.loader').show();
          }
        }
      });

      siteWindow.jQuery(document).ajaxComplete((event, xhr, settings) => {
        const matches = settings.url.match(/\/(\w*).php(\?.*)?$/);

        if (xhr.responseJSON === '500' || xhr.readyState === 0 || matches === null) return;

        const [, page] = matches;

        // save specific responses for later use
        const saveRequest = ['get_production_info', 'get_aktuelle_production_info', 'get_ubersicht_info',
          'get_flottenbewegungen_info', 'get_inbox_message', 'get_info_for_observationen_page',
          'get_spionage_info', 'get_trade_offers', 'put_fleets', 'delete_fleets', 'put_change_flotten'];
        if (saveRequest.indexOf(page) !== -1) {
          if (page === 'get_ubersicht_info') config.gameData.overviewInfo = xhr.responseJSON;
          if (page === 'get_production_info') config.getGameData.setProductionInfos(xhr.responseJSON);
          if (page === 'get_aktuelle_production_info') addOns.calendar.storeProd(xhr.responseJSON);
          if (page === 'get_flottenbewegungen_info') {
            config.getGameData.addFleetInfo(xhr.responseJSON);
            // skip on first load because we can't be sure that everything is set up
            if (!config.loadStates.gdrive) addOns.calendar.storeFleets(xhr.responseJSON);
          }
          if (page === 'get_inbox_message') config.gameData.messageData = xhr.responseJSON;
          if (page === 'get_info_for_observationen_page') config.gameData.observationInfo = xhr.responseJSON;
          if (page === 'get_spionage_info') config.gameData.spionageInfos = xhr.responseJSON;
          if (page === 'get_trade_offers') {
            config.gameData.tradeInfo = xhr.responseJSON;
            addOns.checkCapacities();
            addOns.calendar.storeTrades(xhr.responseJSON);
          }
          if (['put_fleets', 'delete_fleets', 'put_change_flotten'].includes(page)) {
            getSpionageInfo();
          }
        }

        const listenPages = ['put_building'];

        if (listenPages.indexOf(page) !== -1) {
          // console.log(event, xhr, settings);
          // console.log('ajaxComplete',page, xhr.responseJSON);
        }
      });

      siteWindow.jQuery(document).ajaxComplete((event, xhr, settings) => {
        const matches = settings.url.match(/\/(\w*).php(\?.*)?$/);

        if (xhr.responseJSON === '500' || xhr.readyState === 0 || matches === null) return;

        const [, page] = matches;

        if (settings.url.search(/lwm_ignoreProcess/) !== -1) {
          // console.log('lwm_ignoreProcess... skipping');
          return;
        }
        // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
        if (config.firstLoad && page === 'ubersicht') return;

        const preserveSubmenu = preserveSubmenuPages.includes(page);

        if ((settings.url.match(/content/) || processPages.indexOf(page) !== -1) && ignorePages.indexOf(page) === -1) {
          // prevent the same page to get processed twice
          if (!config.loadStates.content || config.loadStates.lastLoadedPage !== page) process(page, xhr, preserveSubmenu);
        }
      });

      siteWindow.jQuery(siteWindow).focus(() => { addOns.load(siteWindow.active_page); });
    });
  };

  const install = () => {
    if (siteWindow.location.href.match(/planetenscanner_view/) !== null || siteWindow.location.href.match(/observationen_view/) !== null) {
      lwmJQ(siteWindow.document).ready(() => {
        addOns.planetData.storeDataFromSpio();
      });
    } else installMain();
  };

  install();
};

if (location.protocol === 'https:') {
  // add style
  // if (location.href.match(/planetenscanner_view/) === null && location.href.match(/observationen_view/) === null) {
  //   const css = GM_getResourceText('css');
  //   if (typeof GM_addStyle !== 'undefined') {
  //     GM_addStyle(css);
  //   } else if (typeof PRO_addStyle !== 'undefined') {
  //     PRO_addStyle(css);
  //   } else if (typeof addStyle !== 'undefined') {
  //     addStyle(css);
  //   } else {
  //     const node = document.createElement('style');
  //     node.type = 'text/css';
  //     node.appendChild(document.createTextNode(css));
  //     const heads = document.getElementsByTagName('head');
  //     if (heads.length > 0) {
  //       heads[0].appendChild(node);
  //     } else {
  //       // no head yet, stick it whereever
  //       document.documentElement.appendChild(node);
  //     }
  //   }
  // }

  // initSentry();
  initGmConfig();
  siteManager();
} else {
  location.href = `https:${lwmWindow.location.href.substring(lwmWindow.location.protocol.length)}`;
}
