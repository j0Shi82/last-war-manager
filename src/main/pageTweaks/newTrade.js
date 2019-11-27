import config from 'config/lwmConfig';
import {
  lwmJQ, gmConfig, siteWindow, gmSetValue,
} from 'config/globals';
import {
  throwError, checkCoords,
} from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import driveManager from 'plugins/driveManager';

const pi = (x) => parseInt(x, 10);
const docQuery = (query) => siteWindow.document.querySelector(query);

export default () => {
  config.promises.content = getPromise('#newTradeOfferDiv');
  config.promises.content.then(() => {
    // move buttons into one row and extend colspan
    const lastTR = docQuery('#newTradeOfferDiv tr:last-child');
    lastTR.querySelector('td:nth-child(1)').style.display = 'none';
    lastTR.querySelector('td:nth-child(2)').setAttribute('colspan', '4');
    lastTR.querySelector('td:nth-child(2) .buttonRow').appendChild(docQuery('.formButtonNewMessage'));

    // save coords in lastused config
    lwmJQ('[onclick*=\'submitNewOfferTrade\']').click(() => {
      const coords = [parseInt(lwmJQ('#galaxyTrade').val(), 10), parseInt(lwmJQ('#systemTrade').val(), 10), parseInt(lwmJQ('#planetTrade').val(), 10)];
      const check = lwmJQ.grep(config.gameData.planets, (p) => parseInt(p.galaxy, 10) === coords[0]
            && parseInt(p.system, 10) === coords[1]
            && parseInt(p.planet, 10) === coords[2]);
      if (!check.length && lwmJQ.inArray(`${coords[0]}x${coords[1]}x${coords[2]}`, config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string]) === -1 && checkCoords(coords)) {
        config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].unshift(`${coords[0]}x${coords[1]}x${coords[2]}`);
        if (config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > gmConfig.get('coords_trades')) {
          config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = gmConfig.get('coords_trades');
        }
        gmSetValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));
        if (gmConfig.get('confirm_drive_sync')) driveManager.save();
      }
    });

    // add button to save all res
    const $buttonSaveAll = lwmJQ('<a class="formButtonNewMessage" style="float: none;" href="#">All Resourcen sichern</a>');
    $buttonSaveAll.click(() => {
      lwmJQ('#my_eisen').val(Math.round((siteWindow.Roheisen - ((siteWindow.Roheisen * siteWindow.lose) / 100))));
      lwmJQ('#my_kristall').val(Math.round((siteWindow.Kristall - ((siteWindow.Kristall * siteWindow.lose) / 100))));
      lwmJQ('#my_frubin').val(Math.round((siteWindow.Frubin - ((siteWindow.Frubin * siteWindow.lose) / 100))));
      lwmJQ('#my_orizin').val(Math.round((siteWindow.Orizin - ((siteWindow.Orizin * siteWindow.lose) / 100))));
      lwmJQ('#my_frurozin').val(Math.round((siteWindow.Frurozin - ((siteWindow.Frurozin * siteWindow.lose) / 100))));
      lwmJQ('#my_gold').val(Math.round((siteWindow.Gold - ((siteWindow.Gold * siteWindow.lose) / 100))));
      if (lwmJQ('#his_eisen').val() === '0') lwmJQ('#his_eisen').val('1');
    });
    $buttonSaveAll.appendTo(lwmJQ(lastTR).find('td:eq(1) .buttonRow'));

    // add div with own chords
    const $divOwn = lwmJQ('<div style=\'width:100%\'></div>');
    const linksOwn = [];
    const saveLinksOwn = [];
    lwmJQ(config.gameData.planets).each((i, coords) => {
      if (pi(coords.galaxy) === siteWindow.my_galaxy
            && pi(coords.system) === siteWindow.my_system
            && pi(coords.planet) === siteWindow.my_planet) return true;
      const $link = lwmJQ(`<a href='javascript:void(0)' data-index='${i}'>${coords.galaxy}x${coords.system}x${coords.planet}</a>`);
      const $saveLink = lwmJQ(`<a href='javascript:void(0)' data-index='${i}'> (SAVE)</a>`);
      $link.click((e) => {
        lwmJQ('#galaxyTrade').val(config.gameData.planets[lwmJQ(e.target).data('index')].galaxy);
        lwmJQ('#systemTrade').val(config.gameData.planets[lwmJQ(e.target).data('index')].system);
        lwmJQ('#planetTrade').val(config.gameData.planets[lwmJQ(e.target).data('index')].planet);
      });
      $saveLink.click((e) => {
        lwmJQ('#galaxyTrade').val(config.gameData.planets[lwmJQ(e.target).data('index')].galaxy);
        lwmJQ('#systemTrade').val(config.gameData.planets[lwmJQ(e.target).data('index')].system);
        lwmJQ('#planetTrade').val(config.gameData.planets[lwmJQ(e.target).data('index')].planet);
        $buttonSaveAll.click();
        lwmJQ('#his_gold').val('999999');
        lwmJQ('#his_eisen').val('0');
        lwmJQ('#tradeOfferComment').val('###LWM::SAVE###');
      });
      linksOwn.push($link);
      saveLinksOwn.push($saveLink);

      return true;
    });
    lwmJQ(linksOwn).each((i, l) => {
      $divOwn.append([l, saveLinksOwn[i], i !== linksOwn.length - 1 ? ' - ' : '']);
    });
    $divOwn.appendTo(lwmJQ(lastTR).find('td:eq(1)'));

    // add div with saved coords
    const $divSave = lwmJQ('<div style=\'width:100%\'></div>');
    const linksSave = [];
    lwmJQ(config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string]).each((i, coords) => {
      const $link = lwmJQ(`<a href='javascript:void(0)'>${coords}</a>`);
      $link.click(() => {
        lwmJQ('#galaxyTrade').val(coords.split('x')[0]);
        lwmJQ('#systemTrade').val(coords.split('x')[1]);
        lwmJQ('#planetTrade').val(coords.split('x')[2]);
      });
      linksSave.push($link);
    });
    lwmJQ(linksSave).each((i, l) => {
      $divSave.append([l, i !== linksOwn.length - 1 ? ' - ' : '']);
    });
    $divSave.appendTo(lwmJQ(lastTR).find('td:eq(1)'));

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
