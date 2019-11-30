
import config from 'config/lwmConfig';
import {
  lwmJQ, gmConfig, siteWindow,
} from 'config/globals';
import {
  throwError, setDataForClocks,
} from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import addOns from 'addons/index';

const docQuery = (query) => siteWindow.document.querySelector(query);

export default () => {
  config.promises.content = getPromise('#uberPageDiv');
  config.promises.content.then(() => {
    lwmJQ('.Posle').find('td:first').attr('colspan', '3');
    lwmJQ('.Posle').find('td:first').each((i, el) => {
      const coords = lwmJQ(el).html().match(/\d+x\d+x\d+/)[0].split('x');
      const button = `<input class="planetButton planetButtonMain" type="button" value="${lwmJQ(el).text()}" onclick="changeCordsFromUberPage(${coords[0]}, ${coords[1]}, ${coords[2]});">`;
      lwmJQ(el).parents('.Posle').attr('data-coords', `${coords[0]}x${coords[1]}x${coords[2]}`);
      lwmJQ(el).html(button);
    });

    // add resources
    if (gmConfig.get('overview_planetresources')) {
      lwmJQ.each(config.gameData.planetInformation, (i, d) => {
        const $Posle = lwmJQ(`.Posle[data-coords='${d.Galaxy}x${d.System}x${d.Planet}']`);
        const $tr = lwmJQ('<tr></tr>');
        const $td = lwmJQ('<td colspan="3" style="padding:2px;"></td>'); $tr.append($td);
        const $table = lwmJQ('<table></table>'); $td.append($table);
        const $tbody = lwmJQ('<tbody></tbody>'); $table.append($tbody);
        const $tr1 = lwmJQ('<tr><td class="sameWith roheisenVariable">Roheisen</td><td class="sameWith kristallVariable">Kristall</td><td class="sameWith frubinVariable">Frubin</td><td class="sameWith orizinVariable">Orizin</td><td class="sameWith frurozinVariable">Frurozin</td><td class="sameWith goldVariable">Gold</td></tr>');
        const $tr2 = lwmJQ(`<tr><td class="roheisenVariable">${siteWindow.jQuery.number(Math.round(d.Planet_Roheisen), 0, ',', '.')}</td><td class="kristallVariable">${siteWindow.jQuery.number(Math.round(d.Planet_Kristall), 0, ',', '.')}</td><td class="frubinVariable">${siteWindow.jQuery.number(Math.round(d.Planet_Frubin), 0, ',', '.')}</td><td class="orizinVariable">${siteWindow.jQuery.number(Math.round(d.Planet_Orizin), 0, ',', '.')}</td><td class="frurozinVariable">${siteWindow.jQuery.number(Math.round(d.Planet_Frurozin), 0, ',', '.')}</td><td class="goldVariable">${siteWindow.jQuery.number(Math.round(d.Planet_Gold), 0, ',', '.')}</td></tr>`);
        $tbody.append($tr1).append($tr2);
        $Posle.find('tbody').append($tr);
      });
    }

    // replace planet type (main, colony) with planet name
    if (gmConfig.get('overview_planetnames')) {
      lwmJQ.each(config.gameData.planetInformation, (i, d) => {
        const $Posle = lwmJQ(`.Posle[data-coords='${d.Galaxy}x${d.System}x${d.Planet}']`);
        let $val = $Posle.find('.planetButton').val();
        $val = $val.replace(/\(.*\)/, `(${d.Planet_Name})`);
        $Posle.find('.planetButton').val($val);
      });
    }

    // add energy and slots
    if (gmConfig.get('overview_planetstatus')) {
      lwmJQ.each(config.lwm.planetInfo[config.gameData.playerID], (coords, data) => {
        const $Posle = lwmJQ(`.Posle[data-coords='${coords}']`);
        $Posle.find('td:first input').val(`${$Posle.find('td:first input').val()} ${data.energy} TW - ${data.slots} Free Slot(s)`);
      });
    }

    // show and relocate planet picture
    if (gmConfig.get('overview_planetpicture')) {
      docQuery('#planetImage').style.setProperty('display', 'block', 'important');
      // docQuery('#uberPageDiv').prepend(docQuery('#planetImage'));
    }

    // save overview times to calendar
    addOns.calendar.storeOverview(config.gameData.overviewInfo);

    if (gmConfig.get('addon_clock')) {
      clearInterval(siteWindow.timeinterval_uber);
      setDataForClocks();
    }

    // add fleet warning distance
    lwmJQ('.Posle').last().next().find('tr')
      .last()
      .after('<tr><td class="Pola">Frühwarnung:</td><td class="Pola lwm_fleetwarning"></td></tr>');

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
