import config from 'config/lwmConfig';
import {
  lwmJQ, gmConfig, siteWindow, gmSetValue, lwmWindow,
} from 'config/globals';
import {
  throwError, addConfirm, setDataForClocks, replaceElementsHtmlWithIcon, addIconToHtmlElements, addResMemory,
  getIncomingResArray, checkCoords, getActiveObs,
} from 'utils/helper';
import { getPromise, getLoadStatePromise } from 'utils/loadPromises';
import performSpionage from 'operations/performSpionage';
import performObservation from 'operations/performObservation';
import { Sentry } from 'plugins/sentry';
import addOns from 'addons/index';
import driveManager from 'plugins/driveManager';

import trades from 'main/pageTweaks/trades';
import newTrade from 'main/pageTweaks/newTrade';
import uebersicht from 'main/pageTweaks/uebersicht';
import produktion from 'main/pageTweaks/produktion';
import buildingTree from 'main/pageTweaks/buildingTree';
import inbox from 'main/pageTweaks/inbox';

import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

const { document, alert } = siteWindow;

const pageTweaks = {
  default: () => {
    config.promises.content = getPromise('.pageContent > div');
    config.promises.content.then(() => {
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  replaceHrefAnchors: () => {
    getLoadStatePromise('content').then(() => {
      siteWindow.document.querySelectorAll('[href=\'#\']').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
        });
      });
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
    });
  },
  replaceArrows: () => {
    getLoadStatePromise('content').then(() => {
      lwmJQ('.arrow-left,.arrow-left-recycle,.spionage-arrow-left,.raumdock-arrow-left').removeClass('arrow-left arrow-left-recycle spionage-arrow-left raumdock-arrow-left').addClass('fa-2x fas fa-angle-left');
      lwmJQ('.arrow-right,.arrow-right-recycle,.spionage-arrow-right,.raumdock-arrow-right').removeClass('arrow-right arrow-right-recycle spionage-arrow-right raumdock-arrow-right').addClass('fa-2x fas fa-angle-right');
      lwmJQ('.fa-angle-right,.fa-angle-left').each((i, el) => {
        const self = lwmJQ(el);
        let interval1; let interval2; let interval3; let timeout1; let timeout2; let
          timeout3;
        lwmJQ(el)
          .attr('style', '')
          .css('width', '1em')
          .css('cursor', 'hand')
          .on('mousedown touchstart', () => {
            timeout1 = setTimeout(() => { interval1 = setInterval(() => { self.click(); }, 150); }, 250);
            timeout2 = setTimeout(() => { clearInterval(interval1); interval2 = setInterval(() => { self.click(); }, 75); }, 2250);
            timeout3 = setTimeout(() => { clearInterval(interval2); interval3 = setInterval(() => { self.click(); }, 25); }, 5250);
          })
          .on('mouseleave touchend', () => { clearInterval(interval1); clearInterval(interval2); clearInterval(interval3); clearTimeout(timeout1); clearTimeout(timeout2); clearTimeout(timeout3); })
          .on('mouseup', () => { clearInterval(interval1); clearInterval(interval2); clearInterval(interval3); clearTimeout(timeout1); clearTimeout(timeout2); clearTimeout(timeout3); });
      });

      // listen to enter key on production pages
      lwmJQ.each(lwmJQ('.inputNumberDiv input,[id*=\'InputNumber\'] input'), (i, el) => {
        const $self = lwmJQ(el);
        const id = $self.attr('id').match(/\d+/)[0];
        const $button = $self.parents('table').find(`[id*='${id}']`).find('button').not('[onclick*=\'deleteDesign\']');
        $self.on('keyup', (event) => {
          if (event.keyCode === 13) {
            $button.click();
          }
        });
      });
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
    });
  },
  uebersicht,
  prodQueue: () => {
    config.promises.content = getPromise('#divTabele1,#divTabele2,#link');
    config.promises.content.then(() => {
      lwmJQ('#aktuelleProduktionPageDiv td[onclick]').each((i, el) => {
        const self = lwmJQ(el);
        self.css('cursor', 'hand');
        if (gmConfig.get('confirm_production')) addConfirm(self, `${self.parent().find('td:eq(1)').text()} abbrechen`);
        if (gmConfig.get('addon_clock')) {
          clearInterval(siteWindow.timeinterval_aktuelle_produktion);
          setDataForClocks();
        }
      });

      replaceElementsHtmlWithIcon(lwmJQ('td[onclick*=\'deleteAktuelleProduktion\']'), 'fas fa-ban');
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  defense: () => {
    config.promises.content = getPromise('#verteidigungDiv');
    config.promises.content.then(() => {
      lwmJQ('button[onclick*=\'makeDefence\']').each((i, el) => {
        const self = lwmJQ(el);
        if (gmConfig.get('confirm_production')) addConfirm(self, `${self.parent().find('td:eq(1)').text()} abbrechen`);
      });

      replaceElementsHtmlWithIcon(lwmJQ('button[onclick*=\'makeDefence\']'), 'fas fa-2x fa-plus-circle');
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  shipPost: () => {
    config.promises.content = getPromise('#handelspostenDiv');
    config.promises.content.then(() => {
      // remove margin from arrows
      lwmJQ('.arrow-left,.arrow-right').css('margin-top', 0);

      lwmJQ('button[onclick*=\'buyHandeslpostenShips\']').each((i, el) => {
        if (gmConfig.get('confirm_production')) {
          const self = lwmJQ(el);
          addConfirm(self, `${self.parents('tr').find('td:eq(0)').text()} bestellen`);
        }
      });

      replaceElementsHtmlWithIcon(lwmJQ('button[onclick*=\'buyHandeslpostenShips\']'), 'fas fa-2x fa-plus-circle');
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  recycleDef: () => {
    config.promises.content = getPromise('#recyclingDefenceDiv');
    config.promises.content.then(() => {
      // add confirm to recycle buttons
      lwmJQ('button[onclick*=\'recycleDefence\']').each((i, el) => {
        const self = lwmJQ(el);
        if (gmConfig.get('confirm_production')) addConfirm(self, `${self.parents('tr').find('td:eq(0)').text()} bauen`);
      });

      replaceElementsHtmlWithIcon(lwmJQ('button[onclick*=\'recycleDefence\']'), 'fas fa-2x fa-plus-circle');
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  upgradeDef: () => {
    config.promises.content = getPromise('#upgradeDefenceDiv');
    config.promises.content.then(() => {
      // add confirm to recycle buttons
      lwmJQ('button[onclick*=\'upgradeDefenceFunction\']').each((i, el) => {
        if (gmConfig.get('confirm_production')) addConfirm(lwmJQ(el));
      });

      addIconToHtmlElements(lwmJQ('button[onclick*=\'upgradeDefenceFunction\']'), 'fas fa-2x fa-arrow-alt-circle-up');

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  produktion,
  upgradeShips: () => {
    config.promises.content = getPromise('#upgradeShipsDiv');
    config.promises.content.then(() => {
      // add confirm to recycle buttons
      lwmJQ('button[onclick*=\'upgradeShipsFunction\']').each((i, el) => {
        if (gmConfig.get('confirm_production')) addConfirm(lwmJQ(el));
      });

      addIconToHtmlElements(lwmJQ('button[onclick*=\'upgradeShipsFunction\']'), 'fas fa-2x fa-arrow-alt-circle-up');

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  recycleShips: () => {
    config.promises.content = getPromise('#recyclingAngleDiv');
    config.promises.content.then(() => {
      // add confirm to recycle buttons
      lwmJQ('button[onclick*=\'RecycleShips\']').each((i, el) => {
        if (gmConfig.get('confirm_production')) addConfirm(lwmJQ(el));
      });

      replaceElementsHtmlWithIcon(lwmJQ('button[onclick*=\'RecycleShips\']'), 'fas fa-2x fa-plus-circle');
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  construction: () => {
    config.promises.content = getPromise('.hauptgebaude');
    config.promises.content.then(() => {
      addResMemory(lwmJQ('.greenButton'), 'building');
      lwmJQ('.greenButton,.yellowButton,.redButton').each((i, el) => {
        const textAppendix = lwmJQ(el).is('.greenButton') ? ' bauen' : ' abbrechen';
        const $td = lwmJQ(el).parent();
        $td.css('cursor', 'hand');
        $td.attr('onclick', lwmJQ(el).attr('onclick'));
        lwmJQ(el).attr('onclick', '');
        if (gmConfig.get('confirm_const')) addConfirm($td, $td.parent().find('.constructionName').text() + textAppendix);
        if (gmConfig.get('addon_clock')) {
          clearInterval(siteWindow.timeinterval_construction);
          clearInterval(siteWindow.timeinterval_construction2);
          setDataForClocks();
        }
      });
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  research: () => {
    config.promises.content = getPromise('.basisForschungen,#researchPage:contains(\'Forschungszentrale benötigt.\')');
    config.promises.content.then(() => {
      lwmJQ('.greenButton,.yellowButton,.redButton').each((i, el) => {
        const textAppendix = lwmJQ(el).is('.greenButton') ? ' forschen' : ' abbrechen';
        const $td = lwmJQ(el).parent();
        $td.css('cursor', 'hand');
        $td.attr('onclick', lwmJQ(el).attr('onclick'));
        lwmJQ(el).attr('onclick', '');
        if (gmConfig.get('confirm_research')) addConfirm($td, $td.parent().find('.researchName').text() + textAppendix);
        if (gmConfig.get('addon_clock')) {
          clearInterval(siteWindow.timeinterval_research);
          setDataForClocks();
        }
      });
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  planeten: () => {
    config.promises.content = getPromise('#planetTable');
    config.promises.content.then(() => {
      lwmJQ('tr').find('.planetButtonTd:gt(0)').remove();
      lwmJQ('#planetTable tbody tr:nth-child(5n-3) td:first-child').each((i, el) => {
        const coords = lwmJQ(el).html().match(/\d+x\d+x\d+/)[0].split('x');
        const button = `<input class="planetButton planetButtonMain" type="button" value="${lwmJQ(el).html()}" onclick="changeCords(${coords[0]}, ${coords[1]}, ${coords[2]});">`;
        lwmJQ(el).html(button);
      });
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  inbox,
  trades,
  newTrade,
  changeFleet: () => {
    config.promises.content = getPromise('#changeFlottenDiv');
    config.promises.content.then(() => {
      // button to add all ships
      const $allShips = lwmJQ('<a href="javascript:void(0)" class="lwm_selectAll"> (All)</a>');
      $allShips.appendTo(lwmJQ('#changeFlottenDiv > table th:eq(7)'));
      $allShips.clone().appendTo(lwmJQ('#changeFlottenDiv > table th:eq(8)'));

      lwmJQ('#changeFlottenDiv .lwm_selectAll').click((e) => {
        const index = lwmJQ(e.target).parent().index('#changeFlottenDiv > table th');
        lwmJQ('#changeFlottenDiv > table tr').find(`td:eq(${index}) .arrow-right`).each((i, el) => {
          let curCount = 0;
          do {
            curCount = parseInt(lwmJQ(el).prev().text(), 10);
            lwmJQ(el).click();
          } while (parseInt(lwmJQ(el).prev().text(), 10) !== curCount);
        });
      });

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  allFleets(xhr) {
    config.promises.content = getPromise('#flottenBasenPlanetDiv,#fremdeFlottenBasenDiv,#flottenBasenAllDiv,#flottenKommandoDiv,#link');
    config.promises.content.then(() => {
      // add recall button if applicable
      const fleets = lwmJQ.grep(xhr.responseJSON, (fleet) => fleet.status_king === '1');
      lwmJQ.each(fleets, (i, fleet) => {
        const $form = lwmJQ(`td:contains('${fleet.id_fleets}')`).parents('table').find('form');
        $form.append(`<a id="recallFleets" class="formButtonSpionage" href="#" onclick="changeContent('flotten_view', 'third', 'Flotten-Kommando', '${fleet.id_fleets}');"><i class="fas fa-wifi faa-flash animated"></i>L-Kom</a>`);
      });

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  shipdock: () => {
    config.promises.content = getPromise('.raumdockNameButtonDiv');
    config.promises.content.then(() => {
      // button to add all ships
      const $allShips = lwmJQ('<button class="createShipButton createFleetRaumdock" id="lwm_selectAllShips">Alle Schiffe</button>');
      $allShips.click(() => {
        lwmJQ('[onclick*=\'addNumberRaumdock\']').each((i, el) => {
          let curCount = 0;
          do {
            curCount = parseInt(lwmJQ(el).prev().text() || lwmJQ(el).prev().val(), 10);
            if (siteWindow.isNaN(curCount)) break;
            lwmJQ(el).click();
          } while (parseInt(lwmJQ(el).prev().text() || lwmJQ(el).prev().val(), 10) !== curCount);
        });
      });
      $allShips.appendTo(lwmJQ('.raumdockNameButtonDiv'));

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  calendar: () => {
    config.promises.content = getPromise('#folottenbewegungenPageDiv');
    config.promises.content.then(() => {
      // remove fleet div, we're using our own
      lwmJQ('#folottenbewegungenPageDiv').remove();

      // add our calendar table
      const $tableBase = lwmJQ(''
                    + '<div id="calendarDiv">'
                        + '<table><tbody>'
                            + '<tr><th>Player</th>'
                            + '<th>Coord</th>'
                            + '<th>Type</th>'
                            + '<th>Text</th>'
                            + '<th>Time</th>'
                            + '<th>Finished</th></tr>'
                        + '</tbody></table>'
                    + '</div>');

      if (gmConfig.get('confirm_drive_sync') && !addOns.calendar.truncateData()) driveManager.save();

      const entries = document.createDocumentFragment();
      lwmJQ.each(config.lwm.calendar, (i, entry) => {
        const tr = document.createElement('tr'); tr.setAttribute('data-username', entry.playerName); tr.setAttribute('data-coord', entry.coords); tr.setAttribute('data-type', entry.type); tr.setAttribute('data-ts', entry.ts);
        const tdName = document.createElement('td'); tdName.innerHTML = entry.playerName;
        const tdCoords = document.createElement('td'); tdCoords.innerHTML = entry.coords;
        const tdType = document.createElement('td'); tdType.innerHTML = entry.type;
        const tdText = document.createElement('td'); tdText.innerHTML = entry.text;
        const tdTS = document.createElement('td'); tdTS.innerHTML = moment(entry.ts).format('YYYY-MM-DD HH:mm:ss');
        const tdCountdown = document.createElement('td'); tdCountdown.setAttribute('id', `clock_calendar_${i}`); tdCountdown.innerHTML = moment.duration(entry.ts - moment().valueOf(), 'milliseconds').format('HH:mm:ss', { trim: false, forceLength: true });
        tr.appendChild(tdName);
        tr.appendChild(tdCoords);
        tr.appendChild(tdType);
        tr.appendChild(tdText);
        tr.appendChild(tdTS);
        tr.appendChild(tdCountdown);
        entries.appendChild(tr);
      });
      $tableBase.find('tbody')[0].appendChild(entries);

      // sort calendar
      $tableBase.find('table tbody tr:gt(0)').sort((a, b) => {
        const tsA = parseInt(lwmJQ(a).data('ts'), 10);
        const tsB = parseInt(lwmJQ(b).data('ts'), 10);
        return tsA - tsB;
      }).each((i, el) => {
        const $elem = lwmJQ(el).detach();
        lwmJQ($elem).appendTo($tableBase.find('table tbody'));
      });

      lwmJQ('.pageContent').last().append($tableBase);
      setDataForClocks();

      // set up filters
      (() => {
        const process = () => {
          $tableBase.find('tr').data('hide', false);
          const filterFunctions = {
            username(v) { $tableBase.find(`tr:gt(0)[data-username!='${v}']`).data('hide', true); },
            coord(v) { $tableBase.find(`tr:gt(0)[data-coord!='${v}']`).data('hide', true); },
            type(v) { $tableBase.find(`tr:gt(0)[data-type!='${v}']`).data('hide', true); },
          };

          lwmJQ.each(lwmJQ('.tableFilters_content > div > .activeBox'), (i, el) => {
            const filterFunction = lwmJQ(el).parent().data('filter');
            const filterValue = lwmJQ(el).parent().data('value');
            filterFunctions[filterFunction](filterValue);
          });

          lwmJQ.each($tableBase.find('tr'), (i, el) => {
            if (lwmJQ(el).data('hide')) lwmJQ(el).hide();
            else lwmJQ(el).show();
          });
        };

        const usernames = lwmJQ.map(config.lwm.calendar, (el) => el.playerName).filter((value, index, self) => self.indexOf(value) === index);
        const coords = lwmJQ.map(config.lwm.calendar, (el) => el.coords).filter((value, index, self) => self.indexOf(value) === index);
        const types = lwmJQ.map(config.lwm.calendar, (el) => el.type).filter((value, index, self) => self.indexOf(value) === index);

        const $div = lwmJQ('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
        lwmJQ.each(usernames, (i, username) => { const $button = lwmJQ(`<div class="buttonRowInbox" data-filter="username" data-value="${username}"><a class="formButton" href="javascript:void(0)">${username}</a></div>`); $button.appendTo($div.find('.tableFilters_content')); });
        lwmJQ.each(coords, (i, coord) => { const $button = lwmJQ(`<div class="buttonRowInbox" data-filter="coord" data-value="${coord}"><a class="formButton" href="javascript:void(0)">${coord}</a></div>`); $button.appendTo($div.find('.tableFilters_content')); });
        lwmJQ.each(types, (i, type) => { const $button = lwmJQ(`<div class="buttonRowInbox" data-filter="type" data-value="${type}"><a class="formButton" href="javascript:void(0)">${type}</a></div>`); $button.appendTo($div.find('.tableFilters_content')); });

        $div.find(`[data-value='${config.gameData.playerName}']`).find('.formButton').toggleClass('activeBox');
        $div.find('[data-value=\'fleet\']').find('.formButton').toggleClass('activeBox');

        $div.find('.buttonRowInbox').click((e) => { lwmJQ(e.target).toggleClass('activeBox'); process(); });
        lwmJQ('#calendarDiv').prepend($div);

        process();
      })();

      // clear fleet interval manually on this page, because add on is deactivated by default
      clearInterval(siteWindow.timeinterval_flottenbewegungen);

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  fleetCommand: () => {
    config.promises.content = getPromise('#makeCommandDiv');
    config.promises.content.then(() => {
      // save coords in lastused config
      lwmJQ('[onclick*=\'makeCommand\']').click(() => {
        const coords = [parseInt(lwmJQ('#galaxyInput').val(), 10), parseInt(lwmJQ('#systemInput').val(), 10), parseInt(lwmJQ('#planetInput').val(), 10)];
        if (lwmJQ.inArray(`${coords[0]}x${coords[1]}x${coords[2]}`, config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string]) === -1 && checkCoords(coords)) {
          config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].unshift(`${coords[0]}x${coords[1]}x${coords[2]}`);
          if (config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length > gmConfig.get('coords_fleets')) {
            config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string].length = gmConfig.get('coords_fleets');
          }
          gmSetValue('lwm_lastFleetCoords', JSON.stringify(config.lwm.lastFleetCoords));
          if (gmConfig.get('confirm_drive_sync')) driveManager.save();
        }
      });

      // add div with saved coords
      const $lastTR = lwmJQ('#makeCommandDiv tr').last();
      const $divSave = lwmJQ('<div style=\'width:100%\'></div>');
      const linksSave = [];
      lwmJQ(config.lwm.lastFleetCoords[config.gameData.playerID][config.gameData.planetCoords.string]).each((i, coords) => {
        const $link = lwmJQ(`<a href='javascript:void(0)'>${coords}</a>`);
        $link.click(() => {
          lwmJQ('#galaxyInput').val(coords.split('x')[0]);
          lwmJQ('#systemInput').val(coords.split('x')[1]);
          lwmJQ('#planetInput').val(coords.split('x')[2]);
        });
        linksSave.push($link);
      });
      lwmJQ(linksSave).each((i, l) => {
        $divSave.append(l);
        if (i !== linksSave.length - 1) $divSave.append(' - ');
      });
      $divSave.appendTo($lastTR.find('td').first());

      // remove last lcick coordinate if not prem
      if (!siteWindow.premium_account) {
        lwmJQ('#ClickLasteCordinate').remove();
      }

      // save raid prio on submit
      if (gmConfig.get('fleet_saveprios') && siteWindow.premium_account) {
        if (config.lwm.raidPrios.length === 6) {
          // fill fields if we have a saved prio
          lwmJQ('#roheisen_priority').val(config.lwm.raidPrios[0]);
          lwmJQ('#kristall_priority').val(config.lwm.raidPrios[1]);
          lwmJQ('#frubin_priority').val(config.lwm.raidPrios[2]);
          lwmJQ('#orizin_priority').val(config.lwm.raidPrios[3]);
          lwmJQ('#frurozin_priority').val(config.lwm.raidPrios[4]);
          lwmJQ('#gold_priority').val(config.lwm.raidPrios[5]);
        }

        lwmJQ('[onclick*=\'makeCommand\']').click(() => {
          // save prios
          if (lwmJQ('[name=\'type_kommand\']:checked').val() === '1') {
            const prios = [
              lwmJQ('#roheisen_priority').val(),
              lwmJQ('#kristall_priority').val(),
              lwmJQ('#frubin_priority').val(),
              lwmJQ('#orizin_priority').val(),
              lwmJQ('#frurozin_priority').val(),
              lwmJQ('#gold_priority').val(),
            ];

            if (JSON.stringify(prios) !== JSON.stringify(config.lwm.raidPrios)) {
              config.lwm.raidPrios = prios;
              gmSetValue('lwm_raidPrios', JSON.stringify(config.lwm.raidPrios));
              if (gmConfig.get('confirm_drive_sync')) driveManager.save();
            }
          }
        });
      }

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  fleetSend(fleetSendData = config.gameData.fleetSendData) {
    // save data so we have it available when browsing back and forth
    config.gameData.fleetSendData = JSON.parse(JSON.stringify(fleetSendData));
    config.promises.content = getPromise('#flottenInformationPage');
    config.promises.content.then(() => {
      const maxSpeed = fleetSendData.max_speed_transport;
      const minTimeInSeconds = moment.duration(fleetSendData.send_time, 'seconds').asSeconds();
      const maxTimeInSeconds = ((minTimeInSeconds / (2 - (maxSpeed / 100))) * (2 - (20 / 100)));

      // round up to the next five mintue interval
      const start = moment().add(minTimeInSeconds, 'seconds');
      const remainder = 5 - (start.minute() % 5);
      const minDate = moment(start).add(remainder, 'minutes').startOf('minute');
      const maxDate = moment().add(maxTimeInSeconds * 2, 'seconds');

      // build time choose select
      const $select = lwmJQ('<select id="lwm_fleet_selecttime"><option value="" selected>Pick Return Hour</option></select>');
      while (minDate.valueOf() < maxDate.valueOf()) {
        $select.append(`<option>${minDate.format('YYYY-MM-DD HH:mm:ss')}</option>`);
        // increment minutes for next option
        minDate.add(5, 'minutes');
      }

      const disableOptions = () => {
        const $oneway = lwmJQ('#lwm_fleet_oneway').is(':checked');
        /* disable options that don't fit speed of fleet */
        $select.find('option:gt(0)').each((i, el) => {
          const timeDiffInSeconds = moment(lwmJQ(el).val()).diff(moment(), 'seconds') / ($oneway ? 1 : 2);
          const minSpeedInSeconds = ((minTimeInSeconds / (2 - (maxSpeed / 100))) * (2 - (20 / 100)));
          lwmJQ(el).prop('disabled', minSpeedInSeconds < timeDiffInSeconds || minTimeInSeconds > timeDiffInSeconds);
        });
      };

      disableOptions();

      const sendFleetTimeRequest = (speed, type = 'send') => {
        siteWindow.jQuery.post('./ajax_request/count_time.php', {
          id_broda: siteWindow.flotten_informations_infos.id_broda,
          tip_broda: siteWindow.flotten_informations_infos.tip_broda,
          Units: siteWindow.flotten_informations_infos.Units,
          id_flote: siteWindow.flotten_informations_infos.id_flote,
          speed,
        }, (data) => {
          if (type === 'send') {
            siteWindow.flotten_informations_infos.send_time = data;
            siteWindow.flotten_informations_infos.speed_send = speed;
          } else {
            siteWindow.flotten_informations_infos.back_time = data;
            siteWindow.flotten_informations_infos.speed_back = speed;
          }

          let seconds = parseInt(data, 10);

          let hours = Math.floor(seconds / 3600);
          seconds -= hours * 3600;
          let minutes = Math.floor(seconds / 60);
          seconds -= minutes * 60;

          if (hours <= 9) {
            hours = `0${hours}`;
          }

          if (minutes <= 9) {
            minutes = `0${minutes}`;
          }

          if (seconds <= 9) {
            seconds = `0${seconds}`;
          }

          if (type === 'send') {
            siteWindow.jQuery('#sendTime').text(`Flugzeit: ${hours}:${minutes}:${seconds} Stunden`);
          } else {
            siteWindow.jQuery('#backTime').text(`Flugzeit: ${hours}:${minutes}:${seconds} Stunden`);
          }
        });
      };

      const calcFleetTime = () => {
        disableOptions();
        const $val = lwmJQ('#lwm_fleet_selecttime').val();
        const $momentVal = moment($val);
        const $oneway = lwmJQ('#lwm_fleet_oneway').is(':checked');
        if (!$val) {
          lwmJQ('.changeTime').val(maxSpeed);
          sendFleetTimeRequest(maxSpeed, 'send');
          sendFleetTimeRequest(maxSpeed, 'back');
          if ($val === null) {
            // val === null means options disabled
            alert('WARNING: Choice is not possible due to fleet speed');
            lwmJQ('.changeTime').val('20');
            siteWindow.jQuery('.changeTime').change();
            sendFleetTimeRequest(20, 'send');
            sendFleetTimeRequest(20, 'back');
          }
        } else {
          // calculate speed for given return time
          let timeDiffInSeconds = $momentVal.diff(moment(), 'seconds') / ($oneway ? 1 : 2);
          const minSpeedInSeconds = ((minTimeInSeconds / (2 - (maxSpeed / 100))) * (2 - (20 / 100)));
          if (minSpeedInSeconds < timeDiffInSeconds || minTimeInSeconds > timeDiffInSeconds) {
            alert('WARNING: Choice is not possible due to fleet speed');
            lwmJQ('.changeTime').val('20');
            siteWindow.jQuery('.changeTime').change();
            sendFleetTimeRequest(20, 'send');
            sendFleetTimeRequest(20, 'back');
            return;
          }
          const type = $oneway ? '0' : lwmJQ('#lwm_fleet_type').val();
          let sendSpeed; let returnSpeed; let curSpeed; let sendSpeedInSeconds; let
            returnSpeedInSeconds;
          const newSpeed = Math.round((1 - ((((timeDiffInSeconds - (minTimeInSeconds / (2 - (parseInt(maxSpeed, 10) / 100))))
            / ((minTimeInSeconds / (2 - (parseInt(maxSpeed, 10) / 100))) * 0.01))) / 100)) * 100);
          switch (type) {
            case '0':
              lwmJQ('.changeTime').val(newSpeed);
              sendFleetTimeRequest(newSpeed, 'send');
              sendFleetTimeRequest(newSpeed, 'back');
              break;
            case '1':
              // ignore one way
              timeDiffInSeconds = $momentVal.diff(moment(), 'seconds');
              sendSpeed = 0;
              returnSpeed = 0;
              curSpeed = 20;
              do {
                // calculate 20% speed in seconds
                sendSpeed = curSpeed;
                sendSpeedInSeconds = (minTimeInSeconds / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100));
                // subtract and see whether return is still possible
                returnSpeedInSeconds = timeDiffInSeconds - sendSpeedInSeconds;
                returnSpeed = Math.round((1 - ((((returnSpeedInSeconds - (minTimeInSeconds / (2 - (parseInt(maxSpeed, 10) / 100))))
                  / ((minTimeInSeconds / (2 - (parseInt(maxSpeed, 10) / 100))) * 0.01))) / 100)) * 100);
                curSpeed += 1;
              } while (returnSpeed < 20 || returnSpeed > maxSpeed);
              lwmJQ('#send').val(returnSpeed);
              sendFleetTimeRequest(returnSpeed, 'send');
              lwmJQ('#back').val(sendSpeed);
              sendFleetTimeRequest(sendSpeed, 'back');
              break;
            case '2':
              // ignore one way
              timeDiffInSeconds = $momentVal.diff(moment(), 'seconds');
              sendSpeed = 0;
              returnSpeed = 0;
              curSpeed = 20;
              do {
                // calculate 20% speed in seconds
                sendSpeed = curSpeed;
                sendSpeedInSeconds = (minTimeInSeconds / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100));
                // subtract and see whether return is still possible
                returnSpeedInSeconds = timeDiffInSeconds - sendSpeedInSeconds;
                returnSpeed = Math.round((1 - ((((returnSpeedInSeconds - (minTimeInSeconds / (2 - (parseInt(maxSpeed, 10) / 100))))
                  / ((minTimeInSeconds / (2 - (parseInt(maxSpeed, 10) / 100))) * 0.01))) / 100)) * 100);
                curSpeed += 1;
              } while (returnSpeed < 20 || returnSpeed > maxSpeed);
              lwmJQ('#send').val(sendSpeed);
              sendFleetTimeRequest(sendSpeed, 'send');
              lwmJQ('#back').val(returnSpeed);
              sendFleetTimeRequest(returnSpeed, 'back');
              break;
            default: break;
          }
        }
      };

      const $selectWrap = lwmJQ('<div></div>');
      $selectWrap.append($select);
      const $wrapper = lwmJQ('<div>');
      $wrapper.attr('id', 'lwm_fleet_timer_wrapper');
      $wrapper.append($selectWrap);
      $wrapper.append('<div><select id="lwm_fleet_type"><option value="0">Send / Return Balanced</option><option value="1">Send Fast/ Return Slow</option><option value="2">Send Slow/Return Fast</option></select></div>');
      $wrapper.append('<div><label style="display:flex;align-items:center;"><input type="checkbox" id="lwm_fleet_oneway">Oneway</label></div>');

      $select.change(() => { calcFleetTime(); });
      $wrapper.find('#lwm_fleet_oneway').change((e) => { calcFleetTime(); lwmJQ('#lwm_fleet_type').prop('disabled', lwmJQ(e.target).is(':checked')); });
      $wrapper.find('#lwm_fleet_type').change(() => { calcFleetTime(); });

      lwmJQ('#timeFlote').after($wrapper);

      // when next is clicked, remove wrapper
      lwmJQ('#nextSite').on('click', () => {
        $wrapper.remove();
        lwmJQ('#nextSite').off('click');
        lwmJQ('#backSite').on('click', () => {
          pageTweaks.fleetSend();
          // has to be triggered, otherwise some stuff doesn't work => flotten_information.js
          const fii = siteWindow.flotten_informations_infos;
          lwmJQ('#send').change(() => {
            fii.speed_send = parseInt(lwmJQ('#send').val(), 10);
            if (fii.speed_send > fii.sped_transport) {
              fii.speed_send = fii.sped_transport;
            } else if (fii.speed_send < 20) {
              fii.speed_send = 20;
            }
            lwmJQ('#send').val(fii.speed_send);
            siteWindow.jQuery.post('./ajax_request/count_time.php', {
              id_broda: fii.id_broda, tip_broda: fii.tip_broda, Units: fii.Units, id_flote: fii.id_flote, speed: fii.speed_send,
            }, (data) => {
              lwmJQ('#sendTime').empty();
              fii.send_time = data;
              lwmJQ('#sendTime').text(`Flugzeit: ${data} Stunden`);
            });
          });

          lwmJQ('#back').change(() => {
            fii.speed_back = parseInt(lwmJQ('#back').val(), 10);
            if (fii.speed_back > fii.sped_transport) {
              fii.speed_back = fii.sped_transport;
            } else if (fii.speed_back < 20) {
              fii.speed_back = 20;
            }
            lwmJQ('#back').val(fii.speed_back);
            siteWindow.jQuery.post('./ajax_request/count_time.php', {
              id_broda: fii.id_broda, tip_broda: fii.tip_broda, Units: fii.Units, id_flote: fii.id_flote, speed: fii.speed_back,
            }, (data) => {
              lwmJQ('#backTime').empty();
              fii.back_time = data;
              lwmJQ('#backTime').text(`Flugzeit: ${data} Stunden`);
            });
          });
          lwmJQ('#backSite').off('click');
        });
      });

      // pre-select defined sets
      const presets = [];
      [1, 2, 3, 4, 5].forEach((i) => {
        if (gmConfig.get(`fleet_presets_${i}_active`)) {
          presets.push({ time: gmConfig.get(`fleet_presets_${i}_time`), days: gmConfig.get(`fleet_presets_${i}_weekday`) });
        }
      });
      if (presets.length) {
        // eslint-disable-next-line no-nested-ternary
        presets.sort((a, b) => ((a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0)));

        let found = false;
        lwmJQ.each(lwmJQ('#lwm_fleet_selecttime').find('option:gt(0)'), (i, el) => {
          const $el = lwmJQ(el);
          const hour = moment($el.text()).hour();
          const minute = moment($el.text()).minute();
          const weekday = moment($el.text()).day();

          const weekdaysToValues = {
            All: [0, 1, 2, 3, 4, 5, 6],
            Mon: [1],
            Tue: [2],
            Wed: [3],
            Thu: [4],
            Fri: [5],
            Sat: [6],
            Sun: [0],
            Weekday: [1, 2, 3, 4, 5],
            Weekend: [0, 6],
          };

          presets.forEach((preset) => {
            const preHour = parseInt(preset.time.split(':')[0], 10);
            const preMinute = parseInt(preset.time.split(':')[1], 10);

            if (hour === preHour && preMinute === minute && weekdaysToValues[preset.days].includes(weekday)) {
              if (!found && $el.is(':not(\'[disabled]\')')) {
                lwmJQ('#lwm_fleet_selecttime').val($el.val());
                calcFleetTime();
                found = true;
              }
              $el.addClass('lwm_preselect');
            }
          });
        });
      }

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  spyInfo(data) {
    if (Object.keys(data.observations_drons).length === 0
        && Object.keys(data.planetenscanner_drons).length === 0
        && Object.keys(data.system_drons).length === 0) config.loadStates.content = false;
    else {
      config.promises.content = getPromise('#spionageDiv');
      config.promises.content.then(() => {
        lwmJQ('#spionageDiv tr').each((i, el) => {
          if (lwmJQ(el).find('td:eq(4)').text() === '0') lwmJQ(el).hide();
        });

        config.loadStates.content = false;
      }).catch((e) => {
        Sentry.captureException(e);
        // console.log(e);
        throwError();
        config.loadStates.content = false;
      });
    }
  },
  galaxyView: () => {
    config.promises.content = getPromise('#galaxyViewInfoTable');
    config.promises.content.then(() => {
      lwmJQ('a.flottenKommandoAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-fighter-jet fa-stack-1x"></i>');
      lwmJQ('a.newTradeOfferAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-handshake fa-stack-1x"></i>');
      lwmJQ('a.spionagePlanetenscannerAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-search fa-stack-1x"></i>');
      lwmJQ('a.spionageObservationsAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-search-plus fa-stack-1x"></i>');
      lwmJQ('a.changePlanetAction').addClass('fa-stack').append('<i class="far fa-circle fa-stack-2x"></i>').append('<i class="fas fa-exchange-alt fa-stack-1x"></i>');

      const parseCoords = (coordsText) => {
        const coords = coordsText.split('x');
        [coords[0]] = coords[0].match(/\d+/);
        [coords[1]] = coords[1].match(/\d+/);
        [coords[2]] = coords[2].match(/\d+/); // filter planet type
        return coords;
      };

      lwmJQ('#galaxyViewInfoTable tr').find('td:eq(3)').each((i, el) => {
        const value = lwmJQ(el).text();
        const coords = parseCoords(lwmJQ(el).parents('tr').find('td').first()
          .text());
        const coordData = config.lwm.planetData[`${coords[0]}x${coords[1]}x${coords[2]}`];
        // add spy buttons for planets that's missing it
        if (value !== '' && value !== 'false' && value !== '0') {
          const spydrones = lwmJQ.grep(config.gameData.spionageInfos.planetenscanner_drons, (el2) => el2.engine_type === 'IOB' && parseInt(el2.number, 10) > 0);
          const obsdrones = lwmJQ.grep(config.gameData.spionageInfos.observations_drons, (el2) => el2.engine_type === 'IOB' && parseInt(el2.number, 10) > 0);
          const existingObs = getActiveObs(coords);
          const hasSpy = lwmJQ(el).next().find('.spionagePlanetenscannerAction').length > 0;
          const hasObs = lwmJQ(el).next().find('.spionageObservationsAction').length > 0;
          if (!hasObs && (obsdrones.length > 0 || existingObs.length !== 0)) lwmJQ(el).next().append('<a href="#" class="actionClass spionageObservationsAction fa-stack" onclick="javascript:void(0)"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search-plus fa-stack-1x"></i></a>');
          if (!hasSpy && spydrones.length > 0) lwmJQ(el).next().append('<a href="#" class="actionClass spionagePlanetenscannerAction fa-stack" onclick="javascript:void(0)"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search fa-stack-1x"></i></a>');
        }

        // add stealth info
        if (value !== '' && value !== 'false' && value !== '0' && coordData) {
          lwmJQ(el).next().append(`<div title="Tarntechnologie" class="actionClass fa-stack popover" style="color: #3c3ff5;"><i class="far fa-circle fa-stack-2x"></i><span>${coordData.Tarntechnologie}</span></div>`);
        }
      });

      // add spionage actions
      lwmJQ('a.spionagePlanetenscannerAction').each((i, el) => {
        lwmJQ(el).attr('onclick', 'void(0)');
        const coords = parseCoords(lwmJQ(el).parents('tr').find('td').first()
          .text());
        lwmJQ(el).click(() => { performSpionage(coords); });
      });
      lwmJQ('a.spionageObservationsAction').each((i, el) => {
        lwmJQ(el).attr('onclick', 'void(0)');
        const coords = parseCoords(lwmJQ(el).parents('tr').find('td').first()
          .text());

        // check for obs
        const existingObs = getActiveObs(coords);
        if (existingObs.length !== 0) {
          // obs found... open!
          lwmJQ(el).click(() => {
            if (gmConfig.get('obs_opentabs')) {
              lwmWindow.open(`view/content/new_window/observationen_view.php?id=${existingObs[0].id}`);
            } else {
              siteWindow.openObservationWindow(existingObs[0].id);
            }
          }).css('color', '#66f398');
        } else {
          // otherwise offer sending one
          lwmJQ(el).click(() => { performObservation(coords); });
        }
      });

      // move observation and search div
      lwmJQ('.headerOfGalaxyViewPage').insertBefore(lwmJQ('#tableForChangingPlanet'));

      // add search icons
      replaceElementsHtmlWithIcon(lwmJQ('.formButtonGalaxyView'), 'fas fa-search');

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  obs: () => {
    config.promises.content = getPromise('#observationenDiv');
    config.promises.content.then(() => {
      // add sort options buttons to obs table
      const $table = lwmJQ('#observationenDiv table').eq(0);
      // add initial order to be able to restore it
      $table.find('tr').each((i, tr) => { lwmJQ(tr).data('order', i); });
      // sort by coords
      const $thCoord = $table.find('th').eq(1);
      const $thExpire = $table.find('th').eq(3);
      $thCoord.append('<i class="fas fa-sort" style="float:right;"></i>').css('cursor', 'hand');
      $thExpire.append('<i class="fas fa-sort" style="float:right;"></i>').css('cursor', 'hand');
      $thCoord.click(() => {
        $table.find('tr:gt(0)').sort((a, b) => {
          const coordsA = lwmJQ(a).find('td:eq(1)').text().split('x');
          const coordsAValue = parseInt(coordsA[0], 10) * 10000 + parseInt(coordsA[1], 10) * 100 + parseInt(coordsA[2], 10);
          const coordsB = lwmJQ(b).find('td:eq(1)').text().split('x');
          const coordsBValue = parseInt(coordsB[0], 10) * 10000 + parseInt(coordsB[1], 10) * 100 + parseInt(coordsB[2], 10);
          return coordsAValue - coordsBValue;
        }).each((i, el) => {
          const $elem = lwmJQ(el).detach();
          lwmJQ($elem).appendTo($table);
        });
      });
      $thExpire.click((e) => {
        $table.find('tr:gt(0)').sort((a, b) => lwmJQ(a).data('order') - lwmJQ(b).data('order')).each(() => {
          const $elem = lwmJQ(e.target).detach();
          lwmJQ($elem).appendTo($table);
        });
      });

      // attach re-send obs button and TT info
      lwmJQ.each(lwmJQ('#observationenDiv table').first().find('tr:gt(0)'), (i, el) => {
        const $td = lwmJQ(el).find('td').eq(0);
        const coords = lwmJQ(el).find('td').eq(1).text()
          .split('x');
        const coordData = config.lwm.planetData[`${coords[0]}x${coords[1]}x${coords[2]}`];
        $td.append(['<a href="#" style="font-size: 0.75em;float: right;" class="fa-stack"><i class="far fa-circle fa-stack-2x"></i><i class="fas fa-search-plus fa-stack-1x"></i></a>',
          `<div style="color: #3c3ff5;font-size: 0.75em;float: right;" class="fa-stack"><i class="far fa-circle fa-stack-2x"></i><span>${coordData ? coordData.Tarntechnologie : '?'}</span></div>`]);
        $td.find('a').click(() => { performObservation(coords); });
      });

      // replace obs links
      if (gmConfig.get('obs_opentabs')) {
        lwmJQ.each(lwmJQ('#observationenDiv a[onclick*=\'openObservationWindow\']'), (i, el) => {
          const $self = lwmJQ(el);
          const id = $self.attr('onclick').match(/\d+/)[0];
          $self.attr('onclick', '').attr('target', '_blank').attr('href', `view/content/new_window/observationen_view.php?id=${id}`);
        });
        // window.open('view/content/new_window/observationen_view.php?id=' + id, 'newwindow', 'scrollbars=yes, width=900px, height=550px');
      }

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  designShips: () => {
    config.promises.content = getPromise('#schiffskomponentenDiv');
    config.promises.content.then(() => {
      // lwmJQ('#create').click(() => { config.gameData.reloads.productionInfos = 'production'; });
      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  buildingTree,
  resources: () => {
    config.promises.content = getPromise('#rohstoffeDiv');
    config.promises.content.then(() => {
      // add time that's needed to reach capacity
      const resTotal = siteWindow.getResourcePerHour();
      const resTypes = ['roheisen', 'kristall', 'frubin', 'orizin', 'frurozin', 'gold'];
      const resValue = [siteWindow.Roheisen, siteWindow.Kristall, siteWindow.Frubin, siteWindow.Orizin, siteWindow.Frurozin, siteWindow.Gold];
      const incomingRes = getIncomingResArray();

      lwmJQ('#rohstoffeDiv > .rohstoffeTableClass > tbody > tr > td > .rohstoffeTableClass').find('> tbody > tr:eq(4)').each((i, el) => {
        if (!resTotal[0][resTypes[i]]) return true;
        const hoursTillFull = (siteWindow.resourceCapacityArray[i] - resValue[i] - incomingRes[i]) / (resTotal[0][resTypes[i]]);
        lwmJQ(el).after(`<tr><td class="second" valign="top" align="right">Time till capacity reached:</td><td class="second" ><span class='${hoursTillFull < 8 ? 'redBackground' : ''}' id='clock_lwm_${resTypes[i]}'>${moment.duration(hoursTillFull, 'hours').format('HH:mm:ss', { trim: false, forceLength: true })}</span></td></tr>`);
        return true;
      });

      setDataForClocks();

      if (config.gameData.planets.length === Object.values(config.lwm.resProd[config.gameData.playerID]).length) {
        // add resources analysis

        const resTotals = {
          fe: lwmJQ.map(config.lwm.resProd[config.gameData.playerID], (planet) => planet.roheisen).reduce((total, num) => total + num),
          kris: lwmJQ.map(config.lwm.resProd[config.gameData.playerID], (planet) => planet.kristall).reduce((total, num) => total + num),
          frub: lwmJQ.map(config.lwm.resProd[config.gameData.playerID], (planet) => planet.frubin).reduce((total, num) => total + num),
          ori: lwmJQ.map(config.lwm.resProd[config.gameData.playerID], (planet) => planet.orizin).reduce((total, num) => total + num),
          fruro: lwmJQ.map(config.lwm.resProd[config.gameData.playerID], (planet) => planet.frurozin).reduce((total, num) => total + num),
          gold: lwmJQ.map(config.lwm.resProd[config.gameData.playerID], (planet) => planet.gold).reduce((total, num) => total + num),
        };

        const $table = lwmJQ(`${'<table id="lwm_resourceTotal"><tbody>'
                        + '<tr><th colspan="7">Total Production For All Planets</th></tr>'
                        + '<tr>'
                        + '<th class="sameWith"></td>'
                        + '<th class="sameWith roheisenVariable">Roheisen</td>'
                        + '<th class="sameWith kristallVariable">Kristall</td>'
                        + '<th class="sameWith frubinVariable">Frubin</td>'
                        + '<th class="sameWith orizinVariable">Orizin</td>'
                        + '<th class="sameWith frurozinVariable">Frurozin</td>'
                        + '<th class="sameWith goldVariable">Gold</td>'
                        + '</tr>'
                        + '<tr>'
                        + '<td class="">per hour</td>'
                        + '<td class="roheisenVariable">'}${siteWindow.jQuery.number(resTotals.fe, 0, ',', '.')}</td>`
                        + `<td class="kristallVariable">${siteWindow.jQuery.number(resTotals.kris, 0, ',', '.')}</td>`
                        + `<td class="frubinVariable">${siteWindow.jQuery.number(resTotals.frub, 0, ',', '.')}</td>`
                        + `<td class="orizinVariable">${siteWindow.jQuery.number(resTotals.ori, 0, ',', '.')}</td>`
                        + `<td class="frurozinVariable">${siteWindow.jQuery.number(resTotals.fruro, 0, ',', '.')}</td>`
                        + `<td class="goldVariable">${siteWindow.jQuery.number(resTotals.gold, 0, ',', '.')}</td>`
                        + '</tr>'
                        + '<tr>'
                        + '<td class="">per day</td>'
                        + `<td class="roheisenVariable">${siteWindow.jQuery.number(resTotals.fe * 24, 0, ',', '.')}</td>`
                        + `<td class="kristallVariable">${siteWindow.jQuery.number(resTotals.kris * 24, 0, ',', '.')}</td>`
                        + `<td class="frubinVariable">${siteWindow.jQuery.number(resTotals.frub * 24, 0, ',', '.')}</td>`
                        + `<td class="orizinVariable">${siteWindow.jQuery.number(resTotals.ori * 24, 0, ',', '.')}</td>`
                        + `<td class="frurozinVariable">${siteWindow.jQuery.number(resTotals.fruro * 24, 0, ',', '.')}</td>`
                        + `<td class="goldVariable">${siteWindow.jQuery.number(resTotals.gold * 24, 0, ',', '.')}</td>`
                        + '</tr>'
                        + '</tbody></table>');

        $table.prependTo('#rohstoffeDiv');
      }

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  credit: () => {
    config.promises.content = getPromise('#kreditinstitutDiv');
    config.promises.content.then(() => {
      // fix a bug leading to credit institute reporting an error even though you can technically get the credit
      lwmJQ('#hoursKredit').change(() => {
        siteWindow.max_resource.forEach((value, i) => {
          siteWindow.max_resource[i] = parseInt(value.replace('.', ''), 10);
        });
      });

      lwmJQ('[type=\'number\']').after('<i class="fas fa-2x fa-angle-double-left"></i>');
      lwmJQ('.fa-angle-double-left').each((i, el) => {
        lwmJQ(el).parent().css('display', 'flex');
        lwmJQ(el).parent().css('justify-content', 'space-evenly');
        lwmJQ(el).parent().css('align-items', 'center');
        lwmJQ(el).click(() => {
          const $input = lwmJQ(el).parent().find('input');
          $input.val(lwmJQ(el).parents('tr').find('[id*=\'max\']').text()
            .replace(/\D/, ''));
        });
      });

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
  bank(responseJSON) {
    config.promises.content = getPromise('#bankDiv');
    config.promises.content.then(() => {
      // null checks
      if (typeof responseJSON.interest === 'undefined'
          || typeof responseJSON.resource === 'undefined'
          || typeof responseJSON.bank_limit === 'undefined') {
        throwError();
        config.loadStates.content = false;
        return;
      }
      const calcInterest = parseFloat(responseJSON.interest) < 0 ? 0 : parseFloat(responseJSON.interest) / 100;
      // add button to fill bank minus interest
      const $wrapper = lwmJQ('<div class="buttonRow" style="width: 100%; margin-left: 0;"></div>');
      const $buttonFill = lwmJQ('<a class="formButtonNewMessage" style="float:none;" href="#">Fill Bank</a>');
      $buttonFill.click(() => {
        alert('WARNING: This function does not respect transactions that are not yet processed. Make sure you do not overflow your bank before submitting!');
        const maxPossibleRes = {
          roheisen: (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.roheisen, 10) < 0
            ? 0 : (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.roheisen, 10),
          kristall: (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.kristall, 10) < 0
            ? 0 : (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.kristall, 10),
          frubin: (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.frubin, 10) < 0
            ? 0 : (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.frubin, 10),
          orizin: (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.orizin, 10) < 0
            ? 0 : (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.orizin, 10),
          frurozin: (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.frurozin, 10) < 0
            ? 0 : (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.frurozin, 10),
          gold: (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.gold, 10) < 0
            ? 0 : (responseJSON.bank_limit / (1 + calcInterest)) - parseInt(responseJSON.resource.gold, 10),
        };

        lwmJQ('#typeTransaction').val('putIn');
        lwmJQ('#roheisenInputBank').val(parseInt(siteWindow.Roheisen > maxPossibleRes.roheisen ? maxPossibleRes.roheisen : siteWindow.Roheisen, 10));
        lwmJQ('#kristallInputBank').val(parseInt(siteWindow.Kristall > maxPossibleRes.kristall ? maxPossibleRes.kristall : siteWindow.Kristall, 10));
        lwmJQ('#frubinInputBank').val(parseInt(siteWindow.Frubin > maxPossibleRes.frubin ? maxPossibleRes.frubin : siteWindow.Frubin, 10));
        lwmJQ('#orizinInputBank').val(parseInt(siteWindow.Orizin > maxPossibleRes.orizin ? maxPossibleRes.orizin : siteWindow.Orizin, 10));
        lwmJQ('#frurozinInputBank').val(parseInt(siteWindow.Frurozin > maxPossibleRes.frurozin ? maxPossibleRes.frurozin : siteWindow.Frurozin, 10));
        lwmJQ('#goldInputBank').val(parseInt(siteWindow.Gold > maxPossibleRes.gold ? maxPossibleRes.gold : siteWindow.Gold, 10));
      });

      // add button to withdraw interest
      const $buttonWithdraw = lwmJQ('<a class="formButtonNewMessage" style="float:none;" href="#">Withdraw Interest</a>');
      $buttonWithdraw.click(() => {
        const withdrawableInterest = {
          roheisen: parseInt(responseJSON.resource.roheisen, 10) - (responseJSON.bank_limit / (1 + calcInterest)) < 0
            ? 0 : parseInt(responseJSON.resource.roheisen, 10) - (responseJSON.bank_limit / (1 + calcInterest)),
          kristall: parseInt(responseJSON.resource.kristall, 10) - (responseJSON.bank_limit / (1 + calcInterest)) < 0
            ? 0 : parseInt(responseJSON.resource.kristall, 10) - (responseJSON.bank_limit / (1 + calcInterest)),
          frubin: parseInt(responseJSON.resource.frubin, 10) - (responseJSON.bank_limit / (1 + calcInterest)) < 0
            ? 0 : parseInt(responseJSON.resource.frubin, 10) - (responseJSON.bank_limit / (1 + calcInterest)),
          orizin: parseInt(responseJSON.resource.orizin, 10) - (responseJSON.bank_limit / (1 + calcInterest)) < 0
            ? 0 : parseInt(responseJSON.resource.orizin, 10) - (responseJSON.bank_limit / (1 + calcInterest)),
          frurozin: parseInt(responseJSON.resource.frurozin, 10) - (responseJSON.bank_limit / (1 + calcInterest)) < 0
            ? 0 : parseInt(responseJSON.resource.frurozin, 10) - (responseJSON.bank_limit / (1 + calcInterest)),
          gold: parseInt(responseJSON.resource.gold, 10) - (responseJSON.bank_limit / (1 + calcInterest)) < 0
            ? 0 : parseInt(responseJSON.resource.gold, 10) - (responseJSON.bank_limit / (1 + calcInterest)),
        };

        lwmJQ('#typeTransaction').val('takeOut');
        lwmJQ('#roheisenInputBank').val(parseInt(withdrawableInterest.roheisen, 10));
        lwmJQ('#kristallInputBank').val(parseInt(withdrawableInterest.kristall, 10));
        lwmJQ('#frubinInputBank').val(parseInt(withdrawableInterest.frubin, 10));
        lwmJQ('#orizinInputBank').val(parseInt(withdrawableInterest.orizin, 10));
        lwmJQ('#frurozinInputBank').val(parseInt(withdrawableInterest.frurozin, 10));
        lwmJQ('#goldInputBank').val(parseInt(withdrawableInterest.gold, 10));
      });

      $wrapper.append([$buttonFill, $buttonWithdraw]);
      lwmJQ('#bankDiv table:eq(0) tr:eq(3) td:eq(0)').append($wrapper);

      config.loadStates.content = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.content = false;
    });
  },
};

export default pageTweaks;
