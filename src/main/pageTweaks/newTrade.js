import config from 'config/lwmConfig';
import {
  gmConfig, siteWindow, gmSetValue, lwmJQ,
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
    const divSave = createElementFromHTML('<div class="lwm-trade-coords" style=\'width:100%\'></div>');
    lastTR.querySelector('td:nth-child(2)').appendChild(divSave);
    lastTR.querySelector('td:nth-child(2)').appendChild(createElementFromHTML('<div class="buttonRow lwm-buttonRow2" style="width: 100%; margin-left: 0;"></div>'));
    lastTR.querySelector('.lwm-buttonRow2').appendChild(docQuery('.formButtonNewMessage'));

    // remove clutter and rebuild trade ui
    lwmJQ('#newTradeOfferDiv td:eq(1),#newTradeOfferDiv td:eq(3)').contents().filter((i, el) => el.nodeName !== 'INPUT').remove();
    lwmJQ('#newTradeOfferDiv th:eq(0), #newTradeOfferDiv th:eq(2), #newTradeOfferDiv td:eq(0), #newTradeOfferDiv td:eq(2)').remove();
    lwmJQ('#newTradeOfferDiv th').attr('colspan', '4')
      .prepend('Koordinaten:&nbsp;')
      .append('<select id="lwm-own-coords"></select>')
      .append(`<div>(Handelsgebühr: ${siteWindow.lose}%)</div>`);
    lwmJQ('#newTradeOfferDiv td:eq(0)').prepend('<div><h3><u>Angebot</u></h3></div>');
    lwmJQ('#newTradeOfferDiv td:eq(1)').prepend('<div><h3><u>Forderung</u></h3></div>');

    siteWindow.document.querySelectorAll('#newTradeOfferDiv td input').forEach((el) => {
      const div = createElementFromHTML('<div class="lwm-res-offer-wrap"></div>');
      const { parentNode } = el;
      div.appendChild(el);
      const icon = createElementFromHTML('<i style="font-size: 1.5em;" class="fas fa-times-circle"></i>');
      icon.addEventListener('click', (e) => {
        e.target.previousSibling.value = '0';
      });
      div.appendChild(icon);
      parentNode.appendChild(div);
    });

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
    const buttonAll = createElementFromHTML('<a class="formButtonNewMessage" style="float: none;" href="#">Alle Resourcen</a>');
    buttonAll.addEventListener('click', () => {
      if (isPremium()) {
        docQuery('#my_eisen').value = Math.round((siteWindow.Roheisen - ((siteWindow.Roheisen * siteWindow.lose) / 100)));
        docQuery('#my_kristall').value = Math.round((siteWindow.Kristall - ((siteWindow.Kristall * siteWindow.lose) / 100)));
        docQuery('#my_frubin').value = Math.round((siteWindow.Frubin - ((siteWindow.Frubin * siteWindow.lose) / 100)));
        docQuery('#my_orizin').value = Math.round((siteWindow.Orizin - ((siteWindow.Orizin * siteWindow.lose) / 100)));
        docQuery('#my_frurozin').value = Math.round((siteWindow.Frurozin - ((siteWindow.Frurozin * siteWindow.lose) / 100)));
        docQuery('#my_gold').value = Math.round((siteWindow.Gold - ((siteWindow.Gold * siteWindow.lose) / 100)));
      }
      if (docQuery('#his_eisen').value === '0') docQuery('#his_eisen').value = '1';
      docQuery('#his_gold').value = '0';
      docQuery('#tradeOfferComment').value = '';

      // get config default coords and fill in
      const defaultCoords = `${gmConfig.get('coords_galaxy_main')}x${gmConfig.get('coords_system_main')}x${gmConfig.get('coords_planet_main')}`;
      const currentPlanetCoords = `${siteWindow.my_galaxy}x${siteWindow.my_system}x${siteWindow.my_planet}`;
      if (gmConfig.get('coords_galaxy_main') !== '0'
            && gmConfig.get('coords_system_main') !== '0'
            && gmConfig.get('coords_planet_main') !== '0'
            && docQuery('#galaxyTrade').value === ''
            && docQuery('#systemTrade').value === ''
            && docQuery('#planetTrade').value === ''
            && defaultCoords !== currentPlanetCoords) {
        docQuery('#galaxyTrade').value = gmConfig.get('coords_galaxy_main');
        docQuery('#systemTrade').value = gmConfig.get('coords_system_main');
        docQuery('#planetTrade').value = gmConfig.get('coords_planet_main');
      }
    });
    if (isPremium()) lastTR.querySelector('td:nth-child(2) .buttonRow').appendChild(buttonAll);

    // add button to secure all res
    const buttonSecureAll = createElementFromHTML('<a class="formButtonNewMessage" style="float: none;" href="#">Savehandel</a>');
    buttonSecureAll.addEventListener('click', () => {
      buttonAll.click();
      docQuery('#his_gold').value = '99999999';
      docQuery('#his_eisen').value = '0';
      docQuery('#tradeOfferComment').value = '###LWM::SAVE###';

      const selectedCoords = `${docQuery('#galaxyTrade').value}x${docQuery('#systemTrade').value}x${docQuery('#planetTrade').value}`;
      const currentPlanetCoords = `${siteWindow.my_galaxy}x${siteWindow.my_system}x${siteWindow.my_planet}`;
      if (docQuery('#lwm-own-coords').options.length > 1
            && (
              config.gameData.planets.filter((el) => el.string === selectedCoords).length === 0
              || selectedCoords === currentPlanetCoords
            )) {
        docQuery('#lwm-own-coords').selectedIndex = 1;
        docQuery('#lwm-own-coords').dispatchEvent(new siteWindow.Event('change'));
      }
    });
    lastTR.querySelector('td:nth-child(2) .buttonRow').appendChild(buttonSecureAll);

    // add own chords to select
    const select = docQuery('#lwm-own-coords');
    select.appendChild(createElementFromHTML('<option value=\'\'>Planet wählen</option>'));
    select.addEventListener('change', () => {
      if (select.value === '') {
        docQuery('#galaxyTrade').value = '';
        docQuery('#systemTrade').value = '';
        docQuery('#planetTrade').value = '';
      } else {
        docQuery('#galaxyTrade').value = config.gameData.planets[select.value].galaxy;
        docQuery('#systemTrade').value = config.gameData.planets[select.value].system;
        docQuery('#planetTrade').value = config.gameData.planets[select.value].planet;
      }
    });
    config.gameData.planets.forEach((coords, i) => {
      if (pi(coords.galaxy) === siteWindow.my_galaxy
            && pi(coords.system) === siteWindow.my_system
            && pi(coords.planet) === siteWindow.my_planet) return true;
      const option = createElementFromHTML(`<option value='${i}'>${coords.galaxy}x${coords.system}x${coords.planet}</option>`);
      select.appendChild(option);

      return true;
    });

    // sync text boxes to select
    siteWindow.document.querySelectorAll('#galaxyTrade,#systemTrade,#planetTrade').forEach((el) => {
      el.addEventListener('change', () => {
        const selectedCoords = `${docQuery('#galaxyTrade').value}x${docQuery('#systemTrade').value}x${docQuery('#planetTrade').value}`;
        const currentPlanetCoords = `${siteWindow.my_galaxy}x${siteWindow.my_system}x${siteWindow.my_planet}`;
        if (config.gameData.planets.filter((planet) => planet.string === selectedCoords).length === 0
            || selectedCoords === currentPlanetCoords) {
          docQuery('#lwm-own-coords').selectedIndex = 0;
        } else {
          docQuery('#lwm-own-coords').selectedIndex = config.gameData.planets.map((planet) => planet.string).indexOf(selectedCoords);
        }
      });
    });

    // add div with saved coords
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
      divSave.appendChild(i !== linksSave.length - 1 ? createElementFromHTML('&nbsp;-&nbsp;') : createElementFromHTML('<div></div>'));
    });

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
