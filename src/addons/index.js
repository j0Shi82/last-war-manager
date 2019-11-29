import {
  gmConfig, siteWindow, lwmJQ, gmSetValue, gmGetValue,
} from 'config/globals';
import { getObsInfo, getSpionageInfo, getFlottenbewegungenInfo } from 'utils/requests';
import performSpionage from 'operations/performSpionage';
import config from 'config/lwmConfig';
import {
  throwError, getIncomingResArray, getActiveObs, setDataForClocks,
} from 'utils/helper';
import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';
import driveManager from 'plugins/driveManager';

momentDurationFormatSetup(moment);

const domQuery = (query) => siteWindow.document.querySelector(query);

const addOns = {
  config: {
    fleetRefreshInterval: null,
    tradeRefreshInterval: null,
    capacityRefreshInterval: null,
    clockInterval: null,
    fleetCompleteHandlerAdded: false,
  },
  load() {
    if (gmConfig.get('addon_fleet') && siteWindow.active_page !== 'flottenbewegungen') {
      if (!Object.keys(config.gameData.spionageInfos).length || !Object.keys(config.gameData.observationInfo).length) {
        getObsInfo()
          .then(() => getSpionageInfo())
          .then(() => { getFlottenbewegungenInfo(); });
      } else {
        getFlottenbewegungenInfo();
      }
    }

    addOns.refreshTrades();
    if (gmConfig.get('addon_clock')) addOns.addClockInterval();
  },
  unload() {
    if (addOns.config.fleetRefreshInterval !== null) { clearInterval(addOns.config.fleetRefreshInterval); addOns.config.fleetRefreshInterval = null; }
    if (addOns.config.tradeRefreshInterval !== null) { clearInterval(addOns.config.tradeRefreshInterval); addOns.config.tradeRefreshInterval = null; }
    if (addOns.config.capacityRefreshInterval !== null) {
      clearInterval(addOns.config.capacityRefreshInterval);
      addOns.config.capacityRefreshInterval = null;
    }
    if (addOns.config.clockInterval !== null) { clearInterval(addOns.config.clockInterval); addOns.config.clockInterval = null; }
  },
  // refresh trades every minute to make it unnecessary to visit the trade page for trade to go through
  refreshTrades() {
    const requestTrades = () => {
      const uriData = `galaxy_check=${config.gameData.planetCoords.galaxy}&system_check=${config.gameData.planetCoords.system}&planet_check=${config.gameData.planetCoords.planet}`;
      siteWindow.jQuery.ajax({
        url: `/ajax_request/get_trade_offers.php?${uriData}`,
        data: { lwm_ignoreProcess: 1 },
        timeout: config.promises.interval.ajaxTimeout,
        success: (data) => {
          if (data === '500') return;
          siteWindow.Roheisen = parseInt(data.resource.Roheisen, 10);
          siteWindow.Kristall = parseInt(data.resource.Kristall, 10);
          siteWindow.Frubin = parseInt(data.resource.Frubin, 10);
          siteWindow.Orizin = parseInt(data.resource.Orizin, 10);
          siteWindow.Frurozin = parseInt(data.resource.Frurozin, 10);
          siteWindow.Gold = parseInt(data.resource.Gold, 10);
        },
        error() { throwError(); },
        dataType: 'json',
      });
    };

    // always refresh trades once after login or planet change
    if (config.firstLoad) requestTrades();

    // refresh interval
    if (addOns.config.tradeRefreshInterval !== null) return; // allready installed
    addOns.config.tradeRefreshInterval = setInterval(() => {
      requestTrades();
    }, 60000);
  },
  // checks whether trades would surpass resource capacities and highlights a warning
  checkCapacities() {
    if (!gmConfig.get('trade_highlights')) return;
    const capacities = siteWindow.resourceCapacityArray;
    const resSpans = [domQuery('#roheisenAmount'), domQuery('#kristallAmount'), domQuery('#frubinAmount'), domQuery('#orizinAmount'), domQuery('#frurozinAmount'), domQuery('#goldAmount')];
    const currentRes = [siteWindow.Roheisen, siteWindow.Kristall, siteWindow.Frubin, siteWindow.Orizin, siteWindow.Frurozin, siteWindow.Gold];
    const incomingRes = getIncomingResArray();

    currentRes.forEach((amount, i) => {
      if (amount + incomingRes[i] > capacities[i]) resSpans[i].classList.add('redBackground');
      else resSpans[i].classList.remove('redBackground');
    });

    // add invterval
    if (addOns.config.capacityRefreshInterval === null) {
      addOns.config.capacityRefreshInterval = setInterval(() => {
        addOns.checkCapacities();
      }, 10000);
    }
  },
  addClockInterval() {
    if (addOns.config.clockInterval !== null) return;
    addOns.config.clockInterval = setInterval(() => {
      lwmJQ('[id*=\'clock\'],[id*=\'Clock\']').each((i, el) => {
        const self = lwmJQ(el);
        // skip elements that don't have data attribute
        if (typeof self.data('clock_seconds') === 'undefined') return true;

        const data = parseInt(self.data('clock_seconds'), 10) - 1;
        self.data('clock_seconds', data);
        if (data < 0) {
          self.html('--:--:--');
        } else {
          const md = moment.duration(data, 'seconds');
          self
            .attr('title', moment().add(data, 'seconds').format('YYYY-MM-DD HH:mm:ss'))
            .addClass('popover')
            .html(md.format('HH:mm:ss', {
              trim: false,
              forceLength: true,
            }));
        }

        return true;
      });
    }, 1000);
  },
  showFleetActivityGlobally(page) {
    // no fleet config set, return
    if (
      (gmConfig.get('addon_fleet') && page === 'flottenbewegungen')
                    || (!gmConfig.get('addon_fleet') && page !== 'flottenbewegungen')
    ) {
      return;
    }

    // eslint-disable-next-line no-shadow
    const addFleetDiv = (page) => {
      const $fleetRows = [];
      const $selectOptions = {
        coords: [],
        types: [],
        status: [],
      };
      const existingValues = {
        coords: lwmJQ.map(lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords option'), (option) => lwmJQ(option).val()),
        types: lwmJQ.map(lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types option'), (option) => lwmJQ(option).val()),
        status: lwmJQ.map(lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status option'), (option) => lwmJQ(option).val()),
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
          const $tableBase = lwmJQ('#lwm_folottenbewegungenPageDiv table');
          $tableBase.find('tr:gt(0)').data('show', false);
          const $coords = lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords').val();
          const $type = lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types').val();
          const $status = lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status').val();

          lwmJQ.each($tableBase.find('tr:gt(0)'), (i, el) => {
            lwmJQ(el).data('show',
              (lwmJQ(el).attr('data-coords') === $coords || $coords === '')
                                && (lwmJQ(el).attr('data-type') === $type || $type === '')
                                && (lwmJQ(el).attr('data-status') === $status || $status === ''));
          });

          lwmJQ.each($tableBase.find('tr:gt(0)'), (i, el) => {
            if (lwmJQ(el).data('show')) lwmJQ(el).show();
            else lwmJQ(el).hide();
          });
        };

        const add = (fleetData) => {
          if (typeof fleetData.homePlanet !== 'undefined'
                            && !lwmJQ.map($selectOptions.coords, (option) => lwmJQ(option).val()).includes(fleetData.homePlanet)
                            && !existingValues.coords.includes(fleetData.homePlanet)) {
            $selectOptions.coords.push(lwmJQ(`<option value="${fleetData.homePlanet}">${fleetData.homePlanet}</option>`));
          }
          if (typeof fleetData.Type !== 'undefined'
                            && !lwmJQ.map($selectOptions.types, (option) => lwmJQ(option).val()).includes(fleetData.Type)
                            && !existingValues.types.includes(fleetData.Type)) {
            $selectOptions.types.push(lwmJQ(`<option value="${fleetData.Type}">${lang.types[fleetData.Type]}</option>`));
          }
          if (typeof fleetData.Status !== 'undefined'
                            && !lwmJQ.map($selectOptions.status, (option) => lwmJQ(option).val()).includes(fleetData.Status)
                            && !existingValues.status.includes(fleetData.Status)) {
            $selectOptions.status.push(lwmJQ(`<option value="${fleetData.Status}">${lang.status[fleetData.Status]}</option>`));
          }
        };

        const attachSelects = () => {
          if (lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords').length === 0) {
            const $selectCoords = lwmJQ('<select id="lwm_fleetFilter_coords"><option value="">Pick Coords</option></select>');
            $selectCoords.change(() => { process(); });
            lwmJQ('#lwm_folottenbewegungenPageDiv table td').first().append($selectCoords);
          }
          if (lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types').length === 0) {
            const $selectTypes = lwmJQ('<select id="lwm_fleetFilter_types"><option value="">Pick Type</option></select>');
            $selectTypes.change(() => { process(); });
            lwmJQ('#lwm_folottenbewegungenPageDiv table td').first().append($selectTypes);
          }
          if (lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status').length === 0) {
            const $selectStatus = lwmJQ('<select id="lwm_fleetFilter_status"><option value="">Pick Status</option></select>');
            $selectStatus.change(() => { process(); });
            lwmJQ('#lwm_folottenbewegungenPageDiv table td').first().append($selectStatus);
          }
        };

        return {
          add,
          attachSelects,
          process,
        };
      })();

      if (lwmJQ('#lwm_folottenbewegungenPageDiv').length === 0) {
        const $div = lwmJQ('<div class="pageContent" style="margin-bottom:20px;"><div id="lwm_folottenbewegungenPageDiv"><table><tbody><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Ankunft</td><td>Restflugzeit</td></tr></tbody></table></div></div>');
        $div.hide();
        $div.prependTo('#all');
        filter.attachSelects();
        $div.show();
      }

      lwmJQ('#lwm_folottenbewegungenPageDiv table tr:gt(0)').remove();

      const iconAtt = '<i class="fas fa-fighter-jet"></i>';
      const iconBack = '<i class="fas fa-long-arrow-alt-left"></i>';
      const iconSend = '<i class="fas fa-long-arrow-alt-right"></i>';
      const iconDef = '<i class="fas fa-shield-alt"></i>';
      const iconTrans = '<i class="fas fa-exchange-alt"></i>';
      const iconPlanet = '<i class="fas fa-globe"></i>';
      const iconDrone = '<i class="fas fa-search"></i>';

      lwmJQ.each(config.gameData.fleetInfo.send_infos, (i, fleetData) => {
        filter.add(fleetData);
        let trStyle = '';
        let fleetInfoString = '';
        let fleetTimeString = '';
        let fleetClock = '';
        const oppCoords = `<b>${fleetData.Galaxy}x${fleetData.System}x${fleetData.Planet}</b>`;
        const oppNick = fleetData.Nickname_send;
        const ownCoords = `<b>${fleetData.Galaxy_send}x${fleetData.System_send}x${fleetData.Planet_send}</b>`;
        const speedString = ` <span class='lwm_fleet_duration' style='font-style:italic;'>Flugdauer: ${moment.duration(fleetData.total_secounds, 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}.</span>`;
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
        $fleetRows.push(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.Galaxy_send}x${fleetData.System_send}x${fleetData.Planet_send}" style=${trStyle}><td>${fleetInfoString}${speedString}</td><td>${fleetTimeString}</td><td id='${fleetClock}'>${moment.duration(moment(fleetTimeString).diff(moment(), 'seconds'), 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}</td></tr>`);
      });

      if (!gmConfig.get('addon_fleet_exclude_drones')) {
        lwmJQ.each(config.gameData.fleetInfo.all_informations, (i, fleetData) => {
          // add missing info for drones
          fleetData.Type = '4'; fleetData.Status = '1';
          filter.add(fleetData);
          $fleetRows.push(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconDrone}Eigene ${fleetData.name} von Planet <b>${fleetData.homePlanet}</b> ist unterwegs nach ( <b>${fleetData.galaxy}x${fleetData.system}</b> )</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${moment.duration(moment(fleetData.time).diff(moment(), 'seconds'), 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}</td></tr>`);
        });

        lwmJQ.each(config.gameData.fleetInfo.dron_observationens, (i, fleetData) => {
          fleetData.Type = '4'; fleetData.Status = '1';
          filter.add(fleetData);
          $fleetRows.push(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconDrone}Eigene ${fleetData.name} von Planet <b>${fleetData.homePlanet}</b> ist unterwegs nach ( <b>${fleetData.galaxy}x${fleetData.system}x${fleetData.planet}</b> )</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${moment.duration(moment(fleetData.time).diff(moment(), 'seconds'), 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}</td></tr>`);
        });

        lwmJQ.each(config.gameData.fleetInfo.dron_planetenscanners, (i, fleetData) => {
          fleetData.Type = '4'; fleetData.Status = '1';
          filter.add(fleetData);
          $fleetRows.push(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconDrone}Eigene ${fleetData.name} von Planet <b>${fleetData.homePlanet}</b> ist unterwegs nach ( <b>${fleetData.galaxy}x${fleetData.system}x${fleetData.planet}</b> )</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${moment.duration(moment(fleetData.time).diff(moment(), 'seconds'), 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}</td></tr>`);
        });
      }

      lwmJQ.each(config.gameData.fleetInfo.buy_ships_array, (i, fleetData) => {
        filter.add(fleetData);
        $fleetRows.push(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${iconSend}Flotte vom Handelsposten wird überstellt nach <b>${fleetData.homePlanet}</b>.</td><td>${fleetData.time}</td><td id='clock_${fleetData.clock_id}'>${moment.duration(moment(fleetData.time).diff(moment(), 'seconds'), 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}</td></tr>`);
      });

      lwmJQ.each(config.gameData.fleetInfo.fleet_informations, (i, fleetData) => {
        filter.add(fleetData);
        let fleetInfoString = '';
        let fleetTimeString = '';
        let fleetClock = '';
        const oppCoords = `<b>${fleetData.Galaxy_send}x${fleetData.System_send}x${fleetData.Planet_send}</b>`;
        const oppNick = fleetData.Nickname_send;
        const ownCoords = `<b>${fleetData.homePlanet}</b>`;
        const lkomSendLink = `<i class="fas fa-wifi faa-flash animated" onclick="changeContent('flotten_view', 'third', 'Flotten-Kommando', '${fleetData.id}')" style="cursor:hand;margin-right:5px;color:#66f398"></i>`;
        const lkomBackLink = `<i class="fas fa-info-circle" onclick="changeContent('flotten_view', 'third', 'Flotten-Kommando', '${fleetData.id}')" style="cursor:hand;margin-right:5px;color:#3c3ff5"></i>`;
        const speedString = ` <span class='lwm_fleet_duration' style='font-style:italic;'>Flugdauer: ${moment.duration(fleetData.total_secounds, 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}.</span>`;

        const existingObs = getActiveObs([fleetData.Galaxy_send, fleetData.System_send, fleetData.Planet_send]);
        const spydrones = lwmJQ.grep(config.gameData.spionageInfos.planetenscanner_drons, (el) => el.engine_type === 'IOB' && parseInt(el.number, 10) > 0);
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
        $fleetRows.push(`<tr data-type="${fleetData.Type || ''}" data-status="${fleetData.Status || ''}" data-coords="${fleetData.homePlanet}"><td>${fleetInfoString}${speedString}</td><td>${fleetTimeString}</td><td id='${fleetClock}'>${moment.duration(moment(fleetTimeString).diff(moment(), 'seconds'), 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })}</td></tr>`);
      });

      // populate fleets
      lwmJQ('#lwm_folottenbewegungenPageDiv table tbody').append($fleetRows);
      if ($fleetRows.length === 0) lwmJQ('#lwm_folottenbewegungenPageDiv').hide();
      else lwmJQ('#lwm_folottenbewegungenPageDiv').show();

      // add spionage action
      lwmJQ('#lwm_folottenbewegungenPageDiv table tbody tr').find('.fa-search').click((e) => { performSpionage(lwmJQ(e.target).parents('tr').attr('data-coords').split('x')); });
      // populate selects
      lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_coords').append($selectOptions.coords);
      lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_types').append($selectOptions.types);
      lwmJQ('#lwm_folottenbewegungenPageDiv #lwm_fleetFilter_status').append($selectOptions.status);

      // sort table by time
      lwmJQ('#lwm_folottenbewegungenPageDiv table tbody tr:gt(0)').sort((a, b) => {
        const tsA = moment.duration(lwmJQ(a).find('td').last().text());
        const tsB = moment.duration(lwmJQ(b).find('td').last().text());
        return tsA.asSeconds() - tsB.asSeconds();
      }).each((i, el) => {
        const $elem = lwmJQ(el).detach();
        lwmJQ($elem).appendTo(lwmJQ('#lwm_folottenbewegungenPageDiv table tbody'));
      });

      filter.process();

      if (gmConfig.get('addon_clock')) {
        clearInterval(siteWindow.timeinterval_flottenbewegungen);
        setDataForClocks();
      }
    };


    if (!addOns.config.fleetCompleteHandlerAdded) {
      lwmJQ(siteWindow.document).ajaxComplete((event, xhr, settings) => {
        const currentPage = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

        if (xhr.responseJSON === '500') return;

        if (currentPage === 'get_flottenbewegungen_info') {
          addFleetDiv(siteWindow.active_page);
        }
      });
      addOns.config.fleetCompleteHandlerAdded = true;
    }
    // add fleets to page
    addFleetDiv(page);

    // add refresh interval
    if (addOns.config.fleetRefreshInterval !== null) return;
    addOns.config.fleetRefreshInterval = setInterval(() => {
      getFlottenbewegungenInfo();
    }, 30000);
  },
  calendar: {
    storeOverview(data) {
      const dataBuildingBefore = JSON.stringify(addOns.calendar.getData('building', config.gameData.playerID));
      addOns.calendar.deleteCat('building', config.gameData.playerID);
      lwmJQ.each(data.all_planets_for_use, (i, planet) => {
        const coords = `${planet.galaxy_pom}x${planet.system_pom}x${planet.planet_pom}`;
        if (planet.BuildingName !== '') {
          addOns.calendar.store({
            playerID: config.gameData.playerID,
            playerName: config.gameData.playerName,
            coords,
            type: 'building',
            name: planet.BuildingName,
            text: planet.BuildingName,
            duration: 0,
            ts: moment(planet.FinishTimeForBuilding).valueOf(),
          });
        }

        if (planet.BuildingName2 !== '') {
          addOns.calendar.store({
            playerID: config.gameData.playerID,
            playerName: config.gameData.playerName,
            coords,
            type: 'building',
            name: planet.BuildingName2,
            text: planet.BuildingName2,
            duration: 0,
            ts: moment(planet.FinishTimeForBuilding2).valueOf(),
          });
        }
      });
      const dataBuildingAfter = JSON.stringify(addOns.calendar.getData('building', config.gameData.playerID));

      const dataResearchBefore = JSON.stringify(addOns.calendar.getData('research', config.gameData.playerID));
      addOns.calendar.deleteCat('research', config.gameData.playerID);
      if (data.research_info.ResearchName !== '') {
        addOns.calendar.store({
          playerID: config.gameData.playerID,
          playerName: config.gameData.playerName,
          coords: `${data.research_info.researchGalaxy}x${data.research_info.researchSystem}x${data.research_info.researchPlanet}`,
          type: 'research',
          name: data.research_info.ResearchName,
          text: data.research_info.ResearchName,
          duration: 0,
          ts: moment(data.research_info.FinishTime).valueOf(),
        });
      }
      const dataResearchAfter = JSON.stringify(addOns.calendar.getData('research', config.gameData.playerID));

      gmSetValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
      if (gmConfig.get('confirm_drive_sync') && (!addOns.calendar.truncateData() || dataResearchBefore !== dataResearchAfter || dataBuildingBefore !== dataBuildingAfter)) driveManager.save();
    },
    storeFleets(data) {
      const lang = config.const.lang.fleet;
      const dataTypes = ['all_informations', 'buy_ships_array', 'dron_observationens', 'dron_planetenscanners', 'fleet_informations', 'send_infos'];
      const dataFleetBefore = JSON.stringify(addOns.calendar.getData('fleet', config.gameData.playerID, config.gameData.planetCoords.string));

      // delete fleets with come time older than seven days
      // this fixes a bug that caused defending fleets from previous round to remain in the calendar data
      config.lwm.calendar = config.lwm.calendar.filter((e) => !(e.type === 'fleet'
        && new Date(e.ts + (1000 * 60 * 60 * 24 * 7)) < new Date()));
      addOns.calendar.deleteCat('fleet', config.gameData.playerID, config.gameData.planetCoords.string);

      lwmJQ.each(dataTypes, (i, type) => {
        lwmJQ.each(data[type], (f, fleetData) => {
          const time = fleetData.ComeTime || fleetData.DefendingTime || fleetData.time;
          if (!time) return true;
          addOns.calendar.store({
            playerID: config.gameData.playerID,
            playerName: config.gameData.playerName,
            coords: config.gameData.planetCoords.string,
            type: 'fleet',
            name: fleetData.id || 0,
            duration: 0,
            text: `Flotte Typ ${lang.types[fleetData.Type] || fleetData.name} mit Status ${lang.status[fleetData.Status || 1]} und Coords ${fleetData.Galaxy_send || fleetData.galaxy}x${fleetData.System_send || fleetData.system}x${fleetData.Planet_send || fleetData.planet}`,
            ts: moment(time).valueOf(),
          });
          return true;
        });
      });
      const dataFleetAfter = JSON.stringify(addOns.calendar.getData('fleet', config.gameData.playerID, config.gameData.planetCoords.string));

      gmSetValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
      if (gmConfig.get('confirm_drive_sync') && dataFleetBefore !== dataFleetAfter) driveManager.save();
    },
    storeProd(data) {
      const dataDefenseBefore = JSON.stringify(addOns.calendar.getData('defense', config.gameData.playerID, config.gameData.planetCoords.string));
      addOns.calendar.deleteCat('defense', config.gameData.playerID, config.gameData.planetCoords.string);
      let lastEntry = {};
      let sameEntryCount = 1;
      lwmJQ.each(data.planet_defense, (i, prodData) => {
        const entry = {
          playerID: config.gameData.playerID,
          playerName: config.gameData.playerName,
          coords: config.gameData.planetCoords.string,
          type: 'defense',
          name: prodData.name,
          text: prodData.name,
          duration: prodData.sati * 60 * 60 + prodData.minuti * 60 + prodData.sekunde,
          ts: moment(prodData.finishTime).valueOf(),
        };
          // for same tasks (like upgrades) < 1 hour, just edit the last entry so that calendar doesn't get too big
        if (lastEntry.type === entry.type
            && lastEntry.name === entry.name
            && lastEntry.duration < (60 * 60)
            && lastEntry.duration === entry.duration) {
          sameEntryCount += 1;
          config.lwm.calendar[config.lwm.calendar.length - 1].text = `${sameEntryCount}x ${prodData.name} (every ${moment.duration(lastEntry.duration, 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })})`;
          config.lwm.calendar[config.lwm.calendar.length - 1].ts = moment(prodData.finishTime).valueOf();
        } else {
          sameEntryCount = 1;
          addOns.calendar.store(entry);
        }
        lastEntry = entry;
      });
      const dataDefenseAfter = JSON.stringify(addOns.calendar.getData('defense', config.gameData.playerID, config.gameData.planetCoords.string));

      const dataShipsBefore = JSON.stringify(addOns.calendar.getData('ships', config.gameData.playerID, config.gameData.planetCoords.string));
      addOns.calendar.deleteCat('ships', config.gameData.playerID, config.gameData.planetCoords.string);
      lastEntry = {};
      sameEntryCount = 1;
      lwmJQ.each(data.ships, (i, prodData) => {
        const entry = {
          playerID: config.gameData.playerID,
          playerName: config.gameData.playerName,
          coords: config.gameData.planetCoords.string,
          type: 'ships',
          name: prodData.name,
          text: prodData.name,
          duration: prodData.sati * 60 * 60 + prodData.minuti * 60 + prodData.sekunde,
          ts: moment(prodData.finishTime).valueOf(),
        };
          // for same tasks (like upgrades) < 1 hour, just edit the last entry so that calendar doesn't get too big
        if (lastEntry.type === entry.type
            && lastEntry.name === entry.name
            && lastEntry.duration < (60 * 60)
            && lastEntry.duration === entry.duration) {
          sameEntryCount += 1;
          config.lwm.calendar[config.lwm.calendar.length - 1].text = `${sameEntryCount}x ${prodData.name} (every ${moment.duration(lastEntry.duration, 'seconds').format('HH:mm:ss', { trim: false, forceLength: true })})`;
          config.lwm.calendar[config.lwm.calendar.length - 1].ts = moment(prodData.finishTime).valueOf();
        } else {
          sameEntryCount = 1;
          addOns.calendar.store(entry);
        }
        lastEntry = entry;
      });
      const dataShipsAfter = JSON.stringify(addOns.calendar.getData('ships', config.gameData.playerID, config.gameData.planetCoords.string));

      gmSetValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
      if (gmConfig.get('confirm_drive_sync') && (dataDefenseBefore !== dataDefenseAfter || dataShipsBefore !== dataShipsAfter)) driveManager.save();
    },
    storeTrades(data) {
      const dataTradesBefore = JSON.stringify(addOns.calendar.getData('trades', config.gameData.playerID, config.gameData.planetCoords.string));
      addOns.calendar.deleteCat('trades', config.gameData.playerID, config.gameData.planetCoords.string);
      lwmJQ.each(data.trade_offers, (i, tradeData) => {
        if (parseInt(tradeData.galaxy, 10) === parseInt(config.gameData.planetCoords.galaxy, 10)
            && parseInt(tradeData.system, 10) === parseInt(config.gameData.planetCoords.system, 10)
            && parseInt(tradeData.planet, 10) === parseInt(config.gameData.planetCoords.planet, 10)) return true;
        addOns.calendar.store({
          playerID: config.gameData.playerID,
          playerName: config.gameData.playerName,
          coords: config.gameData.planetCoords.string,
          type: 'trades',
          text: `Trade ${tradeData.my ? 'with ' : 'from '}${tradeData.galaxy}x${tradeData.system}x${tradeData.planet} (${tradeData.accept === '1' ? 'Running' : 'Pending'})${tradeData.comment}`,
          ts: moment(tradeData.accept === '0' ? tradeData.time.replace(/\//g, '-') : tradeData.time_acc.replace(/\//g, '-')).valueOf(),
        });
        return true;
      });
      const dataTradesAfter = JSON.stringify(addOns.calendar.getData('trades', config.gameData.playerID, config.gameData.planetCoords.string));

      gmSetValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
      if (gmConfig.get('confirm_drive_sync') && dataTradesBefore !== dataTradesAfter) driveManager.save();
    },
    store(data) {
      const check = config.lwm.calendar.filter((entry) => JSON.stringify(entry) === JSON.stringify(data));
      if (check.length === 0) {
        // not found, add!
        config.lwm.calendar.push(data);
      }
    },
    truncateData() {
      const dataBefore = JSON.stringify(addOns.calendar.getData());
      config.lwm.calendar = config.lwm.calendar.filter((entry) => entry.ts > moment().valueOf());
      const dataAfter = JSON.stringify(addOns.calendar.getData());

      return dataBefore === dataAfter;
    },
    deleteCat(cat, playerID, coords = null) {
      config.lwm.calendar = config.lwm.calendar.filter((e) => !(e.type === cat
        && e.playerID === playerID && (e.coords === coords || coords === null)));
    },
    getData(cat = null, playerID = null, coords = null) {
      return config.lwm.calendar.filter((entry) => ((entry.type === cat || cat === null)
      && (entry.playerID === playerID || playerID === null)
      && (entry.coords === coords || coords === null))).sort((a, b) => a.ts - b.ts);
    },
  },
  planetData: {
    storeDataFromSpio() {
      gmGetValue('lwm_planetData_temp', '{}').then((jsonData) => {
        const planetData = JSON.parse(jsonData);

        if (lwmJQ('#buildingsLevel').length === 0) return; // spy not sufficient
        let levelTT = 0;
        const matchTT = lwmJQ('#researchLevel').text().match(/Tarntechnologie (\d+)/);
        if (matchTT === null) levelTT = 0;
        else [, levelTT] = matchTT;

        // save
        const coords = siteWindow.document.querySelector('#tableOS th').textContent.match(/\d*x\d*x\d*/)[0];
        if (typeof planetData[coords] === 'undefined') planetData[coords] = {};
        planetData[coords].Tarntechnologie = parseInt(levelTT, 10);

        // write into temp save because we don't have complete save / load functionality on spy / obs pages
        // the main page will check on the temp save and pick up new values
        gmSetValue('lwm_planetData_temp', JSON.stringify(planetData));
      });
    },
  },
};

export default addOns;
