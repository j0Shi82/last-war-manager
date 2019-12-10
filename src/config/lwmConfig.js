import {
  gmConfig, gmSetValue, gmGetValue, lwmJQ, siteWindow,
} from 'config/globals';
import { getLoadStatePromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import { throwError } from 'utils/helper';
import { getSpionageInfo, getObsInfo } from 'utils/requests';
import addOns from 'addons/index';
import moment from 'moment';
import driveManager from 'plugins/driveManager';

const config = {
  const: {
    lang: {
      fleet: {
        types: {
          1: 'Att',
          2: 'Transport',
          3: 'Def',
          4: 'Drone',
          5: 'Transfer',
        },
        status: {
          1: 'Incoming',
          2: 'Return',
          3: 'Stationary',
          4: 'n/a',
          5: 'n/a',
        },
      },
    },
  },
  menu: gmConfig,
  firstLoad: true,
  loadStates: {
    gdrive: false,
    jQuery: false,
    gameData: false,
    content: false,
    submenu: false,
    lastLoadedPage: null,
  },
  unsafeWindow: {
    changeContent() {},
    changeInboxContent() {},
  },
  currentSavedProject: {
    fe: 0,
    kris: 0,
    frub: 0,
    ori: 0,
    fruro: 0,
    gold: 0,
    ts: null,
    name: null,
    type: null,
  },
  gameData: {
    playerID: null,
    playerName: null,
    playerData: {
      tarntechnologie: 0,
    },
    planetCoords: {
      string: null,
      galaxy: null,
      system: null,
      planet: null,
    },
    planets: [],
    planetInformation: [],
    spionageInfos: {},
    productionInfos: [],
    overviewInfo: {},
    messageData: {},
    fleetInfo: {},
    fleetSendData: {},
    observationInfo: {},
    tradeInfo: {},
  },
  lwm: {
    lastTradeCoords: {},
    lastFleetCoords: {},
    productionFilters: {},
    hiddenShips: {},
    resProd: {},
    gDriveFileID: null,
    raidPrios: [],
    planetInfo: {},
    calendar: [],
    planetData: {},

    set: (data) => {
      if (typeof data.lastTradeCoords !== 'undefined') config.lwm.lastTradeCoords = data.lastTradeCoords;
      if (typeof data.lastFleetCoords !== 'undefined') config.lwm.lastFleetCoords = data.lastFleetCoords;
      if (typeof data.productionFilters !== 'undefined') config.lwm.productionFilters = data.productionFilters;
      if (typeof data.hiddenShips !== 'undefined') config.lwm.hiddenShips = data.hiddenShips;
      if (typeof data.resProd !== 'undefined') config.lwm.resProd = data.resProd;
      if (typeof data.raidPrios !== 'undefined') config.lwm.raidPrios = data.raidPrios;
      if (typeof data.planetInfo !== 'undefined') config.lwm.planetInfo = data.planetInfo;
      if (typeof data.calendar !== 'undefined') config.lwm.calendar = data.calendar;
      if (typeof data.planetData !== 'undefined') config.lwm.planetData = data.planetData;
      if (typeof data.menu !== 'undefined') {
        Object.keys(data.menu).forEach((key) => {
          if (typeof gmConfig.fields[key] !== 'undefined') gmConfig.set(key, data.menu[key]);
        });
        gmConfig.save();
      }

      // set and get to sync
      gmSetValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));
      gmSetValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));
      gmSetValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));
      gmSetValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
      gmSetValue('lwm_resProd', JSON.stringify(config.lwm.resProd));
      gmSetValue('lwm_raidPrios', JSON.stringify(config.lwm.raidPrios));
      gmSetValue('lwm_planetInfo', JSON.stringify(config.lwm.planetInfo));
      gmSetValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
      gmSetValue('lwm_planetData', JSON.stringify(config.lwm.planetData));

      // wait for gameData, then process
      getLoadStatePromise('gameData').then(() => { config.setGMValues(); }, () => { Sentry.captureMessage('gameData promise rejected'); throwError(); });
    },
  },
  pages: {
    inbox: {
      reportHandler: false,
    },
  },
  promises: {
    interval: {
      ms: 200,
      count: 150,
      ajaxTimeout: 3000,
    },
    submenu: null,
    content: null,
  },

  // utility functions
  setGMValues: () => {
    const checkConfigPerCoordsSetup = (settingName) => {
      if (typeof config.lwm[settingName][config.gameData.playerID] === 'undefined') config.lwm[settingName][config.gameData.playerID] = {};

      // check for coords that don't exist
      lwmJQ.each(config.lwm[settingName][config.gameData.playerID], (planet) => {
        const planets = lwmJQ.map(config.gameData.planets, (d) => d.string);
        if (lwmJQ.inArray(planet, planets) === -1) delete config.lwm[settingName][config.gameData.playerID][planet];
      });

      if (typeof config.lwm[settingName][config.gameData.playerID][config.gameData.planetCoords.string] === 'undefined') config.lwm[settingName][config.gameData.playerID][config.gameData.planetCoords.string] = [];
    };

    gmGetValue('lwm_lastTradeCoords', '{}').then((data) => {
      try { config.lwm.lastTradeCoords = JSON.parse(data); } catch (e) { config.lwm.lastTradeCoords = {}; }
      checkConfigPerCoordsSetup('lastTradeCoords');
      if (config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > gmConfig.get('coords_trades')) {
        config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = gmConfig.get('coords_trades');
      }
      gmSetValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));

      return gmGetValue('lwm_lastFleetCoords', '{}');
    }).then((data) => {
      try { config.lwm.lastFleetCoords = JSON.parse(data); } catch (e) { config.lwm.lastFleetCoords = {}; }
      checkConfigPerCoordsSetup('lastFleetCoords');
      if (config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > gmConfig.get('coords_fleets')) {
        config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = gmConfig.get('coords_fleets');
      }
      gmSetValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));

      return gmGetValue('lwm_resProd', '{}');
    }).then((data) => {
      try { config.lwm.resProd = JSON.parse(data); } catch (e) { config.lwm.resProd = {}; }
      checkConfigPerCoordsSetup('resProd');
      config.getGameData.setResProd(); // get res here so config is loaded before fetching current values
      gmSetValue('lwm_resProd', JSON.stringify(config.lwm.resProd));

      return gmGetValue('lwm_raidPrios', '{}');
    })
      .then((data) => {
        try { config.lwm.raidPrios = JSON.parse(data); } catch (e) { config.lwm.raidPrios = []; }
        gmSetValue('lwm_raidPrios', JSON.stringify(config.lwm.raidPrios));

        return gmGetValue('lwm_planetInfo', '{}');
      })
      .then((data) => {
        try { config.lwm.planetInfo = JSON.parse(data); } catch (e) { config.lwm.planetInfo = {}; }
        checkConfigPerCoordsSetup('planetInfo');
        config.getGameData.setPlanetInfo();
        gmSetValue('lwm_planetInfo', JSON.stringify(config.lwm.planetInfo));

        return gmGetValue('lwm_hiddenShips', '{}');
      })
      .then((data) => {
        try { config.lwm.hiddenShips = JSON.parse(data); } catch (e) { config.lwm.hiddenShips = {}; }
        checkConfigPerCoordsSetup('hiddenShips');
        gmSetValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));

        return gmGetValue('lwm_productionFilters', '{}');
      })
      .then((data) => {
        try { config.lwm.productionFilters = JSON.parse(data); } catch (e) { config.lwm.productionFilters = {}; }
        checkConfigPerCoordsSetup('productionFilters');
        gmSetValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));

        return gmGetValue('lwm_calendar', '[]');
      })
      .then((data) => {
        try { config.lwm.calendar = JSON.parse(data); } catch (e) { config.lwm.calendar = []; }
        gmSetValue('lwm_calendar', JSON.stringify(config.lwm.calendar));

        return gmGetValue('lwm_planetData', '[]');
      })
      .then((data) => {
        try { config.lwm.planetData = JSON.parse(data); } catch (e) { config.lwm.planetData = []; }

        return gmGetValue('lwm_planetData_temp', '{}');
      })
      .then((jsonData) => {
        /* pick up temp saved values from obs and spy */
        const data = JSON.parse(jsonData);
        lwmJQ.each(data, (i, d) => {
          config.lwm.planetData[i] = d;
        });

        gmSetValue('lwm_planetData_temp', '{}'); // clear temp
        gmSetValue('lwm_planetData', JSON.stringify(config.lwm.planetData));

        config.loadStates.gdrive = false; // <-- this ends gdrive setup on first load
        if (gmConfig.get('confirm_drive_sync')) driveManager.save();
      })
      .finally(() => {
        config.loadStates.gdrive = false; // <-- this ends gdrive setup on first load
      });
  },

  getGameData: {
    all: () => {
      config.gameData.planetCoords = {
        string: `${siteWindow.my_galaxy}x${siteWindow.my_system}x${siteWindow.my_planet}`,
        galaxy: siteWindow.my_galaxy,
        system: siteWindow.my_system,
        planet: siteWindow.my_planet,
      };
      config.gameData.playerID = siteWindow.my_id;
      config.gameData.playerName = siteWindow.my_username;
      config.gameData.playerData.tarntechnologie = siteWindow.lvlTarntechnologie;

      // resolves loadState because other stuff has to wait for the data
      lwmJQ.when(
        config.getGameData.overviewInfos(),
        config.getGameData.planetInformation(),
      ).then(() => { config.loadStates.gameData = false; }, () => {
        config.loadStates.gameData = false; // still resolve load to be able to continue
        Sentry.captureMessage('fetching gameData all failed');
      });

      // spionage is not needed initially and can be loaded later
      getLoadStatePromise('gdrive').then(() => {
        if (!gmConfig.get('addon_fleet')) {
          // only load here in case fleet addon isn't active
          // otherwise the data gets loaded with the fleet addon
          getSpionageInfo();
          getObsInfo();
        }
      });
    },
    setProductionInfos: (data) => {
      lwmJQ.each(data, (i, cat) => {
        if (!lwmJQ.isArray(cat)) return true;
        lwmJQ.each(cat, (j, ship) => {
          config.gameData.productionInfos.push(ship);
        });
        return true;
      });
    },
    setResProd: () => {
      [config.lwm.resProd[config.gameData.playerID][config.gameData.planetCoords.string]] = siteWindow.getResourcePerHour();
    },
    setPlanetInfo: () => {
      config.lwm.planetInfo[config.gameData.playerID][config.gameData.planetCoords.string] = {
        energy: parseInt(config.gameData.overviewInfo.energy, 10),
        slots: config.gameData.overviewInfo.number_of_slots - config.gameData.overviewInfo.number_of_buildings,
      };
      gmSetValue('lwm_planetInfo', JSON.stringify(config.lwm.planetInfo));
    },
    planetInformation: () => siteWindow.jQuery.ajax({
      url: '/ajax_request/get_all_planets_information.php',
      dataType: 'json',
      success(data) {
        config.gameData.planetInformation = data;
        config.gameData.planets = [];
        lwmJQ.each(data, (i, d) => {
          config.gameData.planets.push({
            galaxy: d.Galaxy, system: d.System, planet: d.Planet, string: `${d.Galaxy}x${d.System}x${d.Planet}`,
          });
        });
      },
      timeout: config.promises.interval.ajaxTimeout,
    }),
    overviewInfos: () => {
      const uriData = `galaxy_check=${config.gameData.planetCoords.galaxy}&system_check=${config.gameData.planetCoords.system}&planet_check=${config.gameData.planetCoords.planet}`;
      return siteWindow.jQuery.ajax({
        url: `/ajax_request/get_ubersicht_info.php?${uriData}`,
        dataType: 'json',
        success(data) {
          config.gameData.overviewInfo = data;
        },
        timeout: config.promises.interval.ajaxTimeout,
      });
    },
    addFleetInfo: (fleetData) => {
      gmGetValue('fleetInfo', '{}').then((saveData) => {
        config.gameData.fleetInfo = JSON.parse(saveData);
        const types = ['all_informations', 'buy_ships_array', 'dron_observationens', 'dron_planetenscanners', 'fleet_informations', 'send_infos'];
        types.forEach((type) => {
          if (typeof config.gameData.fleetInfo[type] === 'undefined') config.gameData.fleetInfo[type] = [];
          // delete fleets for planet and re-insert
          config.gameData.fleetInfo[type] = lwmJQ.grep(config.gameData.fleetInfo[type], (f) => f.homePlanet !== config.gameData.planetCoords.string);
          // delete fleets with come time older than seven days
          // this fixes a bug that caused defending fleets from previous round to remain in the calendar data
          config.gameData.fleetInfo[type] = lwmJQ.grep(
            config.gameData.fleetInfo[type], (f) => new Date(new Date(f.ComeTime).valueOf() + (1000 * 60 * 60 * 24 * 7)) > new Date(),
          );
          lwmJQ.each(fleetData[type], (i, fleet) => {
            // if fleet is present, delete and add to update seconds and time
            // checkForFleet(type, fleet);
            fleet.homePlanet = config.gameData.planetCoords.string;
            config.gameData.fleetInfo[type].push(fleet);
          });
          // delete fleets that arrived
          config.gameData.fleetInfo[type] = lwmJQ.grep(config.gameData.fleetInfo[type], (fleet) => fleet.Status === '3' || moment(fleet.ComeTime || fleet.DefendingTime || fleet.time).valueOf() > moment().valueOf());
        });
        gmSetValue('fleetInfo', JSON.stringify(config.gameData.fleetInfo));
        addOns.showFleetActivityGlobally(siteWindow.active_page);

        // add fleet warning to uebersicht
        if (siteWindow.active_page === 'ubersicht') {
          lwmJQ('.lwm_fleetwarning').text(`${siteWindow.jQuery.number(fleetData.View_Units, 0, ',', '.')} SU`);
        }
      });
    },
  },
};
export default config;
