import { siteWindow, gmGetValue, gmSetValue } from 'config/globals';

import config from 'config/lwmConfig';
import { getPageLoadPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import { throwError } from 'utils/helper';
import submenu from 'main/submenu';
import pageTweaks from 'main/pageTweaks/index';
import addOns from 'addons/index';

const { document } = siteWindow;
const docQuery = (query) => document.querySelector(query);

// stuff to run when the page has loaded
const finalizePageLoad = () => {
  docQuery('.loader').style.display = 'none';
  docQuery('#all').style.display = 'block';
  if (config.firstLoad) {
    docQuery('#Main').classList.add('active');
    document.querySelectorAll('.lwm-firstload').forEach((el) => { el.parentNode.removeChild(el); });
    config.firstLoad = false;

    const viewportmeta = docQuery('meta[name=viewport]');
    viewportmeta.setAttribute('content', 'width=device-width, initial-scale=1.0');

    // check if we need to navigate to another page
    gmGetValue('lwm_navigateTo', []).then((data) => {
      if (data.length === 3) {
        siteWindow.changeContent(data[0], data[1], data[2]);
      }
      gmSetValue('lwm_navigateTo', []);
    });
  }

  // not sure focus works on a div <= TODO
  docQuery('#all').focus();
};

// this is the main process function that tweaks and changes content pages
export default (page, xhr, preserveSubmenu) => {
  // set the loadState to true to init content processing
  config.loadStates.content = true;
  config.loadStates.lastLoadedPage = page;

  // reject current promises to cancel pending loads
  if (config.promises.content !== null) config.promises.content.reject();

  // figure out whether or not to process submenu and reject ongoing load in case
  if (preserveSubmenu && config.promises.submenu !== null) config.promises.submenu.reject();
  // move the submenu to it's LWM location
  if (!preserveSubmenu) {
    submenu.move(page);
  }

  // call the function to change the corresponding page content
  switch (page) {
    case 'ubersicht': pageTweaks.uebersicht(); break;
    case 'produktion': pageTweaks.produktion(); break;
    case 'upgrade_ships': pageTweaks.upgradeShips(); break;
    case 'recycling_anlage': pageTweaks.recycleShips(); break;
    case 'verteidigung': pageTweaks.defense(); break;
    case 'construction': pageTweaks.construction(); break;
    case 'research': pageTweaks.research(); break;
    case 'aktuelle_produktion': pageTweaks.prodQueue(); break;
    case 'handelsposten': pageTweaks.shipPost(); break;
    case 'upgrade_defence': pageTweaks.upgradeDef(); break;
    case 'recycling_defence': pageTweaks.recycleDef(); break;
    case 'planeten': pageTweaks.planeten(); break;
    case 'get_inbox_load_info': pageTweaks.inbox(); break;
    case 'get_inbox_message': pageTweaks.inbox(); break;
    case 'get_trade_offers': pageTweaks.trades(); break;
    case 'new_trade_offer': pageTweaks.newTrade(); break;
    case 'flottenbewegungen': pageTweaks.calendar(); break;
    case 'raumdock': pageTweaks.shipdock(); break;
    case 'get_galaxy_view_info': pageTweaks.galaxyView(); break;
    case 'observationen': pageTweaks.obs(); break;
    case 'schiffskomponenten': pageTweaks.designShips(); break;
    case 'get_make_command_info': pageTweaks.fleetCommand(); break;
    case 'get_change_flotten_info': pageTweaks.changeFleet(); break;
    case 'get_info_for_flotten_pages': pageTweaks.allFleets(xhr); break;
    case 'get_flotten_informations_info': pageTweaks.fleetSend(xhr.responseJSON); break;
    case 'get_spionage_info': pageTweaks.spyInfo(xhr.responseJSON); break;
    case 'building_tree': pageTweaks.buildingTree(); break;
    case 'research_tree': pageTweaks.buildingTree(); break;
    case 'shiptree': pageTweaks.buildingTree(); break;
    case 'verteidigung_tree': pageTweaks.buildingTree(); break;
    case 'rohstoffe': pageTweaks.resources(); break;
    case 'kreditinstitut': pageTweaks.credit(); break;
    case 'get_bank_info': pageTweaks.bank(xhr.responseJSON); break;
    default: pageTweaks.default(); break;
  }

  // replace arrows is a function that we want to do on so many pages that it's enough to just call it globally
  pageTweaks.replaceArrows();

  /* addons */
  /* config.isPageLoad is currently set to false here because it's the last thing that runs */
  addOns.load(page);

  // the promise gets resolved within the page tweak function
  // this is what happens once it's done
  getPageLoadPromise().catch((e) => {
    Sentry.captureException(e);
    throwError();
  }).finally(() => {
    finalizePageLoad();
    // make sure to scroll to the galaxy view because it can get outside the viewport in some cases
    if (page === 'get_galaxy_view_info') {
      docQuery('#tableForChangingPlanet').scrollIntoView();
    }
  });
};
