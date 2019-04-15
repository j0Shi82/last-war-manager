// ==UserScript==
// @name          Last War Manager
// @author        j0Shi <psycho.j0shi@gmail.com>
// @namespace     https://github.com/j0Shi82/
// @homepageURL   https://github.com/j0Shi82/last-war-manager
// @description   Some tweaking to the Last War UI and environment
// @license       GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @updateURL     https://raw.githubusercontent.com/j0Shi82/last-war-manager/master/last-war-manager.user.js
// @downloadURL   https://raw.githubusercontent.com/j0Shi82/last-war-manager/master/last-war-manager.user.js
// @supportURL    https://github.com/j0Shi82/last-war-manager/issues
// @match         https://*.last-war.de/main.php*
// @match         https://*.last-war.de/planetenscanner_view.php*
// @match         https://*.last-war.de/view/content/new_window/observationen_view.php*
// @require       https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@e07de5c0a13d416fda88134f999baccfee6f7059/assets/jquery.min.js
// @require       https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@9b03c1d9589c3b020fcf549d2d02ee6fa2da4ceb/assets/GM_config.min.js
// @require       https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@bfb98adb5b546b920ce7730e1382b1048cb756a1/assets/vendor.js
// @resource      css https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@4ca60e9fbb6ddda6d8b499fb607900565173a13e/last-war-manager.css
// @icon          https://raw.githubusercontent.com/j0Shi82/last-war-manager/master/assets/logo-small.png
// @grant         GM.getValue
// @grant         GM.setValue
// @grant         GM_getResourceText
// @grant         GM_addStyle
// @run-at        document-start
// @version       0.8
// ==/UserScript==

var firstLoad = true;
var lwm_jQuery = window.jQuery;

// add style
(function() {
    if (location.href.match(/planetenscanner_view/) !== null) return;
    if (location.href.match(/observationen_view/) !== null) return;

    var css = GM_getResourceText('css');
    if (typeof GM_addStyle != "undefined") {
        GM_addStyle(css);
    } else if (typeof PRO_addStyle != "undefined") {
        PRO_addStyle(css);
    } else if (typeof addStyle != "undefined") {
        addStyle(css);
    } else {
        var node = document.createElement("style");
        node.type = "text/css";
        node.appendChild(document.createTextNode(css));
        var heads = document.getElementsByTagName("head");
        if (heads.length > 0) {
            heads[0].appendChild(node);
        } else {
            // no head yet, stick it whereever
            document.documentElement.appendChild(node);
        }
    }
})();


function siteManager() {
    var site_jQuery = null;

    var driveManager = (function() {
        var gapi = null;
        var CLIENT_ID = '807071171095-2r28v4jpvgujv5n449ja4lrmk4hg88ie.apps.googleusercontent.com';
        var API_KEY = 'AIzaSyA7VHXY213eg3suaarrMmrbOlX8T9hVwrc';
        var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
        var SCOPES = 'https://www.googleapis.com/auth/drive.appfolder https://www.googleapis.com/auth/drive.file';
        var configFileID = null;

        //if drive fails to load, set loadstate and los browser config instead
        var handleError = function () {
            //reset the google settings
            if (GM_config.set('confirm_drive_sync')) alert('Couldn\'t sync with Google Drive. Please go to the settings and reconnect the service!');
            signOut();
            GM_config.set('confirm_drive_sync', false);

            //load browser values
            config.loadStates.gdrive = false;
            config.setGMValues();
        }

        /**
             *  On load, called to load the auth2 library and API client library.
             */
        var handleClientLoad = function(g) {
            gapi = g;
            gapi.load('client:auth2', {
                callback: initClient,
                onerror: function () {
                    console.error('gapi.client failed to load!');
                    handleError();
                }
            });
        }

        /**
             *  Initializes the API client library and sets up sign-in state
             *  listeners.
             */
        var initClient = function() {
            console.log('gapi.client.init');
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES
            }).then(function () {
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            }, function (error) {
                console.error(JSON.stringify(error, null, 2));
                handleError();
            });
        }

        var updateSigninStatus = function(isSignedIn) {
            if (isSignedIn) {
                console.log('gapi.client.drive.files.list');
                gapi.client.drive.files.list({
                    q: 'name="lwm_config.json"',
                    spaces: 'appDataFolder',
                    fields: 'files(id)'
                }).then(function(response) {
                    console.log(response);
                    if (response.status === 200) {
                        if (response.result.files.length === 0) {
                            createConfig();
                        } else {
                            configFileID = response.result.files[0].id;
                            getConfig();
                        }
                    } else {
                        console.error('files.create: ' + response);
                        handleError();
                    }
                }, function (error) {
                    console.error(JSON.stringify(error, null, 2));
                    handleError();
                });
            } else {
                handleError();
            }
        }

        var createConfig = function () {
            var fileMetadata = {
                name: 'lwm_config.json',
                description: 'Saved config for the Last War Manager',
                parents: ['appDataFolder'],
                mimeType: 'application/json',
                uploadType: 'multipart'
            };
            console.log('gapi.client.drive.files.create');
            gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id,name'
            }).then(function(response) {
                console.log(response);
                if (response.status === 200) {
                    configFileID = response.result.id;
                    config.loadStates.gdrive = false;
                    saveConfig();
                } else {
                    console.error('files.create: ' + response);
                    handleError();
                }
            }, function (error) {
                console.error(JSON.stringify(error, null, 2));
                handleError();
            });
        }

        var saveConfig = function () {
            // check whether config is ready
            if (config.loadStates.gdrive) {
                console.log('gapi.client.request failed due to config.loadStates.gdrive');
                return;
            }
            //save
            var saveObj = JSON.parse(JSON.stringify(config.lwm));
            saveObj.menu = {
                addon_clock: GM_config.get('addon_clock'),
                addon_fleet: GM_config.get('addon_fleet'),
                addon_fleet_exclude_drones: GM_config.get('addon_fleet_exclude_drones'),
                confirm_const: GM_config.get('confirm_const'),
                overview_planetresources: GM_config.get('overview_planetresources'),
                overview_planetstatus: GM_config.get('overview_planetstatus'),
                overview_planetnames: GM_config.get('overview_planetnames'),
                message_spylinks: GM_config.get('message_spylinks'),
                trade_highlights: GM_config.get('trade_highlights'),
                fleet_presets_1_active: GM_config.get('fleet_presets_1_active'),fleet_presets_1_weekday: GM_config.get('fleet_presets_1_weekday'),fleet_presets_1_time: GM_config.get('fleet_presets_1_time'),
                fleet_presets_2_active: GM_config.get('fleet_presets_2_active'),fleet_presets_2_weekday: GM_config.get('fleet_presets_2_weekday'),fleet_presets_2_time: GM_config.get('fleet_presets_2_time'),
                fleet_presets_3_active: GM_config.get('fleet_presets_3_active'),fleet_presets_3_weekday: GM_config.get('fleet_presets_3_weekday'),fleet_presets_3_time: GM_config.get('fleet_presets_3_time'),
                fleet_presets_4_active: GM_config.get('fleet_presets_4_active'),fleet_presets_4_weekday: GM_config.get('fleet_presets_4_weekday'),fleet_presets_4_time: GM_config.get('fleet_presets_4_time'),
                fleet_presets_5_active: GM_config.get('fleet_presets_5_active'),fleet_presets_5_weekday: GM_config.get('fleet_presets_5_weekday'),fleet_presets_5_time: GM_config.get('fleet_presets_5_time'),
                confirm_drive_sync: GM_config.get('confirm_drive_sync'),
                confirm_production: GM_config.get('confirm_production'),
                confirm_research: GM_config.get('confirm_research'),
                coords_fleets: GM_config.get('coords_fleets'),
                coords_trades: GM_config.get('coords_trades')
            };

            if (config.gameData.playerID == 186 && Object.keys(config.lwm.lastTradeCoords[config.gameData.playerID]).length < 5) {
                alert( 'save might have been reset!');
                return;
            };

            console.log('gapi.client.request',saveObj);
            gapi.client.request({
                path: '/upload/drive/v3/files/' + configFileID,
                method: 'PATCH',
                params: {
                    uploadType: 'media',
                    mimeType: 'application/json'
                },
                body: JSON.stringify(saveObj)
            }).then(function (response) {
                console.log(response);
                if (response.status !== 200) {
                    console.error('client.request: ' + response);
                }
            }, function (error) {
                console.error(JSON.stringify(error, null, 2));
            });
        }

        var getConfig = function () {
            console.log('gapi.client.drive.files.get');
            gapi.client.drive.files.get({
                fileId: configFileID,
                alt: 'media'
            }).then(function (response) {
                console.log(response);
                if (response.status === 200) {
                    config.lwm.set(response.result);
                    //config.loadStates.gdrive = false; <-- loadState is updated in config.lwm.set()
                } else {
                    console.error('files.create: ' + response);
                    handleError();
                }
            }, function (error) {
                console.error(JSON.stringify(error, null, 2));
                handleError();
            });
        }

        var signIn = function() {
            gapi.auth2.getAuthInstance().signIn();
        }

        var signOut = function() {
            gapi.auth2.getAuthInstance().signOut();
        }

        var isSignedIn = function() {
            return gapi.auth2.getAuthInstance().isSignedIn.get();
        }

        return {
            signIn: signIn,
            signOut: signOut,
            isSignedIn: isSignedIn,
            save: saveConfig,
            init: handleClientLoad
        };
    })();

    var GM_config_time_array =  ['00:00','00:05','00:10','00:15','00:20','00:25','00:30','00:35','00:40','00:45','00:50','00:55',
                            '01:00','01:05','01:10','01:15','01:20','01:25','01:30','01:35','01:40','01:45','01:50','01:55',
                            '02:00','02:05','02:10','02:15','02:20','02:25','02:30','02:35','02:40','02:45','02:50','02:55',
                            '03:00','03:05','03:10','03:15','03:20','03:25','03:30','03:35','03:40','03:45','03:50','03:55',
                            '04:00','04:05','04:10','04:15','04:20','04:25','04:30','04:35','04:40','04:45','04:50','04:55',
                            '05:00','05:05','05:10','05:15','05:20','05:25','05:30','05:35','05:40','05:45','05:50','05:55',
                            '06:00','06:05','06:10','06:15','06:20','06:25','06:30','06:35','06:40','06:45','06:50','06:55',
                            '07:00','07:05','07:10','07:15','07:20','07:25','07:30','07:35','07:40','07:45','07:50','07:55',
                            '08:00','08:05','08:10','08:15','08:20','08:25','08:30','08:35','08:40','08:45','08:50','08:55',
                            '09:00','09:05','09:10','09:15','09:20','09:25','09:30','09:35','09:40','09:45','09:50','09:55',
                            '10:00','10:05','10:10','10:15','10:20','10:25','10:30','10:35','10:40','10:45','10:50','10:55',
                            '11:00','11:05','11:10','11:15','11:20','11:25','11:30','11:35','11:40','11:45','11:50','11:55',
                            '12:00','12:05','12:10','12:15','12:20','12:25','12:30','12:35','12:40','12:45','12:50','12:55',
                            '13:00','13:05','13:10','13:15','13:20','13:25','13:30','13:35','13:40','13:45','13:50','13:55',
                            '14:00','14:05','14:10','14:15','14:20','14:25','14:30','14:35','14:40','14:45','14:50','14:55',
                            '15:00','15:05','15:10','15:15','15:20','15:25','15:30','15:35','15:40','15:45','15:50','15:55',
                            '16:00','16:05','16:10','16:15','16:20','16:25','16:30','16:35','16:40','16:45','16:50','16:55',
                            '17:00','17:05','17:10','17:15','17:20','17:25','17:30','17:35','17:40','17:45','17:50','17:55',
                            '18:00','18:05','18:10','18:15','18:20','18:25','18:30','18:35','18:40','18:45','18:50','18:55',
                            '19:00','19:05','19:10','19:15','19:20','19:25','19:30','19:35','19:40','19:45','19:50','19:55',
                            '20:00','20:05','20:10','20:15','20:20','20:25','20:30','20:35','20:40','20:45','20:50','20:55',
                            '21:00','21:05','21:10','21:15','21:20','21:25','21:30','21:35','21:40','21:45','21:50','21:55',
                            '22:00','22:05','22:10','22:15','22:20','22:25','22:30','22:35','22:40','22:45','22:50','22:55',
                            '23:00','23:05','23:10','23:15','23:20','23:25','23:30','23:35','23:40','23:45','23:50','23:55'];

    GM_config.init(
    {
        'id': 'lwmSettings', // The id used for this instance of GM_config
        'title': 'Last War Manager Settings',
        'fields': // Fields object
        {
            'addon_fleet':
            {
                'section': [GM_config.create('Add-Ons'), 'Pick which add-ons should run on the site'],
                'label': 'Show fleet activities on all pages',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'addon_fleet_exclude_drones':
            {
                'label': 'Exclude drone actitivy',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'addon_clock':
            {
                'label': 'Make clock intervals not auto-refresh pages',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'confirm_const':
            {
                'section': [GM_config.create('Security Confirms'), 'Pick which pages or buttons should come with a security confirm'],
                'label': 'Constructions',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'confirm_research':
            {
                'label': 'Researches',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'confirm_production':
            {
                'label': 'Productions',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'coords_fleets':
            {
                'section': [GM_config.create('Coords History'), 'The script saves a history of coordinates for different pages. Pick how many you want to store (10 - 50).'],
                'label': 'Fleet Targets',
                'labelPos': 'right',
                'type': 'int',
                'min': 10,
                'max': 50,
                'default': 10
            },
            'coords_trades':
            {
                'label': 'Trade Partner',
                'labelPos': 'right',
                'type': 'int',
                'min': 10,
                'max': 50,
                'default': 10
            },
            'overview_planetresources':
            {
                'section': [GM_config.create('Page Specific'), 'Turn page specific add-ons on and off.'],
                'label': 'OVERVIEW: Show resources on overview page.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'overview_planetstatus':
            {
                'label': 'OVERVIEW: Show energy and building slots on overview page.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'overview_planetnames':
            {
                'label': 'OVERVIEW: Show planet names on overview page.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'message_spylinks':
            {
                'label': 'MESSAGES: Show direct links to spy and combat reports in message lists (WARNING: This marks all reports as read on first visit).',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'trade_highlights':
            {
                'label': 'TRADES: Highlight trades and resources that would exceed storage capacities.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'fleet_saveprios':
            {
                'label': 'FLEET: Save the last resource raid priorities.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': true
            },
            'obs_opentabs':
            {
                'label': 'OBS: Open observation report in new tab instead of new page.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'fleet_presets_1_active':
            {
                'section': [GM_config.create('Fleet Timing Presets'), 'Define timing presets for sending fleets.'],
                'label': 'Active?',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'fleet_presets_1_weekday':
            {
                'type': 'select',
                'options': ['All','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Weekday','Weekend'],
                'default': 'All'
            },
            'fleet_presets_1_time':
            {
                'type': 'select',
                'options': GM_config_time_array,
                'default': '00:00'
            },
            'fleet_presets_2_active':
            {
                'label': 'Active?',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'fleet_presets_2_weekday':
            {
                'type': 'select',
                'options': ['All','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Weekday','Weekend'],
                'default': 'All'
            },
            'fleet_presets_2_time':
            {
                'type': 'select',
                'options': GM_config_time_array,
                'default': '00:00'
            },
            'fleet_presets_3_active':
            {
                'label': 'Active?',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'fleet_presets_3_weekday':
            {
                'type': 'select',
                'options': ['All','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Weekday','Weekend'],
                'default': 'All'
            },
            'fleet_presets_3_time':
            {
                'type': 'select',
                'options': GM_config_time_array,
                'default': '00:00'
            },
            'fleet_presets_4_active':
            {
                'label': 'Active?',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'fleet_presets_4_weekday':
            {
                'type': 'select',
                'options': ['All','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Weekday','Weekend'],
                'default': 'All'
            },
            'fleet_presets_4_time':
            {
                'type': 'select',
                'options': GM_config_time_array,
                'default': '00:00'
            },
            'fleet_presets_5_active':
            {
                'label': 'Active?',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            },
            'fleet_presets_5_weekday':
            {
                'type': 'select',
                'options': ['All','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Weekday','Weekend'],
                'default': 'All'
            },
            'fleet_presets_5_time':
            {
                'type': 'select',
                'options': GM_config_time_array,
                'default': '00:00'
            },
            'confirm_drive_sync':
            {
                'section': [GM_config.create('Sync'), 'Options to sync settings across your different browsers.'],
                'label': 'Use Google Drive to sync settings (recommended). WARNING: Any existing cloud configs will override local configs.',
                'labelPos': 'right',
                'type': 'checkbox',
                'default': false
            }
        },
        'events':
        {
            'close': function() {setTimeout(function () { location.reload(); }, 100); },
            'save': function() {
                if (this.fields.confirm_drive_sync.value) {
                    if (!driveManager.isSignedIn()) driveManager.signIn();
                    else driveManager.save();
                } else {
                    if (driveManager.isSignedIn()) driveManager.signOut();
                }
            }
        },
        'css': '#lwmSettings_addon_fleet_exclude_drones_var { margin-left: 20px !important; } #lwmSettings_section_4 .config_var { width: 33%; display: inline-block;}',
    });

    var config = {
        const: {
            lang: {
                fleet: {
                    types: {
                        1: 'Att',
                        2: 'Transport',
                        3: 'Def',
                        4: 'Drone',
                        5: 'Transfer'
                    },
                    status: {
                        1: 'Incoming',
                        2: 'Return',
                        3: 'Stationary',
                        4: 'n/a',
                        5: 'n/a'
                    }
                }
            }
        },
        menu: GM_config,
        loadStates: {
            gdrive: false,
            gameData: false,
            content: false,
            submenu: false,
            addons: false,
            fleetaddon: false,
            lastLoadedPage: null
        },
        unsafeWindow: {
            changeContent: function () {},
            changeInboxContent: function () {}
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
            type: null
        },
        gameData: {
            playerID: null,
            playerName: null,
            playerData: {
                tarntechnologie: 0
            },
            planetCoords: {
                string: null,
                galaxy: null,
                system: null,
                planet: null
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
            tradeInfo: {}
        },
        lwm: {
            lastTradeCoords: {},
            lastFleetCoords: {},
            productionFilters: {},
            hiddenShips: {},
            resProd: {},
            raidPrios: [],
            planetInfo: {},
            calendar: [],
            planetData: {},

            set: function (data) {
                if (typeof data.lastTradeCoords !== "undefined") config.lwm.lastTradeCoords = data.lastTradeCoords;
                if (typeof data.lastFleetCoords !== "undefined") config.lwm.lastFleetCoords = data.lastFleetCoords;
                if (typeof data.productionFilters !== "undefined") config.lwm.productionFilters = data.productionFilters;
                if (typeof data.hiddenShips !== "undefined") config.lwm.hiddenShips = data.hiddenShips;
                if (typeof data.resProd !== "undefined") config.lwm.resProd = data.resProd;
                if (typeof data.raidPrios !== "undefined") config.lwm.raidPrios = data.raidPrios;
                if (typeof data.planetInfo !== "undefined") config.lwm.planetInfo = data.planetInfo;
                if (typeof data.calendar !== "undefined") config.lwm.calendar = data.calendar;
                if (typeof data.planetData !== "undefined") config.lwm.planetData = data.planetData;
                if (typeof data.menu !== "undefined") {
                    Object.keys(data.menu).forEach(function(key) {
                        if (typeof GM_config.fields[key] !== "undefined") GM_config.set(key, data.menu[key]);
                    });
                }

                //set and get to sync
                GM.setValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));
                GM.setValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));
                GM.setValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));
                GM.setValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
                GM.setValue('lwm_resProd', JSON.stringify(config.lwm.resProd));
                GM.setValue('lwm_raidPrios', JSON.stringify(config.lwm.raidPrios));
                GM.setValue('lwm_planetInfo', JSON.stringify(config.lwm.planetInfo));
                GM.setValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
                GM.setValue('lwm_planetData', JSON.stringify(config.lwm.planetData));

                // wait for gameData, then process
                getLoadStatePromise('gameData').then(function () { config.setGMValues() },function () { helper.throwError(); });
            },
        },
        pages: {
            inbox: {
                reportHandler: false
            }
        },
        promises: {
            interval: {
                ms: 200,
                count: 75
            },
            submenu: null,
            content: null,
            addons: null
        },

        setGMValues: function () {
            var checkConfigPerCoordsSetup = function (settingName) {
                if (typeof config.lwm[settingName][config.gameData.playerID] === "undefined") config.lwm[settingName][config.gameData.playerID] = {};

                //check for coords that don't exist
                lwm_jQuery.each(config.lwm[settingName][config.gameData.playerID], function (planet, planetData) {
                    var planets = lwm_jQuery.map(config.gameData.planets, function (d, i) { return d.string; });
                    if (lwm_jQuery.inArray(planet, planets) === -1) delete config.lwm[settingName][config.gameData.playerID][planet];
                });

                if (typeof config.lwm[settingName][config.gameData.playerID][config.gameData.planetCoords.string] === "undefined") config.lwm[settingName][config.gameData.playerID][config.gameData.planetCoords.string] = [];
            }

            GM.getValue('lwm_lastTradeCoords', '{}').then(function (data) {
                try { config.lwm.lastTradeCoords = JSON.parse(data); } catch (e) { config.lwm.lastTradeCoords = {}; }
                checkConfigPerCoordsSetup('lastTradeCoords');
                if (config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > GM_config.get('coords_trades')) {
                    config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = GM_config.get('coords_trades');
                }
                GM.setValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));

                return GM.getValue('lwm_lastFleetCoords', '{}');
            }).then(function (data) {
                try { config.lwm.lastFleetCoords = JSON.parse(data); } catch (e) { config.lwm.lastFleetCoords = {}; }
                checkConfigPerCoordsSetup('lastFleetCoords');
                if (config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > GM_config.get('coords_fleets')) {
                    config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = GM_config.get('coords_fleets');
                }
                GM.setValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));

                return GM.getValue('lwm_resProd', '{}');
            }).then(function (data) {
                try { config.lwm.resProd = JSON.parse(data); } catch (e) { config.lwm.resProd = {}; }
                checkConfigPerCoordsSetup('resProd');
                config.getGameData.setResProd(); //get res here so config is loaded before fetching current values
                GM.setValue('lwm_resProd', JSON.stringify(config.lwm.resProd));

                return GM.getValue('lwm_raidPrios', '{}');
            }).then(function (data) {
                try { config.lwm.raidPrios = JSON.parse(data); } catch (e) { config.lwm.raidPrios = []; }
                GM.setValue('lwm_raidPrios', JSON.stringify(config.lwm.raidPrios));

                return GM.getValue('lwm_planetInfo', '{}');
            }).then(function (data) {
                try { config.lwm.planetInfo = JSON.parse(data); } catch (e) { config.lwm.planetInfo = {}; }
                checkConfigPerCoordsSetup('planetInfo');
                config.getGameData.setPlanetInfo();
                GM.setValue('lwm_planetInfo', JSON.stringify(config.lwm.planetInfo));

                return GM.getValue('lwm_hiddenShips', '{}');
            }).then(function (data) {
                try { config.lwm.hiddenShips = JSON.parse(data); } catch (e) { config.lwm.hiddenShips = {}; }
                checkConfigPerCoordsSetup('hiddenShips');
                GM.setValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));

                return GM.getValue('lwm_productionFilters', '{}');
            }).then(function (data) {
                try { config.lwm.productionFilters = JSON.parse(data); } catch (e) { config.lwm.productionFilters = {}; }
                checkConfigPerCoordsSetup('productionFilters');
                GM.setValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));

                return GM.getValue('lwm_calendar', '[]');
            }).then(function (data) {
                try { config.lwm.calendar = JSON.parse(data); } catch (e) { config.lwm.calendar = []; }
                GM.setValue('lwm_calendar', JSON.stringify(config.lwm.calendar));

                return GM.getValue('lwm_planetData', '[]');
            }).then(function (data) {
                try { config.lwm.planetData = JSON.parse(data); } catch (e) { config.lwm.planetData = []; }

                return GM.getValue('lwm_planetData_temp', '{}');
            }).then(function (data) {
                /* pick up temp saved values from obs and spy */
                data = JSON.parse(data);
                lwm_jQuery.each(data, function (i, d) {
                    config.lwm.planetData[i] = d;
                });

                GM.setValue('lwm_planetData_temp', '{}'); //clear temp
                GM.setValue('lwm_planetData', JSON.stringify(config.lwm.planetData));

                config.loadStates.gdrive = false; // <-- this ends gdrive setup on first load
                if (GM_config.get('confirm_drive_sync')) driveManager.save();
            }).finally(function () {
                config.loadStates.gdrive = false; // <-- this ends gdrive setup on first load
            });
        },
        getGameData: {
            all: function () {
                config.gameData.planetCoords = {
                    string: unsafeWindow.my_galaxy + 'x' + unsafeWindow.my_system + 'x' + unsafeWindow.my_planet,
                    galaxy: unsafeWindow.my_galaxy,
                    system: unsafeWindow.my_system,
                    planet: unsafeWindow.my_planet
                };
                config.gameData.playerID = unsafeWindow.my_id;
                config.gameData.playerName = unsafeWindow.my_username;
                config.gameData.playerData.tarntechnologie = unsafeWindow.lvlTarntechnologie;

                // resolves loadState because other stuff has to wait for the data
                lwm_jQuery.when(
                    config.getGameData.overviewInfos(),
                    config.getGameData.planetInformation()
                ).then(function () { config.loadStates.gameData = false; },function () { helper.throwError(); });

                // spionage is not needed initially and can be loaded later
                getLoadStatePromise('gdrive').then(function () {
                    if (!GM_config.get('addon_fleet')) {
                        //only load here in case fleet addon isn't active
                        //otherwise the data gets loaded with the fleet addon
                        requests.get_spionage_info();
                        requests.get_obs_info();
                    }
                });
            },
            setProductionInfos: function (data) {
                lwm_jQuery.each(data, function (i, cat) {
                    if (!lwm_jQuery.isArray(cat)) return true;
                    lwm_jQuery.each(cat, function (j, ship) {
                        config.gameData.productionInfos.push(ship);
                    });
                });
            },
            setResProd: function () {
                config.lwm.resProd[config.gameData.playerID][config.gameData.planetCoords.string] = unsafeWindow.getResourcePerHour()[0];
                //GM.setValue('lwm_resProd', JSON.stringify(config.lwm.resProd)); <-- redundant, see setGMvalues()
            },
            setPlanetInfo: function () {
                config.lwm.planetInfo[config.gameData.playerID][config.gameData.planetCoords.string] = {
                    energy: parseInt(config.gameData.overviewInfo.energy),
                    slots: config.gameData.overviewInfo.number_of_slots - config.gameData.overviewInfo.number_of_buildings
                };
                GM.setValue('lwm_planetInfo', JSON.stringify(config.lwm.planetInfo));
            },
            planetInformation: function(data) {
                return site_jQuery.getJSON('/ajax_request/get_all_planets_information.php', function (data) {
                    config.gameData.planetInformation = data;
                    config.gameData.planets = [];
                    lwm_jQuery.each(data, function (i, d) {
                        config.gameData.planets.push({galaxy:d.Galaxy,system:d.System,planet:d.Planet,string:d.Galaxy+'x'+d.System+'x'+d.Planet});
                    });
                });
            },
            overviewInfos: function(data) {
                var uriData = 'galaxy_check='+config.gameData.planetCoords.galaxy+'&system_check='+config.gameData.planetCoords.system+'&planet_check='+config.gameData.planetCoords.planet;
                return site_jQuery.getJSON('/ajax_request/get_ubersicht_info.php?'+uriData, function (data) {
                    config.gameData.overviewInfo = data;
                });
            },
            addFleetInfo: function (fleetData) {
                GM.getValue('fleetInfo', '{}').then(function (saveData) {
                    config.gameData.fleetInfo = JSON.parse(saveData);
                    var types = ['all_informations','buy_ships_array','dron_observationens','dron_planetenscanners','fleet_informations','send_infos'];
                    types.forEach(function (type) {
                        if (typeof config.gameData.fleetInfo[type] === "undefined") config.gameData.fleetInfo[type] = [];
                        //delete fleets for planet and re-insert
                        config.gameData.fleetInfo[type] = lwm_jQuery.grep(config.gameData.fleetInfo[type], function (f, i) { return f.homePlanet !== config.gameData.planetCoords.string; });
                        lwm_jQuery.each(fleetData[type], function (i, fleet) {
                            //if fleet is present, delete and add to update seconds and time
                            //checkForFleet(type, fleet);
                            fleet.homePlanet = config.gameData.planetCoords.string;
                            config.gameData.fleetInfo[type].push(fleet);
                        });
                        //delete fleets that arrived
                        config.gameData.fleetInfo[type] = lwm_jQuery.grep(config.gameData.fleetInfo[type], function (fleet, i) { return fleet.Status === "3" || moment(fleet.ComeTime || fleet.DefendingTime || fleet.time).valueOf() > moment().valueOf(); });
                    });
                    GM.setValue('fleetInfo', JSON.stringify(config.gameData.fleetInfo));
                    addOns.showFleetActivityGlobally(unsafeWindow.active_page);

                    //add fleet warning to uebersicht
                    if (unsafeWindow.active_page === 'ubersicht') {
                        lwm_jQuery('.lwm_fleetwarning').text(site_jQuery.number(fleetData.View_Units, 0, ',', '.' ) + ' SU');
                    }
                });
            }
        },

    };

    var install = function () {
        if (location.href.match(/planetenscanner_view/) !== null || location.href.match(/observationen_view/) !== null) {
            lwm_jQuery(document).ready(function() {
                addOns.planetData.storeDataFromSpio();
            });
        }
        else installMain();
    };

    var installMain = function() {
        // load site jQuery as well, need this to make API calls
        lwm_jQuery(window).load(function () {
            site_jQuery = unsafeWindow.jQuery;
            config.unsafeWindow.changeContent = unsafeWindow.changeContent;
            config.unsafeWindow.changeInboxContent = unsafeWindow.changeInboxContent;
            site_jQuery.ajaxSetup({ cache: true });

            global.uiChanges();

            //set google drive load state to true here so other can listen to it
            config.loadStates.gdrive = true;
            config.loadStates.gameData = true;

            lwm_jQuery('.status.lwm-firstload').text('LOADING... Game Data...');
            config.getGameData.all();
            site_jQuery.getScript('//apis.google.com/js/api.js').then(function () {
                lwm_jQuery('.status.lwm-firstload').text('LOADING... Google Drive...');
                driveManager.init(unsafeWindow.gapi); },function () { lwm_jQuery('.status.lwm-firstload').text('LOADING... ERROR...'); helper.throwError(); });
            getLoadStatePromise('gdrive').then(function () {
                lwm_jQuery('.status.lwm-firstload').text('LOADING... Page Setup...');
                //wait for gameData and google because some stuff depends on it
                global.hotkeySetup();
                if (!GM_config.get('confirm_drive_sync')) config.setGMValues();

                // the first ubersicht load is sometimes not caught by our ajax wrapper, so do manually
                process('ubersicht');
            },function () { lwm_jQuery('.status.lwm-firstload').text('LOADING... ERROR...'); helper.throwError(); });

            //we're hooking into ajax requests to figure out on which page we are and fire our own stuff
            var processPages = ['get_inbox_message','get_message_info','get_galaxy_view_info','get_inbox_load_info','get_make_command_info',
                                'get_info_for_flotten_pages','get_change_flotten_info','get_trade_offers','get_flotten_informations_info','get_spionage_info'];
            var ignorePages =  ['spionage','inbox','trade_offer','make_command','galaxy_view','change_flotten','flottenkommando',
                                'flottenbasen_all','fremde_flottenbasen','flottenbasen_planet','flotten_informations'];
            var preserveSubmenuPages = ['get_inbox_message','get_message_info'];

            site_jQuery(document).ajaxSend(function( event, xhr, settings ) {
                var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                if (settings.url.search(/lwm_ignoreProcess/) !== -1) {
                    console.log('lwm_ignoreProcess... skipping');
                    return;
                }
                // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
                if (firstLoad && page === 'ubersicht') return;

                if ((settings.url.match(/content/) || processPages.indexOf(page) !== -1) && ignorePages.indexOf(page) === -1) {
                    //prevent the same page to get processed twice
                    if (!config.loadStates.content || config.loadStates.lastLoadedPage !== page) {
                        console.log(page);
                        if (!preserveSubmenuPages.includes(page)) submenu.clear();
                        lwm_jQuery('#all').hide();
                        lwm_jQuery('.loader').show();
                    }
                }
            });

            site_jQuery(document).ajaxComplete(function( event, xhr, settings ) {
                var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                if (xhr.responseJSON == '500') return;

                // save specific responses for later use
                var saveRequest = ['get_production_info', 'get_aktuelle_production_info', 'get_ubersicht_info',
                                   'get_flottenbewegungen_info','get_inbox_message','get_info_for_observationen_page',
                                   'get_spionage_info','get_trade_offers','put_fleets','delete_fleets','put_change_flotten'];
                if (saveRequest.indexOf(page) !== -1) {
                    if (page === 'get_ubersicht_info')              config.gameData.overviewInfo     = xhr.responseJSON;
                    if (page === 'get_production_info')             config.getGameData.setProductionInfos(xhr.responseJSON);
                    if (page === 'get_aktuelle_production_info')    addOns.calendar.storeProd(xhr.responseJSON);
                    if (page === 'get_flottenbewegungen_info') {
                                                                    config.getGameData.addFleetInfo(xhr.responseJSON);
                                                                    // skip on first load because we can't be sure that everything is set up
                                                                    if (!config.loadStates.gdrive) addOns.calendar.storeFleets(xhr.responseJSON);
                    }
                    if (page === 'get_inbox_message')               config.gameData.messageData      = xhr.responseJSON;
                    if (page === 'get_info_for_observationen_page') config.gameData.observationInfo = xhr.responseJSON;
                    if (page === 'get_spionage_info')               config.gameData.spionageInfos    = xhr.responseJSON;
                    if (page === 'get_trade_offers') {
                                                                    config.gameData.tradeInfo        = xhr.responseJSON;
                                                                    addOns.checkCapacities();
                                                                    addOns.calendar.storeTrades(xhr.responseJSON);
                    }
                    if (['put_fleets','delete_fleets','put_change_flotten'].includes(page)) {
                                                                    requests.get_spionage_info();
                    }
                }

                var listenPages = ['put_building'];

                if (listenPages.indexOf(page) !== -1) {
                    console.log(event, xhr, settings);
                    console.log('ajaxComplete',page, xhr.responseJSON);
                }
            });

            site_jQuery(document).ajaxComplete(function( event, xhr, settings ) {
                var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                if (xhr.responseJSON == '500') return;

                if (settings.url.search(/lwm_ignoreProcess/) !== -1) {
                    console.log('lwm_ignoreProcess... skipping');
                    return;
                }
                // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
                if (firstLoad && page === 'ubersicht') return;

                var preserveSubmenu = preserveSubmenuPages.includes(page);

                if ((settings.url.match(/content/) || processPages.indexOf(page) !== -1) && ignorePages.indexOf(page) === -1) {
                    //prevent the same page to get processed twice
                    if (!config.loadStates.content || config.loadStates.lastLoadedPage !== page) process(page, xhr, preserveSubmenu);
                }
            });

            site_jQuery(window).focus(function () { addOns.load(unsafeWindow.active_page); });
        });
    }

    var uninstall = function () {
        addOns.unload();
    }

    var process = function (page, xhr, preserveSubmenu) {
        config.loadStates.content = true;
        config.loadStates.lastLoadedPage = page;
        config.loadStates.addons = true;
        //override changeContent to avoid multiple page calls
        unsafeWindow.changeContent = function () {};
        unsafeWindow.changeInboxContent = function () {};
        //reject current promises to cancel pending loads
        if (config.promises.content !== null) config.promises.content.reject();
        if (config.promises.addons !== null) config.promises.addons.reject();

        //figure out whether or not to process submenu and reject ongoing load in case
        if (preserveSubmenu && config.promises.submenu !== null) config.promises.submenu.reject();

        getPageLoadPromise().then(function () {
            lwm_jQuery('.loader').hide();
            lwm_jQuery('#all').show();
            if (firstLoad) {
                lwm_jQuery('#Main').css('display','flex');
                lwm_jQuery('.lwm-firstload').remove();
                firstLoad = false;

                var viewportmeta = document.querySelector('meta[name=viewport]');
                viewportmeta.setAttribute('content', "width=device-width, initial-scale=1.0");
            }
            lwm_jQuery('#all').focus();
            unsafeWindow.changeContent = config.unsafeWindow.changeContent;
            unsafeWindow.changeInboxContent = config.unsafeWindow.changeInboxContent;

            if (page === 'get_galaxy_view_info') {
                lwm_jQuery("html, body").animate({ scrollTop: lwm_jQuery(document).height() }, 250);
            }
        }).catch(function (e) {
            console.log(e);
            helper.throwError();
            lwm_jQuery('.loader').hide();
            lwm_jQuery('#all').show();
            if (firstLoad) {
                lwm_jQuery('#Main').css('display','flex');
                lwm_jQuery('.lwm-firstload').remove();
                firstLoad = false;

                var viewportmeta = document.querySelector('meta[name=viewport]');
                viewportmeta.setAttribute('content', "width=device-width, initial-scale=1.0");
            }
            lwm_jQuery('#all').focus();
            unsafeWindow.changeContent = config.unsafeWindow.changeContent;
            unsafeWindow.changeInboxContent = config.unsafeWindow.changeInboxContent;
        });

        if (!preserveSubmenu) {
            submenu.move(page);
        }

        switch (page) {
            case "ubersicht":                pageTweaks.uebersicht(); break;
            case "produktion":               pageTweaks.produktion(); break;
            case "upgrade_ships":            pageTweaks.upgradeShips(); break;
            case "recycling_anlage":         pageTweaks.recycleShips(); break;
            case "verteidigung":             pageTweaks.defense(); break;
            case "construction":             pageTweaks.construction(); break;
            case "research":                 pageTweaks.research(); break;
            case "aktuelle_produktion":      pageTweaks.prodQueue(); break;
            case "handelsposten":            pageTweaks.shipPost(); break;
            case "upgrade_defence":          pageTweaks.upgradeDef(); break;
            case "recycling_defence":        pageTweaks.recycleDef(); break;
            case "planeten":                 pageTweaks.planeten(); break;
            case "get_inbox_load_info":      pageTweaks.inbox(); break;
            case "get_inbox_message":        pageTweaks.inbox(); break;
            case "get_trade_offers":         pageTweaks.trades(); break;
            case "new_trade_offer":          pageTweaks.newTrade(); break;
            case "flottenbewegungen":        pageTweaks.calendar(); break;
            case "raumdock":                 pageTweaks.shipdock(); break;
            case "get_galaxy_view_info":     pageTweaks.galaxyView(); break;
            case "observationen":            pageTweaks.obs(); break;
            case "schiffskomponenten":       pageTweaks.designShips(); break;
            case "get_make_command_info":    pageTweaks.fleetCommand(); break;
            case "get_change_flotten_info":  pageTweaks.changeFleet(); break;
            case "get_info_for_flotten_pages": pageTweaks.allFleets(xhr); break;
            case "get_flotten_informations_info": pageTweaks.fleetSend(xhr.responseJSON); break;
            case "get_spionage_info":        pageTweaks.spyInfo(xhr.responseJSON); break;
            case "building_tree":            pageTweaks.buildingTree(); break;
            case "research_tree":            pageTweaks.buildingTree(); break;
            case "shiptree":                 pageTweaks.buildingTree(); break;
            case "verteidigung_tree":        pageTweaks.buildingTree(); break;
            case "rohstoffe":                pageTweaks.resources(); break;
            case "kreditinstitut":           pageTweaks.credit(); break;
            default:                         pageTweaks.default(); break;
        }

        pageTweaks.replaceArrows();

        /* addons */
        /* config.isPageLoad is currently set to false here because it's the last thing that runs */
        addOns.load(page);
    }

    var submenu = {
        move: function(page) {
            //setup page => data-page pairs that should get ignored
            var ignoreItems = {
                produktion: ['raumdock'],
                aktuelle_produktion: ['raumdock'],
                schiffskomponenten: ['raumdock'],
                recycling_anlage: ['raumdock'],
                raumdock: ['flottenbewegungen','trade_offer'],
                flottenkommando: ['flottenbewegungen','trade_offer'],
                get_info_for_flotten_pages: ['flottenbewegungen','trade_offer'],
                get_info_for_flotten_view: ['flottenbewegungen','trade_offer'],
                get_change_flotten_info: ['flottenbewegungen','trade_offer'],
                flotten_view: ['flottenbewegungen','trade_offer'],
                flottenbasen_planet: ['flottenbewegungen','trade_offer'],
                flottenbasen_all: ['flottenbewegungen','trade_offer'],
                fremde_flottenbasen: ['flottenbewegungen','trade_offer'],
                flottenbewegungen: ['raumdock','spionage','flottenkommando','flottenbewegungen']
            };
            //submenu loads after content
            config.loadStates.submenu = true;
            config.promises.submenu = getLoadStatePromise('content');
            config.promises.submenu.then(function () {
                lwm_jQuery('#link .navButton, #veticalLink .navButton').each(function () {
                    lwm_jQuery(this).attr('data-page', lwm_jQuery(this).attr('onclick').match(/(\'|\")([a-z0-9A-Z_]*)(\'|\")/)[2]);
                    //check if items can be skipped
                    if (ignoreItems[page] && ignoreItems[page].includes(lwm_jQuery(this).attr('data-page'))) {
                        lwm_jQuery(this).remove();
                        return true;
                    }
                    lwm_jQuery(this).find('i').remove(); //remove icons to avoid situations in which buttons could have more than one icon
                    switch (lwm_jQuery(this).attr('data-page')) {
                        case 'trade_offer': lwm_jQuery(this).prepend('<i class="fas fa-handshake"></i>'); break;
                        case 'handelsposten': lwm_jQuery(this).prepend('<i class="fas fa-dollar-sign"></i>'); break;
                        case 'building_tree': lwm_jQuery(this).prepend('<i class="fas fa-warehouse"></i>'); break;
                        case 'research_tree': lwm_jQuery(this).prepend('<i class="fas fa-database"></i>'); break;
                        case 'shiptree': lwm_jQuery(this).prepend('<i class="fas fa-fighter-jet"></i>'); break;
                        case 'verteidigung_tree': lwm_jQuery(this).prepend('<i class="fas fa-shield-alt"></i>'); break;
                        case 'planeten_tree': lwm_jQuery(this).prepend('<i class="fas fa-globe"></i>'); break;
                        case 'rohstoffe': lwm_jQuery(this).prepend('<i class="fas fa-gem"></i>'); break;
                        case 'eigenschaften': lwm_jQuery(this).prepend('<i class="fas fa-chart-bar"></i>'); break;
                        case 'highscore_player': lwm_jQuery(this).prepend('<i class="fas fa-trophy"></i>'); break;
                        case 'highscore_alliance': lwm_jQuery(this).prepend('<i class="fas fa-users"></i>'); break;
                        case 'newPrivateMessage': lwm_jQuery(this).prepend('<i class="fas fa-envelope-open"></i>'); break;
                        case 'privateMessageList': lwm_jQuery(this).prepend('<i class="fas fa-envelope"></i>'); break;
                        case 'notifiscationMessageList': lwm_jQuery(this).prepend('<i class="fas fa-bell"></i>'); break;
                        case 'reportMessageList': lwm_jQuery(this).prepend('<i class="fas fa-bomb"></i>'); break;
                        case 'adminMessageList': lwm_jQuery(this).prepend('<i class="fas fa-user-cog"></i>'); break;
                        case 'delitedMessageList': lwm_jQuery(this).prepend('<i class="fas fa-trash-alt"></i>'); break;
                        case 'flottenbewegungen': lwm_jQuery(this).prepend('<i class="fas fa-wifi"></i>'); break;
                        case 'raumdock': lwm_jQuery(this).prepend('<i class="fas fa-plane-arrival"></i>'); break;
                        case 'flottenkommando': lwm_jQuery(this).prepend('<i class="fas fa-plane-departure"></i>'); break;
                        case 'spionage': lwm_jQuery(this).prepend('<i class="fas fa-search"></i>'); break;
                        case 'aktuelle_produktion': lwm_jQuery(this).prepend('<i class="fas fa-tools"></i>'); break;
                        case 'schiffskomponenten': lwm_jQuery(this).prepend('<i class="fas fa-cogs"></i>'); break;
                        case 'upgrade_ships': lwm_jQuery(this).prepend('<i class="fas fa-arrow-alt-circle-up"></i>'); break;
                        case 'verteidigung': lwm_jQuery(this).prepend('<i class="fas fa-shield-alt"></i>'); break;
                        case 'produktion': lwm_jQuery(this).prepend('<i class="fas fa-fighter-jet"></i>'); break;
                        case 'upgrade_defence': lwm_jQuery(this).prepend('<i class="fas fa-arrow-alt-circle-up"></i>'); break;
                        case 'recycling_defence': lwm_jQuery(this).prepend('<i class="fas fa-recycle"></i>'); break;
                        case 'recycling_anlage': lwm_jQuery(this).prepend('<i class="fas fa-recycle"></i>'); break;
                        case 'new_trade_offer': lwm_jQuery(this).prepend('<i class="fas fa-plus-circle"></i>'); break;
                        case 'flottenbasen_planet': lwm_jQuery(this).prepend('<i class="fas fa-plane-departure"></i>'); break;
                        case 'flottenbasen_all': lwm_jQuery(this).prepend('<i class="fas fa-plane-departure"></i>'); break;
                        case 'fremde_flottenbasen': lwm_jQuery(this).prepend('<i class="fas fa-plane-departure"></i>'); break;
                        case 'bank': lwm_jQuery(this).prepend('<i class="fas fa-university"></i>'); break;
                        case 'kreditinstitut': lwm_jQuery(this).prepend('<i class="fab fa-cc-visa"></i>'); break;
                    }
                });
                if (window.matchMedia("(min-width: 849px)").matches) {
                    lwm_jQuery('#link .navButton, #veticalLink .navButton').appendTo('.secound_line');
                }
                lwm_jQuery('.secound_line').toggle(lwm_jQuery('.secound_line .navButton').length > 0);

                config.loadStates.submenu = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.submenu = false;
            });
        },
        clear: function () {
            lwm_jQuery('.secound_line .navButton').remove();
            //lwm_jQuery('#link').html('');
        }
    };

    var pageTweaks = {
        default: function () {
            config.promises.content = getPromise('.pageContent > div');
            config.promises.content.then(function () {
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        replaceArrows: function() {
            getLoadStatePromise('content').then(function () {
                lwm_jQuery('.arrow-left,.arrow-left-recycle,.spionage-arrow-left,.raumdock-arrow-left').removeClass('arrow-left arrow-left-recycle spionage-arrow-left raumdock-arrow-left').addClass('fa-2x fas fa-angle-left');
                lwm_jQuery('.arrow-right,.arrow-right-recycle,.spionage-arrow-right,.raumdock-arrow-right').removeClass('arrow-right arrow-right-recycle spionage-arrow-right raumdock-arrow-right').addClass('fa-2x fas fa-angle-right');
                lwm_jQuery('.fa-angle-right,.fa-angle-left').each(function () {
                    var longpress = 500;
                    var self = lwm_jQuery(this);
                    var start, interval1, interval2, interval3, timeout1, timeout2, timeout3;
                    lwm_jQuery(this)
                        .attr('style','')
                        .css('width','1em')
                        .css('cursor','hand')
                        .on( 'mousedown touchstart', function( e ) {
                            timeout1 = setTimeout(function () { interval1 = setInterval( function () { self.click(); },150); }, 250);
                            timeout2 = setTimeout(function () { clearInterval(interval1); interval2 = setInterval( function () { self.click(); },75); }, 2250);
                            timeout3 = setTimeout(function () { clearInterval(interval2); interval3 = setInterval( function () { self.click(); },25); }, 5250);
                        })
                        .on( 'mouseleave touchend', function( e ) { clearInterval(interval1); clearInterval(interval2); clearInterval(interval3); clearTimeout(timeout1); clearTimeout(timeout2); clearTimeout(timeout3); })
                        .on( 'mouseup', function( e ) { clearInterval(interval1); clearInterval(interval2); clearInterval(interval3); clearTimeout(timeout1); clearTimeout(timeout2); clearTimeout(timeout3); });
                });

                //listen to enter key on production pages
                lwm_jQuery.each(lwm_jQuery('.inputNumberDiv input,[id*=\'InputNumber\'] input'), function () {
                    var $self = lwm_jQuery(this);
                    var id = $self.attr('id').match(/\d+/)[0];
                    var $button = $self.parents('table').find('[id*=\''+id+'\']').find('button').not('[onclick*=\'deleteDesign\']');
                    $self.on('keyup', function (e) {
                        if (event.keyCode === 13) {
                            $button.click();
                        }
                    });
                });
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
            });
        },
        uebersicht: function() {
            config.promises.content = getPromise('#uberPageDiv');
            config.promises.content.then(function () {
                lwm_jQuery('.Posle').find('td:first').attr('colspan', '3');
                lwm_jQuery('.Posle').find('td:first').each(function () {
                    var coords = lwm_jQuery(this).html().match(/\d+x\d+x\d+/)[0].split('x');
                    var button = '<input class="planetButton planetButtonMain" type="button" value="'+lwm_jQuery(this).html()+'" onclick="changeCords('+coords[0]+', '+coords[1]+', '+coords[2]+');">';
                    lwm_jQuery(this).parents('.Posle').attr('data-coords', coords[0]+'x'+coords[1]+'x'+coords[2]);
                    lwm_jQuery(this).html(button);
                });

                //add resources
                if (GM_config.get('overview_planetresources')) {
                    lwm_jQuery.each(config.gameData.planetInformation, function (i, d) {
                        var $Posle = lwm_jQuery('.Posle[data-coords=\''+d.Galaxy+'x'+d.System+'x'+d.Planet+'\']');
                        var $tr = lwm_jQuery('<tr></tr>');
                        var $td = lwm_jQuery('<td colspan="3" style="padding:2px;"></td>'); $tr.append($td);
                        var $table = lwm_jQuery('<table></table>'); $td.append($table);
                        var $tbody = lwm_jQuery('<tbody></tbody>'); $table.append($tbody);
                        var $tr1 = lwm_jQuery('<tr><td class="sameWith roheisenVariable">Roheisen</td><td class="sameWith kristallVariable">Kristall</td><td class="sameWith frubinVariable">Frubin</td><td class="sameWith orizinVariable">Orizin</td><td class="sameWith frurozinVariable">Frurozin</td><td class="sameWith goldVariable">Gold</td></tr>');
                        var $tr2 = lwm_jQuery('<tr><td class="roheisenVariable">'+site_jQuery.number(Math.round(d.Planet_Roheisen), 0, ',', '.' )+'</td><td class="kristallVariable">'+site_jQuery.number(Math.round(d.Planet_Kristall), 0, ',', '.' )+'</td><td class="frubinVariable">'+site_jQuery.number(Math.round(d.Planet_Frubin), 0, ',', '.' )+'</td><td class="orizinVariable">'+site_jQuery.number(Math.round(d.Planet_Orizin), 0, ',', '.' )+'</td><td class="frurozinVariable">'+site_jQuery.number(Math.round(d.Planet_Frurozin), 0, ',', '.' )+'</td><td class="goldVariable">'+site_jQuery.number(Math.round(d.Planet_Gold), 0, ',', '.' )+'</td></tr>');
                        $tbody.append($tr1).append($tr2);
                        $Posle.find('tbody').append($tr);

                    });
                }

                //replace planet type (main, colony) with planet name
                if (GM_config.get('overview_planetnames')) {
                    lwm_jQuery.each(config.gameData.planetInformation, function (i, d) {
                        var $Posle = lwm_jQuery('.Posle[data-coords=\''+d.Galaxy+'x'+d.System+'x'+d.Planet+'\']');
                        var $val = $Posle.find('.planetButton').val();
                        $val = $val.replace(/\(.*\)/, '(' + d.Planet_Name + ')');
                        $Posle.find('.planetButton').val($val);
                    });
                }

                //add energy and slots
                if (GM_config.get('overview_planetstatus')) {
                    lwm_jQuery.each(config.lwm.planetInfo[config.gameData.playerID], function (coords, data) {
                        var $Posle = lwm_jQuery('.Posle[data-coords=\''+coords+'\']');
                        $Posle.find('td:first input').val($Posle.find('td:first input').val()+' '+data.energy + ' TW - ' + data.slots + ' Free Slot(s)');
                    });
                }

                // save overview times to calendar
                addOns.calendar.storeOverview(config.gameData.overviewInfo);

                if (GM_config.get('addon_clock')) {
                    clearInterval(unsafeWindow.timeinterval_uber);
                }

                //add fleet warning distance
                lwm_jQuery('.Posle').last().next().find('tr').last().after('<tr><td class="Pola">Frühwarnung:</td><td class="Pola lwm_fleetwarning"></td></tr>');

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        prodQueue: function() {
            config.promises.content = getPromise('#divTabele1,#divTabele2,#link');
            config.promises.content.then(function () {
                lwm_jQuery('#aktuelleProduktionPageDiv td[onclick]').each(function () {
                    lwm_jQuery(this).css('cursor', 'hand');
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                    if (GM_config.get('addon_clock')) {
                        clearInterval(unsafeWindow.timeinterval_aktuelle_produktion);
                        helper.setDataForClocks();
                    }
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('td[onclick*=\'deleteAktuelleProduktion\']'), 'fas fa-ban');
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        defense: function() {
            config.promises.content = getPromise('#verteidigungDiv');
            config.promises.content.then(function () {
                lwm_jQuery('button[onclick*=\'makeDefence\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('button[onclick*=\'makeDefence\']'), 'fas fa-2x fa-plus-circle');
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        shipPost: function() {
            config.promises.content = getPromise('#handelspostenDiv');
            config.promises.content.then(function () {
                //remove margin from arrows
                lwm_jQuery('.arrow-left,.arrow-right').css('margin-top',0);

                lwm_jQuery('button[onclick*=\'buyHandeslpostenShips\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('button[onclick*=\'buyHandeslpostenShips\']'), 'fas fa-2x fa-plus-circle');
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        recycleDef: function() {
            config.promises.content = getPromise('#recyclingDefenceDiv');
            config.promises.content.then(function () {
                //add confirm to recycle buttons
                lwm_jQuery('button[onclick*=\'recycleDefence\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('button[onclick*=\'recycleDefence\']'), 'fas fa-2x fa-plus-circle');
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        upgradeDef: function() {
            config.promises.content = getPromise('#upgradeDefenceDiv');
            config.promises.content.then(function () {
                //add confirm to recycle buttons
                lwm_jQuery('button[onclick*=\'upgradeDefenceFunction\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.addIconToHtmlElements(lwm_jQuery('button[onclick*=\'upgradeDefenceFunction\']'), 'fas fa-2x fa-arrow-alt-circle-up');

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        produktion: function() {
            config.promises.content = getPromise('#productionDiv');
            config.promises.content.then(function () {
                lwm_jQuery('button[onclick*=\'delete\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('button[onclick*=\'delete\']'), 'fas fa-ban');

                lwm_jQuery('button[onclick*=\'makeShip\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('button[onclick*=\'makeShip\']'), 'fas fa-2x fa-plus-circle');

                //set up filters
                var productionFilters = function () {
                    var process = function () {
                        //write setting
                        config.lwm.productionFilters[config.gameData.playerID][config.gameData.planetCoords.string] = lwm_jQuery.map(lwm_jQuery('.tableFilters_content > div > .activeBox'), function (el, i) { return lwm_jQuery(el).parent().data('filter'); });
                        GM.setValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));
                        if (GM_config.get('confirm_drive_sync')) driveManager.save();

                        var filterFunctions = {
                            all: function() {
                                return lwm_jQuery.map(config.gameData.productionInfos,function (el, k) { return el.id; });
                            },
                            freight: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return parseInt(el.cargo) > 0; }),function (el, k) { return el.id; }); },
                            kolo: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return parseInt(el.kolonisationsmodul) > 0; }),function (el, k) { return el.id; }); },
                            traeger: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return parseInt(el.tragerdeck) > 0; }),function (el, k) { return el.id; }); },
                            tarn: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return parseInt(el.tarnvorrichtung) > 0; }),function (el, k) { return el.id; }); },
                            nuk: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return el.engineShortCode === 'NUK'; }),function (el, k) { return el.id; }); },
                            hyp: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return el.engineShortCode === 'Hyp'; }),function (el, k) { return el.id; }); },
                            gty: function () { return lwm_jQuery.map(lwm_jQuery.grep(config.gameData.productionInfos, function (el, k) { return el.engineShortCode === 'Gty'; }),function (el, k) { return el.id; }); }
                        };

                        var getShipClassFromElement = function ($tr) {
                            var shipClass = helper.getFirstClassNameFromElement($tr) || '';
                            shipClass = shipClass.match(/\d+/);
                            return shipClass !== null ? shipClass[0] : '';
                        }

                        var shipClasses = filterFunctions.all();
                        lwm_jQuery.each(lwm_jQuery('.tableFilters_content > div > .activeBox'), function () {
                            var filterClasses = filterFunctions[lwm_jQuery(this).parent().data('filter')]();
                            shipClasses = lwm_jQuery(shipClasses).filter(filterClasses);

                        });

                        lwm_jQuery('#productionDiv tr').each(function () {
                            if (lwm_jQuery(this).data('hide')) return true;
                            //get first class name and strip s_ from it => then test for null in case regexp turns out empty
                            var shipClass = getShipClassFromElement(lwm_jQuery(this));
                            if (shipClass !== '' && lwm_jQuery.inArray(shipClass, shipClasses) === -1) lwm_jQuery(this).hide();
                            else                                                              lwm_jQuery(this).show();
                        });
                    };

                    var $div = lwm_jQuery('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
                    var $freightButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterFreight" data-filter="freight"><a class="formButton" href="javascript:void(0)">Fracht > 0</a></div>').appendTo($div.find('.tableFilters_content'));
                    var $koloButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterKolo" data-filter="kolo"><a class="formButton" href="javascript:void(0)">Module: Kolo</a></div>').appendTo($div.find('.tableFilters_content'));
                    var $tragerButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterTraeger" data-filter="traeger"><a class="formButton" href="javascript:void(0)">Module: Trägerdeck</a></div>').appendTo($div.find('.tableFilters_content'));
                    var $tarnButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterTarn" data-filter="tarn"><a class="formButton" href="javascript:void(0)">Module: Tarn</a></div>').appendTo($div.find('.tableFilters_content'));
                    var $nukButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterNuk" data-filter="nuk"><a class="formButton" href="javascript:void(0)">Engine: Nuk</a></div>').appendTo($div.find('.tableFilters_content'));
                    var $hypButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterHyp" data-filter="hyp"><a class="formButton" href="javascript:void(0)">Engine: Hyp</a></div>').appendTo($div.find('.tableFilters_content'));
                    var $gtyButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_ProdFilterGty" data-filter="gty"><a class="formButton" href="javascript:void(0)">Engine: Gty</a></div>').appendTo($div.find('.tableFilters_content'));

                    $div.find('.buttonRowInbox').click(function () { lwm_jQuery(this).find('.formButton').toggleClass('activeBox'); process(); });
                    lwm_jQuery('#productionDiv').prepend($div);

                    return {process: process};
                }();

                lwm_jQuery.each(config.lwm.productionFilters[config.gameData.playerID][config.gameData.planetCoords.string], function (i, filter) { lwm_jQuery('[data-filter=\''+filter+'\'] .formButton').addClass('activeBox'); });
                productionFilters.process();

                var getShipName = function ($tr) {
                    return $tr.find('.shipNameProduction a').text();
                };

                //add hide buttons for ships
                var $showAllButton = function () {
                    var $button = lwm_jQuery('<div class="inboxDeleteMessageButtons"><div class="buttonRowInbox" id="lwm_ShowHiddenShips"><a class="formButton" href="javascript:void(0)"><span class="count">'+config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string].length+'</span> versteckte(s) anzeigen</a></div></div>');
                    $button.click(function () {
                        config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string] = [];
                        GM.setValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
                        if (GM_config.get('confirm_drive_sync')) driveManager.save();
                        lwm_jQuery('#productionDiv tr').each(function () { lwm_jQuery(this).data('hide', false); });
                        setCurrentHiddenCount();
                        productionFilters.process();
                    });

                    lwm_jQuery('#productionDiv').append($button);

                    var setCurrentHiddenCount = function () {
                        $button.find('.count').text(config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string].length);
                    };

                    return {setCurrentHiddenCount: setCurrentHiddenCount};
                }();
                lwm_jQuery.each(config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string], function (k, shipName) {
                    var shipClass = helper.getFirstClassNameFromElement(lwm_jQuery('.shipNameProduction:contains(\''+shipName+' (\')').parents('tr'));
                    lwm_jQuery('.'+shipClass).hide();
                    lwm_jQuery('.'+shipClass).data('hide', true);
                });

                lwm_jQuery('.shipNameProduction').each(function () {
                    var $icon = lwm_jQuery('<i class="fas fa-times"></i>');
                    $icon.click(function () {
                        //ship name goes into config, but we're using classNames for the hide process
                        var $tr = lwm_jQuery(this).parents('tr');
                        var shipName = getShipName($tr);
                        var shipClass = helper.getFirstClassNameFromElement($tr);
                        config.lwm.hiddenShips[config.gameData.playerID][config.gameData.planetCoords.string].push(shipName);
                        GM.setValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
                        if (GM_config.get('confirm_drive_sync')) driveManager.save();
                        $showAllButton.setCurrentHiddenCount();
                        lwm_jQuery('.'+shipClass).hide();
                        lwm_jQuery('.'+shipClass).data('hide', true);
                    });
                    lwm_jQuery(this).append($icon);
                });

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        upgradeShips: function() {
            config.promises.content = getPromise('#upgradeShipsDiv');
            config.promises.content.then(function () {
                //add confirm to recycle buttons
                lwm_jQuery('button[onclick*=\'upgradeShipsFunction\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.addIconToHtmlElements(lwm_jQuery('button[onclick*=\'upgradeShipsFunction\']'), 'fas fa-2x fa-arrow-alt-circle-up');

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        recycleShips: function() {
            config.promises.content = getPromise('#recyclingAngleDiv');
            config.promises.content.then(function () {
                //add confirm to recycle buttons
                lwm_jQuery('button[onclick*=\'RecycleShips\']').each(function () {
                    if (GM_config.get('confirm_production')) helper.addConfirm(lwm_jQuery(this));
                });

                helper.replaceElementsHtmlWithIcon(lwm_jQuery('button[onclick*=\'RecycleShips\']'), 'fas fa-2x fa-plus-circle');
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        construction: function() {
            config.promises.content = getPromise('.hauptgebaude');
            config.promises.content.then(function () {
                helper.addResMemory(lwm_jQuery('.greenButton'), 'building');
                lwm_jQuery('.greenButton,.yellowButton,.redButton').each(function () {
                    var $td = lwm_jQuery(this).parent();
                    $td.css('cursor', 'hand');
                    $td.attr('onclick', lwm_jQuery(this).attr('onclick'));
                    lwm_jQuery(this).attr('onclick', '');
                    if (GM_config.get('confirm_const')) helper.addConfirm($td);
                    if (GM_config.get('addon_clock')) {
                        clearInterval(unsafeWindow.timeinterval_construction);
                        helper.setDataForClocks();
                    }
                });
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        research: function() {
            config.promises.content = getPromise('.basisForschungen,#researchPage:contains(\'Forschungszentrale benötigt.\')');
            config.promises.content.then(function () {
                lwm_jQuery('.greenButton,.yellowButton,.redButton').each(function () {
                    var $td = lwm_jQuery(this).parent();
                    $td.css('cursor', 'hand');
                    $td.attr('onclick', lwm_jQuery(this).attr('onclick'));
                    lwm_jQuery(this).attr('onclick', '')
                    if (GM_config.get('confirm_research')) helper.addConfirm($td);
                    if (GM_config.get('addon_clock')) {
                        clearInterval(unsafeWindow.timeinterval_construction);
                        helper.setDataForClocks();
                    }
                });
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        planeten: function() {
            config.promises.content = getPromise('#planetTable');
            config.promises.content.then(function () {
                lwm_jQuery('tr').find('.planetButtonTd:gt(0)').remove();
                lwm_jQuery('#planetTable tbody tr:nth-child(5n-3) td:first-child').each(function () {
                    var coords = lwm_jQuery(this).html().match(/\d+x\d+x\d+/)[0].split('x');
                    var button = '<input class="planetButton planetButtonMain" type="button" value="'+lwm_jQuery(this).html()+'" onclick="changeCords('+coords[0]+', '+coords[1]+', '+coords[2]+');">';
                    lwm_jQuery(this).html(button);
                });
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        inbox: function() {
            //clear content so loadStates doesn't fire too early
            //lwm_jQuery('#inboxContent').html('');
            config.promises.content = getPromise('.inboxDeleteMessageButtons,#messagesListTableInbox');
            config.promises.content.then(function () {
                config.loadStates.content = false;

                // workaround to bring the submenu in if you come to message from anywhere else than the message menu button
                if (lwm_jQuery('#veticalLink a.navButton').length !== 0 && lwm_jQuery('.secound_line a.navButton').length === 0) submenu.move();

                // go through messages and add direct link to fight and spy reports
                // we do this after updating loadstate to not slow down page load
                var addReportLink = function(message) {
                    var type = message.subject.search(/Kampfbericht/) !== -1 ? 'view_report_attack' : 'planetenscanner_view';
                    var $link = lwm_jQuery('<a target=\'_blank\' href=\'https://last-war.de/'+type+'.php?id='+message.reportID+'&user='+config.gameData.playerID+'\'><i style=\'margin-left: 5px;\' class=\'fas fa-external-link-alt\'></i></a>');
                    lwm_jQuery('[onclick*=\''+message.id+'\']').after($link);
                };

                //install handler to attach report links on browsing message pages
                if (!config.pages.inbox.reportHandler) {
                    lwm_jQuery(document).on('click', function (e) {
                        var check = lwm_jQuery(e.target).is('.formButton[onclick*=\'nextPage\']') || lwm_jQuery(e.target).is('.formButton[onclick*=\'previousPage\']');
                        if (!check) return;
                        if (![2,4].includes(unsafeWindow.window.current_view_type)) return;
                        lwm_jQuery.each(config.gameData.messageData[1], function (i, m) {
                            if (m.subject.search(/Kampfbericht|Spionagebericht/) !== -1 && m.user_nickname === 'Systemnachricht') addReportLink(m);
                        });
                    });
                    config.pages.inbox.reportHandler = true;
                }

                if ([2,4].includes(unsafeWindow.window.current_view_type) && GM_config.get('message_spylinks')) {
                    lwm_jQuery.each(config.gameData.messageData[1], function (i, m) {
                        if (m.subject.search(/Kampfbericht|Spionagebericht/) !== -1 && m.user_nickname === 'Systemnachricht') {
                            site_jQuery.getJSON('/ajax_request/get_message_info.php?id_conversation='+m.id, { lwm_ignoreProcess: 1 }, function (data) {
                                //add reportID to data for future use
                                config.gameData.messageData[1][i].reportID = data[0][0].text.match(/id=(\d*)/)[1];

                                addReportLink(config.gameData.messageData[1][i]);
                            });
                        }
                    });
                }
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        trades: function () {
            //we have to chain promises here to work around an issue
            //we resolve the page on #link since #tradeOfferDiv is not present without any active trades
            //we can't just process the page however because #tradeOfferDiv might still appear after #link
            //so we first listen to #link, then check tradeInfo.length and additionally resolve #tradeOfferDiv in case
            //we additionally have to tweak tradeInfo config as soon as trade get declined
            config.promises.content = getPromise('#link');
            config.promises.content.then(function () {
                if (config.gameData.tradeInfo.trade_offers.length === 0) config.loadStates.content = false;
                else {
                    getPromise('#tradeOfferDiv').then(function () {
                        //mark trades that would exceed capacities
                        var tradeInfo = config.gameData.tradeInfo;
                        var capacities = unsafeWindow.resourceCapacityArray;
                        var currentRes = [unsafeWindow.Roheisen,unsafeWindow.Kristall,unsafeWindow.Frubin,unsafeWindow.Orizin,unsafeWindow.Frurozin,unsafeWindow.Gold];
                        var incomingRes = helper.getIncomingResArray();
                        $.each(tradeInfo.trade_offers, function (i, offer) {
                            var tradeRunning = offer.accept === "1";
                            var $tradeDiv = lwm_jQuery('#div_'+offer.trade_id);
                            var isMyPlanet = offer.galaxy == config.gameData.planetCoords.galaxy && offer.system == config.gameData.planetCoords.system && offer.planet == config.gameData.planetCoords.planet;
                            $.each(currentRes, function (i, amount) {
                                if (GM_config.get('trade_highlights')) {
                                    if (offer.my === 1 && (incomingRes[i] + amount + (!tradeRunning ? parseInt(offer.resource[i+6]) : 0)) > capacities[i]) {
                                        $tradeDiv.find('tr:eq('+(i+5)+') td').last().addClass('redBackground');
                                        $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
                                    }
                                    if (offer.my === 1 && (incomingRes[i] + amount + (!tradeRunning ? parseInt(offer.resource[i+12]) : 0)) > capacities[i]) {
                                        $tradeDiv.find('tr:eq('+(i+5)+') td').first().addClass('redBackground');
                                        $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
                                    }
                                    if (isMyPlanet && offer.my === 0  && (incomingRes[i] + amount + (!tradeRunning ? parseInt(offer.resource[i+12]) : 0)) > capacities[i]) {
                                        $tradeDiv.find('tr:eq('+(i+5)+') td').first().addClass('redBackground');
                                        $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
                                    }
                                    if (offer.my === 0  && (incomingRes[i] + amount + (!tradeRunning ? parseInt(offer.resource[i+6]) : 0)) > capacities[i]) {
                                        $tradeDiv.find('tr:eq('+(i+5)+') td').last().addClass('redBackground');
                                        $tradeDiv.find('tr:eq(4) th').addClass('redBackground').html('Denying or accepting this trade would exceed your storage capacities for the marked resource type!');
                                    }
                                }
                            });
                            //remove deny button from save trades of other planets
                            if (offer.comment === '###LWM::SAVE###' && !isMyPlanet && !offer.my) $tradeDiv.find('tr').last().remove();
                            if (offer.comment === '###LWM::SAVE###' && isMyPlanet) $tradeDiv.find('.buttonRow').first().remove();
                        });

                        //attach events to delete trades
                        lwm_jQuery('[onclick*=\'declineTradeOffer\']').click(function () {
                            var id = lwm_jQuery(this).attr('onclick').match(/\d+/)[0];
                            config.gameData.tradeInfo.trade_offers = config.gameData.tradeInfo.trade_offers.filter(function (offer) { return offer.trade_id != id; });
                        });

                        //add accept and deny all button
                        $html = $('<div class="tableFilters">'+
                                  '    <div class="tableFilters_header">Optionen</div>'+
                                  '    <div class="tableFilters_content">'+
                                  '        <div class="buttonRowInbox" id="lwm_trades_accept_all"><a class="formButton" href="javascript:void(0)">Accept All Trades</a></div>'+
                                  '        <div class="buttonRowInbox" id="lwm_trades_deny_all"><a class="formButton" href="javascript:void(0)">Deny All Trades</a></div>'+
                                  '    </div>'+
                                  '</div>');
                        $html.find('#lwm_trades_accept_all').click(function () {
                            if (confirm('WARNING: This will accept ALL trades!')) {
                                var acceptPromises = [];
                                lwm_jQuery.each(lwm_jQuery('[onclick*=acceptTradeOffer]'), function () {
                                    var trade_offer_id = lwm_jQuery(this).attr('onclick').match(/\d+/)[0];
                                    var call = site_jQuery.ajax({
                                        type: "POST",
                                        dataType: "json",
                                        url: "./ajax_request/accept_trade_offer.php",
                                        data: {"trade_offer_id": trade_offer_id}
                                    });
                                    acceptPromises.push(call);
                                });
                                lwm_jQuery.when.apply(lwm_jQuery, acceptPromises).then(function () { changeContent('trade_offer', 'first', 'Handel'); });
                            }
                        });

                        $html.find('#lwm_trades_deny_all').click(function () {
                            if (confirm('WARNING: This will cancel/deny ALL trades!')) {
                                var declinePromises = [];
                                lwm_jQuery.each(lwm_jQuery('[onclick*=declineTradeOffer]'), function () {
                                    var trade_offer_id = lwm_jQuery(this).attr('onclick').match(/\d+/)[0];
                                    var call = site_jQuery.ajax({
                                        type: "POST",
                                        dataType: "json",
                                        url: "./ajax_request/decline_trade_offer.php",
                                        data: {"trade_offer_id": trade_offer_id}
                                    });
                                    declinePromises.push(call);
                                });
                                lwm_jQuery.each(lwm_jQuery('[onclick*=cancelTradeOffer]'), function () {
                                    var trade_offer_id = lwm_jQuery(this).attr('onclick').match(/\d+/)[0];
                                    var call = site_jQuery.ajax({
                                        type: "POST",
                                        dataType: "json",
                                        url: "./ajax_request/delete_trade_offer.php",
                                        data: {"trade_offer_id": trade_offer_id}
                                    });
                                    declinePromises.push(call);
                                });
                                lwm_jQuery.when.apply(lwm_jQuery, declinePromises).then(function () { changeContent('trade_offer', 'first', 'Handel'); });
                            }
                        });

                        lwm_jQuery('#tradeOfferDiv').before($html);

                        config.loadStates.content = false;
                    }).catch(function (e) {
                        console.log(e);
                        config.loadStates.content = false;
                    });
                }
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        newTrade: function() {
            config.promises.content = getPromise('#newTradeOfferDiv');
            config.promises.content.then(function () {
                //move buttons into one row and extend colspan
                var $lastTR = lwm_jQuery('#newTradeOfferDiv tr').last();
                $lastTR.find('td:eq(0)').hide();
                $lastTR.find('td:eq(1)').attr('colspan', '4');
                lwm_jQuery('.formButtonNewMessage').appendTo($lastTR.find('td:eq(1) .buttonRow'));

                //save coords in lastused config
                lwm_jQuery('[onclick*=\'submitNewOfferTrade\']').click(function () {
                    var coords = [parseInt(lwm_jQuery('#galaxyTrade').val()),parseInt(lwm_jQuery('#systemTrade').val()),parseInt(lwm_jQuery('#planetTrade').val())];
                    var check = lwm_jQuery.grep(config.gameData.planets, function (p) {
                        return parseInt(p.galaxy) === coords[0] && parseInt(p.system) === coords[1] && parseInt(p.planet) === coords[2];
                    });
                    if (!check.length && lwm_jQuery.inArray(coords[0]+'x'+coords[1]+'x'+coords[2], config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string]) === -1 && helper.checkCoords(coords)) {
                        config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].unshift(coords[0]+'x'+coords[1]+'x'+coords[2]);
                        if (config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > GM_config.get('coords_trades')) {
                            config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = GM_config.get('coords_trades');
                        }
                        GM.setValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));
                        if (GM_config.get('confirm_drive_sync')) driveManager.save();
                    }
                });

                //add div with own chords
                var $divOwn = lwm_jQuery('<div style=\'width:100%\'></div>');
                var linksOwn = [];
                var saveLinksOwn = [];
                lwm_jQuery(config.gameData.planets).each(function (i, coords) {
                    if (coords.galaxy == my_galaxy && coords.system == my_system && coords.planet == my_planet) return true;
                    var $link = lwm_jQuery('<a href=\'javascript:void(0)\' data-index=\''+i+'\'>'+coords.galaxy+'x'+coords.system+'x'+coords.planet+'</a>');
                    var $saveLink = lwm_jQuery('<a href=\'javascript:void(0)\' data-index=\''+i+'\'> (SAVE)</a>');
                    $link.click(function () {
                        lwm_jQuery('#galaxyTrade').val(config.gameData.planets[lwm_jQuery(this).data('index')].galaxy);
                        lwm_jQuery('#systemTrade').val(config.gameData.planets[lwm_jQuery(this).data('index')].system);
                        lwm_jQuery('#planetTrade').val(config.gameData.planets[lwm_jQuery(this).data('index')].planet);
                    });
                    $saveLink.click(function () {
                        lwm_jQuery('#galaxyTrade').val(config.gameData.planets[lwm_jQuery(this).data('index')].galaxy);
                        lwm_jQuery('#systemTrade').val(config.gameData.planets[lwm_jQuery(this).data('index')].system);
                        lwm_jQuery('#planetTrade').val(config.gameData.planets[lwm_jQuery(this).data('index')].planet);
                        inputFullResource();
                        lwm_jQuery('#his_gold').val('999999');
                        lwm_jQuery('#tradeOfferComment').val('###LWM::SAVE###');
                    });
                    linksOwn.push($link);
                    saveLinksOwn.push($saveLink);
                });
                lwm_jQuery(linksOwn).each(function (i, l) {
                    $divOwn.append([l, saveLinksOwn[i], i !== linksOwn.length - 1 ? ' - ' : '']);
                });
                $divOwn.appendTo($lastTR.find('td:eq(1)'));

                //put 1 Eisen when saving all res
                lwm_jQuery('[onclick*=\'inputFullResource\']').click(function () {
                    if (lwm_jQuery('#his_eisen').val() === "0") lwm_jQuery('#his_eisen').val("1");
                });

                //add div with saved coords
                var $divSave = lwm_jQuery('<div style=\'width:100%\'></div>');
                var linksSave = [];
                lwm_jQuery(config.lwm.lastTradeCoords[config.gameData.playerID][config.gameData.planetCoords.string]).each(function (i, coords) {
                    var $link = lwm_jQuery('<a href=\'javascript:void(0)\'>'+coords+'</a>');
                    $link.click(function () {
                        lwm_jQuery('#galaxyTrade').val(coords.split('x')[0]);
                        lwm_jQuery('#systemTrade').val(coords.split('x')[1]);
                        lwm_jQuery('#planetTrade').val(coords.split('x')[2]);
                    });
                    linksSave.push($link);
                });
                lwm_jQuery(linksSave).each(function (i, l) {
                    $divSave.append([l, i !== linksOwn.length - 1 ? ' - ' : '']);
                });
                $divSave.appendTo($lastTR.find('td:eq(1)'));

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        changeFleet: function () {
            config.promises.content = getPromise('#changeFlottenDiv');
            config.promises.content.then(function () {
                //button to add all ships
                var $allShips = lwm_jQuery('<a href="javascript:void(0)" class="lwm_selectAll"> (All)</a>');
                $allShips.appendTo(lwm_jQuery('#changeFlottenDiv > table th:eq(7)'));
                $allShips.clone().appendTo(lwm_jQuery('#changeFlottenDiv > table th:eq(8)'));

                lwm_jQuery('#changeFlottenDiv .lwm_selectAll').click(function () {
                    var index = lwm_jQuery(this).parent().index('#changeFlottenDiv > table th');
                    lwm_jQuery('#changeFlottenDiv > table tr').find('td:eq('+(index)+') .arrow-right').each(function () {
                        var curCount = 0;
                        do {
                            curCount = parseInt(lwm_jQuery(this).prev().text());
                            lwm_jQuery(this).click();

                        } while (parseInt(lwm_jQuery(this).prev().text()) !== curCount)
                    });
                });

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        allFleets: function (xhr) {
            config.promises.content = getPromise('#flottenBasenPlanetDiv,#fremdeFlottenBasenDiv,#flottenBasenAllDiv,#flottenKommandoDiv,#link');
            config.promises.content.then(function () {
                //add recall button if applicable
                var fleets = lwm_jQuery.grep(xhr.responseJSON, function (fleet, i) { return fleet.status_king === "1"; });
                lwm_jQuery.each(fleets, function (i, fleet) {
                    var $form = lwm_jQuery('td:contains(\''+fleet.id_fleets+'\')').parents('table').find('form');
                    $form.append('<a id="recallFleets" class="formButtonSpionage" href="#" onclick="changeContent(\'flotten_view\', \'third\', \'Flotten-Kommando\', \''+fleet.id_fleets+'\');"><i class="fas fa-wifi faa-flash animated"></i>L-Kom</a>');
                });

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        shipdock: function () {
            config.promises.content = getPromise('.raumdockNameButtonDiv');
            config.promises.content.then(function () {
                //button to add all ships
                var $allShips = lwm_jQuery('<button class="createShipButton createFleetRaumdock" id="lwm_selectAllShips">Alle Schiffe</button>');
                $allShips.click(function () {
                    lwm_jQuery('[onclick*=\'addNumberRaumdock\']').each(function () {
                        var curCount = 0;
                        do {
                            curCount = parseInt(lwm_jQuery(this).prev().text() || lwm_jQuery(this).prev().val());
                            if (isNaN(curCount)) break;
                            lwm_jQuery(this).click();

                        } while (parseInt(lwm_jQuery(this).prev().text() || lwm_jQuery(this).prev().val()) !== curCount)
                    });
                });
                $allShips.appendTo(lwm_jQuery('.raumdockNameButtonDiv'));

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        calendar: function() {
            config.promises.content = getPromise('#folottenbewegungenPageDiv');
            config.promises.content.then(function () {
                //remove fleet div, we're using our own
                lwm_jQuery('#folottenbewegungenPageDiv').remove();

                //add our calendar table
                var $tableBase = lwm_jQuery(''+
                    '<div id="calendarDiv">'+
                        '<table><tbody>'+
                            '<tr><th>Player</th>'+
                            '<th>Coord</th>'+
                            '<th>Type</th>'+
                            '<th>Text</th>'+
                            '<th>Time</th>'+
                            '<th>Finished</th></tr>'+
                        '</tbody></table>'+
                    '</div>');

                if (!addOns.calendar.truncateData()) driveManager.save();

                var entries = document.createDocumentFragment();
                lwm_jQuery.each(config.lwm.calendar, function (i, entry) {
                    var tr = document.createElement('tr');tr.setAttribute('data-username', entry.playerName);tr.setAttribute('data-coord', entry.coords);tr.setAttribute('data-type', entry.type);tr.setAttribute('data-ts', entry.ts);
                    var tdName = document.createElement('td');tdName.innerHTML=entry.playerName;
                    var tdCoords = document.createElement('td');tdCoords.innerHTML=entry.coords;
                    var tdType = document.createElement('td');tdType.innerHTML=entry.type;
                    var tdText = document.createElement('td');tdText.innerHTML=entry.text;
                    var tdTS = document.createElement('td');tdTS.innerHTML=moment(entry.ts).format("YYYY-MM-DD HH:mm:ss");
                    var tdCountdown = document.createElement('td');tdCountdown.setAttribute('id', 'clock_calendar_'+i);tdCountdown.innerHTML=moment.duration(entry.ts-moment().valueOf(), "milliseconds").format("HH:mm:ss", { trim: false, forceLength: true });
                    tr.appendChild(tdName);tr.appendChild(tdCoords);tr.appendChild(tdType);tr.appendChild(tdText);tr.appendChild(tdTS);tr.appendChild(tdCountdown);
                    entries.appendChild(tr);
                });
                $tableBase.find('tbody')[0].appendChild(entries);

                //sort calendar
                $tableBase.find('table tbody tr:gt(0)').sort(function (a, b) {
                    var tsA = parseInt(lwm_jQuery(a).data('ts'));
                    var tsB = parseInt(lwm_jQuery(b).data('ts'));
                    return tsA - tsB;
                }).each(function() {
                    var $elem = lwm_jQuery(this).detach();
                    lwm_jQuery($elem).appendTo($tableBase.find('table tbody'));
                });

                $tableBase.appendTo('.pageContent');
                helper.setDataForClocks();

                //set up filters
                var calendarFilters = function () {
                    var process = function () {
                        $tableBase.find('tr').data('hide', false);
                        var filterFunctions = {
                            username: function(v) { $tableBase.find('tr:gt(0)[data-username!=\''+v+'\']').data('hide', true); },
                            coord: function(v) { $tableBase.find('tr:gt(0)[data-coord!=\''+v+'\']').data('hide', true); },
                            type: function(v) { $tableBase.find('tr:gt(0)[data-type!=\''+v+'\']').data('hide', true); }
                        };

                        lwm_jQuery.each(lwm_jQuery('.tableFilters_content > div > .activeBox'), function () {
                            var filterFunction = lwm_jQuery(this).parent().data('filter');
                            var filterValue    = lwm_jQuery(this).parent().data('value');
                            filterFunctions[filterFunction](filterValue);
                        });

                        lwm_jQuery.each($tableBase.find('tr'), function (i, el) {
                            if (lwm_jQuery(el).data('hide')) lwm_jQuery(el).hide();
                            else                             lwm_jQuery(el).show();
                        });
                    };

                    var usernames = lwm_jQuery.map(config.lwm.calendar, function (el, i) { return el.playerName; }).filter(function (value, index, self) { return self.indexOf(value) === index; });
                    var coords = lwm_jQuery.map(config.lwm.calendar, function (el, i) { return el.coords; }).filter(function (value, index, self) { return self.indexOf(value) === index; });
                    var types = lwm_jQuery.map(config.lwm.calendar, function (el, i) { return el.type; }).filter(function (value, index, self) { return self.indexOf(value) === index; });

                    var $div = lwm_jQuery('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
                    lwm_jQuery.each(usernames, function (i, username) { var $button = lwm_jQuery('<div class="buttonRowInbox" data-filter="username" data-value="'+username+'"><a class="formButton" href="javascript:void(0)">'+username+'</a></div>').appendTo($div.find('.tableFilters_content')); });
                    lwm_jQuery.each(coords, function (i, coord) { var $button = lwm_jQuery('<div class="buttonRowInbox" data-filter="coord" data-value="'+coord+'"><a class="formButton" href="javascript:void(0)">'+coord+'</a></div>').appendTo($div.find('.tableFilters_content')); });
                    lwm_jQuery.each(types, function (i, type) { var $button = lwm_jQuery('<div class="buttonRowInbox" data-filter="type" data-value="'+type+'"><a class="formButton" href="javascript:void(0)">'+type+'</a></div>').appendTo($div.find('.tableFilters_content')); });

                    $div.find('[data-value=\''+config.gameData.playerName+'\']').find('.formButton').toggleClass('activeBox');
                    $div.find('[data-value=\'fleet\']').find('.formButton').toggleClass('activeBox');

                    $div.find('.buttonRowInbox').click(function () { lwm_jQuery(this).find('.formButton').toggleClass('activeBox'); process(); });
                    lwm_jQuery('#calendarDiv').prepend($div);

                    process();
                }();

                //clear fleet interval manually on this page, because add on is deactivated by default
                clearInterval(unsafeWindow.timeinterval_flottenbewegungen);

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        fleetCommand: function() {
            config.promises.content = getPromise('#makeCommandDiv');
            config.promises.content.then(function () {
                //save coords in lastused config
                lwm_jQuery('[onclick*=\'makeCommand\']').click(function () {
                    var coords = [parseInt(lwm_jQuery('#galaxyInput').val()),parseInt(lwm_jQuery('#systemInput').val()),parseInt(lwm_jQuery('#planetInput').val())];
                    if (lwm_jQuery.inArray(coords[0]+'x'+coords[1]+'x'+coords[2], config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string]) === -1 && helper.checkCoords(coords)) {
                        config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].unshift(coords[0]+'x'+coords[1]+'x'+coords[2]);
                        if (config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > GM_config.get('coords_fleets')) {
                            config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = GM_config.get('coords_fleets');
                        }
                        GM.setValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));
                        if (GM_config.get('confirm_drive_sync')) driveManager.save();
                    }
                });

                //add div with saved coords
                var $lastTR = lwm_jQuery('#makeCommandDiv tr').last();
                var $divSave = lwm_jQuery('<div style=\'width:100%\'></div>');
                var linksSave = [];
                lwm_jQuery(config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string]).each(function (i, coords) {
                    var $link = lwm_jQuery('<a href=\'javascript:void(0)\'>'+coords+'</a>');
                    $link.click(function () {
                        lwm_jQuery('#galaxyInput').val(coords.split('x')[0]);
                        lwm_jQuery('#systemInput').val(coords.split('x')[1]);
                        lwm_jQuery('#planetInput').val(coords.split('x')[2]);
                    });
                    linksSave.push($link);
                });
                lwm_jQuery(linksSave).each(function (i, l) {
                    $divSave.append(l);
                    if (i !== linksSave.length - 1) $divSave.append(' - ');
                });
                $divSave.appendTo($lastTR.find('td').first());

                //save raid prio on submit
                if (GM_config.get('fleet_saveprios')) {
                    if (config.lwm.raidPrios.length === 6) {
                        //fill fields if we have a saved prio
                        lwm_jQuery('#roheisen_priority').val(config.lwm.raidPrios[0]);
                        lwm_jQuery('#kristall_priority').val(config.lwm.raidPrios[1]);
                        lwm_jQuery('#frubin_priority').val(config.lwm.raidPrios[2]);
                        lwm_jQuery('#orizin_priority').val(config.lwm.raidPrios[3]);
                        lwm_jQuery('#frurozin_priority').val(config.lwm.raidPrios[4]);
                        lwm_jQuery('#gold_priority').val(config.lwm.raidPrios[5]);
                    }

                    lwm_jQuery('[onclick*=\'makeCommand\']').click(function () {
                        //save prios
                        if (lwm_jQuery('[name=\'type_kommand\']:checked').val() === "1") {
                            var prios = [
                                lwm_jQuery('#roheisen_priority').val(),
                                lwm_jQuery('#kristall_priority').val(),
                                lwm_jQuery('#frubin_priority').val(),
                                lwm_jQuery('#orizin_priority').val(),
                                lwm_jQuery('#frurozin_priority').val(),
                                lwm_jQuery('#gold_priority').val()
                            ];

                            if (JSON.stringify(prios) !== JSON.stringify(config.lwm.raidPrios)) {
                                config.lwm.raidPrios = prios;
                                GM.setValue('lwm_raidPrios', JSON.stringify(config.lwm.raidPrios));
                                if (GM_config.get('confirm_drive_sync')) driveManager.save();
                            }
                        }
                    });
                }

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        fleetSend: function (data) {
            //save data so we have it available when browsing back and forth
            var data = data || config.gameData.fleetSendData;
            config.gameData.fleetSendData = data;
            config.promises.content = getPromise('#flottenInformationPage');
            config.promises.content.then(function () {
                var maxSpeed = data.max_speed_transport;
                var minTimeInSeconds  = moment.duration(data.send_time, "seconds").asSeconds();
                var maxTimeInSeconds = (minTimeInSeconds / (2-(maxSpeed/100)) * (2-(20/100)));
                
                //round up to the next five mintue interval
                var start = moment().add(minTimeInSeconds, 'seconds');
                var remainder = 5 - (start.minute() % 5);
                var minDate = moment(start).add(remainder, "minutes").startOf('minute');
                var maxDate = moment().add(maxTimeInSeconds*2, 'seconds');

                //build time choose select
                var $select = lwm_jQuery('<select id="lwm_fleet_selecttime"><option value="" selected>Pick Return Hour</option></select>');
                while (minDate.valueOf() < maxDate.valueOf()) {
                    $select.append('<option>'+minDate.format("YYYY-MM-DD HH:mm:ss")+'</option>');
                    //increment minutes for next option
                    minDate.add(5,'minutes');
                }

                var disableOptions = function () {
                    var $oneway = lwm_jQuery('#lwm_fleet_oneway').is(':checked');
                    /* disable options that don't fit speed of fleet */
                    $select.find('option:gt(0)').each(function () {
                        var timeDiffInSeconds = moment(lwm_jQuery(this).val()).diff(moment(), "seconds") /  ($oneway ? 1 : 2);;
                        var minSpeedInSeconds = (minTimeInSeconds / (2-(maxSpeed/100)) * (2-(20/100)));
                        lwm_jQuery(this).prop('disabled', minSpeedInSeconds < timeDiffInSeconds || minTimeInSeconds > timeDiffInSeconds);
                    });
                }

                disableOptions();

                var calcFleetTime = function () {
                    disableOptions();
                    var $val = lwm_jQuery('#lwm_fleet_selecttime').val();
                    var $momentVal = moment($val);
                    var $oneway = lwm_jQuery('#lwm_fleet_oneway').is(':checked');
                    if (!$val) {
                        lwm_jQuery('.changeTime').val(maxSpeed);
                        site_jQuery('.changeTime').change();
                        if ($val === null) {
                            //val === null means options disabled
                            alert('WARNING: Choice is not possible due to fleet speed');
                            lwm_jQuery('.changeTime').val('20');
                            site_jQuery('.changeTime').change();
                            return;
                        }
                    } else {
                        //calculate speed for given return time
                        var timeDiffInSeconds = $momentVal.diff(moment(), "seconds") / ($oneway ? 1 : 2);
                        var minSpeedInSeconds = (minTimeInSeconds / (2-(maxSpeed/100)) * (2-(20/100)));
                        if (minSpeedInSeconds < timeDiffInSeconds || minTimeInSeconds > timeDiffInSeconds) {
                            alert('WARNING: Choice is not possible due to fleet speed');
                            lwm_jQuery('.changeTime').val('20');
                            site_jQuery('.changeTime').change();
                            return;
                        }
                        var type = $oneway ? "0" : lwm_jQuery('#lwm_fleet_type').val();
                        var sendSpeed,returnSpeed,curSpeed,sendSpeedInSeconds,returnSpeedInSeconds;
                        switch (type) {
                            case "0":
                                var newSpeed = Math.round((1-((((timeDiffInSeconds-(minTimeInSeconds/(2-(parseInt(maxSpeed)/100))))/((minTimeInSeconds/(2-(parseInt(maxSpeed)/100)))*0.01)))/100))*100);
                                lwm_jQuery('.changeTime').val(newSpeed);
                                break;
                            case "1":
                                //ignore one way
                                timeDiffInSeconds = $momentVal.diff(moment(), "seconds");
                                sendSpeed = 0;
                                returnSpeed = 0;
                                curSpeed = 20;
                                do {
                                    //calculate 20% speed in seconds
                                    sendSpeed = curSpeed;
                                    sendSpeedInSeconds = minTimeInSeconds / (2-(maxSpeed/100)) * (2-(curSpeed/100));
                                    //subtract and see whether return is still possible
                                    returnSpeedInSeconds = timeDiffInSeconds - sendSpeedInSeconds;
                                    returnSpeed = Math.round((1-((((returnSpeedInSeconds-(minTimeInSeconds/(2-(parseInt(maxSpeed)/100))))/((minTimeInSeconds/(2-(parseInt(maxSpeed)/100)))*0.01)))/100))*100);
                                    curSpeed++;
                                } while (returnSpeed < 20 || returnSpeed > maxSpeed)
                                lwm_jQuery('#send').val(returnSpeed);
                                lwm_jQuery('#back').val(sendSpeed);
                                break;
                            case "2":
                                //ignore one way
                                timeDiffInSeconds = $momentVal.diff(moment(), "seconds");
                                sendSpeed = 0;
                                returnSpeed = 0;
                                curSpeed = 20;
                                do {
                                    //calculate 20% speed in seconds
                                    sendSpeed = curSpeed;
                                    sendSpeedInSeconds = minTimeInSeconds / (2-(maxSpeed/100)) * (2-(curSpeed/100));
                                    //subtract and see whether return is still possible
                                    returnSpeedInSeconds = timeDiffInSeconds - sendSpeedInSeconds;
                                    returnSpeed = Math.round((1-((((returnSpeedInSeconds-(minTimeInSeconds/(2-(parseInt(maxSpeed)/100))))/((minTimeInSeconds/(2-(parseInt(maxSpeed)/100)))*0.01)))/100))*100);
                                    curSpeed++;
                                } while (returnSpeed < 20 || returnSpeed > maxSpeed)
                                lwm_jQuery('#send').val(sendSpeed);
                                lwm_jQuery('#back').val(returnSpeed);
                                break;
                        }
                        site_jQuery('.changeTime').change();
                        lwm_jQuery('.changeTime').change();
                    }
                }

                var $selectWrap = lwm_jQuery('<div></div>');
                $selectWrap.append($select);
                var $wrapper = lwm_jQuery('<div>');
                $wrapper.attr('id', 'lwm_fleet_timer_wrapper');
                $wrapper.append($selectWrap);
                $wrapper.append('<div><select id="lwm_fleet_type"><option value="0">Send / Return Balanced</option><option value="1">Send Fast/ Return Slow</option><option value="2">Send Slow/Return Fast</option></select></div>');
                $wrapper.append('<div><label style="display:flex;align-items:center;"><input type="checkbox" id="lwm_fleet_oneway">Oneway</label></div>');

                $select.change(function () { calcFleetTime(); });
                $wrapper.find('#lwm_fleet_oneway').change(function () { calcFleetTime(); lwm_jQuery('#lwm_fleet_type').prop('disabled', lwm_jQuery(this).is(':checked')); });
                $wrapper.find('#lwm_fleet_type').change(function () { calcFleetTime(); });

                lwm_jQuery('#timeFlote').after($wrapper);

                //when next is clicked, remove wrapper
                lwm_jQuery('#nextSite').on('click', function () {
                    $wrapper.remove();
                    lwm_jQuery('#nextSite').off('click');
                    lwm_jQuery('#backSite').on('click', function () {
                        pageTweaks.fleetSend();
                        //has to be triggered, otherwise some stuff doesn't work => flotten_information.js
                        var fii = unsafeWindow.flotten_informations_infos;
                        site_jQuery( "#send" ).change(function() {
                            fii.speed_send = parseInt(site_jQuery("#send").val());
                            if(fii.speed_send > fii.sped_transport)
                            {
                                fii.speed_send = fii.sped_transport;
                            }
                            else if(fii.speed_send < 20)
                            {
                                fii.speed_send = 20;
                            }
                            site_jQuery("#send").val(fii.speed_send);
                            site_jQuery.post('./ajax_request/count_time.php', {id_broda: fii.id_broda, tip_broda: fii.tip_broda,Units: fii.Units, id_flote: fii.id_flote, speed: fii.speed_send},function (data) {
                                site_jQuery( "#sendTime" ).empty();
                                fii.send_time = data;
                                site_jQuery( "#sendTime" ).text("Flugzeit: "+data+" Stunden");
                            });
                        });

                        site_jQuery( "#back" ).change(function() {
                            fii.speed_back = parseInt(site_jQuery("#back").val());
                            if(fii.speed_back > fii.sped_transport)
                            {
                                fii.speed_back = fii.sped_transport;
                            }
                            else if(fii.speed_back < 20)
                            {
                                fii.speed_back = 20;
                            }
                            site_jQuery("#back").val(fii.speed_back);
                            site_jQuery.post('./ajax_request/count_time.php', {id_broda: fii.id_broda, tip_broda: fii.tip_broda,Units: fii.Units, id_flote: fii.id_flote, speed: fii.speed_back},function (data) {
                                site_jQuery( "#backTime" ).empty();
                                fii.back_time = data;
                                site_jQuery( "#backTime" ).text("Flugzeit: "+data+" Stunden");
                            });
                        });
                        lwm_jQuery('#backSite').off('click');
                    });
                });

                //pre-select defined sets
                var presets = [];
                [1,2,3,4,5].forEach(function (i) {
                    if (GM_config.get('fleet_presets_'+i+'_active')) {
                        presets.push({time: GM_config.get('fleet_presets_'+i+'_time'), days: GM_config.get('fleet_presets_'+i+'_weekday')});
                    }
                });
                if (presets.length) {
                    presets.sort(function (a,b) { return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0); });

                    var found = false;
                    lwm_jQuery.each(lwm_jQuery('#lwm_fleet_selecttime').find('option:gt(0)'), function (i, el) {
                        var $el = lwm_jQuery(el);
                        var hour = moment($el.text()).hour();
                        var minute = moment($el.text()).minute();
                        var weekday = moment($el.text()).day();

                        var weekdaysToValues = {
                            'All': [0,1,2,3,4,5,6],
                            'Mon': [1],
                            'Tue': [2],
                            'Wed': [3],
                            'Thu': [4],
                            'Fri': [5],
                            'Sat': [6],
                            'Sun': [0],
                            'Weekday': [1,2,3,4,5],
                            'Weekend': [0,6]
                        };

                        presets.forEach(function (preset) {
                            var preHour = parseInt(preset.time.split(':')[0]);
                            var preMinute = parseInt(preset.time.split(':')[1]);

                            if (hour == preHour && preMinute == minute && weekdaysToValues[preset.days].includes(weekday)) {
                                if (!found && $el.is(':not(\'[disabled]\')')) {
                                    lwm_jQuery('#lwm_fleet_selecttime').val($el.val());
                                    calcFleetTime();
                                    found = true;
                                }
                                $el.addClass('lwm_preselect');
                            }
                        });
                    });
                }

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        spyInfo: function (data) {
            if (Object.keys(data.observations_drons).length === 0 && Object.keys(data.planetenscanner_drons).length === 0 && Object.keys(data.system_drons).length === 0) config.loadStates.content = false;
            else {
                config.promises.content = getPromise('#spionageDiv');
                config.promises.content.then(function () {
                    lwm_jQuery('#spionageDiv tr').each(function () {
                        if (lwm_jQuery(this).find('td:eq(4)').text() === '0') lwm_jQuery(this).hide();
                    });

                    config.loadStates.content = false;
                }).catch(function (e) {
                    console.log(e);
                    helper.throwError();
                    config.loadStates.content = false;
                });
            }
        },
        galaxyView: function () {
            //lwm_jQuery('#galaxyViewInfoTable').html('');
            config.promises.content = getPromise('#galaxyViewInfoTable');
            config.promises.content.then(function () {
                lwm_jQuery('a.flottenKommandoAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-fighter-jet fa-stack-1x"></i>');
                lwm_jQuery('a.newTradeOfferAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-handshake fa-stack-1x"></i>');
                lwm_jQuery('a.spionagePlanetenscannerAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-search fa-stack-1x"></i>');
                lwm_jQuery('a.spionageObservationsAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-search-plus fa-stack-1x"></i>');
                lwm_jQuery('a.changePlanetAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-exchange-alt fa-stack-1x"></i>');

                var parseCoords = function (coordsText) {
                    var coords = coordsText.split('x');
                    coords[0] = coords[0].match(/\d+/)[0];
                    coords[1] = coords[1].match(/\d+/)[0];
                    coords[2] = coords[2].match(/\d+/)[0]; //filter planet type
                    return coords;
                }

                lwm_jQuery('#galaxyViewInfoTable tr').find('td:eq(3)').each(function () {
                    var value = lwm_jQuery(this).text();
                    var coords = parseCoords(lwm_jQuery(this).parents('tr').find('td').first().text());
                    var coordData = config.lwm.planetData[coords[0]+'x'+coords[1]+'x'+coords[2]];
                    //add spy buttons for planets that's missing it
                    if (value !== '' && value !== 'false' && value !== '0') {
                        var spydrones = lwm_jQuery.grep(config.gameData.spionageInfos.planetenscanner_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
                        var obsdrones = lwm_jQuery.grep(config.gameData.spionageInfos.observations_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
                        var existingObs = helper.getActiveObs(coords);
                        var hasSpy =  lwm_jQuery(this).next().find('.spionagePlanetenscannerAction').length > 0;
                        var hasObs =  lwm_jQuery(this).next().find('.spionageObservationsAction').length > 0;
                        if (!hasObs && (obsdrones.length > 0 || existingObs.length !== 0)) lwm_jQuery(this).next().append('<a href="#" class="actionClass spionageObservationsAction fa-stack" onclick="javascript:void(0)"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search-plus fa-stack-1x"></i></a>');
                        if (!hasSpy && spydrones.length > 0) lwm_jQuery(this).next().append('<a href="#" class="actionClass spionagePlanetenscannerAction fa-stack" onclick="javascript:void(0)"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search fa-stack-1x"></i></a>');
                    }

                    //add stealth info
                    if (value !== '' && value !== 'false' && value !== '0' && coordData) {
                        lwm_jQuery(this).next().append('<div title="Tarntechnologie" class="actionClass fa-stack popover" style="color: #3c3ff5;"><i class="far fa-circle fa-stack-2x"></i><span>'+coordData.Tarntechnologie+'</span></div>');
                    }

                });

                //add spionage actions
                lwm_jQuery('a.spionagePlanetenscannerAction').each(function () {
                    lwm_jQuery(this).attr('onclick', 'javascript:void(0)');
                    var coords = parseCoords(lwm_jQuery(this).parents('tr').find('td').first().text());
                    lwm_jQuery(this).click(function () { operations.performSpionage(coords) });
                });
                lwm_jQuery('a.spionageObservationsAction').each(function () {
                    lwm_jQuery(this).attr('onclick', 'javascript:void(0)');
                    var coords = parseCoords(lwm_jQuery(this).parents('tr').find('td').first().text());

                    //check for obs
                    var existingObs = helper.getActiveObs(coords);
                    if (existingObs.length !== 0) {
                        //obs found... open!
                        lwm_jQuery(this).click(function () {
                            if (GM_config.get('obs_opentabs')) {
                                window.open('view/content/new_window/observationen_view.php?id='+existingObs[0].id);
                            } else {
                                unsafeWindow.openObservationWindow(existingObs[0].id);
                            }
                        }).css('color', '#66f398');
                    } else {
                        //otherwise offer sending one
                        lwm_jQuery(this).click(function () { operations.performObservation(coords) });
                    }
                });

                //move observation and search div
                lwm_jQuery('.headerOfGalaxyViewPage').insertBefore(lwm_jQuery('#tableForChangingPlanet'));

                //add search icons
                helper.replaceElementsHtmlWithIcon(lwm_jQuery('.formButtonGalaxyView'), 'fas fa-search');

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        obs: function () {
            config.promises.content = getPromise('#observationenDiv');
            config.promises.content.then(function () {
                // add sort options buttons to obs table
                var $table = lwm_jQuery('#observationenDiv table').eq(0);
                // add initial order to be able to restore it
                $table.find('tr').each(function (i, tr) { lwm_jQuery(tr).data('order', i); });
                // sort by coords
                var $thCoord = $table.find('th').eq(1);
                var $thExpire = $table.find('th').eq(3);
                $thCoord.append('<i class="fas fa-sort" style="float:right;"></i>').css('cursor', 'hand');
                $thExpire.append('<i class="fas fa-sort" style="float:right;"></i>').css('cursor', 'hand');
                $thCoord.click(function () {
                    $table.find('tr:gt(0)').sort(function (a, b) {
                        var coordsA = lwm_jQuery(a).find('td:eq(1)').text().split('x');
                        var coordsAValue = parseInt(coordsA[0])*10000 + parseInt(coordsA[1]) * 100 + parseInt(coordsA[2]);
                        var coordsB = lwm_jQuery(b).find('td:eq(1)').text().split('x');
                        var coordsBValue = parseInt(coordsB[0])*10000 + parseInt(coordsB[1]) * 100 + parseInt(coordsB[2]);
                        return coordsAValue - coordsBValue;
                    }).each(function() {
                        var $elem = lwm_jQuery(this).detach();
                        lwm_jQuery($elem).appendTo($table);
                    });
                });
                $thExpire.click(function () {
                    $table.find('tr:gt(0)').sort(function (a, b) {
                        return lwm_jQuery(a).data('order') - lwm_jQuery(b).data('order');
                    }).each(function() {
                        var $elem = lwm_jQuery(this).detach();
                        lwm_jQuery($elem).appendTo($table);
                    });
                });

                //attach re-send obs button and TT info
                lwm_jQuery.each(lwm_jQuery('#observationenDiv table').first().find('tr:gt(0)'), function () {
                    var $td = lwm_jQuery(this).find('td').eq(0);
                    var coords = lwm_jQuery(this).find('td').eq(1).text().split('x');
                    var coordData = config.lwm.planetData[coords[0]+'x'+coords[1]+'x'+coords[2]];
                    $td.append(['<a href="#" style="font-size: 0.75em;float: right;" class="fa-stack"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search-plus fa-stack-1x"></i></a>',
                                '<div style="color: #3c3ff5;font-size: 0.75em;float: right;" class="fa-stack"><i class="far fa-circle fa-stack-2x"></i><span>'+(coordData ? coordData.Tarntechnologie : '?')+'</span></div>']);
                    $td.find('a').click(function () { operations.performObservation(coords); });
                });

                //replace obs links
                if (GM_config.get('obs_opentabs')) {
                    lwm_jQuery.each(lwm_jQuery('#observationenDiv a[onclick*=\'openObservationWindow\']'), function () {
                        $self = lwm_jQuery(this);
                        var id = $self.attr('onclick').match(/\d+/)[0];
                        $self.attr('onclick', '').attr('target', '_blank').attr('href', 'view/content/new_window/observationen_view.php?id='+id);
                    });
                    //	window.open('view/content/new_window/observationen_view.php?id=' + id, 'newwindow', 'scrollbars=yes, width=900px, height=550px');

                }

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        designShips: function () {
            config.promises.content = getPromise('#schiffskomponentenDiv');
            config.promises.content.then(function () {
                //lwm_jQuery('#create').click(function () { config.gameData.reloads.productionInfos = 'production'; });
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        buildingTree: function () {
            config.promises.content = getPromise('#constructionTreeTable,#researcheTreeTable,#shipTreeTable,#defenseTreeTable');
            config.promises.content.then(function () {
                //add a button that filters unlocked stuff in the tree
                var $div = lwm_jQuery('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
                var $filterButton = lwm_jQuery('<div class="buttonRowInbox" id="lwm_filterBuildingTree"><a class="formButton" href="javascript:void(0)">Filter Achieved</a></div>').appendTo($div.find('.tableFilters_content'));
                $filterButton.click(function () {
                    lwm_jQuery(this).find('.formButton').toggleClass('activeBox');
                    var hideIds = lwm_jQuery.map(lwm_jQuery('#Tables tr').find('td:eq(1) img[src*=\'green\']').parents('tr'), function (el, i) { return lwm_jQuery(el).attr('id') || lwm_jQuery(el).attr('class') || lwm_jQuery(el).find('td').first().attr('id'); });
                    if (lwm_jQuery(this).find('.formButton').is('.activeBox')) {
                        lwm_jQuery('#Tables').find('tr#'+hideIds.join(',tr#')).hide();
                        lwm_jQuery('#Tables').find('tr#'+hideIds.join(',tr#')).next().hide();
                        lwm_jQuery('#Tables').find('tr.'+hideIds.join(',tr.')).hide();
                        lwm_jQuery('#Tables').find('tr.'+hideIds.join(',tr.')).next().hide();
                        lwm_jQuery('#Tables').find('td#'+hideIds.join(',td#')).parents('tr').hide();
                        lwm_jQuery('#Tables').find('td#'+hideIds.join(',td#')).parents('tr').next().hide();
                        lwm_jQuery('#Tables').find('th').parents('tr').show();
                    } else {
                        lwm_jQuery('#Tables tr').show();
                    }
                });
                $div.prependTo(lwm_jQuery('#Tables'));
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        resources: function () {
            config.promises.content = getPromise('#rohstoffeDiv');
            config.promises.content.then(function () {
                // add time that's needed to reach capacity
                var resTotal = getResourcePerHour();
                var resTypes = ['roheisen','kristall','frubin','orizin','frurozin','gold'];
                var resValue = [unsafeWindow.Roheisen,unsafeWindow.Kristall,unsafeWindow.Frubin,unsafeWindow.Orizin,unsafeWindow.Frurozin,unsafeWindow.Gold];
                var incomingRes = helper.getIncomingResArray();

                lwm_jQuery('#rohstoffeDiv > .rohstoffeTableClass > tbody > tr > td > .rohstoffeTableClass').find('> tbody > tr:eq(4)').each(function (i, table) {
                    if (!resTotal[0][resTypes[i]]) return true;
                    var hoursTillFull = (resourceCapacityArray[i]-resValue[i]-incomingRes[i])/(resTotal[0][resTypes[i]]);
                    lwm_jQuery(this).after('<tr><td class="second" valign="top" align="right">Time till capacity reached:</td><td class="second" ><span class=\''+(hoursTillFull < 8 ? 'redBackground' : '')+'\' id=\'clock_lwm_'+resTypes[i]+'\'>'+moment.duration(hoursTillFull, "hours").format("HH:mm:ss", { trim: false, forceLength: true })+'</span></td></tr>');
                });

                if (config.gameData.planets.length === Object.values(config.lwm.resProd[config.gameData.playerID]).length) {
                    //add resources analysis

                    var resTotals = {
                        fe: lwm_jQuery.map(config.lwm.resProd[config.gameData.playerID], function (planet, i) { return planet.roheisen; }).reduce(function (total, num) { return total + num; }),
                        kris: lwm_jQuery.map(config.lwm.resProd[config.gameData.playerID], function (planet, i) { return planet.kristall; }).reduce(function (total, num) { return total + num; }),
                        frub: lwm_jQuery.map(config.lwm.resProd[config.gameData.playerID], function (planet, i) { return planet.frubin; }).reduce(function (total, num) { return total + num; }),
                        ori: lwm_jQuery.map(config.lwm.resProd[config.gameData.playerID], function (planet, i) { return planet.orizin; }).reduce(function (total, num) { return total + num; }),
                        fruro: lwm_jQuery.map(config.lwm.resProd[config.gameData.playerID], function (planet, i) { return planet.frurozin; }).reduce(function (total, num) { return total + num; }),
                        gold: lwm_jQuery.map(config.lwm.resProd[config.gameData.playerID], function (planet, i) { return planet.gold; }).reduce(function (total, num) { return total + num; })
                    };

                    var $table = lwm_jQuery('<table id="lwm_resourceTotal"><tbody>'+
                        '<tr><th colspan="7">Total Production For All Planets</th></tr>'+
                        '<tr>'+
                        '<th class="sameWith"></td>'+
                        '<th class="sameWith roheisenVariable">Roheisen</td>'+
                        '<th class="sameWith kristallVariable">Kristall</td>'+
                        '<th class="sameWith frubinVariable">Frubin</td>'+
                        '<th class="sameWith orizinVariable">Orizin</td>'+
                        '<th class="sameWith frurozinVariable">Frurozin</td>'+
                        '<th class="sameWith goldVariable">Gold</td>'+
                        '</tr>'+
                        '<tr>'+
                        '<td class="">per hour</td>'+
                        '<td class="roheisenVariable">'+site_jQuery.number(resTotals.fe, 0, ',', '.' )+'</td>'+
                        '<td class="kristallVariable">'+site_jQuery.number(resTotals.kris, 0, ',', '.' )+'</td>'+
                        '<td class="frubinVariable">'+site_jQuery.number(resTotals.frub, 0, ',', '.' )+'</td>'+
                        '<td class="orizinVariable">'+site_jQuery.number(resTotals.ori, 0, ',', '.' )+'</td>'+
                        '<td class="frurozinVariable">'+site_jQuery.number(resTotals.fruro, 0, ',', '.' )+'</td>'+
                        '<td class="goldVariable">'+site_jQuery.number(resTotals.gold, 0, ',', '.' )+'</td>'+
                        '</tr>'+
                        '<tr>'+
                        '<td class="">per day</td>'+
                        '<td class="roheisenVariable">'+site_jQuery.number(resTotals.fe*24, 0, ',', '.' )+'</td>'+
                        '<td class="kristallVariable">'+site_jQuery.number(resTotals.kris*24, 0, ',', '.' )+'</td>'+
                        '<td class="frubinVariable">'+site_jQuery.number(resTotals.frub*24, 0, ',', '.' )+'</td>'+
                        '<td class="orizinVariable">'+site_jQuery.number(resTotals.ori*24, 0, ',', '.' )+'</td>'+
                        '<td class="frurozinVariable">'+site_jQuery.number(resTotals.fruro*24, 0, ',', '.' )+'</td>'+
                        '<td class="goldVariable">'+site_jQuery.number(resTotals.gold*24, 0, ',', '.' )+'</td>'+
                        '</tr>'+
                        '</tbody></table>');

                    $table.prependTo('#rohstoffeDiv');
                }

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        },
        credit: function () {
            config.promises.content = getPromise('#kreditinstitutDiv');
            config.promises.content.then(function () {
                lwm_jQuery('[type=\'number\']').after('<i class="fas fa-2x fa-angle-double-left"></i>');
                lwm_jQuery('.fa-angle-double-left').each(function () {
                    lwm_jQuery(this).parent().css('display','flex');
                    lwm_jQuery(this).parent().css('justify-content','space-evenly');
                    lwm_jQuery(this).parent().css('align-items','center');
                    lwm_jQuery(this).click(function () {
                        $input = lwm_jQuery(this).parent().find('input');
                        $input.val(lwm_jQuery(this).parents('tr').find('[id*=\'max\']').text().replace(/\D/, ''));
                    });
                });

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                helper.throwError();
                config.loadStates.content = false;
            });
        }
    }

    var global = {
        uiChanges: function () {
                /* delete propassssss*/
                lwm_jQuery('#propassssss,#loader,.ui-loader').remove();

                //add mobile support
                lwm_jQuery('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0">');

                //attach loader for first page load
                lwm_jQuery('body').append('<div class="loader lwm-firstload"></div><div class="status lwm-firstload"></div>');

                //add mobile header collapse menu
                var $menuToggle = lwm_jQuery('<div id=\'lwm_menu_toggle\'>'+
                                        '<div class=\'lwm_menu-content\'>'+
                                        '<div class=\'lwm_menu-item\'>'+
                                            '<i class="fas fa-home"></i><i class="fas fa-warehouse"></i><i class="fas fa-database"></i><i class="fas fa-shield-alt"></i><i class="fas fa-fighter-jet"></i>'+
                                            '<i class="fas fa-plane-departure"></i><i class="fas fa-handshake"></i><i class="fas fa-envelope"></i><i class="fas icon-galaxy"></i><i class="fas fa-sign-out-alt"></i>'+
                                            '</div>'+
                                            '<div class=\'lwm_menu-item\'>'+
                                            '<div class="planet-changer"></div>'+
                                            '</div>'+
                                            '<div class=\'lwm_menu-item\'>'+
                                            '<i class="toggle fas fa-3x fa-plus-circle">'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>');
                $menuToggle.find('.fa-home').click(function () { unsafeWindow.changeContent('ubersicht', 'first', 'Übersicht'); });
                $menuToggle.find('.fa-warehouse').click(function () { unsafeWindow.changeContent('construction', 'first', 'Konstruktion'); });
                $menuToggle.find('.fa-database').click(function () { unsafeWindow.changeContent('research', 'first', 'Forschung'); });
                $menuToggle.find('.fa-shield-alt').click(function () { unsafeWindow.changeContent('verteidigung', 'first', 'Verteidigung'); });
                $menuToggle.find('.fa-fighter-jet').click(function () { unsafeWindow.changeContent('produktion', 'first', 'Produktion'); });
                $menuToggle.find('.fa-plane-departure').click(function () { unsafeWindow.changeContent('flottenkommando', 'second', 'Flotten-Kommando'); });
                $menuToggle.find('.fa-handshake').click(function () { unsafeWindow.changeContent('new_trade_offer', 'second', 'Handelsangebot'); });
                $menuToggle.find('.fa-envelope').click(function () { unsafeWindow.changeContent('inbox', 'first', 'Nachrichten', 'notifiscationMessageList'); });
                $menuToggle.find('.icon-galaxy').click(function () { unsafeWindow.changeContent('galaxy_view', 'first', 'Galaxieansicht'); });
                $menuToggle.find('.fa-sign-out-alt').click(function () { unsafeWindow.logoutRequest(); });
                $menuToggle.find('.toggle').click(function () {
                    lwm_jQuery('#Header').toggle();
                    lwm_jQuery(this).toggleClass('fa-plus-circle fa-minus-circle');
                });
                $menuToggle.prependTo(lwm_jQuery('#Main'));
                lwm_jQuery('.select_box_cordinaten').clone().appendTo($menuToggle.find('.planet-changer'));
                $menuToggle.find('.planet-changer').click(function (e) { e.stopPropagation(); } );
                $menuToggle.find('.planet-changer').change(function (e) {
                    site_jQuery('.profileInfo #allCordinaten').val(lwm_jQuery(this).find('select').val());
                    site_jQuery('.profileInfo #allCordinaten').change();
                });

                // make sure header is always visible on desktop
                // https://codepen.io/ravenous/pen/BgGKA
                function watchMenuOnWindowResize() {
                    if (window.matchMedia('(max-width: 850px)').matches) {
                        lwm_jQuery('#Header').hide();
                        $menuToggle.find('i.toggle').addClass('fa-plus-circle').removeClass('fa-minus-circle');

                        lwm_jQuery('.secound_line .navButton').appendTo('#link, #veticalLink');
                        lwm_jQuery('.secound_line').toggle(lwm_jQuery('.secound_line .navButton').length > 0);
                    } else {
                        lwm_jQuery('#Header').show();
                        $menuToggle.find('i.toggle').addClass('fa-minus-circle').removeClass('fa-plus-circle');

                        lwm_jQuery('#link .navButton, #veticalLink .navButton').appendTo('.secound_line');
                        lwm_jQuery('.secound_line').toggle(lwm_jQuery('.secound_line .navButton').length > 0);
                    }
                };
                window.addEventListener('resize', watchMenuOnWindowResize, false);

                //remove unnecessary br
                lwm_jQuery('.middleContent > br').remove();

                //move menu into same container
                var divs = lwm_jQuery('.secound_line').find('div');
                lwm_jQuery.each(divs, function () {
                    lwm_jQuery(this).appendTo('.first_line');
                });

                //add events to highlight current menus
                lwm_jQuery(document).on('click', '.menu_box', function (e) {
                    lwm_jQuery('.menu_box').removeClass('activeBox');
                    lwm_jQuery(e.target).closest('.menu_box').addClass('activeBox');
                });
                lwm_jQuery(document).on('click', '.secound_line .navButton', function (e) {
                    lwm_jQuery('.secound_line .navButton').removeClass('activeBox');
                    lwm_jQuery(e.target).closest('.navButton').addClass('activeBox');
                });
                lwm_jQuery(document).on('click', '#veticalLink .navButton', function (e) {
                    lwm_jQuery('#veticalLink .navButton').removeClass('activeBox');
                    lwm_jQuery(e.target).closest('.navButton').addClass('activeBox');
                });

                //rewrite clock functions so we can kill timers
                if (GM_config.get('addon_clock')) {
                    var oldInitializeClock = unsafeWindow.initializeClock;
                    unsafeWindow.initializeClock = function (idTr, idTd, idTime, total_secounds, secounds, construction_number) {
                        oldInitializeClock(idTr, idTd, idTime, total_secounds, secounds, construction_number);
                        clearInterval(unsafeWindow.timeinterval_construction);
                        helper.setDataForClocks();
                    }
                }

                // register events to navigate with arrow keys
                lwm_jQuery(document).keyup(function (e) {
                    var isGalaxy = lwm_jQuery('#galaxyViewDiv').length > 0;
                    var isInbox  = lwm_jQuery('#messagesListTableInbox').length > 0;
                    var isMessage= lwm_jQuery('.messages').length > 0 && lwm_jQuery('#newMessageInsert').length === 0;
                    if (!isGalaxy && !isInbox && !isMessage) return;
                    if ( event.which == 37 && isGalaxy)   unsafeWindow.goToPrevSystem();
                    if ( event.which == 39 && isGalaxy)   unsafeWindow.goToNextSystem();
                    if ( event.which == 37 && isInbox)    unsafeWindow.previousPage();
                    if ( event.which == 39 && isInbox)    unsafeWindow.nextPage();
                    if ( event.which == 37 && isMessage)  lwm_jQuery('.controller a:contains(\'<<\')').click();
                    if ( event.which == 39 && isMessage)  lwm_jQuery('.controller a:contains(\'>>\')').click();
                });

                //replace the profile image box
                lwm_jQuery('#profileImageBox').css('background-image', 'url(https://last-war.de/'+lwm_jQuery('#imageAvatarPattern').attr('xlink:href')+')');

                //add menu icons
                lwm_jQuery('#ubersicht').prepend('<i class="fas fa-home"></i>');
                lwm_jQuery('#construction').prepend('<i class="fas fa-warehouse"></i>');
                lwm_jQuery('#research').prepend('<i class="fas fa-database"></i>');
                lwm_jQuery('#verteidigung').prepend('<i class="fas fa-shield-alt"></i>');
                lwm_jQuery('#produktion').prepend('<i class="fas fa-fighter-jet"></i>');
                lwm_jQuery('#flottenbewegungen').after(lwm_jQuery('#flottenbewegungen').clone().prepend('<i class="far fa-calendar"></i>').attr('id','calendar'));
                lwm_jQuery('#calendar span').text('Kalender');
                lwm_jQuery('#flottenbewegungen').prepend('<i class="fas fa-plane-departure"></i>').attr('id','raumdock').attr('onclick', 'changeContent(\'flottenkommando\', \'second\', \'Flotten-Kommando\');');
                lwm_jQuery('#trade_offer').prepend('<i class="fas fa-handshake"></i>');
                lwm_jQuery('#rohstoffe').prepend('<i class="fas fa-gem"></i>');
                lwm_jQuery('#planeten').prepend('<i class="fas fa-globe"></i>');
                lwm_jQuery('#building_tree').prepend('<i class="fas fa-th-list"></i>');
                lwm_jQuery('#highscore_player').prepend('<i class="fas fa-trophy"></i>');
                lwm_jQuery('#create_new_allianze').prepend('<i class="fas fa-users"></i>');
                lwm_jQuery('#alliance').prepend('<i class="fas fa-users"></i>');
                lwm_jQuery('#inbox').prepend('<i class="fas fa-envelope"></i>');
                lwm_jQuery('#account').prepend('<i class="fas fa-user-circle"></i>');
                lwm_jQuery('#forum').prepend('<i class="fab fa-wpforms"></i>');
                lwm_jQuery('#chatMenu').prepend('<i class="fas fa-comments"></i>');
                lwm_jQuery('#logout').prepend('<i class="fas fa-sign-out-alt"></i>');

                //add managerButton
                var $managerButton = lwm_jQuery('<div class="menu_box"><i class="fas fa-cogs"></i><span style="margin-right:2px;">Manager</span></div>')
                $managerButton.click(function () { GM_config.open(); });
                lwm_jQuery('.first_line .menu_box:nth-last-child(2)').after($managerButton);

                //add manager unload on logout
                lwm_jQuery('#logout').click(function () { uninstall(); });

                //move galaxy view and resources into same container
                lwm_jQuery('.galaxyView').appendTo('.resourceBoxs');

                /* loader */
                lwm_jQuery('#all').before('<div class="loader"></div>');

                //tooltips
                global.tooltips.tweak();

                /* font awesome */
                lwm_jQuery('head').append('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.2/css/all.css" integrity="sha384-fnmOCqbTlWIlj8LyTjo7mOUStjsKC4pOpQbqyi7RrhN7udi9RwhKkMHpvLbHG9Sr" crossorigin="anonymous">');
                lwm_jQuery('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome-animation/0.2.1/font-awesome-animation.min.css">');
        },
        hotkeySetup: function () {
            hotkeys('ctrl+shift+c,ctrl+shift+r,ctrl+shift+f,ctrl+shift+p,ctrl+shift+o', function(event,handler) {
                switch(handler.key){
                    case "ctrl+shift+c":event.preventDefault();unsafeWindow.changeContent('construction', 'first', 'Konstruktion');break;
                    case "ctrl+shift+r":event.preventDefault();unsafeWindow.changeContent('research', 'first', 'Forschung');break;
                    case "ctrl+shift+f":event.preventDefault();unsafeWindow.changeContent('flottenkommando', 'second', 'Flotten-Kommando');break;
                    case "ctrl+shift+p":event.preventDefault();unsafeWindow.changeContent('produktion', 'first', 'Produktion');break;
                    case "ctrl+shift+o":event.preventDefault();unsafeWindow.changeContent('ubersicht', 'first', 'Übersicht');break;
                }
            });

            // add hotkeys for planets
            lwm_jQuery.each(config.gameData.planets, function (i, coords) {
                hotkeys('ctrl+shift+'+(i+1), function(event,handler) {
                    unsafeWindow.changeCords(coords.galaxy, coords.system, coords.planet);
                });
            });
        },
        tooltips: {
            tweak: function() {
                /* tooltip manipulation */
                /* need to work with timeouts here to make sure events fire after original ones */
                lwm_jQuery(document).on("mouseenter", ".popover,.constructionName" , function(e) {
                    setTimeout(function () {
                        lwm_jQuery('.big_img').appendTo('body').attr('class', 'big_img_alt');
                    }, 50);
                });

                lwm_jQuery(document).on("mousemove", ".popover,.constructionName" , function(e) {
                    setTimeout(function () {
                        lwm_jQuery('.big_img_alt').css({
                            top: e.pageY - 50,
                            left: e.pageX + 10
                        });
                    }, 50);
                });

                lwm_jQuery(document).on("mouseleave", ".popover,.constructionName" , function(e) {
                    lwm_jQuery('.big_img_alt').remove();
                });
                /* tooltip manipulation end */
            }
        }
    }

    var addOns = {
        config: {
            fleetRefreshInterval: null,
            tradeRefreshInterval: null,
            capacityRefreshInterval: null,
            clockInterval: null,
            fleetCompleteHandlerAdded: false
        },
        load: function (page) {
            //load addons after submenu
            config.promises.addons = getLoadStatePromise('submenu');
            config.promises.addons.then(function () {
                config.loadStates.fleetaddon = true;
                addOns.showFleetActivityGlobally(page);
                if (GM_config.get('addon_fleet')) {
                    if (!Object.keys(config.gameData.spionageInfos).length || !Object.keys(config.gameData.observationInfo).length) {
                        requests.get_obs_info()
                            .then(function () { return requests.get_spionage_info(); })
                            .then(function () { requests.get_flottenbewegungen_info(); });
                    } else {
                        requests.get_flottenbewegungen_info();
                    }
                }
                addOns.refreshTrades();
                if (GM_config.get('addon_clock')) addOns.addClockInterval();

                //wait for fleetaddon before resolving addons
                getLoadStatePromise('fleetaddon').then(function () {
                    config.loadStates.addons = false;
                }).catch(function (e) {
                    console.log(e);
                    helper.throwError();
                    config.loadStates.addons = false;
                });
            }).catch(function (e) {
                console.log(e);
                config.loadStates.addons = false;
                config.loadStates.fleetaddon = false;
            });
        },
        unload: function () {
            if (addOns.config.fleetRefreshInterval !== null) { clearInterval(addOns.config.fleetRefreshInterval); addOns.config.fleetRefreshInterval = null; }
            if (addOns.config.tradeRefreshInterval !== null) { clearInterval(addOns.config.tradeRefreshInterval); addOns.config.tradeRefreshInterval = null; }
            if (addOns.config.capacityRefreshInterval !== null) { clearInterval(addOns.config.capacityRefreshInterval); addOns.config.capacityRefreshInterval = null; }
            if (addOns.config.clockInterval !== null) { clearInterval(addOns.config.clockInterval); addOns.config.clockInterval = null; }
        },
        //refresh trades every minute to make it unnecessary to visit the trade page for trade to go through
        refreshTrades: function() {
            var requestTrades = function() {
                var uriData = 'galaxy_check='+config.gameData.planetCoords.galaxy+'&system_check='+config.gameData.planetCoords.system+'&planet_check='+config.gameData.planetCoords.planet;
                site_jQuery.ajax({
                    url: '/ajax_request/get_trade_offers.php?'+uriData,
                    data: { lwm_ignoreProcess: 1 },
                    success: function(data) {
                        if (data == '500') return;
                        unsafeWindow.Roheisen = parseInt(data.resource['Roheisen']);
                        unsafeWindow.Kristall = parseInt(data.resource['Kristall']);
                        unsafeWindow.Frubin = parseInt(data.resource['Frubin']);
                        unsafeWindow.Orizin = parseInt(data.resource['Orizin']);
                        unsafeWindow.Frurozin = parseInt(data.resource['Frurozin']);
                        unsafeWindow.Gold = parseInt(data.resource['Gold']);
                    },
                    error: function () { helper.throwError(); },
                    dataType: 'json'
                });
            }

            // always refresh trades once after login or planet change
            if (firstLoad) requestTrades();

            //refresh interval
            if (addOns.config.tradeRefreshInterval !== null) return; //allready installed
            addOns.config.tradeRefreshInterval = setInterval(function() {
                requestTrades();
            }, 60000);
        },
        //checks whether trades would surpass resource capacities and highlights a warning
        checkCapacities: function () {
            if (!GM_config.get('trade_highlights')) return;
            var tradeInfo = config.gameData.tradeInfo;
            var capacities = unsafeWindow.resourceCapacityArray;
            var resSpans = [lwm_jQuery('#roheisenAmount'),lwm_jQuery('#kristallAmount'),lwm_jQuery('#frubinAmount'),lwm_jQuery('#orizinAmount'),lwm_jQuery('#frurozinAmount'),lwm_jQuery('#goldAmount')];
            var currentRes = [unsafeWindow.Roheisen,unsafeWindow.Kristall,unsafeWindow.Frubin,unsafeWindow.Orizin,unsafeWindow.Frurozin,unsafeWindow.Gold];
            var incomingRes = helper.getIncomingResArray();

            $.each(currentRes, function (i, amount) {
                if (amount+incomingRes[i] > capacities[i]) resSpans[i].addClass('redBackground');
                else                                       resSpans[i].removeClass('redBackground');
            });

            //add invterval
            if (addOns.config.capacityRefreshInterval === null) {
                addOns.config.capacityRefreshInterval = setInterval(function () {
                    addOns.checkCapacities();
                }, 10000);
            }
        },
        addClockInterval: function() {
            if (addOns.config.clockInterval !== null) return;
            addOns.config.clockInterval = setInterval(function () {
                lwm_jQuery('[id*=\'clock\'],[id*=\'Clock\']').each(function () {
                    //skip elements that don't have data attribute
                    if (typeof lwm_jQuery(this).data('clock_seconds') === "undefined") return true;

                    var data = parseInt(lwm_jQuery(this).data('clock_seconds')) - 1;
                    lwm_jQuery(this).data('clock_seconds', data);
                    if (data < 0) {
                        lwm_jQuery(this).html('--:--:--');
                    } else {
                        var md = moment.duration(data, 'seconds');
                        lwm_jQuery(this)
                            .attr('title', moment().add(data, 'seconds').format("YYYY-MM-DD HH:mm:ss"))
                            .addClass('popover')
                            .html(md.format("HH:mm:ss", {
                                trim: false,
                                forceLength: true
                            }));
                    }
                });
            }, 1000);
        },
        showFleetActivityGlobally: function(page) {
            //no fleet config set, return
            if (
                (GM_config.get('addon_fleet') && page === 'flottenbewegungen')
                    ||
                (!GM_config.get('addon_fleet') && page !== 'flottenbewegungen')
            ) {
                config.loadStates.fleetaddon = false;
                return;
            }

            var addFleetDiv = function (page) {
                var $fleetRows = [];
                var $selectOptions = {
                    coords: [],
                    types: [],
                    status: []
                };
                var existingValues = {
                    coords: lwm_jQuery.map(lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_coords option'), function (option, i) { return lwm_jQuery(option).val(); }),
                    types: lwm_jQuery.map(lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_types option'), function (option, i) { return lwm_jQuery(option).val(); }),
                    status: lwm_jQuery.map(lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_status option'), function (option, i) { return lwm_jQuery(option).val(); })
                };

                //exclude flottenbewegungen here as the only page that should not show fleets even with setting set
                if (
                    (GM_config.get('addon_fleet') && page === 'flottenbewegungen')
                        ||
                    (!GM_config.get('addon_fleet') && page !== 'flottenbewegungen')
                ) {
                    config.loadStates.fleetaddon = false;
                    return;
                }

                //filter function
                var filter = (function () {
                    var lang = config.const.lang.fleet;

                    var process = function () {
                        var $tableBase = lwm_jQuery('#folottenbewegungenPageDiv table');
                        $tableBase.find('tr:gt(0)').data('show', false);
                        var $coords = lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_coords').val();
                        var $type = lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_types').val();
                        var $status = lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_status').val();

                        lwm_jQuery.each($tableBase.find('tr:gt(0)'), function () {
                            lwm_jQuery(this).data('show',
                                (lwm_jQuery(this).attr('data-coords') === $coords || $coords === '') &&
                                (lwm_jQuery(this).attr('data-type') === $type || $type === '') &&
                                (lwm_jQuery(this).attr('data-status') === $status || $status === ''));
                        });

                        lwm_jQuery.each($tableBase.find('tr:gt(0)'), function (i, el) {
                            if (lwm_jQuery(el).data('show')) lwm_jQuery(el).show();
                            else                             lwm_jQuery(el).hide();
                        });
                    }

                    var add = function (fleetData) {
                        if (typeof fleetData.homePlanet !== "undefined" &&
                            !lwm_jQuery.map($selectOptions.coords, function (option, i) { return lwm_jQuery(option).val(); }).includes(fleetData.homePlanet) &&
                            !existingValues.coords.includes(fleetData.homePlanet))
                        {
                            $selectOptions.coords.push(lwm_jQuery('<option value="'+fleetData.homePlanet+'">'+fleetData.homePlanet+'</option>'));
                        }
                        if (typeof fleetData.Type !== "undefined" &&
                            !lwm_jQuery.map($selectOptions.types, function (option, i) { return lwm_jQuery(option).val(); }).includes(fleetData.Type) &&
                            !existingValues.types.includes(fleetData.Type))
                        {
                            $selectOptions.types.push(lwm_jQuery('<option value="'+fleetData.Type+'">'+lang.types[fleetData.Type]+'</option>'));
                        }
                        if (typeof fleetData.Status !== "undefined" &&
                            !lwm_jQuery.map($selectOptions.status, function (option, i) { return lwm_jQuery(option).val(); }).includes(fleetData.Status) &&
                            !existingValues.status.includes(fleetData.Status))
                        {
                            $selectOptions.status.push(lwm_jQuery('<option value="'+fleetData.Status+'">'+lang.status[fleetData.Status]+'</option>'));
                        }
                    }

                    var attachSelects = function () {
                        if (lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_coords').length === 0) {
                            var $selectCoords = lwm_jQuery('<select id="lwm_fleetFilter_coords"><option value="">Pick Coords</option></select>');
                            $selectCoords.change(function () { process(); })
                            lwm_jQuery('#folottenbewegungenPageDiv table td').first().append($selectCoords);
                        }
                        if (lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_types').length === 0) {
                            var $selectTypes = lwm_jQuery('<select id="lwm_fleetFilter_types"><option value="">Pick Type</option></select>');
                            $selectTypes.change(function () { process(); })
                            lwm_jQuery('#folottenbewegungenPageDiv table td').first().append($selectTypes);
                        }
                        if (lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_status').length === 0) {
                            var $selectStatus = lwm_jQuery('<select id="lwm_fleetFilter_status"><option value="">Pick Status</option></select>');
                            $selectStatus.change(function () { process(); })
                            lwm_jQuery('#folottenbewegungenPageDiv table td').first().append($selectStatus);
                        }
                    }

                    return {
                        add: add,
                        attachSelects: attachSelects,
                        process: process
                    }
                })();

                if (lwm_jQuery('#folottenbewegungenPageDiv').length === 0) {
                    var $div = lwm_jQuery('<div class="pageContent" style="margin-bottom:20px;"><div id="folottenbewegungenPageDiv"><table><tbody><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Ankunft</td><td>Restflugzeit</td></tr></tbody></table></div></div>');
                    $div.hide();
                    $div.prependTo('#all');
                    filter.attachSelects();
                    $div.show();
                }

                lwm_jQuery('#folottenbewegungenPageDiv table tr:gt(0)').remove();

                var iconAtt         = '<i class="fas fa-fighter-jet"></i>';
                var iconBack        = '<i class="fas fa-long-arrow-alt-left"></i>';
                var iconSend        = '<i class="fas fa-long-arrow-alt-right"></i>';
                var iconDef         = '<i class="fas fa-shield-alt"></i>';
                var iconTrans       = '<i class="fas fa-exchange-alt"></i>';
                var iconPlanet      = '<i class="fas fa-globe"></i>';
                var iconDrone       = '<i class="fas fa-search"></i>';

                lwm_jQuery.each(config.gameData.fleetInfo.send_infos, function(i, fleetData) {
                    filter.add(fleetData);
                    var trStyle         = '';
                    var fleetInfoString = '';
                    var fleetTimeString = '';
                    var fleetClock      = '';
                    var oppCoords       = "<b>"+fleetData.Galaxy + "x" + fleetData.System + "x" + fleetData.Planet+"</b>";
                    var oppNick         = fleetData.Nickname_send;
                    var ownCoords       = "<b>"+fleetData.Galaxy_send + "x" + fleetData.System_send + "x" + fleetData.Planet_send+"</b>";
                    var speedString     = " <span class='lwm_fleet_duration' style='font-style:italic;'>Flugdauer: "+moment.duration(fleetData.total_secounds,'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+".</span>";
                    switch (parseInt(fleetData.Type)) {
                        case 1:
                            trStyle = 'background-color:red;';
                            fleetInfoString = iconAtt+"Eine Flotte vom Planet "+ oppCoords +" greift deinen Planeten " + ownCoords + " an.";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case 2:
                            fleetInfoString = iconTrans+"Fremde Flotte vom "+ oppCoords +" ("+oppNick+") transportiert Rohstoffe nach "+ ownCoords +".";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case 3:
                            if(fleetData.Status == 1) {
                                fleetInfoString = iconDef+"Eine Flotte vom Planet "+ oppCoords +" verteidigt deinen Planeten "+ ownCoords +".";
                                fleetTimeString = fleetData.ComeTime;
                                fleetClock =      'clock_' + fleetData.clock_id;
                            } else if(fleetData.Status == 3) {
                                fleetInfoString = iconDef+"Eine Flotte von Planet "+ oppCoords +" verteidigt deinen Planeten "+ ownCoords +".";
                                fleetTimeString = fleetData.DefendingTime;
                                if(fleetData.DefendingTime == null) fleetClock = "unbefristet";
                                else
                                {
                                    fleetClock = 'clock_' + fleetData.clock_id;
                                }
                            }
                            break;
                        case 5:
                            fleetInfoString = iconSend+"Fremde Flotte von "+ oppCoords +" wird überstellt nach "+ ownCoords +".";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                    }
                    $fleetRows.push('<tr data-type="'+(fleetData.Type || '')+'" data-status="'+(fleetData.Status || '')+'" data-coords="'+(fleetData.Galaxy_send + "x" + fleetData.System_send + "x" + fleetData.Planet_send)+'" style='+trStyle+'><td>'+fleetInfoString+speedString+'</td><td>'+fleetTimeString+'</td><td id=\''+fleetClock+'\'>'+moment.duration(moment(fleetTimeString).diff(moment(),'seconds'), 'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+'</td></tr>');
                });

                if (!GM_config.get('addon_fleet_exclude_drones')) {
                    lwm_jQuery.each(config.gameData.fleetInfo.all_informations, function(i, fleetData) {
                        //add missing info for drones
                        fleetData.Type = '4'; fleetData.Status = '1';
                        filter.add(fleetData);
                        $fleetRows.push("<tr data-type=\""+(fleetData.Type || '')+"\" data-status=\""+(fleetData.Status || '')+"\" data-coords=\""+fleetData.homePlanet+"\"><td>"+iconDrone+"Eigene " + fleetData.name + " von Planet <b>" + fleetData.homePlanet + "</b> ist unterwegs nach ( <b>" + fleetData.galaxy + "x" + fleetData.system + "</b> )</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(moment(fleetData.time).diff(moment(),'seconds'), 'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                    });

                    lwm_jQuery.each(config.gameData.fleetInfo.dron_observationens, function(i, fleetData) {
                        fleetData.Type = '4'; fleetData.Status = '1';
                        filter.add(fleetData);
                        $fleetRows.push("<tr data-type=\""+(fleetData.Type || '')+"\" data-status=\""+(fleetData.Status || '')+"\" data-coords=\""+fleetData.homePlanet+"\"><td>"+iconDrone+"Eigene " + fleetData.name + " von Planet <b>" + fleetData.homePlanet + "</b> ist unterwegs nach ( <b>" + fleetData.galaxy + "x" + fleetData.system + "x" + fleetData.planet + "</b> )</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(moment(fleetData.time).diff(moment(),'seconds'), 'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                    });

                    lwm_jQuery.each(config.gameData.fleetInfo.dron_planetenscanners, function(i, fleetData) {
                        fleetData.Type = '4'; fleetData.Status = '1';
                        filter.add(fleetData);
                        $fleetRows.push("<tr data-type=\""+(fleetData.Type || '')+"\" data-status=\""+(fleetData.Status || '')+"\" data-coords=\""+fleetData.homePlanet+"\"><td>"+iconDrone+"Eigene " + fleetData.name + " von Planet <b>" + fleetData.homePlanet + "</b> ist unterwegs nach ( <b>" + fleetData.galaxy + "x" + fleetData.system + "x" + fleetData.planet + "</b> )</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(moment(fleetData.time).diff(moment(),'seconds'), 'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                    });
                }

                lwm_jQuery.each(config.gameData.fleetInfo.buy_ships_array, function(i, fleetData) {
                    filter.add(fleetData);
                    $fleetRows.push("<tr data-type=\""+(fleetData.Type || '')+"\" data-status=\""+(fleetData.Status || '')+"\" data-coords=\""+fleetData.homePlanet+"\"><td>"+iconSend+"Flotte vom Handelsposten wird überstellt nach <b>" + fleetData.homePlanet + "</b>.</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(moment(fleetData.time).diff(moment(),'seconds'), 'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                });

                lwm_jQuery.each(config.gameData.fleetInfo.fleet_informations, function(i, fleetData) {
                    filter.add(fleetData);
                    var fleetInfoString = '';
                    var fleetTimeString = '';
                    var fleetClock      = '';
                    var oppCoords       = "<b>"+fleetData.Galaxy_send + "x" + fleetData.System_send + "x" + fleetData.Planet_send+"</b>";
                    var oppNick         = fleetData.Nickname_send
                    var ownCoords       = "<b>"+fleetData.homePlanet+"</b>";
                    var lkomSendLink    = '<i class="fas fa-wifi faa-flash animated" onclick="changeContent(\'flotten_view\', \'third\', \'Flotten-Kommando\', \'' + fleetData.id + '\')" style="cursor:hand;margin-right:5px;color:#66f398"></i>';
                    var lkomBackLink    = '<i class="fas fa-info-circle" onclick="changeContent(\'flotten_view\', \'third\', \'Flotten-Kommando\', \'' + fleetData.id + '\')" style="cursor:hand;margin-right:5px;color:#3c3ff5"></i>';
                    var speedString     = " <span class='lwm_fleet_duration' style='font-style:italic;'>Flugdauer: "+moment.duration(fleetData.total_secounds,'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+".</span>";
                    switch (fleetData.Type) {
                        case '1':
                            var existingObs = helper.getActiveObs([fleetData.Galaxy_send,fleetData.System_send,fleetData.Planet_send]);
                            var spydrones = lwm_jQuery.grep(config.gameData.spionageInfos.planetenscanner_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
                            var obsOnclick = GM_config.get('obs_opentabs') ? 'window.open(\'view/content/new_window/observationen_view.php?id='+existingObs[0].id+'\')' : 'openObservationWindow('+existingObs[0].id+')';
                            var obsLink = existingObs.length ? '<i onclick="'+obsOnclick+'" style="cursor:hand;" class="fas fa-search-plus fa2x"></i>' : (spydrones.length ? '<i style="cursor:hand;" class="fas fa-search fa2x"></i>' : '');

                            fleetInfoString = 'Eigene Flotte vom Planet '+ ownCoords;
                            if (fleetData.Status == 1) fleetInfoString = iconAtt+obsLink+lkomSendLink+fleetInfoString+" greift Planet ";
                            else                       fleetInfoString = iconBack+lkomBackLink+fleetInfoString+" kehrt von ";
                            fleetInfoString += oppCoords + ' ('+oppNick+')';
                            if (fleetData.Status == 1) fleetInfoString += " an.";
                            else                       fleetInfoString += " zurück.";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case '2':
                            fleetInfoString = 'Eigene Flotte vom Planet '+ ownCoords;
                            if (fleetData.Status == 1) fleetInfoString = iconTrans+lkomSendLink+fleetInfoString+" transportiert Rohstoffe nach ";
                            else                       fleetInfoString = iconBack+lkomBackLink+fleetInfoString+" kehrt zurück von ";
                            fleetInfoString += oppCoords + ' ('+oppNick+').';
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case '3':
                            fleetInfoString = 'Eigene Flotte vom Planet '+ ownCoords;
                            if (fleetData.Status == 1)     fleetInfoString = iconDef+lkomBackLink+fleetInfoString+" verteidigt Planet ";
                            else if(fleetData.Status == 2) fleetInfoString = iconBack+lkomSendLink+fleetInfoString+" kehrt zurück vom ";
                            else if(fleetData.Status == 3) fleetInfoString = iconDef+lkomBackLink+fleetInfoString+" verteidigt den Planeten ";
                            fleetInfoString += oppCoords + '( '+oppNick+' )';
                            if(fleetData.Status != 3) {
                                fleetTimeString = fleetData.ComeTime;
                                fleetClock =      'clock_' + fleetData.clock_id;
                            } else {
                                fleetTimeString = fleetData.DefendingTime;
                                if(fleetData.DefendingTime == null) fleetClock = 'unbefristet';
                                else
                                {
                                    fleetClock = 'clock_' + fleetData.clock_id;
                                }
                            }
                            break;
                        case '4':
                            fleetInfoString = iconPlanet+lkomSendLink+'Eigene Flotte von Planet '+ ownCoords +' kolonisiert Planeten '+ oppCoords +'.';
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case '5':
                            fleetInfoString = iconSend+lkomSendLink+'Eigene Flotte von Planet '+ ownCoords +' wird überstellt nach '+ oppCoords +' ( '+oppNick+' ).';
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                    }
                    $fleetRows.push('<tr data-type="'+(fleetData.Type || '')+'" data-status="'+(fleetData.Status || '')+'" data-coords="'+(fleetData.homePlanet)+'"><td>'+fleetInfoString+speedString+'</td><td>'+fleetTimeString+'</td><td id=\''+fleetClock+'\'>'+moment.duration(moment(fleetTimeString).diff(moment(),'seconds'), 'seconds').format("HH:mm:ss", { trim: false, forceLength: true })+'</td></tr>');
                });

                //populate fleets
                lwm_jQuery('#folottenbewegungenPageDiv table tbody').append($fleetRows);
                if ($fleetRows.length === 0) lwm_jQuery('#folottenbewegungenPageDiv').hide();
                else                         lwm_jQuery('#folottenbewegungenPageDiv').show();

                //add spionage action
                lwm_jQuery('#folottenbewegungenPageDiv table tbody tr').find('.fa-search').click(function () { operations.performSpionage(lwm_jQuery(this).parents('tr').attr('data-coords').split("x")); });
                //populate selects
                lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_coords').append($selectOptions.coords);
                lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_types').append($selectOptions.types);
                lwm_jQuery('#folottenbewegungenPageDiv #lwm_fleetFilter_status').append($selectOptions.status);

                //sort table by time
                lwm_jQuery('#folottenbewegungenPageDiv table tbody tr:gt(0)').sort(function (a, b) {
                    var tsA = moment.duration(lwm_jQuery(a).find('td').last().text());
                    var tsB = moment.duration(lwm_jQuery(b).find('td').last().text());
                    return tsA.asSeconds() - tsB.asSeconds();
                }).each(function() {
                    var $elem = lwm_jQuery(this).detach();
                    lwm_jQuery($elem).appendTo(lwm_jQuery('#folottenbewegungenPageDiv table tbody'));
                });

                filter.process();

                if (GM_config.get('addon_clock')) {
                    clearInterval(unsafeWindow.timeinterval_flottenbewegungen);
                    helper.setDataForClocks();
                }

                config.loadStates.fleetaddon = false;
            }


            if (!addOns.config.fleetCompleteHandlerAdded) {
                site_jQuery(document).ajaxComplete(function( event, xhr, settings ) {
                    var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                    if (xhr.responseJSON == '500') return;

                    if (page === 'get_flottenbewegungen_info') {
                        addFleetDiv(unsafeWindow.active_page);
                    }
                });
                addOns.config.fleetCompleteHandlerAdded = true;
            }
            //add fleets to page
            addFleetDiv(page);

            //add refresh interval
            if (addOns.config.fleetRefreshInterval !== null) return;
            addOns.config.fleetRefreshInterval = setInterval(function() {
                config.loadStates.fleetaddon = true;
                requests.get_flottenbewegungen_info();
            }, 30000);
        },
        calendar: {
            storeOverview: function (data) {
                var dataBuildingBefore = JSON.stringify(addOns.calendar.getData('building',config.gameData.playerID));
                addOns.calendar.deleteCat('building',config.gameData.playerID);
                lwm_jQuery.each(data.all_planets_for_use, function (i, planet) {
                    var coords = planet.galaxy_pom + 'x' + planet.system_pom + 'x' + planet.planet_pom;
                    if (planet.BuildingName !== '') addOns.calendar.store({
                        playerID: config.gameData.playerID,
                        playerName: config.gameData.playerName,
                        coords: coords,
                        type: 'building',
                        name: planet.BuildingName,
                        text: planet.BuildingName,
                        duration: 0,
                        ts: moment(planet.FinishTimeForBuilding).valueOf()
                    });
                    if (planet.BuildingName2 !== '') addOns.calendar.store({
                        playerID: config.gameData.playerID,
                        playerName: config.gameData.playerName,
                        coords: coords,
                        type: 'building',
                        name: planet.BuildingName2,
                        text: planet.BuildingName2,
                        duration: 0,
                        ts: moment(planet.FinishTimeForBuilding2).valueOf()
                    });
                });
                var dataBuildingAfter = JSON.stringify(addOns.calendar.getData('building',config.gameData.playerID));

                var dataResearchBefore = JSON.stringify(addOns.calendar.getData('research',config.gameData.playerID));
                addOns.calendar.deleteCat('research',config.gameData.playerID);
                if (data.research_info.ResearchName !== '') addOns.calendar.store({
                    playerID: config.gameData.playerID,
                    playerName: config.gameData.playerName,
                    coords: data.research_info.researchGalaxy + 'x' + data.research_info.researchSystem + 'x' + data.research_info.researchPlanet,
                    type: 'research',
                    name: data.research_info.ResearchName,
                    text: data.research_info.ResearchName,
                    duration: 0,
                    ts: moment(data.research_info.FinishTime).valueOf()
                });
                var dataResearchAfter = JSON.stringify(addOns.calendar.getData('research',config.gameData.playerID));

                GM.setValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
                if (GM_config.get('confirm_drive_sync') && (!addOns.calendar.truncateData() || dataResearchBefore !== dataResearchAfter || dataBuildingBefore !== dataBuildingAfter)) driveManager.save();
            },
            storeFleets: function (data) {
                var lang = config.const.lang.fleet;
                var dataTypes = ['all_informations','buy_ships_array','dron_observationens','dron_planetenscanners','fleet_informations','send_infos'];
                var dataFleetBefore = JSON.stringify(addOns.calendar.getData('fleet',config.gameData.playerID, config.gameData.planetCoords.string));
                addOns.calendar.deleteCat('fleet',config.gameData.playerID, config.gameData.planetCoords.string);
                lwm_jQuery.each(dataTypes, function (i, type) {
                    lwm_jQuery.each(data[type], function (f, fleetData) {
                        var time = fleetData.ComeTime || fleetData.DefendingTime || fleetData.time;
                        if (!time) return true;
                        addOns.calendar.store({
                            playerID: config.gameData.playerID,
                            playerName: config.gameData.playerName,
                            coords: config.gameData.planetCoords.string,
                            type: 'fleet',
                            name: fleetData.id || 0,
                            duration: 0,
                            text: 'Flotte Typ '+(lang.types[fleetData.Type] || fleetData.name)+' mit Status '+(lang.status[fleetData.Status || 1])+' und Coords ' + (fleetData.Galaxy_send || fleetData.galaxy) + "x" + (fleetData.System_send || fleetData.system) + "x" + (fleetData.Planet_send || fleetData.planet),
                            ts: moment(time).valueOf()
                        });
                    });
                });
                var dataFleetAfter = JSON.stringify(addOns.calendar.getData('fleet',config.gameData.playerID, config.gameData.planetCoords.string));

                GM.setValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
                if (GM_config.get('confirm_drive_sync') && dataFleetBefore !== dataFleetAfter) driveManager.save();
            },
            storeProd: function (data) {
                var dataDefenseBefore = JSON.stringify(addOns.calendar.getData('defense',config.gameData.playerID, config.gameData.planetCoords.string));
                addOns.calendar.deleteCat('defense',config.gameData.playerID, config.gameData.planetCoords.string);
                var lastEntry = {};
                var sameEntryCount = 1;
                lwm_jQuery.each(data.planet_defense, function (i, prodData) {
                    var entry = {
                        playerID: config.gameData.playerID,
                        playerName: config.gameData.playerName,
                        coords: config.gameData.planetCoords.string,
                        type: 'defense',
                        name: prodData.name,
                        text: prodData.name,
                        duration: prodData.sati * 60 * 60 + prodData.minuti * 60 + prodData.sekunde,
                        ts: moment(prodData.finishTime).valueOf()
                    };
                    //for same tasks (like upgrades) < 1 hour, just edit the last entry so that calendar doesn't get too big
                    if (lastEntry.type === entry.type && lastEntry.name === entry.name && lastEntry.duration < (60*60) && lastEntry.duration === entry.duration) {
                        sameEntryCount++;
                        config.lwm.calendar[config.lwm.calendar.length-1].text = sameEntryCount+'x '+prodData.name+' (every '+(moment.duration(lastEntry.duration, "seconds").format("HH:mm:ss", { trim: false, forceLength: true }))+')';
                        config.lwm.calendar[config.lwm.calendar.length-1].ts = moment(prodData.finishTime).valueOf();
                    } else {
                        sameEntryCount = 1;
                        addOns.calendar.store(entry);
                    }
                    lastEntry = entry;
                });
                var dataDefenseAfter = JSON.stringify(addOns.calendar.getData('defense',config.gameData.playerID, config.gameData.planetCoords.string));

                var dataShipsBefore = JSON.stringify(addOns.calendar.getData('ships',config.gameData.playerID, config.gameData.planetCoords.string));
                addOns.calendar.deleteCat('ships',config.gameData.playerID, config.gameData.planetCoords.string);
                lastEntry = {};
                sameEntryCount = 1;
                lwm_jQuery.each(data.ships, function (i, prodData) {
                    var entry = {
                        playerID: config.gameData.playerID,
                        playerName: config.gameData.playerName,
                        coords: config.gameData.planetCoords.string,
                        type: 'ships',
                        name: prodData.name,
                        text: prodData.name,
                        duration: prodData.sati * 60 * 60 + prodData.minuti * 60 + prodData.sekunde,
                        ts: moment(prodData.finishTime).valueOf()
                    };
                    //for same tasks (like upgrades) < 1 hour, just edit the last entry so that calendar doesn't get too big
                    if (lastEntry.type === entry.type && lastEntry.name === entry.name && lastEntry.duration < (60*60) && lastEntry.duration === entry.duration) {
                        sameEntryCount++;
                        config.lwm.calendar[config.lwm.calendar.length-1].text = sameEntryCount+'x '+prodData.name+' (every '+(moment.duration(lastEntry.duration, "seconds").format("HH:mm:ss", { trim: false, forceLength: true }))+')';
                        config.lwm.calendar[config.lwm.calendar.length-1].ts = moment(prodData.finishTime).valueOf();
                    } else {
                        sameEntryCount = 1;
                        addOns.calendar.store(entry);
                    }
                    lastEntry = entry;
                });
                var dataShipsAfter = JSON.stringify(addOns.calendar.getData('ships',config.gameData.playerID, config.gameData.planetCoords.string));

                GM.setValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
                if (GM_config.get('confirm_drive_sync') && (dataDefenseBefore !== dataDefenseAfter || dataShipsBefore !== dataShipsAfter)) driveManager.save();
            },
            storeTrades: function (data) {
                var dataTradesBefore = JSON.stringify(addOns.calendar.getData('trades',config.gameData.playerID, config.gameData.planetCoords.string));
                addOns.calendar.deleteCat('trades',config.gameData.playerID, config.gameData.planetCoords.string);
                lwm_jQuery.each(data.trade_offers, function (i, tradeData) {
                    if (tradeData.galaxy == config.gameData.planetCoords.galaxy && tradeData.system == config.gameData.planetCoords.system && tradeData.planet == config.gameData.planetCoords.planet) return true;
                    addOns.calendar.store({
                        playerID: config.gameData.playerID,
                        playerName: config.gameData.playerName,
                        coords: config.gameData.planetCoords.string,
                        type: 'trades',
                        text: 'Trade ' + (tradeData.my ? 'with ' : 'from ') + tradeData.galaxy + 'x' + tradeData.system + 'x' + tradeData.planet + ' ('+(tradeData.accept == "1" ? 'Running' : 'Pending')+')' + tradeData.comment,
                        ts: moment(tradeData.accept == '0' ? tradeData.time.replace(/\//g, '-') : tradeData.time_acc.replace(/\//g, '-')).valueOf()
                    });
                });
                var dataTradesAfter =  JSON.stringify(addOns.calendar.getData('trades',config.gameData.playerID, config.gameData.planetCoords.string));

                GM.setValue('lwm_calendar', JSON.stringify(config.lwm.calendar));
                if (GM_config.get('confirm_drive_sync') && dataTradesBefore !== dataTradesAfter) driveManager.save();
            },
            store: function (data) {
                var check = config.lwm.calendar.filter(function (entry) {
                    return JSON.stringify(entry) === JSON.stringify(data);
                });
                if (check.length === 0) {
                    //not found, add!
                    config.lwm.calendar.push(data);
                }
            },
            truncateData: function () {
                var dataBefore = JSON.stringify(addOns.calendar.getData());
                config.lwm.calendar = config.lwm.calendar.filter(function (entry) {
                    return entry.ts > moment().valueOf();
                });
                var dataAfter = JSON.stringify(addOns.calendar.getData());

                return dataBefore === dataAfter;
            },
            deleteCat: function (cat, playerID, coords) {
                var coords = coords || null;
                config.lwm.calendar = config.lwm.calendar.filter(function (entry) {
                    return !(entry.type === cat && entry.playerID === playerID && (entry.coords === coords || coords === null));
                });
            },
            getData: function (cat, playerID, coords) {
                var coords = coords || null;
                var cat = cat || null;
                var playerID = playerID || null;
                return config.lwm.calendar.filter(function (entry) {
                    return ((entry.type === cat || cat === null) && (entry.playerID === playerID || playerID === null) && (entry.coords === coords || coords === null));
                }).sort(function (a,b) { return a.ts - b.ts; });
            }
        },
        planetData: {
            storeDataFromSpio: function () {
                GM.getValue('lwm_planetData_temp', '{}').then(function (planetData) {
                    planetData = JSON.parse(planetData);

                    if (lwm_jQuery('#buildingsLevel').length === 0) return; //spy not sufficient
                    var levelTT = lwm_jQuery('#researchLevel').text().match(/Tarntechnologie (\d+)/);
                    if (levelTT === null) levelTT = 0;
                    else                  levelTT = levelTT[1];

                    //save
                    var coords = document.querySelector('#tableOS th').textContent.match(/\d*x\d*x\d*/)[0];
                    if (typeof planetData[coords] === "undefined") planetData[coords] = {};
                    planetData[coords].Tarntechnologie = parseInt(levelTT);

                    //write into temp save because we don't have complete save / load functionality on spy / obs pages
                    //the main page will check on the temp save and pick up new values
                    GM.setValue('lwm_planetData_temp', JSON.stringify(planetData));
                });
            }
        }
    }

    var requests = {
        get_flottenbewegungen_info: function () {
            return site_jQuery.getJSON('/ajax_request/get_flottenbewegungen_info.php?galaxy='+config.gameData.planetCoords.galaxy+'&system='+config.gameData.planetCoords.system+'&planet='+config.gameData.planetCoords.planet);
        },
        get_spionage_info: function () {
            return site_jQuery.getJSON('/ajax_request/get_spionage_info.php?galaxy_check='+config.gameData.planetCoords.galaxy+'&system_check='+config.gameData.planetCoords.system+'&planet_check='+config.gameData.planetCoords.planet, { lwm_ignoreProcess: 1 });
        },
        get_obs_info: function () {
            return site_jQuery.getJSON('/ajax_request/get_info_for_observationen_page.php', { lwm_ignoreProcess: 1 });
        }
    };

    var operations = {
        performSpionage: function (coords) {
            var data = config.gameData.spionageInfos;
            if (data.planetenscanner_drons.length === 0) {
                alert('Unable to find drones to use');
                return;
            }

            //grab the first eligable drone with IOB and roll with it
            var drone = lwm_jQuery.grep(data.planetenscanner_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
            if (drone.length === 0) {
                alert('Unable to find drones to use');
                return;
            }

            var droneID = drone[0].id;

            var obj = {
                "galaxy_check": unsafeWindow.my_galaxy,
                "system_check": unsafeWindow.my_system,
                "planet_check": unsafeWindow.my_planet,
                "type": "2",
                "dron_id": droneID,
                "dron_quantity": 1,
                "galaxy_spionage": coords[0],
                "system_from_spionage": coords[1],
                "planet_from_spionage": coords[2],
                "planet_to_spionage": -1
            };

            //we're using a simplified version of sendSpionageAction in spionage.js
            site_jQuery.ajax({
                type: "POST",
                dataType: "json",
                url: "/ajax_request/send_spionage_action.php",
                data: obj,
                error: function(jqXHR, textStatus, errorThrown) {
                    alert(textStatus + ": " + errorThrown);
                },
                success: function(data){
                    if(data == "-1" || data == "500" || data == "-2" || data == "-4" || data == "-5" || data == "-6" ||
                        data == "-10" || data == "-11" || data == "-12" ||
                        data == "-20" || data == "-21" || data == "-22" || data == "-23" || data == "24" || data == "-30")
                    {
                        alert("some error occured :/");
                    }
                    else if(!data)
                    {
                        unsafeWindow.logoutRequest();
                    }
                    else{
                        if(data.error)
                        {
                            alert(data.error);
                        }
                        else {
                            if (data.dron_id) {
                                var message = '';
                                if(data.real_number == 1)
                                {
                                    message = "Frurozin benötigt: " + data.Frurozin_d + ", Ankunftszeit: " + data.string + ". Möchtest du abschicken?";
                                }
                                else if(data.real_number > 1)
                                {
                                    message = "Frurozin benötigt: " + data.Frurozin_d + ". Möchtest du abschicken?";
                                }

                                var r = confirm(message);
                                if (r == true)
                                {
                                    lwm_jQuery.post('/ajax_request/put_planetenscanner_drons.php', {
                                        Units: data.Units,
                                        EngineType_Drone: data.EngineType_Drone,
                                        Speed_Drone: data.Speed_Drone,
                                        Name_Dron: data.Name_Dron,
                                        galaxy1:data.spionage_galaxy,
                                        system1: data.spionage_system_from,
                                        planet1: data.spionage_planet_from,
                                        planet2: data.spionage_planet_to,
                                        real_number: data.real_number,
                                        id_drones: data.dron_id,
                                        Frurozin_d: data.Frurozin_d,
                                        status_planete: data.status_planete,
                                        galaxy_check: unsafeWindow.my_galaxy,
                                        system_check: unsafeWindow.my_system,
                                        planet_check: unsafeWindow.my_planet
                                    },function (data) {
                                        if (data == "1") {
                                            //refresh fleets and spy infos
                                            requests.get_flottenbewegungen_info();
                                            requests.get_spionage_info();
                                        }
                                        else {
                                            alert("some error occured :/");
                                        }
                                    })

                                }
                            } else {
                                alert("some error occured :/");
                            }
                        }
                    }
                }
            });
        },
        performObservation: function (coords) {
            var data = config.gameData.spionageInfos;
            if (data.observations_drons.length === 0) {
                alert('Unable to find drones to use');
                return;
            }

            //grab the first eligable drone with IOB and roll with it
            var drone = lwm_jQuery.grep(data.observations_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
            if (drone.length === 0) {
                alert('Unable to find drones to use');
                return;
            }

            var droneID = drone[0].id;

            var obj = {
                "galaxy_check": unsafeWindow.my_galaxy,
                "system_check": unsafeWindow.my_system,
                "planet_check": unsafeWindow.my_planet,
                "type": "1",
                "dron_id": droneID,
                "dron_quantity": 1,
                "galaxy_spionage": coords[0],
                "system_from_spionage": coords[1],
                "planet_from_spionage": coords[2],
                "planet_to_spionage": -1
            };

            //we're using a simplified version of sendSpionageAction in spionage.js
            site_jQuery.ajax({
                type: "POST",
                dataType: "json",
                url: "/ajax_request/send_spionage_action.php",
                data: obj,
                error: function(jqXHR, textStatus, errorThrown) {
                    alert(textStatus + ": " + errorThrown);
                },
                success: function(data){
                    if(data == "-1" || data == "500" || data == "-2" || data == "-4" || data == "-5" || data == "-6" ||
                        data == "-10" || data == "-11" || data == "-12" ||
                        data == "-20" || data == "-21" || data == "-22" || data == "-23" || data == "24" || data == "-30")
                    {
                        alert("some error occured :/");
                    }
                    else if(!data)
                    {
                        unsafeWindow.logoutRequest();
                    }
                    else{
                        if(data.error)
                        {
                            alert(data.error);
                        }
                        else {
                            if (data.dron_id) {
                                var message = '';
                                if(data.real_number == 1)
                                {
                                    message = "Frurozin benötigt: " + data.Frurozin_d + ", Ankunftszeit: " + data.string + ". Möchtest du abschicken?";
                                }
                                else if(data.real_number > 1)
                                {
                                    message = "Frurozin benötigt: " + data.Frurozin_d + ". Möchtest du abschicken?";
                                }

                                var r = confirm(message);
                                if (r == true)
                                {
                                    lwm_jQuery.post('/ajax_request/put_observationen_drons.php', {
                                        Units: data.Units,
                                        EngineType_Drone: data.EngineType_Drone,
                                        Speed_Drone: data.Speed_Drone,
                                        Name_Dron: data.Name_Dron,
                                        galaxy1:data.spionage_galaxy,
                                        system1: data.spionage_system_from,
                                        planet1: data.spionage_planet_from,
                                        planet2: data.spionage_planet_to,
                                        real_number: data.real_number,
                                        id_drones: data.dron_id,
                                        Frurozin_d: data.Frurozin_d,
                                        galaxy_check: unsafeWindow.my_galaxy,
                                        system_check: unsafeWindow.my_system,
                                        planet_check: unsafeWindow.my_planet
                                    },function (data) {
                                        if (data == "1") {
                                            //refresh fleets and spy infos
                                            requests.get_flottenbewegungen_info();
                                            requests.get_spionage_info();
                                        }
                                        else {
                                            alert("some error occured :/");
                                        }
                                    })

                                }
                            } else {
                                alert("some error occured :/");
                            }
                        }
                    }
                }
            });
        }
    };

    var helper = {
        addConfirm: function($el, m) {
            var m = m || 'Really?';
            if ($el.data('has-confirm')) return;
            $el.data('has-confirm', true);
            var onclick = $el.attr('onclick');
            $el.attr('onclick', 'r = confirm("'+m+'?"); if (r == true) '+onclick);
        },
        addResMemory: function ($list, type) {
            lwm_jQuery.each($list, function (i, el) {
                lwm_jQuery(el).click(function () {
                    config.currentSavedProject.fe = numeral(lwm_jQuery(this).parents('tr').find('.roheisenVariable').text().replace(/\D/, '')).value();
                    config.currentSavedProject.kris = numeral(lwm_jQuery(this).parents('tr').find('.kristallVariable').text().replace(/\D/, '')).value();
                    config.currentSavedProject.frub = numeral(lwm_jQuery(this).parents('tr').find('.frubinVariable').text().replace(/\D/, '')).value();
                    config.currentSavedProject.ori = numeral(lwm_jQuery(this).parents('tr').find('.orizinVariable').text().replace(/\D/, '')).value();
                    config.currentSavedProject.fruro = numeral(lwm_jQuery(this).parents('tr').find('.frurozinVariable').text().replace(/\D/, '')).value();
                    config.currentSavedProject.gold = numeral(lwm_jQuery(this).parents('tr').find('.goldVariable').text().replace(/\D/, '')).value();
                    config.currentSavedProject.ts = moment().unix();
                    config.currentSavedProject.name = lwm_jQuery(this).parents('tr').find('.constructionName').text();
                    config.currentSavedProject.type = type;
                });
            });
        },
        setDataForClocks: function () {
            if (!GM_config.get('addon_clock')) return true;
            lwm_jQuery('[id*=\'clock\'],[id*=\'Clock\']').each(function () {
                if (typeof lwm_jQuery(this).data('clock_seconds') !== "undefined") return true;

                var time = lwm_jQuery(this).text().split(':');
                var seconds = parseInt(time[0])*60*60 + parseInt(time[1])*60 + parseInt(time[2]);

                lwm_jQuery(this).data('clock_seconds', seconds - 1);
            });
        },
        getFirstClassNameFromElement: function ($el) {
            var classList = $el.attr('class');
            if (typeof classList === "undefined") return false;
            return classList.split(' ')[0];
        },
        replaceElementsHtmlWithIcon: function($list, iconClass, amount) {
            var amount = parseInt(amount) || 1;
            lwm_jQuery.each($list, function (i, el) {
                var html = '';
                for (var j = 0; j < amount; j++) html += '<i class="'+iconClass+'"></i>';
                lwm_jQuery(el).html(html);
            });
        },
        addIconToHtmlElements: function($list, iconClass, amount) {
            var amount = parseInt(amount) || 1;
            lwm_jQuery.each($list, function (i, el) {
                var html = '';
                for (var j = 0; j < amount; j++) html += '<i class="'+iconClass+'"></i>';
                lwm_jQuery(el).html(html+'&nbsp;'+lwm_jQuery(el).html());
            });
        },
        checkCoords: function (coords) {
            if (!Array.isArray(coords)) coords = coords.split("x");
            return Number.isInteger(parseInt(coords[0])) && Number.isInteger(parseInt(coords[1])) && Number.isInteger(parseInt(coords[2]));
        },
        getIncomingResArray: function () {
            if (config.gameData.tradeInfo.trade_offers.length === 0) return [0,0,0,0,0,0];

            return [
                lwm_jQuery.map(config.gameData.tradeInfo.trade_offers, function (trade, i) { return parseInt(trade.accept) * ((parseInt(trade.galaxy) === config.gameData.planetCoords.galaxy && parseInt(trade.system) === config.gameData.planetCoords.system && parseInt(trade.planet) === config.gameData.planetCoords.planet) ? parseInt(trade.resource[12]) : parseInt(trade.resource[6])); }).reduce(function (total, num) { return total + num; }),
                lwm_jQuery.map(config.gameData.tradeInfo.trade_offers, function (trade, i) { return parseInt(trade.accept) * ((parseInt(trade.galaxy) === config.gameData.planetCoords.galaxy && parseInt(trade.system) === config.gameData.planetCoords.system && parseInt(trade.planet) === config.gameData.planetCoords.planet) ? parseInt(trade.resource[13]) : parseInt(trade.resource[7])); }).reduce(function (total, num) { return total + num; }),
                lwm_jQuery.map(config.gameData.tradeInfo.trade_offers, function (trade, i) { return parseInt(trade.accept) * ((parseInt(trade.galaxy) === config.gameData.planetCoords.galaxy && parseInt(trade.system) === config.gameData.planetCoords.system && parseInt(trade.planet) === config.gameData.planetCoords.planet) ? parseInt(trade.resource[14]) : parseInt(trade.resource[8])); }).reduce(function (total, num) { return total + num; }),
                lwm_jQuery.map(config.gameData.tradeInfo.trade_offers, function (trade, i) { return parseInt(trade.accept) * ((parseInt(trade.galaxy) === config.gameData.planetCoords.galaxy && parseInt(trade.system) === config.gameData.planetCoords.system && parseInt(trade.planet) === config.gameData.planetCoords.planet) ? parseInt(trade.resource[15]) : parseInt(trade.resource[9])); }).reduce(function (total, num) { return total + num; }),
                lwm_jQuery.map(config.gameData.tradeInfo.trade_offers, function (trade, i) { return parseInt(trade.accept) * ((parseInt(trade.galaxy) === config.gameData.planetCoords.galaxy && parseInt(trade.system) === config.gameData.planetCoords.system && parseInt(trade.planet) === config.gameData.planetCoords.planet) ? parseInt(trade.resource[16]) : parseInt(trade.resource[10])); }).reduce(function (total, num) { return total + num; }),
                lwm_jQuery.map(config.gameData.tradeInfo.trade_offers, function (trade, i) { return parseInt(trade.accept) * ((parseInt(trade.galaxy) === config.gameData.planetCoords.galaxy && parseInt(trade.system) === config.gameData.planetCoords.system && parseInt(trade.planet) === config.gameData.planetCoords.planet) ? parseInt(trade.resource[17]) : parseInt(trade.resource[11])); }).reduce(function (total, num) { return total + num; }),
            ];
        },
        throwError: function (m) {
            if (lwm_jQuery('#all .lwm-loaderror').length) return;
            var m = m || 'Something went wrong while loading the page. Not all features might be fully functional!';
            lwm_jQuery('#all').prepend('<div class="lwm-loaderror" style="margin-bottom: 20px;background-color: #792121;border: 1px solid rgba(124, 243, 241, 0.5);padding: 2px;"><i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>'+m+'</div>');
        },
        getActiveObs: function (coords) {
            if (!Array.isArray(coords)) coords = coords.split('x');
            return lwm_jQuery.grep(config.gameData.observationInfo.observationen_informations, function (obsData, i) { return obsData.galaxy == coords[0] && obsData.system == coords[1] && obsData.planet == coords[2]; });
        }
    }

    var getPromise = function(searchSelector) {
        var res, rej;

        var promise = new Promise(function(resolve, reject) {
            res = resolve;
            rej = reject;

            if (!searchSelector) reject();

            var count = 0;
            var interval;

            if (lwm_jQuery(searchSelector).length && lwm_jQuery.map(lwm_jQuery(searchSelector), function (sel, i) { return lwm_jQuery(sel).html(); }).join(' ').search(/\w/) !== -1) {
                resolve();
            } else {
                interval = setInterval(() => {
                    if (lwm_jQuery(searchSelector).length && lwm_jQuery.map(lwm_jQuery(searchSelector), function (sel, i) { return lwm_jQuery(sel).html(); }).join(' ').search(/\w/) !== -1) {
                        var bla = lwm_jQuery(searchSelector).html();
                        clearInterval(interval);
                        resolve();
                    }
                    count += 1;
                    if (count > config.promises.interval.count - 1) {
                        clearInterval(interval);
                        reject();
                    }
                }, config.promises.interval.ms);
            }
        });

        promise.resolve = res;
        promise.reject = rej;

        return promise;
    }

    var getLoadStatePromise = function(type) {
        var res, rej;

        var promise = new Promise(function(resolve, reject) {
            res = resolve;
            rej = reject;

            if (typeof config.loadStates[type] === "undefined") reject();

            var count = 0;
            var interval;

            if (!config.loadStates[type]) {
                resolve();
            } else {
                interval = setInterval(() => {
                    if (!config.loadStates[type]) {
                        clearInterval(interval);
                        resolve();
                    }
                    count += 1;
                    if (count > config.promises.interval.count - 1) {
                        clearInterval(interval);
                        reject();
                    }
                }, config.promises.interval.ms);
            }
        });

        promise.resolve = res;
        promise.reject = rej;

        return promise;
    }

    var getPageLoadPromise = function () {
        return new Promise(function(resolve, reject) {

            var count = 0;
            var interval;

            //all loadStates must be false for site to finish loading
            if (lwm_jQuery.map(config.loadStates, function (state) { return state; }).indexOf(true) === -1) {
                resolve();
            } else {
                interval = setInterval(() => {
                    if (lwm_jQuery.map(config.loadStates, function (state) { return state; }).indexOf(true) === -1) {
                        clearInterval(interval);
                        resolve();
                    }
                    count += 1;
                    if (count > config.promises.interval.count - 1) {
                        clearInterval(interval);
                        reject();
                    }
                }, config.promises.interval.ms);
            }
        });
    }

    install();
};

(function() {
    'use strict';

    siteManager();
})();
