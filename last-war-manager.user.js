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
// @require       https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@e07de5c0a13d416fda88134f999baccfee6f7059/assets/jquery.min.js
// @require       https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@9b03c1d9589c3b020fcf549d2d02ee6fa2da4ceb/assets/GM_config.min.js
// @resource      css https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@c2f1a8579dfd0b687530a0ef377305b597eaa5d1/last-war-manager.css
// @icon          https://raw.githubusercontent.com/j0Shi82/last-war-manager/master/assets/logo-small.png
// @grant         GM.getValue
// @grant         GM.setValue
// @grant         GM_getResourceText
// @grant         GM_addStyle
// @run-at        document-start
// @version       0.6
// ==/UserScript==

var firstLoad = true;
var lwm_jQuery = window.jQuery;

// add style
(function() {
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

        /**
             *  On load, called to load the auth2 library and API client library.
             */
        var handleClientLoad = function(g) {
            gapi = g;
            gapi.load('client:auth2', initClient);
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
                config.setGMValues();
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
                        config.setGMValues();
                    }
                }, function (error) {
                    console.error(JSON.stringify(error, null, 2));
                    config.setGMValues();
                });
            } else {
                //we're not logged in, load browser settings
                config.setGMValues();
                //also reset the google settings
                if (GM_config.set('confirm_drive_sync')) alert('Couldn\'t sync with Google Drive. Please go to the settings and reconnect the service!');
                GM_config.set('confirm_drive_sync', false);
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
                    saveConfig();
                } else {
                    console.error('files.create: ' + response);
                    config.setGMValues();
                }
            }, function (error) {
                console.error(JSON.stringify(error, null, 2));
                config.setGMValues();
            });
        }

        var saveConfig = function () {
            var saveObj = JSON.parse(JSON.stringify(config.lwm));
            saveObj.menu = {
                addon_clock: GM_config.get('addon_clock'),
                addon_fleet: GM_config.get('addon_fleet'),
                confirm_const: GM_config.get('confirm_const'),
                confirm_drive_sync: GM_config.get('confirm_drive_sync'),
                confirm_production: GM_config.get('confirm_production'),
                confirm_research: GM_config.get('confirm_research'),
                coords_fleets: GM_config.get('coords_fleets'),
                coords_trades: GM_config.get('coords_trades')
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
                    console.error('files.create: ' + response);
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
                } else {
                    console.error('files.create: ' + response);
                    config.setGMValues();
                }
            }, function (error) {
                console.error(JSON.stringify(error, null, 2));
                config.setGMValues();
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
        }
    });

    var config = {
        menu: GM_config,
        loadStates: {
            content: false,
            submenu: false,
            addons: false,
            fleetaddon: false
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
            planetCoords: {
                string: null,
                galaxy: null,
                system: null,
                planet: null
            },
            planets: [],
            planetInformation: [],
            spionageInfos: [],
            productionInfos: [],
            overviewInfo: {},
            messageData: {},
            fleetInfo: {},
            observationInfo: {},

            checkDataReloads: function () {
                lwm_jQuery.each(config.gameData.reloads, function (type, state) {
                    if (state) {
                        config.getGameData[type]();
                        config.gameData.reloads[type] = false;
                    }
                });
            },

            reloads: {
                productionInfos: false
            }
        },
        lwm: {
            lastTradeCoords: {},
            lastFleetCoords: {},
            productionFilters: {},
            hiddenShips: {},
            resProd: {},

            set: function (data) {
                if (typeof data.lastTradeCoords !== "undefined") config.lwm.lastTradeCoords = data.lastTradeCoords;
                if (typeof data.lastFleetCoords !== "undefined") config.lwm.lastFleetCoords = data.lastFleetCoords;
                if (typeof data.productionFilters !== "undefined") config.lwm.productionFilters = data.productionFilters;
                if (typeof data.hiddenShips !== "undefined") config.lwm.hiddenShips = data.hiddenShips;
                if (typeof data.resProd !== "undefined") config.lwm.resProd = data.resProd;
                if (typeof data.menu !== "undefined") {
                    GM_config.set('addon_clock', data.menu.addon_clock);
                    GM_config.set('addon_fleet', data.menu.addon_fleet);
                    GM_config.set('confirm_const', data.menu.confirm_const);
                    GM_config.set('confirm_drive_sync', data.menu.confirm_drive_sync);
                    GM_config.set('confirm_production', data.menu.confirm_production);
                    GM_config.set('confirm_research', data.menu.confirm_research);
                    GM_config.set('coords_fleets', data.menu.coords_fleets);
                    GM_config.set('coords_trades', data.menu.coords_trades);
                }

                //set and get to sync
                GM.setValue('lwm_lastTradeCoords', JSON.stringify(config.lwm.lastTradeCoords));
                GM.setValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));
                GM.setValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));
                GM.setValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
                GM.setValue('lwm_resProd', JSON.stringify(config.lwm.resProd));

                config.setGMValues();
            }
        },
        pages: {
            inbox: {
                reportHandler: false
            }
        },
        promises: {
            interval: {
                ms: 200,
                count: 50
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
            });

            GM.getValue('lwm_lastFleetCoords', '{}').then(function (data) {
                try { config.lwm.lastFleetCoords = JSON.parse(data); } catch (e) { config.lwm.lastFleetCoords = {}; }
                checkConfigPerCoordsSetup('lastFleetCoords');
                if (config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > GM_config.get('coords_fleets')) {
                    config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = GM_config.get('coords_fleets');
                }
                GM.setValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));
            });

            GM.getValue('lwm_resProd', '{}').then(function (data) {
                try { config.lwm.resProd = JSON.parse(data); } catch (e) { config.lwm.resProd = {}; }
                checkConfigPerCoordsSetup('resProd');
                config.getGameData.resProd(); //get res here so config is loaded before fetching current values
                GM.setValue('lwm_resProd', JSON.stringify(config.lwm.resProd));
            });

            GM.getValue('lwm_hiddenShips', '{}').then(function (data) {
                try { config.lwm.hiddenShips = JSON.parse(data); } catch (e) { config.lwm.hiddenShips = {}; }
                checkConfigPerCoordsSetup('hiddenShips');
                GM.setValue('lwm_hiddenShips', JSON.stringify(config.lwm.hiddenShips));
            });

            GM.getValue('lwm_productionFilters', '{}').then(function (data) {
                try { config.lwm.productionFilters = JSON.parse(data); } catch (e) { config.lwm.productionFilters = {}; }
                checkConfigPerCoordsSetup('productionFilters');
                GM.setValue('lwm_productionFilters', JSON.stringify(config.lwm.productionFilters));
            });

            //need another promise here to make sure save fires after settings were loaded
            GM.getValue('lwm_productionFilters', '{}').then(function () {
                if (GM_config.get('confirm_drive_sync')) driveManager.save();
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

                // returns a promise because other stuff has to wait for the data
                return lwm_jQuery.when(
                    requests.get_spionage_info(),
                    config.getGameData.productionInfos(),
                    config.getGameData.planetInformation()
                );
            },
            productionInfos: function () {
                var uriData = 'galaxy_check='+config.gameData.planetCoords.galaxy+'&system_check='+config.gameData.planetCoords.system+'&planet_check='+config.gameData.planetCoords.planet;
                return site_jQuery.getJSON("/ajax_request/get_production_info.php?"+uriData, function( data ) {
                    lwm_jQuery.each(data, function (i, cat) {
                        if (!lwm_jQuery.isArray(cat)) return true;
                        lwm_jQuery.each(cat, function (j, ship) {
                            config.gameData.productionInfos.push(ship);
                        });
                    });
                });
            },
            resProd: function () {
                config.lwm.resProd[config.gameData.playerID][config.gameData.planetCoords.string] = unsafeWindow.getResourcePerHour()[0];
                GM.setValue('lwm_resProd', JSON.stringify(config.lwm.resProd));
            },
            planetInformation: function(data) {
                return site_jQuery.getJSON('/ajax_request/get_all_planets_information.php', function (data) {
                    config.gameData.planetInformation = data;
                    config.gameData.planets = [];
                    lwm_jQuery.each(data, function (i, d) {
                        config.gameData.planets.push({galaxy:d.Galaxy,system:d.System,planet:d.Planet,string:d.Galaxy+'x'+d.System+'x'+d.Planet});
                    });
                });
            }

        },

    };

    var install = function() {
        // load site jQuery as well, need this to make API calls
        lwm_jQuery(window).load(function () {
            site_jQuery = unsafeWindow.jQuery;
            site_jQuery.ajaxSetup({ cache: true });

            global.uiChanges();

            var loadVendor = site_jQuery.getScript('https://cdn.jsdelivr.net/gh/j0Shi82/last-war-manager@bfb98adb5b546b920ce7730e1382b1048cb756a1/assets/vendor.js');
            site_jQuery.when(config.getGameData.all(),loadVendor).then(function () {
                // wait for game date because some stuff depends on it
                global.hotkeySetup();

                // load settings from google or browser
                site_jQuery.getScript('//apis.google.com/js/api.js').then(function () {
                    if (!GM_config.get('confirm_drive_sync')) config.setGMValues();
                    driveManager.init(unsafeWindow.gapi);
                });

                // the first ubersicht load is sometimes not caught by our ajax wrapper, so do manually
                process('ubersicht');
            });

            //we're hooking into ajax requests to figure out on which page we are and fire our own stuff
            site_jQuery(document).ajaxSend(function( event, xhr, settings ) {
                var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                if (settings.url.search(/lwm_ignoreProcess/) !== -1) {
                    console.log('lwm_ignoreProcess... skipping');
                    return;
                }
                // first ubersicht load is usually not caught by our wrapper. But in case it is, return because we invoke this manually
                if (firstLoad && page === 'ubersicht') return;

                console.log(page);

                var processPages = ['get_inbox_message','get_message_info','get_galaxy_view_info','get_inbox_load_info','get_make_command_info',
                                    'get_info_for_flotten_pages','get_change_flotten_info'];
                var ignorePages =  ['make_command','galaxy_view','change_flotten','flottenkommando','flottenbasen_all','fremde_flottenbasen','flottenbasen_planet'];

                if ((settings.url.match(/content/) || processPages.indexOf(page) !== -1) && ignorePages.indexOf(page) === -1) process(page, xhr);
            });

            site_jQuery(window).focus(function () { addOns.load(); });
            site_jQuery(window).blur(function () { addOns.blur(); });

            site_jQuery(document).ajaxComplete(function( event, xhr, settings ) {
                var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                // save specific responses for later use
                var saveRequest = ['get_ubersicht_info','get_flottenbewegungen_info','get_inbox_message','get_info_for_observationen_page','get_spionage_info'];
                if (saveRequest.indexOf(page) !== -1) {
                    if (page === 'get_ubersicht_info')              config.gameData.overviewInfo     = xhr.responseJSON;
                    if (page === 'get_flottenbewegungen_info')      config.gameData.fleetInfo        = xhr.responseJSON;
                    if (page === 'get_inbox_message')               config.gameData.messageData      = xhr.responseJSON;
                    if (page === 'get_info_for_observationen_page') config.gameData.obsvervationInfo = xhr.responseJSON;
                    if (page === 'get_spionage_info')               config.gameData.spionageInfos    = xhr.responseJSON;
                }

                var listenPages = ['put_building'];

                if (listenPages.indexOf(page) !== -1) {
                    console.log(event, xhr, settings);
                    console.log('ajaxComplete',page, xhr.responseJSON);
                }
            });
        });
    }

    var uninstall = function () {
        addOns.unload();
    }

    var process = function (page, xhr) {
        config.loadStates.content = true;
        config.loadStates.addons = true;
        //reject current promises to cancel pending loads
        if (config.promises.content !== null) config.promises.content.reject();
        if (config.promises.addons !== null) config.promises.addons.reject();

        //figure out whether or not to process submenu and reject ongoing load in case
        var preserveSubmenu = page === 'get_inbox_message' || page === 'get_message_info';
        if (!preserveSubmenu && config.promises.submenu !== null) config.promises.submenu.reject();

        //check whether any gameData is marked as refresh
        config.gameData.checkDataReloads();

        lwm_jQuery('#all').hide();
        lwm_jQuery('.loader').show();
        getPageLoadPromise().then(function () {
            lwm_jQuery('.loader').hide();
            lwm_jQuery('#all').show();
            if (firstLoad) {
                lwm_jQuery('#Main').css('display','flex');
                lwm_jQuery('.loader.lwm-firstload').remove();
                firstLoad = false;
            }
            lwm_jQuery(unsafeWindow).focus();

            if (page === 'get_galaxy_view_info') {
                lwm_jQuery("html, body").animate({ scrollTop: lwm_jQuery(document).height() }, 250);
            }
        }).catch(function (e) {
            console.log(e);
            lwm_jQuery('.loader').hide();
            lwm_jQuery('#all').show();
            if (firstLoad) {
                lwm_jQuery('#Main').css('display','flex');
                lwm_jQuery('.loader.lwm-firstload').remove();
                firstLoad = false;
            }
            lwm_jQuery(unsafeWindow).focus();
        });

        if (!preserveSubmenu) {
            submenu.clear();
            submenu.move();
        }

        switch (page) {
            case "ubersicht":                pageTweaks.uebersicht(); break;
            case "produktion":               pageTweaks.produktion(); break;
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
            case "new_trade_offer":          pageTweaks.newTrade(); break;
            case "raumdock":                 pageTweaks.shipdock(); break;
            case "get_galaxy_view_info":     pageTweaks.galaxyView(); break;
            case "observationen":            pageTweaks.obs(); break;
            case "schiffskomponenten":       pageTweaks.designShips(); break;
            case "get_make_command_info":    pageTweaks.fleetCommand(); break;
            case "get_change_flotten_info":  pageTweaks.changeFleet(); break;
            case "get_info_for_flotten_pages": pageTweaks.allFleets(xhr); break;
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
        addOns.load();
    }

    var submenu = {
        move: function() {
            //submenu loads after content
            config.loadStates.submenu = true;
            config.promises.submenu = getLoadStatePromise('content');
            config.promises.submenu.then(function () {
                lwm_jQuery('#link .navButton, #veticalLink .navButton').each(function () {
                    lwm_jQuery(this).attr('data-page', lwm_jQuery(this).attr('onclick').match(/(\'|\")([a-z0-9A-Z_]*)(\'|\")/)[2]);
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
                config.loadStates.submenu = false;
            });
        },
        clear: function () {
            lwm_jQuery('.secound_line .navButton').remove();
            lwm_jQuery('#link').html('');
        }
    };

    var pageTweaks = {
        default: function () {
            config.promises.content = getPromise('.pageContent > div');
            config.promises.content.then(function () {
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
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
                        .on( 'mousedown', function( e ) {
                            timeout1 = setTimeout(function () { interval1 = setInterval( function () { self.click(); },150); }, 250);
                            timeout2 = setTimeout(function () { clearInterval(interval1); interval2 = setInterval( function () { self.click(); },75); }, 2250);
                            timeout3 = setTimeout(function () { clearInterval(interval2); interval3 = setInterval( function () { self.click(); },25); }, 5250);
                        })
                        .on( 'mouseleave', function( e ) { clearInterval(interval1); clearInterval(interval2); clearInterval(interval3); clearTimeout(timeout1); clearTimeout(timeout2); clearTimeout(timeout3); })
                        .on( 'mouseup', function( e ) { clearInterval(interval1); clearInterval(interval2); clearInterval(interval3); clearTimeout(timeout1); clearTimeout(timeout2); clearTimeout(timeout3); });
                });
            }).catch(function (e) {
                console.log(e);
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

                if (GM_config.get('addon_clock')) {
                    clearInterval(unsafeWindow.timeinterval_uber);
                }

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
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

                    $div.find('.buttonRowInbox').click(function () { lwm_jQuery(this).find('.formButton').toggleClass('activeBox'); process(lwm_jQuery(this)); });
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
                config.loadStates.content = false;
            });
        },
        inbox: function() {
            //clear content so loadStates doesn't fire too early
            lwm_jQuery('#inboxContent').html('');
            config.promises.content = getPromise('.inboxDeleteMessageButtons,#messagesListTableInbox');
            config.promises.content.then(function () {
                config.loadStates.content = false;

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
                            addReportLink(m);
                        });
                    });
                    config.pages.inbox.reportHandler = true;
                }

                if ([2,4].includes(unsafeWindow.window.current_view_type)) {
                    console.log('messageData', config.gameData.messageData);
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
                    var $saveLink = lwm_jQuery('<a href=\'javascript:void(0)\' data-index=\''+i+'\'>SAVE</a>');
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
                    });
                    linksOwn.push($link);
                    saveLinksOwn.push($saveLink);
                });
                lwm_jQuery(linksOwn).each(function (i, l) {
                    $divOwn.append(l).append(' (').append(saveLinksOwn[i]).append(') ');
                    if (i !== linksOwn.length - 1) $divOwn.append(' - ');
                });
                $divOwn.appendTo($lastTR.find('td:eq(1)'));

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
                    $divSave.append(l);
                    if (i !== linksSave.length - 1) $divSave.append(' - ');
                });
                $divSave.appendTo($lastTR.find('td:eq(1)'));

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
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

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                config.loadStates.content = false;
            });
        },
        galaxyView: function () {
            lwm_jQuery('#galaxyViewInfoTable').html('');
            config.promises.content = getPromise('#galaxyViewInfoTable');
            config.promises.content.then(function () {
                lwm_jQuery('a.flottenKommandoAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-fighter-jet fa-stack-1x"></i>');
                lwm_jQuery('a.newTradeOfferAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-handshake fa-stack-1x"></i>');
                lwm_jQuery('a.spionagePlanetenscannerAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-search fa-stack-1x"></i>');
                lwm_jQuery('a.spionageObservationsAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-search-plus fa-stack-1x"></i>');
                lwm_jQuery('a.changePlanetAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-exchange-alt fa-stack-1x"></i>');

                //add spy buttons for planets that's missing it
                lwm_jQuery('#galaxyViewInfoTable tr').find('td:eq(3)').each(function () {
                    var value = lwm_jQuery(this).text();
                    if (value !== '' && value !== 'false' && value !== '0' && lwm_jQuery(this).next().html() === '') {
                        var spydrones = lwm_jQuery.grep(config.gameData.spionageInfos.planetenscanner_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
                        var obsdrones = lwm_jQuery.grep(config.gameData.spionageInfos.observations_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
                        if (obsdrones.length > 0) lwm_jQuery(this).next().append('<a href="#" class="actionClass spionageObservationsAction fa-stack" onclick="javascript:void(0)"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search-plus fa-stack-1x"></i></a>');
                        if (spydrones.length > 0) lwm_jQuery(this).next().append('<a href="#" class="actionClass spionagePlanetenscannerAction fa-stack" onclick="javascript:void(0)"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search fa-stack-1x"></i></a>');
                    }
                });

                //add spionage actions
                lwm_jQuery('a.spionagePlanetenscannerAction').each(function () {
                    lwm_jQuery(this).attr('onclick', 'javascript:void(0)');
                    var coords = lwm_jQuery(this).parents('tr').find('td').first().text().split('x');
                    coords[0] = coords[0].match(/\d+/)[0];
                    coords[1] = coords[1].match(/\d+/)[0];
                    coords[2] = coords[2].match(/\d+/)[0]; //filter planet type
                    lwm_jQuery(this).click(function () { operations.performSpionage(coords) });
                });
                lwm_jQuery('a.spionageObservationsAction').each(function () {
                    lwm_jQuery(this).attr('onclick', 'javascript:void(0)');
                    var coords = lwm_jQuery(this).parents('tr').find('td').first().text().split('x');
                    coords[0] = coords[0].match(/\d+/)[0];
                    coords[1] = coords[1].match(/\d+/)[0];
                    coords[2] = coords[2].match(/\d+/)[0]; //filter planet type
                    lwm_jQuery(this).click(function () { operations.performObservation(coords) });
                });

                //move observation and search div
                lwm_jQuery('.headerOfGalaxyViewPage').insertBefore(lwm_jQuery('#tableForChangingPlanet'));

                //add search icons
                helper.replaceElementsHtmlWithIcon(lwm_jQuery('.formButtonGalaxyView'), 'fas fa-search');

                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
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
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
                config.loadStates.content = false;
            });
        },
        designShips: function () {
            config.promises.content = getPromise('#schiffskomponentenDiv');
            config.promises.content.then(function () {
                lwm_jQuery('#create').click(function () { config.gameData.reloads.productionInfos = 'production'; });
                config.loadStates.content = false;
            }).catch(function (e) {
                console.log(e);
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
                lwm_jQuery('#rohstoffeDiv > .rohstoffeTableClass > tbody > tr > td > .rohstoffeTableClass').find('> tbody > tr:eq(4)').each(function (i, table) {
                    if (!resTotal[0][resTypes[i]]) return true;
                    var hoursTillFull = (resourceCapacityArray[i]-resValue[i])/(resTotal[0][resTypes[i]]);
                    lwm_jQuery(this).after('<tr><td class="second" valign="top" align="right">Time till capacity reached:</td><td class="second" ><span class=\''+(hoursTillFull < 8 ? 'redBackground' : '')+'\' id=\'clock_lwm_'+resTypes[i]+'\'>'+moment.duration(hoursTillFull, "hours").format("HH:mm:ss")+'</span></td></tr>');
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
                config.loadStates.content = false;
            });
        }

    }

    var global = {
        uiChanges: function () {
                /* delete propassssss*/
                lwm_jQuery('#propassssss').remove();

                //add mobile support
                lwm_jQuery('head').append('<meta name="viewport" content="width=device-width, initial-scale=1">');

                //attach loader for first page load
                lwm_jQuery('body').append('<div class="loader lwm-firstload"></div>');

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
                $menuToggle.find('.fa-plane-departure').click(function () { unsafeWindow.changeContent('flottenbasen_all', 'second', 'Flotten-Kommando'); });
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
                lwm_jQuery('#flottenbewegungen').prepend('<i class="fas fa-plane-departure"></i>');
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
                    case "ctrl+shift+f":event.preventDefault();unsafeWindow.changeContent('flottenbasen_all', 'second', 'Flotten-Kommando');break;
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
            clockInterval: null,
            fleetCompleteHandlerAdded: false
        },
        load: function () {
            //load addons after submenu
            config.promises.addons = getLoadStatePromise('submenu');
            config.promises.addons.then(function () {
                config.loadStates.fleetaddon = true;
                addOns.showFleetActivityGlobally();
                addOns.refreshTrades();
                if (GM_config.get('addon_clock')) addOns.addClockInterval();

                //wait for fleetaddon before resolving addons
                getLoadStatePromise('fleetaddon').then(function () {
                    config.loadStates.addons = false;
                }).catch(function (e) {
                    console.log(e);
                    config.loadStates.addons = false;
                });
            }).catch(function (e) {
                console.log(e);
                config.loadStates.addons = false;
                config.loadStates.fleetaddon = false;
            });
        },
        blur: function () {
            if (GM_config.get('addon_fleet')) requests.get_flottenbewegungen_info();
        },
        unload: function () {
            if (addOns.config.fleetRefreshInterval !== null) { clearInterval(addOns.config.fleetRefreshInterval); addOns.config.fleetRefreshInterval = null; }
            if (addOns.config.tradeRefreshInterval !== null) { clearInterval(addOns.config.tradeRefreshInterval); addOns.config.tradeRefreshInterval = null; }
            if (addOns.config.clockInterval !== null) { clearInterval(addOns.config.clockInterval); addOns.config.clockInterval = null; }
        },
        //refresh trades every minute to make it unnecessary to visit the trade page for trade to go through
        refreshTrades: function() {
            var requestTrades = function() {
                var uriData = 'galaxy_check='+config.gameData.planetCoords.galaxy+'&system_check='+config.gameData.planetCoords.system+'&planet_check='+config.gameData.planetCoords.planet;
                site_jQuery.ajax({
                    url: '/ajax_request/get_trade_offers.php?'+uriData,
                    success: function(data) {
                        unsafeWindow.Roheisen = parseInt(data.resource['Roheisen']);
                        unsafeWindow.Kristall = parseInt(data.resource['Kristall']);
                        unsafeWindow.Frubin = parseInt(data.resource['Frubin']);
                        unsafeWindow.Orizin = parseInt(data.resource['Orizin']);
                        unsafeWindow.Frurozin = parseInt(data.resource['Frurozin']);
                        unsafeWindow.Gold = parseInt(data.resource['Gold']);
                    },
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
                        lwm_jQuery(this).html(md.format("hh:mm:ss", {
                            trim: false,
                            forceLength: true
                        }));
                    }
                });
            }, 1000);
        },

        showFleetActivityGlobally: function() {
            //no fleet config set, return
            if (!GM_config.get('addon_fleet')) {
                config.loadStates.fleetaddon = false;
                return;
            }

            var addFleetDiv = function () {
                if (lwm_jQuery('#folottenbewegungenPageDiv').length === 0) {
                    var $div = lwm_jQuery('<div class="pageContent" style="margin-bottom:20px;"><div id="folottenbewegungenPageDiv"><table><tbody><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Ankunft</td><td>Restflugzeit</td></tr></tbody></table></div></div>');
                    $div.hide();
                    $div.prependTo('#all');
                    $div.show();
                }

                lwm_jQuery('#folottenbewegungenPageDiv table tr:gt(0)').remove();

                lwm_jQuery.each(config.gameData.fleetInfo.send_infos, function(i, fleetData) {
                    var trStyle         = '';
                    var fleetInfoString = '';
                    var fleetTimeString = '';
                    var fleetClock      = '';
                    var oppCoords       = fleetData.Galaxy + "x" + fleetData.System + "x" + fleetData.Planet;
                    var oppNick         = fleetData.Nickname_send
                    var ownCoords       = fleetData.Galaxy_send + "x" + fleetData.System_send + "x" + fleetData.Planet_send;
                    switch (parseInt(fleetData.Type)) {
                        case 1:
                            trStyle = 'background-color:red;';
                            fleetInfoString = "Eine Flotte vom Planet "+ oppCoords +" greift deinen Planeten " + ownCoords + " an.";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case 2:
                            fleetInfoString = "Fremde Flotte vom "+ oppCoords +" ("+oppNick+") transportiert Rohstoffe nach "+ ownCoords +".";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case 3:
                            if(fleetData.Status == 1) {
                                fleetInfoString = "Eine Flotte vom Planet "+ oppCoords +" verteidigt deinen Planeten "+ ownCoords +".";
                                fleetTimeString = fleetData.ComeTime;
                                fleetClock =      'clock_' + fleetData.clock_id;
                            } else if(fleetData.Status == 3) {
                                fleetInfoString = "Eine Flotte von Planet "+ oppCoords +" verteidigt deinen Planeten "+ ownCoords +".";
                                fleetTimeString = fleetData.DefendingTime;
                                if(send_info.DefendingTime == null) fleetClock = "unbefristet";
                                else
                                {
                                    fleetClock = 'clock_' + fleetData.clock_id;
                                }
                            }
                            break;
                        case 5:
                            fleetInfoString = "Fremde Flotte von "+ oppCoords +" wird überstellt nach "+ ownCoords +".";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                    }
                    lwm_jQuery('#folottenbewegungenPageDiv table tbody').append('<tr style='+trStyle+'><td>'+fleetInfoString+'</td><td>'+fleetTimeString+'</td><td id=\''+fleetClock+'\'>'+moment.duration(fleetData.secounds, 'seconds').format("hh:mm:ss", { trim: false, forceLength: true })+'</td></tr>');
                });

                lwm_jQuery.each(config.gameData.fleetInfo.all_informations, function(i, fleetData) {
                    lwm_jQuery('#folottenbewegungenPageDiv table tbody').append("<tr><td>Eigene " + fleetData.name + " von Planet " + config.gameData.planetCoords.galaxy + "x" + config.gameData.planetCoords.system + "x" + config.gameData.planetCoords.planet + " ist unterwegs nach ( " + fleetData.galaxy + "x" + fleetData.system + " )</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(fleetData.secounds, 'seconds').format("hh:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                });

                lwm_jQuery.each(config.gameData.fleetInfo.dron_observationens, function(i, fleetData) {
                    lwm_jQuery('#folottenbewegungenPageDiv table tbody').append("<tr><td>Eigene " + fleetData.name + " von Planet " + config.gameData.planetCoords.galaxy + "x" + config.gameData.planetCoords.system + "x" + config.gameData.planetCoords.planet + " ist unterwegs nach ( " + fleetData.galaxy + "x" + fleetData.system + "x" + fleetData.planet + " )</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(fleetData.secounds, 'seconds').format("hh:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                });

                lwm_jQuery.each(config.gameData.fleetInfo.dron_planetenscanners, function(i, fleetData) {
                    lwm_jQuery('#folottenbewegungenPageDiv table tbody').append("<tr><td>Eigene " + fleetData.name + " von Planet " + config.gameData.planetCoords.galaxy + "x" + config.gameData.planetCoords.system + "x" + config.gameData.planetCoords.planet + " ist unterwegs nach ( " + fleetData.galaxy + "x" + fleetData.system + "x" + fleetData.planet + " )</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(fleetData.secounds, 'seconds').format("hh:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                });

                lwm_jQuery.each(config.gameData.fleetInfo.buy_ships_array, function(i, fleetData) {
                    lwm_jQuery('#folottenbewegungenPageDiv table tbody').append("<tr><td>Flotte vom Handelsposten wird überstellt nach " + config.gameData.planetCoords.galaxy + "x" + config.gameData.planetCoords.system + "x" + config.gameData.planetCoords.planet + ".</td><td>" + fleetData.time + "</td><td id='" + 'clock_' + fleetData.clock_id + "'>"+moment.duration(fleetData.secounds, 'seconds').format("hh:mm:ss", { trim: false, forceLength: true })+"</td></tr>");
                });

                lwm_jQuery.each(config.gameData.fleetInfo.fleet_informations, function(i, fleetData) {
                    var fleetInfoString = '';
                    var fleetTimeString = '';
                    var fleetClock      = '';
                    var oppCoords       = fleetData.Galaxy_send + "x" + fleetData.System_send + "x" + fleetData.Planet_send;
                    var oppNick         = fleetData.Nickname_send
                    var ownCoords       = config.gameData.planetCoords.galaxy + "x" + config.gameData.planetCoords.system + "x" + config.gameData.planetCoords.planet;
                    var lkomLink        = '<i class="fas fa-wifi faa-flash animated" onclick="changeContent(\'flotten_view\', \'third\', \'Flotten-Kommando\', \'' + fleetData.id + '\')" style="cursor:hand;margin-right:5px;color:#66f398"></i>';
                    switch (fleetData.Type) {
                        case '1':
                            fleetInfoString = lkomLink+'Eigene Flotte vom Planet '+ ownCoords;
                            if (fleetData.Status == 1) fleetInfoString += " greift Planet ";
                            else                       fleetInfoString += " kehrt von ";
                            fleetInfoString += oppCoords + ' ('+oppNick+')';
                            if (fleetData.Status == 1) fleetInfoString += " an.";
                            else                       fleetInfoString += " zurück.";
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case '2':
                            fleetInfoString = lkomLink+'Eigene Flotte vom Planet '+ ownCoords;
                            if (fleetData.Status == 1) fleetInfoString += " transportiert Rohstoffe nach ";
                            else                       fleetInfoString += " kehrt zurück von ";
                            fleetInfoString += oppCoords + ' ('+oppNick+').';
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case '3':
                            fleetInfoString = lkomLink+'Eigene Flotte vom Planet '+ ownCoords;
                            if (fleetData.Status == 1)     fleetInfoString += " verteidigt Planet ";
                            else if(fleetData.Status == 2) fleetInfoString += " kehrt zurück vom ";
                            else if(fleetData.Status == 3) fleetInfoString += " verteidigt den Planeten ";
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
                            fleetInfoString = lkomLink+'Eigene Flotte von Planet '+ ownCoords +' kolonisiert Planeten '+ oppCoords +'.';
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                        case '5':
                            fleetInfoString = lkomLink+'Eigene Flotte von Planet '+ ownCoords +' wird überstellt nach '+ oppCoords +' ( '+oppNick+' ).';
                            fleetTimeString = fleetData.ComeTime;
                            fleetClock =      'clock_' + fleetData.clock_id;
                            break;
                    }
                    lwm_jQuery('#folottenbewegungenPageDiv table tbody').append('<tr><td>'+fleetInfoString+'</td><td>'+fleetTimeString+'</td><td id=\''+fleetClock+'\'>'+moment.duration(fleetData.secounds, 'seconds').format("hh:mm:ss", { trim: false, forceLength: true })+'</td></tr>');
                });

                if (GM_config.get('addon_clock')) {
                    clearInterval(unsafeWindow.timeinterval_flottenbewegungen);
                    helper.setDataForClocks();
                }

                config.loadStates.fleetaddon = false;
            }


            if (!addOns.config.fleetCompleteHandlerAdded) {
                site_jQuery(document).ajaxComplete(function( event, xhr, settings ) {
                    var page = settings.url.match(/\/(\w*).php(\?.*)?$/)[1];

                    if (page === 'get_flottenbewegungen_info') {
                        addFleetDiv();
                    }
                });
                addOns.config.fleetCompleteHandlerAdded = true;
            }
            //add fleets to page
            if (firstLoad) requests.get_flottenbewegungen_info();
            else           addFleetDiv();

            //add refresh interval
            if (addOns.config.fleetRefreshInterval !== null) return;
            addOns.config.fleetRefreshInterval = setInterval(function() {
                config.loadStates.fleetaddon = true;
                requests.get_flottenbewegungen_info();
            }, 30000);
        }
    }

    var requests = {
        get_flottenbewegungen_info: function () {
            return site_jQuery.getJSON('/ajax_request/get_flottenbewegungen_info.php?galaxy='+config.gameData.planetCoords.galaxy+'&system='+config.gameData.planetCoords.system+'&planet='+config.gameData.planetCoords.planet);
        },
        get_spionage_info: function () {
            return site_jQuery.getJSON('/ajax_request/get_spionage_info.php?galaxy_check='+config.gameData.planetCoords.galaxy+'&system_check='+config.gameData.planetCoords.system+'&planet_check='+config.gameData.planetCoords.planet);
        }
    };

    var operations = {
        performSpionage: function (coords) {
            var data = config.gameData.spionageInfos;
            if (data.planetenscanner_drons.length === 0) alert('Unable to find drones to use');

            //grab the first eligable drone with IOB and roll with it
            var drone = lwm_jQuery.grep(data.planetenscanner_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
            if (drone.length === 0) alert('Unable to find drones to use');

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
            if (data.observations_drons.length === 0) alert('Unable to find drones to use');

            //grab the first eligable drone with IOB and roll with it
            var drone = lwm_jQuery.grep(data.observations_drons, function (el, i) { return el.engine_type === 'IOB' && parseInt(el.number) > 0; });
            if (drone.length === 0) alert('Unable to find drones to use');

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
