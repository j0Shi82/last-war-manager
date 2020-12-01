import config from 'config/lwmConfig';
import {
  lwmJQ, siteWindow,
} from 'config/globals';
import gmConfig from 'plugins/GM_config';
import { throwError } from 'utils/helper';
import { createElementFromHTML } from 'utils/domHelper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';

import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

const { document } = siteWindow;

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

const addOptionsToTimeSelect = (selectEl, minDate, maxDate) => {
  const remainder = 5 - (minDate.minute() % 5);
  const minDateInterval = moment(minDate).add(remainder, 'minutes').startOf('minute');
  const options = selectEl.querySelectorAll('option:not(:first-child)');
  options.forEach((o) => o.remove());
  while (minDateInterval.valueOf() < maxDate.valueOf()) {
    const option = createElementFromHTML(`<option value="${minDateInterval.valueOf()}">${minDateInterval.format('YYYY-MM-DD HH:mm:ss')}</option>`);
    selectEl.appendChild(option);
    minDateInterval.add(5, 'minutes');
  }
};

const fleetSend = (fleetSendData = config.gameData.fleetSendData) => {
  // save data so we have it available when browsing back and forth
  config.gameData.fleetSendData = JSON.parse(JSON.stringify(fleetSendData));
  config.promises.content = getPromise('#flottenInformationPage');
  config.promises.content.then(() => {
    const maxSpeed = parseInt(fleetSendData.max_speed_transport, 10);
    const minTimeInSecs = moment.duration(fleetSendData.send_time, 'seconds').asSeconds();
    const maxTimeInSecs = ((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (20 / 100)));

    // round up to the next five mintue interval
    const minDateArrival = moment().add(minTimeInSecs, 'seconds');
    const maxDateArrival = moment().add(maxTimeInSecs, 'seconds');
    const minDateReturn = moment().add(minTimeInSecs * 2, 'seconds');
    const maxDateReturn = moment().add(maxTimeInSecs * 2, 'seconds');

    // build choose time selects
    const optionWrapper = createElementFromHTML('<div id="lwm_fleet_timer_wrapper"></div>');

    const timingTypeDiv = createElementFromHTML('<div><select id="lwm_fleet_type"><option value="0">Pick Fleet Timing Function</option><option value="1">Send / Return Balanced</option><option value="2">Send Fast/ Return Slow</option><option value="3">Send Slow/Return Fast</option></select></div>');
    const timingTypeSelect = timingTypeDiv.querySelector('select');
    const onewayDiv = createElementFromHTML('<div><label style="display:flex;align-items:center;"><input type="checkbox" id="lwm_fleet_oneway">Oneway</label></div>');
    const arrivalSelect = createElementFromHTML(`<select id="lwm_fleet_selectarrivaltime"><option value="${minDateArrival.valueOf()}" selected>Pick Arrival Time</option></select>`);
    addOptionsToTimeSelect(arrivalSelect, minDateArrival, maxDateArrival);
    const returnSelect = createElementFromHTML(`<select id="lwm_fleet_selectreturntime"><option value="${minDateReturn.valueOf()}" selected>Pick Return Time</option></select>`);
    addOptionsToTimeSelect(returnSelect, minDateReturn, maxDateReturn);
    const onewayCheckbox = onewayDiv.querySelector('#lwm_fleet_oneway');
    const sendSpeedInput = document.querySelector('#send.changeTime');
    const returnSpeedInput = document.querySelector('#back.changeTime');

    const toggleReturnSelect = () => {
      const onewayCheckboxIsChecked = onewayCheckbox.checked;
      if (onewayCheckboxIsChecked) {
        returnSelect.value = '';
        returnSelect.style.display = 'none';
      } else {
        returnSelect.style.display = 'block';
      }
    };

    toggleReturnSelect();

    const calcSpeed = (startDate, endDate) => {
      const timeDiffInSecs = parseInt(((endDate.valueOf() - startDate.valueOf()) / 1000), 10);
      return parseInt((
        1 - (
          (
            (
              (timeDiffInSecs - (minTimeInSecs / (2 - (maxSpeed / 100))))
              / ((minTimeInSecs / (2 - (maxSpeed / 100))) * 0.01)
            )
          ) / 100
        )
      ) * 100, 10);
    };

    const calcFleetTime = (from = 'arrival') => {
      //   toggleReturnSelect();
      let curSpeed = 20;
      const arrivalTime = moment(parseInt(arrivalSelect.value, 10));
      const arrivalMinAddTime = moment(parseInt(arrivalSelect.value, 10)).add(minTimeInSecs, 'seconds');
      const arrivalMaxAddTime = moment(parseInt(arrivalSelect.value, 10)).add(maxTimeInSecs, 'seconds');
      let sendSpeed = calcSpeed(moment(), arrivalTime);
      let returnTime = moment(parseInt(returnSelect.value, 10));
      let returnSpeed = calcSpeed(arrivalTime, returnTime);
      const onewayCheckboxIsChecked = onewayCheckbox.checked;
      const timingType = timingTypeSelect.value;
      switch (from) {
        case 'arrival':
          // arrival changed means we might have to tweak return time
          if (onewayCheckboxIsChecked) {
            document.querySelector('#send').val(returnSpeed);
            sendSpeedInput.value = sendSpeed;
            sendFleetTimeRequest(sendSpeed, 'send');
            returnSpeedInput.value = sendSpeed;
            sendFleetTimeRequest(sendSpeed, 'back');
          } else {
            sendSpeedInput.value = sendSpeed;
            sendFleetTimeRequest(sendSpeed, 'send');
            // rebuild select to match new arrival speed
            addOptionsToTimeSelect(returnSelect, arrivalMinAddTime, arrivalMaxAddTime);
            // if returnSpeed is no longer possible due to arrival time, change to max speed
            if (returnSpeed < 20 || returnSpeed > maxSpeed) {
              returnSpeed = maxSpeed;
              returnTime = moment(arrivalMinAddTime).add(5 - (arrivalMinAddTime.minute() % 5), 'minutes').startOf('minute').valueOf();
            }
            // (re)pick value in return select
            returnSpeedInput.value = returnSpeed;
            returnSelect.value = returnTime.valueOf();
          }
          break;
        case 'return':
          // arrival changed means we might have to tweak arrival time
          switch (timingType) {
            case '0':
              sendSpeedInput.value = sendSpeed;
              sendFleetTimeRequest(sendSpeed, 'send');
              returnSpeedInput.value = returnSpeed;
              sendFleetTimeRequest(returnSpeed, 'back');
              break;
            case '1':
              sendSpeedInput.value = returnSpeed;
              sendFleetTimeRequest(returnSpeed, 'send');
              returnSpeedInput.value = returnSpeed;
              sendFleetTimeRequest(returnSpeed, 'back');
              break;
            case '2':
              sendSpeed = 0;
              returnSpeed = 0;
              curSpeed = 20;
              do {
              // calculate 20% speed in seconds
                sendSpeed = curSpeed;
                returnSpeed = calcSpeed(
                  moment().add((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100)), 'seocnds'),
                  returnTime,
                );
                curSpeed += 1;
              } while (returnSpeed < 20 || returnSpeed > maxSpeed);
              sendSpeedInput.value = sendSpeed;
              sendFleetTimeRequest(sendSpeed, 'send');
              returnSpeedInput.value = returnSpeed;
              sendFleetTimeRequest(returnSpeed, 'back');
              break;
            case '3': break;
            default: break;
          }
          break;
        case 'oneway':
          break;
        default:
          break;
      }
    };
    //   const $val = lwmJQ('#lwm_fleet_selecttime').val();
    //   const $momentVal = moment($val);
    //   const $oneway = lwmJQ('#lwm_fleet_oneway').is(':checked');
    //   if (!$val) {
    //     lwmJQ('.changeTime').val(maxSpeed);
    //     sendFleetTimeRequest(maxSpeed, 'send');
    //     sendFleetTimeRequest(maxSpeed, 'back');
    //     if ($val === null) {
    //       // val === null means options disabled
    //       alert('WARNING: Choice is not possible due to fleet speed');
    //       lwmJQ('.changeTime').val('20');
    //       siteWindow.jQuery('.changeTime').change();
    //       sendFleetTimeRequest(20, 'send');
    //       sendFleetTimeRequest(20, 'back');
    //     }
    //   } else {
    //     // calculate speed for given return time
    //     let timeDiffInSeconds = $momentVal.diff(moment(), 'seconds') / ($oneway ? 1 : 2);
    //     const minSpeedInSeconds = ((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (20 / 100)));
    //     if (minSpeedInSeconds < timeDiffInSeconds || minTimeInSecs > timeDiffInSeconds) {
    //       alert('WARNING: Choice is not possible due to fleet speed');
    //       lwmJQ('.changeTime').val('20');
    //       siteWindow.jQuery('.changeTime').change();
    //       sendFleetTimeRequest(20, 'send');
    //       sendFleetTimeRequest(20, 'back');
    //       return;
    //     }
    //     const type = $oneway ? '0' : lwmJQ('#lwm_fleet_type').val();
    //     let sendSpeed; let returnSpeed; let curSpeed; let sendSpeedInSeconds; let
    //       returnSpeedInSeconds;
    //     const newSpeed = Math.round((1 - ((((timeDiffInSeconds - (minTimeInSecs / (2 - (parseInt(maxSpeed, 10) / 100))))
    //       / ((minTimeInSecs / (2 - (parseInt(maxSpeed, 10) / 100))) * 0.01))) / 100)) * 100);
    //     switch (type) {
    //       case '0':
    //         lwmJQ('.changeTime').val(newSpeed);
    //         sendFleetTimeRequest(newSpeed, 'send');
    //         sendFleetTimeRequest(newSpeed, 'back');
    //         break;
    //       case '1':
    //         // ignore one way
    //         timeDiffInSeconds = $momentVal.diff(moment(), 'seconds');
    //         sendSpeed = 0;
    //         returnSpeed = 0;
    //         curSpeed = 20;
    //         do {
    //           // calculate 20% speed in seconds
    //           sendSpeed = curSpeed;
    //           sendSpeedInSeconds = (minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100));
    //           // subtract and see whether return is still possible
    //           returnSpeedInSeconds = timeDiffInSeconds - sendSpeedInSeconds;
    //           returnSpeed = Math.round((1 - ((((returnSpeedInSeconds - (minTimeInSecs / (2 - (parseInt(maxSpeed, 10) / 100))))
    //             / ((minTimeInSecs / (2 - (parseInt(maxSpeed, 10) / 100))) * 0.01))) / 100)) * 100);
    //           curSpeed += 1;
    //         } while (returnSpeed < 20 || returnSpeed > maxSpeed);
    //         lwmJQ('#send').val(returnSpeed);
    //         sendFleetTimeRequest(returnSpeed, 'send');
    //         lwmJQ('#back').val(sendSpeed);
    //         sendFleetTimeRequest(sendSpeed, 'back');
    //         break;
    //       case '2':
    //         // ignore one way
    //         timeDiffInSeconds = $momentVal.diff(moment(), 'seconds');
    //         sendSpeed = 0;
    //         returnSpeed = 0;
    //         curSpeed = 20;
    //         do {
    //           // calculate 20% speed in seconds
    //           sendSpeed = curSpeed;
    //           sendSpeedInSeconds = (minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100));
    //           // subtract and see whether return is still possible
    //           returnSpeedInSeconds = timeDiffInSeconds - sendSpeedInSeconds;
    //           returnSpeed = Math.round((1 - ((((returnSpeedInSeconds - (minTimeInSecs / (2 - (parseInt(maxSpeed, 10) / 100))))
    //             / ((minTimeInSecs / (2 - (parseInt(maxSpeed, 10) / 100))) * 0.01))) / 100)) * 100);
    //           curSpeed += 1;
    //         } while (returnSpeed < 20 || returnSpeed > maxSpeed);
    //         lwmJQ('#send').val(sendSpeed);
    //         sendFleetTimeRequest(sendSpeed, 'send');
    //         lwmJQ('#back').val(returnSpeed);
    //         sendFleetTimeRequest(returnSpeed, 'back');
    //         break;
    //       default: break;
    //     }
    //   }
    // };

    // add events to elements
    arrivalSelect.addEventListener('change', () => { timingTypeSelect.value = '0'; calcFleetTime('arrival'); });
    returnSelect.addEventListener('change', () => { calcFleetTime('return'); });
    onewayCheckbox.addEventListener('change', () => { toggleReturnSelect(); if (onewayCheckbox.checked) timingTypeSelect.value = '0'; calcFleetTime('arrival'); });
    timingTypeSelect.addEventListener('change', () => { if (timingTypeSelect.value !== '0') onewayCheckbox.checked = false; calcFleetTime('return'); });

    // add elements to DOM
    const documentContainer = document.querySelector('#timeFlote').nextSibling;
    optionWrapper.appendChild(arrivalSelect);
    optionWrapper.appendChild(returnSelect);
    optionWrapper.appendChild(timingTypeDiv);
    optionWrapper.appendChild(onewayDiv);
    documentContainer.parentNode.insertBefore(optionWrapper, documentContainer);

    // when next is clicked, remove wrapper
    lwmJQ('#nextSite').on('click', () => {
      optionWrapper.remove();
      lwmJQ('#nextSite').off('click');
      lwmJQ('#backSite').on('click', () => {
        fleetSend();
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
};

export default fleetSend;
