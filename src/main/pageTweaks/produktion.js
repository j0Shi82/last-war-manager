import config from 'config/lwmConfig';
import {
  lwmJQ, gmSetValue, siteWindow,
} from 'config/globals';
import gmConfig from 'plugins/GM_config';
import {
  throwError, addConfirm, replaceElementsHtmlWithIcon, getFirstClassNameFromElement,
} from 'utils/helper';
import { addProductionCalculator } from 'utils/productionHelper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import driveManager from 'plugins/driveManager';

export default () => {
  config.promises.content = getPromise('#productionDiv');
  config.promises.content.then(() => {
    lwmJQ('button[onclick*=\'deleteDesign\']').each((i, el) => {
      const self = lwmJQ(el);
      if (gmConfig.get('confirm_production')) addConfirm(self[0], `${self.parents('tr').find('td:eq(0)').text()} löschen`);
    });

    replaceElementsHtmlWithIcon(lwmJQ('button[onclick*=\'deleteDesign\']'), 'fas fa-ban');

    lwmJQ('button[onclick*=\'makeShip\']').each((i, el) => {
      const self = lwmJQ(el);
      if (gmConfig.get('confirm_production')) addConfirm(self[0], `${self.parents('tr').prev().find('td:eq(0)').text()} produzieren`);
    });

    replaceElementsHtmlWithIcon(lwmJQ('button[onclick*=\'makeShip\']'), 'fas fa-2x fa-plus-circle');

    // set up filters
    const productionFilters = (() => {
      const process = () => {
        // write setting
        config.lwm.productionFilters[config.gameData.playerID][config.gameData.planetCoords.string] = lwmJQ.map(lwmJQ('.tableFilters_content > div > .activeBox'), (el) => lwmJQ(el).parent().data('filter'));
        gmSetValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));
        if (gmConfig.get('confirm_drive_sync')) driveManager.save();

        const filterFunctions = {
          all: () => lwmJQ.map(config.gameData.productionInfos, (el) => el.id),
          freight: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => parseInt(el.cargo, 10) > 0), (el) => el.id),
          kolo: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => parseInt(el.kolonisationsmodul, 10) > 0), (el) => el.id),
          traeger: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => parseInt(el.tragerdeck, 10) > 0), (el) => el.id),
          tarn: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => parseInt(el.tarnvorrichtung, 10) > 0), (el) => el.id),
          nuk: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => el.engineShortCode === 'NUK'), (el) => el.id),
          hyp: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => el.engineShortCode === 'Hyp'), (el) => el.id),
          gty: () => lwmJQ.map(lwmJQ.grep(config.gameData.productionInfos, (el) => el.engineShortCode === 'Gty'), (el) => el.id),
        };

        const getShipClassFromElement = ($tr) => {
          let shipClass = getFirstClassNameFromElement($tr) || '';
          shipClass = shipClass.match(/\d+/);
          return shipClass !== null ? shipClass[0] : '';
        };

        let shipClasses = filterFunctions.all();
        lwmJQ.each(lwmJQ('.tableFilters_content > div > .activeBox'), (i, el) => {
          const filterClasses = filterFunctions[lwmJQ(el).parent().data('filter')]();
          shipClasses = lwmJQ(shipClasses).filter(filterClasses);
        });

        lwmJQ('#productionDiv tr').each((i, el) => {
          if (lwmJQ(el).data('hide')) return true;
          // get first class name and strip s_ from it => then test for null in case regexp turns out empty
          const shipClass = getShipClassFromElement(lwmJQ(el));
          if (shipClass !== '' && lwmJQ.inArray(shipClass, shipClasses) === -1) lwmJQ(el).hide();
          else lwmJQ(el).show();
          return true;
        });
      };

      const $div = lwmJQ('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterFreight" data-filter="freight"><a class="formButton" href="javascript:void(0)">Fracht > 0</a></div>').appendTo($div.find('.tableFilters_content'));
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterKolo" data-filter="kolo"><a class="formButton" href="javascript:void(0)">Module: Kolo</a></div>').appendTo($div.find('.tableFilters_content'));
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterTraeger" data-filter="traeger"><a class="formButton" href="javascript:void(0)">Module: Trägerdeck</a></div>').appendTo($div.find('.tableFilters_content'));
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterTarn" data-filter="tarn"><a class="formButton" href="javascript:void(0)">Module: Tarn</a></div>').appendTo($div.find('.tableFilters_content'));
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterNuk" data-filter="nuk"><a class="formButton" href="javascript:void(0)">Engine: Nuk</a></div>').appendTo($div.find('.tableFilters_content'));
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterHyp" data-filter="hyp"><a class="formButton" href="javascript:void(0)">Engine: Hyp</a></div>').appendTo($div.find('.tableFilters_content'));
      lwmJQ('<div class="buttonRowInbox" id="lwm_ProdFilterGty" data-filter="gty"><a class="formButton" href="javascript:void(0)">Engine: Gty</a></div>').appendTo($div.find('.tableFilters_content'));

      $div.find('.buttonRowInbox').click((e) => { lwmJQ(e.target).toggleClass('activeBox'); process(); });
      lwmJQ('#productionDiv').prepend($div);

      return { process };
    })();

    lwmJQ.each(config.lwm.productionFilters[config.gameData.playerID][config.gameData.planetCoords.string], (i, filter) => { lwmJQ(`[data-filter='${filter}'] .formButton`).addClass('activeBox'); });
    productionFilters.process();

    const getShipName = ($tr) => $tr.find('.shipNameProduction a').text();

    // add hide buttons for ships
    const $showAllButton = (() => {
      const $button = lwmJQ(`<div class="inboxDeleteMessageButtons"><div class="buttonRowInbox" id="lwm_ShowHiddenShips"><a class="formButton" href="javascript:void(0)"><span class="count">${config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string].length}</span> versteckte(s) anzeigen</a></div></div>`);

      const setCurrentHiddenCount = () => {
        $button.find('.count').text(config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string].length);
      };

      $button.click(() => {
        config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string] = [];
        gmSetValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
        if (gmConfig.get('confirm_drive_sync')) driveManager.save();
        lwmJQ('#productionDiv tr').each((i, el) => { lwmJQ(el).data('hide', false); });
        setCurrentHiddenCount();
        productionFilters.process();
      });

      lwmJQ('#productionDiv').append($button);
      return { setCurrentHiddenCount };
    })();
    lwmJQ.each(config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string], (k, shipName) => {
      const shipClass = getFirstClassNameFromElement(lwmJQ(`.shipNameProduction:contains('${shipName} (')`).parents('tr'));
      lwmJQ(`.${shipClass}`).hide();
      lwmJQ(`.${shipClass}`).data('hide', true);
    });

    lwmJQ('.shipNameProduction').each((i, el) => {
      const $icon = lwmJQ('<i class="fas fa-times"></i>');
      $icon.click(() => {
        // ship name goes into config, but we're using classNames for the hide process
        const $tr = lwmJQ(el).parents('tr');
        const shipName = getShipName($tr);
        const shipClass = getFirstClassNameFromElement($tr);
        config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string].push(shipName);
        gmSetValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
        if (gmConfig.get('confirm_drive_sync')) driveManager.save();
        $showAllButton.setCurrentHiddenCount();
        lwmJQ(`.${shipClass}`).hide();
        lwmJQ(`.${shipClass}`).data('hide', true);
      });
      lwmJQ(el).append($icon);
    });

    // recalculate upgrade res
    siteWindow.document.querySelectorAll('[onclick*=\'addNumber\'],[onclick*=\'subNumber\']').forEach((el) => {
      const matches = el.getAttribute('onclick').match(/\((\d+),\s*(\d+)\)/);
      const shipID = parseInt(matches[2], 10);
      const shipType = matches[1] == '1' ? 's' : 'd';
      const shipTypeLong = matches[1] == '1' ? 'ship' : 'drone';
      const shipTR = siteWindow.document.querySelectorAll(`[class*='${shipType}_${shipID}']`).item(1);
      const feTD = shipTR.querySelector('.roheisenVariable');
      const krisTD = shipTR.querySelector('.kristallVariable');
      const frubTD = shipTR.querySelector('.frubinVariable');
      const oriTD = shipTR.querySelector('.orizinVariable');
      const fruroTD = shipTR.querySelector('.frurozinVariable');
      const goldTD = shipTR.querySelector('.goldVariable');
      const goButton = shipTR.querySelector('button');

      addProductionCalculator(
        el,
        [
          feTD, krisTD, frubTD, oriTD, fruroTD, goldTD,
        ],
        goButton,
        siteWindow.document.querySelector(`input[id$='_${shipTypeLong}_${shipID}']`),
        'value',
        el.getAttribute('onclick').match(/subNumber/) !== null,
      );
    });

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
