import {
  siteWindow,
} from 'config/globals';
import gmConfig from 'plugins/GM_config';
import { getLoadStatePromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import config from 'config/lwmConfig';

import { throwError } from 'utils/helper';

const { alert } = siteWindow;

const driveManager = () => {
  let gapi = null;
  const CLIENT_ID = '807071171095-2r28v4jpvgujv5n449ja4lrmk4hg88ie.apps.googleusercontent.com';
  const API_KEY = 'AIzaSyA7VHXY213eg3suaarrMmrbOlX8T9hVwrc';
  const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
  const SCOPES = 'https://www.googleapis.com/auth/drive.appfolder https://www.googleapis.com/auth/drive.file';

  const signIn = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  const signOut = () => {
    gapi.auth2.getAuthInstance().signOut();
  };

  const isSignedIn = () => gapi.auth2.getAuthInstance().isSignedIn.get();

  // if drive fails to load, set loadstate and use browser config instead
  const handleError = () => {
    // reset the google settings
    if (gmConfig.get('confirm_drive_sync')) alert('Couldn\'t sync with Google Drive. Please go to the settings and reconnect the service!');
    signOut();
    gmConfig.set('confirm_drive_sync', false);
    gmConfig.save();

    // load browser values
    getLoadStatePromise('gameData').then(() => { config.setGMValues(); }, () => { Sentry.captureMessage('gameData promise rejected'); throwError(); });
  };

  const getConfig = (saveFileID) => {
    // console.log('gapi.client.drive.files.get');
    gapi.client.drive.files.get({
      fileId: saveFileID,
      alt: 'media',
    }).then((response) => {
      // console.log(response);
      if (response.status === 200) {
        config.lwm.gDriveFileID = saveFileID;
        config.lwm.set(response.result);
        // config.loadStates.gdrive = false; <-- loadState is updated in config.lwm.set()
      } else {
        console.error(`files.create: ${response}`);
        handleError();
      }
    }, (error) => {
      Sentry.captureException(error);
      console.error(JSON.stringify(error, null, 2));
      handleError();
    });
  };

  const saveConfig = (driveID = config.lwm.gDriveFileID) => {
    // check whether config is ready
    if (config.loadStates.gdrive) {
      // console.log('gapi.client.request failed due to config.loadStates.gdrive');
      return Promise.resolve();
    }
    // save
    const saveObj = JSON.parse(JSON.stringify(config.lwm));
    saveObj.menu = {
      addon_clock: gmConfig.get('addon_clock'),
      addon_fleet: gmConfig.get('addon_fleet'),
      addon_fleet_exclude_drones: gmConfig.get('addon_fleet_exclude_drones'),
      confirm_const: gmConfig.get('confirm_const'),
      menu_clipboard: gmConfig.get('menu_clipboard'),
      overview_planetresources: gmConfig.get('overview_planetresources'),
      overview_planetstatus: gmConfig.get('overview_planetstatus'),
      overview_planetnames: gmConfig.get('overview_planetnames'),
      overview_planetpicture: gmConfig.get('overview_planetpicture'),
      overview_hintvacantmultiqueue: gmConfig.get('overview_hintvacantmultiqueue'),
      message_spylinks: gmConfig.get('message_spylinks'),
      trade_highlights: gmConfig.get('trade_highlights'),
      res_updates: gmConfig.get('res_updates'),
      fleet_saveprios: gmConfig.get('fleet_saveprios'),
      obs_opentabs: gmConfig.get('obs_opentabs'),
      fleet_presets_1_active: gmConfig.get('fleet_presets_1_active'),
      fleet_presets_1_weekday: gmConfig.get('fleet_presets_1_weekday'),
      fleet_presets_1_time: gmConfig.get('fleet_presets_1_time'),
      fleet_presets_2_active: gmConfig.get('fleet_presets_2_active'),
      fleet_presets_2_weekday: gmConfig.get('fleet_presets_2_weekday'),
      fleet_presets_2_time: gmConfig.get('fleet_presets_2_time'),
      fleet_presets_3_active: gmConfig.get('fleet_presets_3_active'),
      fleet_presets_3_weekday: gmConfig.get('fleet_presets_3_weekday'),
      fleet_presets_3_time: gmConfig.get('fleet_presets_3_time'),
      fleet_presets_4_active: gmConfig.get('fleet_presets_4_active'),
      fleet_presets_4_weekday: gmConfig.get('fleet_presets_4_weekday'),
      fleet_presets_4_time: gmConfig.get('fleet_presets_4_time'),
      fleet_presets_5_active: gmConfig.get('fleet_presets_5_active'),
      fleet_presets_5_weekday: gmConfig.get('fleet_presets_5_weekday'),
      fleet_presets_5_time: gmConfig.get('fleet_presets_5_time'),
      confirm_production: gmConfig.get('confirm_production'),
      confirm_research: gmConfig.get('confirm_research'),
      coords_fleets: gmConfig.get('coords_fleets'),
      coords_trades: gmConfig.get('coords_trades'),
      coords_galaxy_main: gmConfig.get('coords_galaxy_main'),
      coords_system_main: gmConfig.get('coords_system_main'),
      coords_planet_main: gmConfig.get('coords_planet_main'),
      confirm_hideTrades: gmConfig.get('confirm_hideTrades'),
    };

    // console.log('gapi.client.request', saveObj);
    return gapi.client.request({
      path: `/upload/drive/v3/files/${driveID}`,
      method: 'PATCH',
      params: {
        uploadType: 'media',
        mimeType: 'application/json',
      },
      body: JSON.stringify(saveObj),
    }).then((response) => {
      // console.log(response);
      if (response.status !== 200) {
        console.error(`client.request: ${response}`);
      }
    }, (error) => {
      Sentry.captureException(error);
      console.error(JSON.stringify(error, null, 2));
    });
  };

  const createConfig = () => {
    const fileMetadata = {
      name: 'lwm_config.json',
      description: 'Saved config for the Last War Manager',
      parents: ['appDataFolder'],
      mimeType: 'application/json',
      uploadType: 'multipart',
    };
      // console.log('gapi.client.drive.files.create');
    gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id,name',
    }).then((response) => {
      // console.log(response);
      if (response.status === 200) {
        config.lwm.gDriveFileID = response.result.id;
        config.loadStates.gdrive = false;
        saveConfig();
      } else {
        console.error(`files.create: ${response}`);
        handleError();
      }
    }, (error) => {
      Sentry.captureException(error);
      console.error(JSON.stringify(error, null, 2));
      handleError();
    });
  };

  const updateSigninStatus = (status) => {
    if (status && gmConfig.get('confirm_drive_sync')) {
      // console.log('gapi.client.drive.files.list');
      gapi.client.drive.files.list({
        q: 'name="lwm_config.json"',
        spaces: 'appDataFolder',
        fields: 'files(id)',
      }).then((response) => {
        // console.log(response);
        if (response.status === 200) {
          if (response.result.files.length === 0) {
            createConfig();
          } else {
            getConfig(response.result.files[0].id);
          }
        } else {
          console.error(`files.create: ${response}`);
          handleError();
        }
      }, (error) => {
        Sentry.captureException(error);
        console.error(JSON.stringify(error, null, 2));
        handleError();
      });
    } else {
      handleError();
    }
  };

  /**
   *  Initializes the API client library and sets up sign-in state
   *  listeners.
   */
  const initClient = () => {
    // console.log('gapi.client.init');
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    }).then(() => {
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    }, (error) => {
      Sentry.captureException(error);
      console.error(JSON.stringify(error, null, 2));
      handleError();
    });
  };

  /**
   *  On load, called to load the auth2 library and API client library.
   */
  const handleClientLoad = (g) => {
    gapi = g;
    gapi.load('client:auth2', {
      callback: initClient,
      onerror() {
        console.error('gapi.client failed to load!');
        handleError();
      },
    });
  };

  return {
    signIn,
    signOut,
    isSignedIn,
    save: saveConfig,
    init: handleClientLoad,
  };
};

const dmObject = driveManager();

export default dmObject;
