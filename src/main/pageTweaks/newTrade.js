import config from 'config/lwmConfig';
import {
  gmConfig, siteWindow, gmSetValue,
} from 'config/globals';
import {
  throwError, checkCoords,
} from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import driveManager from 'plugins/driveManager';
import { createElementFromHTML, docQuery } from 'utils/domHelper';

const pi = (x) => parseInt(x, 10);
const isPremium = () => siteWindow.premium_account === 1;

export default () => {
  config.promises.content = getPromise('#newTradeOfferDiv');
  config.promises.content.then(() => {
    // remove original save all button
    if (isPremium()) docQuery('[onclick*=\'inputFullResource\']').parentNode.removeChild(docQuery('[onclick*=\'inputFullResource\']'));
    // move buttons into one row and extend colspan
    const lastTR = docQuery('#newTradeOfferDiv tr:last-child');
    lastTR.querySelector('td:nth-child(1)').style.display = 'none';
    lastTR.querySelector('td:nth-child(2)').setAttribute('colspan', '4');
    lastTR.querySelector('td:nth-child(2) .buttonRow').appendChild(docQuery('.formButtonNewMessage'));

    // save coords in lastused config
    const savedCoords = config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string];
    docQuery('[onclick*=\'submitNewOfferTrade\']').addEventListener('click', () => {
      const coords = [parseInt(docQuery('#galaxyTrade').value, 10), parseInt(docQuery('#systemTrade').value, 10), parseInt(docQuery('#planetTrade').value, 10)];
      const check = config.gameData.planets.filter((p) => parseInt(p.galaxy, 10) === coords[0]
            && parseInt(p.system, 10) === coords[1]
            && parseInt(p.planet, 10) === coords[2]);
      if (!check.length && !savedCoords.includes(`${coords[0]}x${coords[1]}x${coords[2]}`) && checkCoords(coords)) {
        savedCoords.unshift(`${coords[0]}x${coords[1]}x${coords[2]}`);
        if (savedCoords.length > gmConfig.get('coords_trades')) {
          savedCoords.length = gmConfig.get('coords_trades');
        }
        gmSetValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));
        if (gmConfig.get('confirm_drive_sync')) driveManager.save();
      }
    });

    // add button to save all res
    const buttonSaveAll = createElementFromHTML('<a class="formButtonNewMessage" style="float: none;" href="#">All Resourcen sichern</a>');
    if (isPremium()) {
      buttonSaveAll.addEventListener('click', () => {
        docQuery('#my_eisen').value = Math.round((siteWindow.Roheisen - ((siteWindow.Roheisen * siteWindow.lose) / 100)));
        docQuery('#my_kristall').value = Math.round((siteWindow.Kristall - ((siteWindow.Kristall * siteWindow.lose) / 100)));
        docQuery('#my_frubin').value = Math.round((siteWindow.Frubin - ((siteWindow.Frubin * siteWindow.lose) / 100)));
        docQuery('#my_orizin').value = Math.round((siteWindow.Orizin - ((siteWindow.Orizin * siteWindow.lose) / 100)));
        docQuery('#my_frurozin').value = Math.round((siteWindow.Frurozin - ((siteWindow.Frurozin * siteWindow.lose) / 100)));
        docQuery('#my_gold').value = Math.round((siteWindow.Gold - ((siteWindow.Gold * siteWindow.lose) / 100)));
        if (docQuery('#his_eisen').value === '0') docQuery('#his_eisen').value = '1';
      });
      lastTR.querySelector('td:nth-child(2) .buttonRow').appendChild(buttonSaveAll);
    }

    // add div with own chords
    const divOwn = createElementFromHTML('<div class="lwm-trade-coords" style=\'width:100%\'></div>');
    const linksOwn = [];
    const saveLinksOwn = [];
    config.gameData.planets.forEach((coords, i) => {
      if (pi(coords.galaxy) === siteWindow.my_galaxy
            && pi(coords.system) === siteWindow.my_system
            && pi(coords.planet) === siteWindow.my_planet) return true;
      const link = createElementFromHTML(`<a href='javascript:void(0)' data-index='${i}'>${coords.galaxy}x${coords.system}x${coords.planet}</a>`);
      link.addEventListener('click', (e) => {
        docQuery('#galaxyTrade').value = config.gameData.planets[e.target.getAttribute('data-index')].galaxy;
        docQuery('#systemTrade').value = config.gameData.planets[e.target.getAttribute('data-index')].system;
        docQuery('#planetTrade').value = config.gameData.planets[e.target.getAttribute('data-index')].planet;
      });
      const saveLink = createElementFromHTML(`<a href='javascript:void(0)' data-index='${i}'> (SAVE)</a>`);
      if (isPremium()) {
        saveLink.addEventListener('click', (e) => {
          docQuery('#galaxyTrade').value = config.gameData.planets[e.target.getAttribute('data-index')].galaxy;
          docQuery('#systemTrade').value = config.gameData.planets[e.target.getAttribute('data-index')].system;
          docQuery('#planetTrade').value = config.gameData.planets[e.target.getAttribute('data-index')].planet;
          buttonSaveAll.click();
          docQuery('#his_gold').value = '99999999';
          docQuery('#his_eisen').value = '0';
          docQuery('#tradeOfferComment').value = '###LWM::SAVE###';
        });
      }
      linksOwn.push(link);
      saveLinksOwn.push(saveLink);

      return true;
    });
    linksOwn.forEach((l, i) => {
      divOwn.appendChild(l);
      divOwn.appendChild(isPremium() ? saveLinksOwn[i] : createElementFromHTML('<div></div>'));
      divOwn.appendChild(i !== linksOwn.length - 1 ? createElementFromHTML(' - ') : createElementFromHTML('<div></div>'));
    });
    lastTR.querySelector('td:nth-child(2)').appendChild(divOwn);

    // add div with saved coords
    const divSave = createElementFromHTML('<div class="lwm-trade-coords" style=\'width:100%\'></div>');
    const linksSave = [];
    savedCoords.forEach((coords) => {
      const link = createElementFromHTML(`<a href='javascript:void(0)'>${coords}</a>`);
      link.addEventListener('click', () => {
        [docQuery('#galaxyTrade').value, docQuery('#systemTrade').value, docQuery('#planetTrade').value] = coords.split('x');
      });
      linksSave.push(link);
    });
    linksSave.forEach((l, i) => {
      divSave.appendChild(l);
      divSave.appendChild(i !== linksSave.length - 1 ? createElementFromHTML(' - ') : createElementFromHTML('<div></div>'));
    });
    lastTR.querySelector('td:nth-child(2)').appendChild(divSave);

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
