import {
  gmConfig, siteWindow, gmSetValue, gmGetValue,
} from 'config/globals';
import { getFlottenbewegungenInfo } from 'utils/requests';
import performSpionage from 'operations/performSpionage';
import config from 'config/lwmConfig';
import { getActiveObs, setDataForClocks } from 'utils/helper';
import { createElementFromHTML, docQuery } from 'utils/domHelper';
import { convertSecondsToHHMMSS, dayjs } from 'utils/dateHelper';
// import moment from 'moment';

const { document } = siteWindow;

let fleetCompleteHandlerAdded = false;
let fleetRefreshInterval = null;

export default (page) => {
  // no fleet config set, return
  if (
    (gmConfig.get('addon_fleet') && page === 'flottenbewegungen')
    || (!gmConfig.get('addon_fleet') && page !== 'flottenbewegungen')
  ) {
    return;
  }

  // eslint-disable-next-line no-shadow
  const addFleetDiv = (page) => {
    const fleetRowElements = [];
    const filterSelectOptions = {
      coords: [],
      types: [],
      status: [],
    };
    const existingValues = {
      coords: [...document.querySelectorAll('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords option')].map((option) => option.value),
      types: [...document.querySelectorAll('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types option')].map((option) => option.value),
      status: [...document.querySelectorAll('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status option')].map((option) => option.value),
    };

    // exclude flottenbewegungen here as the only page that should not show fleets even with setting set
    if (
      (gmConfig.get('addon_fleet') && page === 'flottenbewegungen')
                        || (!gmConfig.get('addon_fleet') && page !== 'flottenbewegungen')
    ) {
      return;
    }

    // filter function
    const filter = (() => {
      const lang = config.const.lang.fleet;

      const process = () => {
        const tableBase = docQuery('#lwm_folottenbewegungenPageDiv table');
        tableBase.querySelectorAll('tr.lwm-hideable').forEach((el) => el.classList.add('lwm-hide'));
        const coordsFilterValue = docQuery('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords').value;
        const typeFilterValue = docQuery('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types').value;
        const statusFilterValue = docQuery('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status').value;

        tableBase.querySelectorAll('tr.lwm-fleet').forEach((el) => {
          const elementCoordValue = el.getAttribute('data-coords');
          const elementTypeValue = el.getAttribute('data-type');
          const elementStatusValue = el.getAttribute('data-status');

          const showRow = (elementCoordValue === coordsFilterValue || coordsFilterValue === '')
            && (elementTypeValue === typeFilterValue || typeFilterValue === '')
            && (elementStatusValue === statusFilterValue || statusFilterValue === '');
          if (showRow) el.classList.remove('lwm-hide');
          // hide drones if excluded and not directly selected
          if (gmConfig.get('addon_fleet_exclude_drones') && typeFilterValue !== '4' && elementTypeValue === '4') {
            el.classList.add('lwm-hide');
          }
        });

        // show active rows
        gmGetValue('lwm_fleetDivState', true).then((state) => {
          tableBase.querySelectorAll('tr.lwm-hideable').forEach((el) => {
            if (el.classList.contains('lwm-hide')) el.style.display = 'none';
            else el.style.display = '';
          });

          // show hint at hidden drones
          // this follows the following logic: if there are no visible fleets, must be hidden drones
          if (
            tableBase.querySelectorAll('tr.lwm-fleet').length > 0
                && [...tableBase.querySelectorAll('tr.lwm-fleet')].filter((el) => !el.classList.contains('lwm-hide')).length === 0
                && state
          ) {
            docQuery('#lwm_fleets_drone_info').style.display = 'none';
          } else {
            docQuery('#lwm_fleets_drone_info').style.display = '';
          }
        });
      };

      const add = (fleetData) => {
        if (typeof fleetData.homePlanet !== 'undefined'
            && !filterSelectOptions.coords.map((option) => option.value).includes(fleetData.homePlanet)
            && !existingValues.coords.includes(fleetData.homePlanet)
        ) {
          filterSelectOptions.coords.push(createElementFromHTML(`<option value="${fleetData.homePlanet}">${fleetData.homePlanet}</option>`));
        }
        if (typeof fleetData.Type !== 'undefined'
        && !filterSelectOptions.types.map((option) => option.value).includes(fleetData.Type)
            && !existingValues.types.includes(fleetData.Type)
        ) {
          filterSelectOptions.types.push(createElementFromHTML(`<option value="${fleetData.Type}">${lang.types[fleetData.Type]}</option>`));
        }
        if (typeof fleetData.Status !== 'undefined'
        && !filterSelectOptions.status.map((option) => option.value).includes(fleetData.Status)
            && !existingValues.status.includes(fleetData.Status)
        ) {
          filterSelectOptions.status.push(createElementFromHTML(`<option value="${fleetData.Status}">${lang.status[fleetData.Status]}</option>`));
        }
      };

      const attachSelects = () => {
        const flottenDiv = docQuery('#lwm_folottenbewegungenPageDiv');
        const flottenDivFirstTD = flottenDiv.docQuery('table td:first-child');

        if (flottenDiv.docQuery('i.toggle') === null) {
          gmGetValue('lwm_fleetDivState', true).then((data) => {
            const iconElement = createElementFromHTML(`<i style="font-size: 1.5em;margin-top:0px;" class="toggle fas fa-${data ? 'minus' : 'plus'}-circle"></i>`);
            flottenDivFirstTD.insertBefore(iconElement, flottenDivFirstTD.firstChild);
            flottenDiv.docQuery('i.toggle').addEventListener('click', (e) => {
              gmGetValue('lwm_fleetDivState', true).then((data2) => {
                gmSetValue('lwm_fleetDivState', !data2);
                process();
              });
              e.target.classList.toggle('fa-plus-circle');
              e.target.classList.toggle('fa-minus-circle');
            });
          });
        }

        if (flottenDiv.docQuery('#lwm_fleetFilter_coords') === null) {
          const selectCoords = createElementFromHTML('<select id="lwm_fleetFilter_coords"><option value="">Pick Coords</option></select>');
          selectCoords.addEventListener('change', () => { process(); });
          flottenDivFirstTD.appendChild(selectCoords);
        }

        if (flottenDiv.docQuery('#lwm_fleetFilter_types') === null) {
          const selectTypes = createElementFromHTML('<select id="lwm_fleetFilter_types"><option value="">Pick Type</option></select>');
          selectTypes.addEventListener('change', () => { process(); });
          flottenDivFirstTD.appendChild(selectTypes);
        }
        if (flottenDiv.docQuery('#lwm_fleetFilter_status') === null) {
          const selectStatus = createElementFromHTML('<select id="lwm_fleetFilter_status"><option value="">Pick Status</option></select>');
          selectStatus.addEventListener('change', () => { process(); });
          flottenDivFirstTD.appendChild(selectStatus);
        }
      };

      return {
        add,
        attachSelects,
        process,
      };
    })();

    // create main fleet div and attach selects
    if (docQuery('#lwm_folottenbewegungenPageDiv') === null) {
      const div = createElementFromHTML('<div class="pageContent" style="margin-bottom:20px;"><div id="lwm_folottenbewegungenPageDiv"><table><tbody><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Ankunft</td><td>Restflugzeit</td></tr></tbody></table></div></div>');
      div.style.display = 'none';
      docQuery('#all').insertBefore(div, docQuery('#all').firstChild);
      filter.attachSelects();
      div.style.display = '';
    }

    // remove all rows before populating
    document.querySelectorAll('#lwm_folottenbewegungenPageDiv table tr.lwm-hideable').forEach((el) => { el.parentNode.removeChild(el); });

    const iconAtt = '<i class="fas fa-fighter-jet"></i>';
    const iconBack = '<i class="fas fa-long-arrow-alt-left"></i>';
    const iconSend = '<i class="fas fa-long-arrow-alt-right"></i>';
    const iconDef = '<i class="fas fa-shield-alt"></i>';
    const iconTrans = '<i class="fas fa-exchange-alt"></i>';
    const iconPlanet = '<i class="fas fa-globe"></i>';
    const iconDrone = '<i class="fas fa-search"></i>';

    const getFleetTimerString = (fleetTimeString) => convertSecondsToHHMMSS(dayjs(fleetTimeString, 'YYYY-MM-DD HH:mm:ss').diff(dayjs(), 'second'));

    config.gameData.fleetInfo.send_infos.forEach((fleetData) => {
      filter.add(fleetData);
      let trStyle = '';
      let fleetInfoString = '';
      let fleetTimeString = '';
      let fleetClock = '';
      const oppCoords = `<b>${fleetData.Galaxy}x${fleetData.System}x${fleetData.Planet}</b>`;
      const oppNick = fleetData.Nickname_send;
      const ownCoords = `<b>${fleetData.Galaxy_send}x${fleetData.System_send}x${fleetData.Planet_send}</b>`;
      const speedString = ` <span class='lwm_fleet_duration' style='font-style:italic;'>Flugdauer: ${convertSecondsToHHMMSS(fleetData.total_secounds)}.</span>`;
      switch (parseInt(fleetData.Type, 10)) {
        case 1:
          trStyle = 'color:#fff;background-color:#c70000;';
          fleetInfoString = `${iconAtt}Eine Flotte vom Planet ${oppCoords} greift deinen Planeten ${ownCoords} an.`;
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        case 2:
          fleetInfoString = `${iconTrans}Fremde Flotte vom ${oppCoords} (${oppNick}) transportiert Rohstoffe nach ${ownCoords}.`;
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        case 3:
          if (parseInt(fleetData.Status, 10) === 1) {
            fleetInfoString = `${iconDef}Eine Flotte vom Planet ${oppCoords} verteidigt deinen Planeten ${ownCoords}.`;
            fleetTimeString = fleetData.ComeTime;
            fleetClock = `clock_${fleetData.clock_id}`;
          } else if (parseInt(fleetData.Status, 10) === 3) {
            fleetInfoString = `${iconDef}Eine Flotte von Planet ${oppCoords} verteidigt deinen Planeten ${ownCoords}.`;
            fleetTimeString = fleetData.DefendingTime;
            if (fleetData.DefendingTime == null) fleetClock = 'unbefristet';
            else {
              fleetClock = `clock_${fleetData.clock_id}`;
            }
          }
          break;
        case 5:
          fleetInfoString = `${iconSend}Fremde Flotte von ${oppCoords} wird überstellt nach ${ownCoords}.`;
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        default: break;
      }
      fleetRowElements.push(createElementFromHTML(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.Galaxy_send}x${fleetData.System_send}x${fleetData.Planet_send}" style=${trStyle}><td>${fleetInfoString}${speedString}</td><td>${fleetTimeString}</td><td id='${fleetClock}'>${getFleetTimerString(fleetTimeString)}</td></tr>`));
    });

    config.gameData.fleetInfo.all_informations.forEach((fleetData) => {
      // add missing info for drones
      fleetData.Type = '4'; fleetData.Status = '1';
      filter.add(fleetData);
      fleetRowElements.push(createElementFromHTML(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconDrone}Eigene ${fleetData.name} von Planet <b>${fleetData.homePlanet}</b> ist unterwegs nach ( <b>${fleetData.galaxy}x${fleetData.system}</b> )</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${getFleetTimerString(fleetData.time)}</td></tr>`));
    });

    config.gameData.fleetInfo.dron_observationens.forEach((fleetData) => {
      fleetData.Type = '4'; fleetData.Status = '1';
      filter.add(fleetData);
      fleetRowElements.push(createElementFromHTML(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconDrone}Eigene ${fleetData.name} von Planet <b>${fleetData.homePlanet}</b> ist unterwegs nach ( <b>${fleetData.galaxy}x${fleetData.system}x${fleetData.planet}</b> )</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${getFleetTimerString(fleetData.time)}</td></tr>`));
    });

    config.gameData.fleetInfo.dron_planetenscanners.forEach((fleetData) => {
      fleetData.Type = '4'; fleetData.Status = '1';
      filter.add(fleetData);
      fleetRowElements.push(createElementFromHTML(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconDrone}Eigene ${fleetData.name} von Planet <b>${fleetData.homePlanet}</b> ist unterwegs nach ( <b>${fleetData.galaxy}x${fleetData.system}x${fleetData.planet}</b> )</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${getFleetTimerString(fleetData.time)}</td></tr>`));
    });

    config.gameData.fleetInfo.buy_ships_array.forEach((fleetData) => {
      filter.add(fleetData);
      fleetRowElements.push(createElementFromHTML(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconSend}Flotte vom Handelsposten wird überstellt nach <b>${fleetData.homePlanet}</b>.</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${getFleetTimerString(fleetData.time)}</td></tr>`));
    });

    config.gameData.fleetInfo.fleet_informations.forEach((fleetData) => {
      filter.add(fleetData);
      let fleetInfoString = '';
      let fleetTimeString = '';
      let fleetClock = '';
      const oppCoords = `<b>${fleetData.Galaxy_send}x${fleetData.System_send}x${fleetData.Planet_send}</b>`;
      const oppNick = fleetData.Nickname_send;
      const ownCoords = `<b>${fleetData.homePlanet}</b>`;
      const lkomSendLink = `<i class="fas fa-wifi faa-flash animated" onclick="changeContent('flotten_view', 'third', 'Flotten-Kommando', '${fleetData.id}')" style="cursor:hand;margin-right:5px;color:#66f398"></i>`;
      const lkomBackLink = `<i class="fas fa-info-circle" onclick="changeContent('flotten_view', 'third', 'Flotten-Kommando', '${fleetData.id}')" style="cursor:hand;margin-right:5px;color:#3c3ff5"></i>`;
      const speedString = ` <span class='lwm_fleet_duration' style='font-style:italic;'>Flugdauer: ${convertSecondsToHHMMSS(fleetData.total_secounds)}.</span>`;

      const existingObs = getActiveObs([fleetData.Galaxy_send, fleetData.System_send, fleetData.Planet_send]);
      const spydrones = config.gameData.spionageInfos.planetenscanner_drons.filter((el) => el.engine_type === 'IOB' && parseInt(el.number, 10) > 0);
      // eslint-disable-next-line no-nested-ternary
      const obsLink = existingObs.length ? `<i onclick="${gmConfig.get('obs_opentabs') ? `window.open('view/content/new_window/observationen_view.php?id=${existingObs[0].id}')` : `openObservationWindow(${existingObs[0].id})`}" style="cursor:hand;" class="fas fa-search-plus fa2x"></i>` : (spydrones.length ? '<i style="cursor:hand;" class="fas fa-search fa2x"></i>' : '');

      const fleetDataStatus = parseInt(fleetData.Status, 10);

      switch (fleetData.Type) {
        case '1':
          fleetInfoString = `Eigene Flotte vom Planet ${ownCoords}`;
          if (fleetDataStatus === 1) fleetInfoString = `${iconAtt + obsLink + lkomSendLink + fleetInfoString} greift Planet `;
          else fleetInfoString = `${iconBack + lkomBackLink + fleetInfoString} kehrt von `;
          fleetInfoString += `${oppCoords} (${oppNick})`;
          if (fleetDataStatus === 1) fleetInfoString += ' an.';
          else fleetInfoString += ' zurück.';
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        case '2':
          fleetInfoString = `Eigene Flotte vom Planet ${ownCoords}`;
          if (fleetDataStatus === 1) fleetInfoString = `${iconTrans + lkomSendLink + fleetInfoString} transportiert Rohstoffe nach `;
          else fleetInfoString = `${iconBack + lkomBackLink + fleetInfoString} kehrt zurück von `;
          fleetInfoString += `${oppCoords} (${oppNick}).`;
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        case '3':
          fleetInfoString = `Eigene Flotte vom Planet ${ownCoords}`;
          if (fleetDataStatus === 1) fleetInfoString = `${iconDef + lkomBackLink + fleetInfoString} verteidigt Planet `;
          else if (fleetDataStatus === 2) fleetInfoString = `${iconBack + lkomSendLink + fleetInfoString} kehrt zurück vom `;
          else if (fleetDataStatus === 3) fleetInfoString = `${iconDef + lkomBackLink + fleetInfoString} verteidigt den Planeten `;
          fleetInfoString += `${oppCoords}( ${oppNick} )`;
          if (fleetDataStatus !== 3) {
            fleetTimeString = fleetData.ComeTime;
            fleetClock = `clock_${fleetData.clock_id}`;
          } else {
            fleetTimeString = fleetData.DefendingTime;
            if (fleetData.DefendingTime == null) fleetClock = 'unbefristet';
            else {
              fleetClock = `clock_${fleetData.clock_id}`;
            }
          }
          break;
        case '4':
          fleetInfoString = `${iconPlanet + lkomSendLink}Eigene Flotte von Planet ${ownCoords} kolonisiert Planeten ${oppCoords}.`;
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        case '5':
          fleetInfoString = `${iconSend + lkomSendLink}Eigene Flotte von Planet ${ownCoords} wird überstellt nach ${oppCoords} ( ${oppNick} ).`;
          fleetTimeString = fleetData.ComeTime;
          fleetClock = `clock_${fleetData.clock_id}`;
          break;
        default: break;
      }
      fleetRowElements.push(createElementFromHTML(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${fleetInfoString}${speedString}</td><td>${fleetTimeString}</td><td id='${fleetClock}'>${getFleetTimerString(fleetTimeString)}</td></tr>`));
    });

    // display message if there are hidden drones
    docQuery('#lwm_folottenbewegungenPageDiv table tbody').appendChild(createElementFromHTML('<tr id="lwm_fleets_drone_info" style="display:none;"><td colspan="3" style="text-align="center"><span style="font-style: italic; width:100%;">Drones are hidden in the settings. To show them please specifically select them using the type dropdown.</span></td></tr>'));
    // sort table by time
    fleetRowElements.sort((a, b) => {
      const tsA = dayjs(a.docQuery('td:last-child').textContent, 'HH:mm:ss').unix();
      const tsB = dayjs(b.docQuery('td:last-child').textContent, 'HH:mm:ss').unix();
      return tsA - tsB;
    });
    // populate fleets
    fleetRowElements.forEach((el) => {
      docQuery('#lwm_folottenbewegungenPageDiv table tbody').appendChild(el);
    });
    if (fleetRowElements.length === 0) {
      docQuery('#lwm_folottenbewegungenPageDiv').style.display = 'none';
      docQuery('#lwm_folottenbewegungenPageDiv').parentNode.style.marginBottom = '0px';
    } else {
      docQuery('#lwm_folottenbewegungenPageDiv').style.display = '';
      docQuery('#lwm_folottenbewegungenPageDiv').parentNode.style.marginBottom = '20px';
    }

    // add spionage action
    docQuery('#lwm_folottenbewegungenPageDiv table tbody tr').docQuery('.fa-search').addEventListener('click', (e) => { performSpionage(e.target.closest('tr').getAttribute('data-coords').split('x')); });
    // populate selects
    filterSelectOptions.coords.forEach((el) => { docQuery('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords').appendChild(el); });
    filterSelectOptions.types.forEach((el) => { docQuery('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types').appendChild(el); });
    filterSelectOptions.status.forEach((el) => { docQuery('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status').appendChild(el); });

    filter.process();

    if (gmConfig.get('addon_clock')) {
      clearInterval(siteWindow.timeinterval_flottenbewegungen);
      setDataForClocks();
    }
  };

  if (!fleetCompleteHandlerAdded) {
    siteWindow.jQuery(document).ajaxComplete((event, xhr, settings) => {
      const currentPage = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

      if (xhr.responseJSON === '500') return;

      if (currentPage === 'get_flottenbewegungen_info') {
        addFleetDiv(siteWindow.active_page);
      }
    });
    fleetCompleteHandlerAdded = true;
  }
  // add fleets to page
  addFleetDiv(page);

  // add refresh interval
  if (fleetRefreshInterval !== null) return;
  fleetRefreshInterval = setInterval(() => {
    getFlottenbewegungenInfo();
  }, 30000);
};
