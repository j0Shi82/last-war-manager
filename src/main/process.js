import { lwmJQ, siteWindow } from 'config/globals';

import config from 'config/lwmConfig';
import { getPageLoadPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import { throwError } from 'utils/helper';
import submenu from 'main/submenu';
import pageTweaks from 'main/pageTweaks/index';
import addOns from 'addons/index';

const { document } = siteWindow;

export default (page, xhr, preserveSubmenu) => {
  config.loadStates.content = true;
  config.loadStates.lastLoadedPage = page;

  // reject current promises to cancel pending loads
  if (config.promises.content !== null) config.promises.content.reject();

  // figure out whether or not to process submenu and reject ongoing load in case
  if (preserveSubmenu && config.promises.submenu !== null) config.promises.submenu.reject();

  getPageLoadPromise().then(() => {
    lwmJQ('.loader').hide();
    lwmJQ('#all').show();
    if (config.firstLoad) {
      lwmJQ('#Main').addClass('active');
      lwmJQ('.lwm-firstload').remove();
      config.firstLoad = false;

      const viewportmeta = document.querySelector('meta[name=viewport]');
      viewportmeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    lwmJQ('#all').focus();

    if (page === 'get_galaxy_view_info') {
      lwmJQ('html, body').animate({ scrollTop: lwmJQ(document).height() }, 250);
    }
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    lwmJQ('.loader').hide();
    lwmJQ('#all').show();
    if (config.firstLoad) {
      lwmJQ('#Main').addClass('active');
      lwmJQ('.lwm-firstload').remove();
      config.firstLoad = false;

      const viewportmeta = document.querySelector('meta[name=viewport]');
      viewportmeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    lwmJQ('#all').focus();
  });

  if (!preserveSubmenu) {
    submenu.move(page);
  }

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

  pageTweaks.replaceArrows();

  /* addons */
  /* config.isPageLoad is currently set to false here because it's the last thing that runs */
  addOns.load(page);
};
