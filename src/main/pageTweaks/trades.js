import config from 'config/lwmConfig';
import {
  lwmJQ, siteWindow,
} from 'config/globals';
import gmConfig from 'plugins/GM_config';
import { throwError, getIncomingResArray } from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';

const { confirm } = siteWindow;

export default () => {
  // we have to chain promises here to work around an issue
  // we resolve the page on #link since #tradeOfferDiv is not present without any active trades
  // we can't just process the page however because #tradeOfferDiv might still appear after #link
  // so we first listen to #link, then check tradeInfo.length and additionally resolve #tradeOfferDiv in case
  // we additionally have to tweak tradeInfo config as soon as trade get declined
  config.promises.content = getPromise('#link');
  config.promises.content.then(() => {
    // add accept and deny all button
    const $html = lwmJQ('<div class="tableFilters">'
        + '    <div class="tableFilters_header">Optionen</div>'
        + '    <div class="tableFilters_content">'
        + '        <div class="buttonRowInbox" id="lwm_trades_accept_all"><a class="formButton" href="javascript:void(0)">Accept All Trades</a></div>'
        + '        <div class="buttonRowInbox" id="lwm_trades_deny_all"><a class="formButton" href="javascript:void(0)">Deny All Trades</a></div>'
        + '    </div>'
        + '</div>');
    $html.find('#lwm_trades_accept_all').click(() => {
      if (confirm('WARNING: This will accept ALL trades!')) {
        const acceptPromises = [];
        lwmJQ.each(lwmJQ('[onclick*=acceptTradeOffer]'), (i, el) => {
          const tradeOfferId = lwmJQ(el).attr('onclick').match(/\d+/)[0];
          const call = siteWindow.jQuery.ajax({
            type: 'POST',
            dataType: 'json',
            url: './ajax_request/accept_trade_offer.php',
            data: { trade_offer_id: tradeOfferId },
          });
          acceptPromises.push(call);
        });
        // eslint-disable-next-line prefer-spread
        lwmJQ.when.apply(lwmJQ, acceptPromises).then(() => { siteWindow.changeContent('trade_offer', 'first', 'Handel'); });
      }
    });

    $html.find('#lwm_trades_deny_all').click(() => {
      if (confirm('WARNING: This will cancel/deny ALL trades!')) {
        const declinePromises = [];
        lwmJQ.each(lwmJQ('[onclick*=declineTradeOffer]'), (i, el) => {
          const tradeOfferId = lwmJQ(el).attr('onclick').match(/\d+/)[0];
          const call = siteWindow.jQuery.ajax({
            type: 'POST',
            dataType: 'json',
            url: './ajax_request/decline_trade_offer.php',
            data: { trade_offer_id: tradeOfferId },
          });
          declinePromises.push(call);
        });
        lwmJQ.each(lwmJQ('[onclick*=cancelTradeOffer]'), (i, el) => {
          const tradeOfferId = lwmJQ(el).attr('onclick').match(/\d+/)[0];
          const call = siteWindow.jQuery.ajax({
            type: 'POST',
            dataType: 'json',
            url: './ajax_request/delete_trade_offer.php',
            data: { trade_offer_id: tradeOfferId },
          });
          declinePromises.push(call);
        });
        // eslint-disable-next-line prefer-spread
        lwmJQ.when.apply(lwmJQ, declinePromises).then(() => { siteWindow.changeContent('trade_offer', 'first', 'Handel'); });
      }
    });

    // add stats table
    const tradeData = config.lwm.tradeData[config.gameData.playerID];
    const allTrades = Object.keys(tradeData).reduce((t, n) => { t.push(...tradeData[n]); return t; }, []);

    const savedResTotal = {
      fe: allTrades.filter((trade) => trade.my === 1).map((trade) => trade.resource[12]).reduce((t, n) => t + parseInt(n, 10), 0),
      kris: allTrades.filter((trade) => trade.my === 1).map((trade) => trade.resource[13]).reduce((t, n) => t + parseInt(n, 10), 0),
      frub: allTrades.filter((trade) => trade.my === 1).map((trade) => trade.resource[14]).reduce((t, n) => t + parseInt(n, 10), 0),
      ori: allTrades.filter((trade) => trade.my === 1).map((trade) => trade.resource[15]).reduce((t, n) => t + parseInt(n, 10), 0),
      fruro: allTrades.filter((trade) => trade.my === 1).map((trade) => trade.resource[16]).reduce((t, n) => t + parseInt(n, 10), 0),
      gold: allTrades.filter((trade) => trade.my === 1).map((trade) => trade.resource[17]).reduce((t, n) => t + parseInt(n, 10), 0),
    };

    const $statsTable = lwmJQ('<table id="lwm_tradeStats"><tbody>'
        + '<tr><th colspan="7">Currently Saved Resources</th></tr>'
        + '<tr>'
        + '<th class="sameWith"></td>'
        + '<th class="sameWith roheisenVariable">Roheisen</td>'
        + '<th class="sameWith kristallVariable">Kristall</td>'
        + '<th class="sameWith frubinVariable">Frubin</td>'
        + '<th class="sameWith orizinVariable">Orizin</td>'
        + '<th class="sameWith frurozinVariable">Frurozin</td>'
        + '<th class="sameWith goldVariable">Gold</td>'
        + '</tr>'
        + '</tbody></table>');

    config.gameData.planets.forEach((planet) => {
      const tradePlanetData = tradeData[planet.string];
      if (typeof tradePlanetData !== 'undefined') {
        const savedResPlanet = {
          fe: tradePlanetData.filter((trade) => trade.my === 1).map((trade) => trade.resource[12]).reduce((t, n) => t + parseInt(n, 10), 0),
          kris: tradePlanetData.filter((trade) => trade.my === 1).map((trade) => trade.resource[13]).reduce((t, n) => t + parseInt(n, 10), 0),
          frub: tradePlanetData.filter((trade) => trade.my === 1).map((trade) => trade.resource[14]).reduce((t, n) => t + parseInt(n, 10), 0),
          ori: tradePlanetData.filter((trade) => trade.my === 1).map((trade) => trade.resource[15]).reduce((t, n) => t + parseInt(n, 10), 0),
          fruro: tradePlanetData.filter((trade) => trade.my === 1).map((trade) => trade.resource[16]).reduce((t, n) => t + parseInt(n, 10), 0),
          gold: tradePlanetData.filter((trade) => trade.my === 1).map((trade) => trade.resource[17]).reduce((t, n) => t + parseInt(n, 10), 0),
        };

        $statsTable.find('tbody').append('<tr>'
            + `<td class="">${planet.string}</td>`
            + `<td class="roheisenVariable">${siteWindow.jQuery.number(savedResPlanet.fe, 0, ',', '.')}</td>`
            + `<td class="kristallVariable">${siteWindow.jQuery.number(savedResPlanet.kris, 0, ',', '.')}</td>`
            + `<td class="frubinVariable">${siteWindow.jQuery.number(savedResPlanet.frub, 0, ',', '.')}</td>`
            + `<td class="orizinVariable">${siteWindow.jQuery.number(savedResPlanet.ori, 0, ',', '.')}</td>`
            + `<td class="frurozinVariable">${siteWindow.jQuery.number(savedResPlanet.fruro, 0, ',', '.')}</td>`
            + `<td class="goldVariable">${siteWindow.jQuery.number(savedResPlanet.gold, 0, ',', '.')}</td>`
            + '</tr>'
            + '</tbody></table>');
      }
    });

    $statsTable.find('tbody').append('<tr>'
        + '<th class="">Total</th>'
        + `<th class="roheisenVariable">${siteWindow.jQuery.number(savedResTotal.fe, 0, ',', '.')}</th>`
        + `<th class="kristallVariable">${siteWindow.jQuery.number(savedResTotal.kris, 0, ',', '.')}</th>`
        + `<th class="frubinVariable">${siteWindow.jQuery.number(savedResTotal.frub, 0, ',', '.')}</th>`
        + `<th class="orizinVariable">${siteWindow.jQuery.number(savedResTotal.ori, 0, ',', '.')}</th>`
        + `<th class="frurozinVariable">${siteWindow.jQuery.number(savedResTotal.fruro, 0, ',', '.')}</th>`
        + `<th class="goldVariable">${siteWindow.jQuery.number(savedResTotal.gold, 0, ',', '.')}</th>`
        + '</tr>'
        + '</tbody></table>');

    lwmJQ('#link').after($html);
    lwmJQ('#link').after($statsTable);

    if (config.gameData.tradeInfo.trade_offers.length === 0) {
      config.loadStates.content = false;
    } else {
      getPromise('#tradeOfferDiv').then(() => {
        // mark trades that would exceed capacities
        const { tradeInfo } = config.gameData;
        const capacities = siteWindow.resourceCapacityArray;
        const currentRes = [siteWindow.Roheisen, siteWindow.Kristall, siteWindow.Frubin, siteWindow.Orizin, siteWindow.Frurozin, siteWindow.Gold];
        const incomingRes = getIncomingResArray();
        lwmJQ.each(tradeInfo.trade_offers, (i, offer) => {
          const tradeRunning = offer.accept === '1';
          const $tradeDiv = lwmJQ(`#div_${offer.trade_id}`);
          const isMyPlanet = offer.galaxy === config.gameData.planetCoords.galaxy
                && offer.system === config.gameData.planetCoords.system
                && offer.planet === config.gameData.planetCoords.planet;
          lwmJQ.each(currentRes, (j, amount) => {
            if (gmConfig.get('trade_highlights')) {
              if (offer.my === 1
                    && parseInt(offer.resource[j + 6], 10) > 0
                    && (incomingRes[j] + amount + (!tradeRunning ? parseInt(offer.resource[j + 6], 10) : 0)) > capacities[j]) {
                $tradeDiv.find(`tr:eq(${j + 5}) td`).last().addClass('redBackground');
                $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
              }
              if (isMyPlanet
                    && offer.my === 1
                    && parseInt(offer.resource[j + 12], 10) > 0
                    && (incomingRes[j] + amount + (!tradeRunning ? parseInt(offer.resource[j + 12], 10) : 0)) > capacities[j]) {
                $tradeDiv.find(`tr:eq(${j + 5}) td`).first().addClass('redBackground');
                $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
              }
              if (isMyPlanet
                    && offer.my === 0
                    && parseInt(offer.resource[j + 12], 10) > 0
                    && (incomingRes[j] + amount + (!tradeRunning ? parseInt(offer.resource[j + 12], 10) : 0)) > capacities[j]) {
                $tradeDiv.find(`tr:eq(${j + 5}) td`).first().addClass('redBackground');
                $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
              }
              if (offer.my === 0
                    && parseInt(offer.resource[j + 6], 10) > 0
                    && (incomingRes[j] + amount + (!tradeRunning ? parseInt(offer.resource[j + 6], 10) : 0)) > capacities[j]) {
                $tradeDiv.find(`tr:eq(${j + 5}) td`).last().addClass('redBackground');
                $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
              }
            }
          });
          // remove deny button from save trades of other planets
          if (offer.comment === '###LWM::SAVE###' && !isMyPlanet && !offer.my) $tradeDiv.find('tr').last().remove();
          if (offer.comment === '###LWM::SAVE###' && isMyPlanet) $tradeDiv.find('.buttonRow').first().remove();

          if (gmConfig.get('confirm_hideTrades')) {
            // remove trades from save trades of other planets
            if (offer.comment === '###LWM::SAVE###' && !isMyPlanet && !offer.my) $tradeDiv.hide();
            if (offer.comment === '###LWM::SAVE###' && isMyPlanet) $tradeDiv.hide();
          }

          // mark running trades
          if (offer.accept === '1') {
            $tradeDiv.find('.empty').last().addClass('green').find('th')
              .text('Running...');
          }
        });

        // attach events to delete trades
        lwmJQ('[onclick*=\'declineTradeOffer\']').click((e) => {
          const id = lwmJQ(e.target).attr('onclick').match(/\d+/)[0];
          config.gameData.tradeInfo.trade_offers = config.gameData.tradeInfo.trade_offers.filter((offer) => offer.trade_id !== id);
        });

        config.loadStates.content = false;
      }).catch((e) => {
        Sentry.captureException(e);
        // console.log(e);
        config.loadStates.content = false;
      });
    }
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
