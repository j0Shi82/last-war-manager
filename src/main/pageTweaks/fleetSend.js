import config from 'config/lwmConfig';
import { siteWindow } from 'config/globals';
import gmConfig from 'plugins/GM_config';
import { throwError } from 'utils/helper';
import { createElementFromHTML } from 'utils/domHelper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';

import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

const { document } = siteWindow;

const dataValues = {
  arrivalTime: '',
  returnTime: '',
  timingType: '0',
};

const getCommonValues = () => {
  const { fleetSendData } = config.gameData;
  const arrivalSelect = document.querySelector('#lwm_fleet_selectarrivaltime');
  const returnSelect = document.querySelector('#lwm_fleet_selectreturntime');
  const timingTypeSelect = document.querySelector('#lwm_fleet_type');
  const maxSpeed = parseInt(config.gameData.fleetSendData.max_speed_transport, 10);
  const arrivalTime = moment(parseInt(arrivalSelect.value, 10));
  const returnTime = moment(parseInt(returnSelect.value, 10));
  const isOneway = timingTypeSelect.value === '1';
  const timingType = timingTypeSelect.value;

  const minTimeInSecs = moment.duration(fleetSendData.send_time, 'seconds').asSeconds();
  const maxTimeInSecs = ((minTimeInSecs / (2 - (parseInt(fleetSendData.max_speed_transport, 10) / 100))) * (2 - (20 / 100)));
  const minDateArrival = moment().add(minTimeInSecs, 'seconds');
  const maxDateArrival = moment().add(maxTimeInSecs, 'seconds');
  const minDateReturn = moment().add(minTimeInSecs * 2, 'seconds');
  const maxDateReturn = moment().add(maxTimeInSecs * 2, 'seconds');

  const sendSpeedInput = document.querySelector('#send.changeTime');
  const returnSpeedInput = document.querySelector('#back.changeTime');

  return {
    arrivalSelect,
    returnSelect,
    timingTypeSelect,
    maxSpeed,
    arrivalTime,
    returnTime,
    isOneway,
    timingType,
    minTimeInSecs,
    maxTimeInSecs,
    minDateArrival,
    maxDateArrival,
    minDateReturn,
    maxDateReturn,
    sendSpeedInput,
    returnSpeedInput,
  };
};

const sendFleetTimeRequest = (speed, type = 'send') => {
  siteWindow.jQuery.post('./ajax_request/count_time.php', {
    id_broda: siteWindow.flotten_informations_infos.id_broda,
    tip_broda: siteWindow.flotten_informations_infos.tip_broda,
    Units: siteWindow.flotten_informations_infos.Units,
    id_flote: siteWindow.flotten_informations_infos.id_flote,
    speed,
  }, (data) => {
    data = JSON.parse(data);

    if (type === 'send') {
      siteWindow.flotten_informations_infos.send_time = data.time_sec;
      siteWindow.flotten_informations_infos.speed_send = speed;
    } else {
      siteWindow.flotten_informations_infos.back_time = data.time_sec;
      siteWindow.flotten_informations_infos.speed_back = speed;
    }

    let seconds = parseInt(data.time_sec, 10);

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

    updateSendAndBackTime();
  });
};

const updateSendAndBackTime = () => {
    let now = new Date();
    let sendTime = new Date(now.getTime() + flotten_informations_infos.send_time * 1000);
    let backTime = new Date(sendTime.getTime() + flotten_informations_infos.back_time * 1000);

    siteWindow.jQuery('#sendTimeString').text(`Ankunft: ${sendTime.toLocaleTimeString('de-DE')} Uhr`);
    siteWindow.jQuery('#backTimeString').text(`Rückkehr: ${backTime.toLocaleTimeString('de-DE')} Uhr`);
};

const addOptionsToTimeSelect = (selectEl, minDate, maxDate) => {
  const currentValue = selectEl.value;
  const remainder = 5 - (minDate.minute() % 5);
  const minDateInterval = moment(minDate).add(remainder, 'minutes').startOf('minute');
  const options = selectEl.querySelectorAll('option:not(:first-child)');
  options.forEach((o) => o.remove());
  // let valueFound = false;
  while (minDateInterval.valueOf() < maxDate.valueOf()) {
    // if (minDateInterval.valueOf() === parseInt(currentValue, 10)) valueFound = true;
    const option = createElementFromHTML(`<option value="${minDateInterval.valueOf()}">${minDateInterval.format('YYYY-MM-DD HH:mm:ss')}</option>`);
    selectEl.appendChild(option);
    minDateInterval.add(5, 'minutes');
  }
  // if (!valueFound && currentValue !== '') {
  //   const valueOption = createElementFromHTML(`<option value="${currentValue}">${moment(currentValue).format('YYYY-MM-DD HH:mm:ss')}</option>`);
  //   selectEl.insertBefore(valueOption, selectEl.querySelector('option:not(:first-child)'));
  // }

  selectEl.value = currentValue;
};

const calcSpeed = (startDate, endDate) => {
  const { maxSpeed, minTimeInSecs } = getCommonValues();
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
  const {
    arrivalSelect, returnSelect, maxSpeed, arrivalTime, returnTime, isOneway, timingType, minTimeInSecs, maxTimeInSecs,
    minDateArrival, maxDateArrival, minDateReturn, maxDateReturn, sendSpeedInput, returnSpeedInput,
  } = getCommonValues();

  let curSpeed = 20;
  let sendSpeed; let returnSpeed;

  if (!arrivalTime.isValid()) { sendSpeed = maxSpeed; } else { sendSpeed = calcSpeed(moment(), arrivalTime); }
  if (!returnTime.isValid()) { returnSpeed = maxSpeed; } else if (!arrivalTime.isValid()) {
    returnSpeed = calcSpeed(minDateArrival, returnTime);
  } else {
    returnSpeed = calcSpeed(arrivalTime, returnTime);
  }

  switch (from) {
    case 'arrival':
      // arrival changed means we might have to tweak return time
      if (isOneway) {
        sendSpeedInput.value = sendSpeed;
        sendFleetTimeRequest(sendSpeed, 'send');
        returnSpeedInput.value = sendSpeed;
        sendFleetTimeRequest(sendSpeed, 'back');
      } else {
        if (!arrivalTime.isValid()) {
          addOptionsToTimeSelect(returnSelect, minDateReturn, maxDateReturn);
          if (returnTime.isValid()) {
            calcFleetTime('return');
            break;
          }
        } else {
          // rebuild select to match new arrival speed
          addOptionsToTimeSelect(
            returnSelect,
            moment(parseInt(arrivalSelect.value, 10)).add(minTimeInSecs, 'seconds'),
            moment(parseInt(arrivalSelect.value, 10)).add(maxTimeInSecs, 'seconds'),
          );
          // if returnSpeed is no longer possible due to arrival time, change to max speed
          if (returnSpeed > maxSpeed) {
            returnSpeed = maxSpeed;
          }
        }
        sendSpeedInput.value = sendSpeed;
        sendFleetTimeRequest(sendSpeed, 'send');

        // (re)pick value in return select
        returnSpeedInput.value = returnSpeed;
        sendFleetTimeRequest(returnSpeed, 'back');

        returnSelect.value = returnTime.isValid() ? returnTime.valueOf() : '';
        dataValues.returnTime = returnSelect.value;
      }
      break;
    case 'return':
      // arrival changed means we might have to tweak arrival time
      switch (timingType) {
        case '0':
          if (!returnTime.isValid()) {
            addOptionsToTimeSelect(arrivalSelect, minDateArrival, maxDateArrival);
          } else if (returnSpeed < 20) {
            returnSpeed = 20;
            // recalc sendSpeed
            sendSpeed = calcSpeed(
              moment().add((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (20 / 100)), 'seconds'),
              returnTime,
            );

            addOptionsToTimeSelect(arrivalSelect, moment().add((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (sendSpeed / 100)), 'seconds'), maxDateArrival);
          } else {
            addOptionsToTimeSelect(arrivalSelect, minDateArrival, moment(returnTime).subtract((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (maxSpeed / 100)), 'seconds'));
          }

          sendSpeedInput.value = sendSpeed;
          sendFleetTimeRequest(sendSpeed, 'send');
          returnSpeedInput.value = returnSpeed;
          sendFleetTimeRequest(returnSpeed, 'back');
          break;
        case '2':
          if (!returnTime.isValid()) {
            returnSpeed = maxSpeed;
          } else {
            returnSpeed = calcSpeed(
              moment(),
              moment().add(parseInt(returnTime.diff(moment(), 'seconds') / 2, 10), 'seconds'),
            );
          }
          sendSpeedInput.value = returnSpeed;
          sendFleetTimeRequest(returnSpeed, 'send');
          returnSpeedInput.value = returnSpeed;
          sendFleetTimeRequest(returnSpeed, 'back');
          break;
        case '3':
          if (!returnTime.isValid()) {
            returnSpeed = maxSpeed;
            sendSpeed = maxSpeed;
          } else {
            sendSpeed = 0;
            returnSpeed = 0;
            curSpeed = 20;
            do {
              returnSpeed = curSpeed;
              sendSpeed = calcSpeed(
                moment().add((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100)), 'seconds'),
                returnTime,
              );
              curSpeed += 1;
            } while (sendSpeed < 20 || sendSpeed > maxSpeed);
          }
          sendSpeedInput.value = sendSpeed;
          sendFleetTimeRequest(sendSpeed, 'send');
          returnSpeedInput.value = returnSpeed;
          sendFleetTimeRequest(returnSpeed, 'back');
          break;
        case '4':
          if (!returnTime.isValid()) {
            returnSpeed = maxSpeed;
            sendSpeed = maxSpeed;
          } else {
            sendSpeed = 0;
            returnSpeed = 0;
            curSpeed = 20;
            do {
              sendSpeed = curSpeed;
              returnSpeed = calcSpeed(
                moment().add((minTimeInSecs / (2 - (maxSpeed / 100))) * (2 - (curSpeed / 100)), 'seconds'),
                returnTime,
              );
              curSpeed += 1;
            } while (returnSpeed < 20 || returnSpeed > maxSpeed);
          }
          sendSpeedInput.value = sendSpeed;
          sendFleetTimeRequest(sendSpeed, 'send');
          returnSpeedInput.value = returnSpeed;
          sendFleetTimeRequest(returnSpeed, 'back');
          break;
        default: break;
      }
      break;
    case 'oneway':
      break;
    default:
      break;
  }
};

const toggleTimingType = () => {
  const {
    arrivalSelect, returnSelect, minDateArrival, maxDateArrival, minDateReturn, maxDateReturn, timingTypeSelect,
  } = getCommonValues();

  if (timingTypeSelect.value === '1') {
    dataValues.returnTime = '';
    returnSelect.value = '';
    returnSelect.style.display = 'none';
    addOptionsToTimeSelect(arrivalSelect, minDateArrival, maxDateArrival);
  } else {
    returnSelect.style.display = 'inline-block';
  }

  if (parseInt(timingTypeSelect.value, 10) > 1) {
    dataValues.arrivalTime = '';
    arrivalSelect.value = '';
    arrivalSelect.style.display = 'none';
    addOptionsToTimeSelect(returnSelect, minDateReturn, maxDateReturn);
  } else {
    arrivalSelect.style.display = 'inline-block';
  }
};

const fleetSend = (fleetSendData = config.gameData.fleetSendData) => {
  // save data so we have it available when browsing back and forth
  config.gameData.fleetSendData = JSON.parse(JSON.stringify(fleetSendData));
  config.promises.content = getPromise('#flottenInformationPage');
  return config.promises.content.then(() => {
    const minTimeInSecs = moment.duration(fleetSendData.send_time, 'seconds').asSeconds();
    const maxTimeInSecs = ((minTimeInSecs / (2 - (parseInt(fleetSendData.max_speed_transport, 10) / 100))) * (2 - (20 / 100)));
    const minDateArrival = moment().add(minTimeInSecs, 'seconds');
    const maxDateArrival = moment().add(maxTimeInSecs, 'seconds');
    const minDateReturn = moment().add(minTimeInSecs * 2, 'seconds');
    const maxDateReturn = moment().add(maxTimeInSecs * 2, 'seconds');

    // build choose time selects
    const optionWrapper = createElementFromHTML('<div id="lwm_fleet_timer_wrapper"></div>');

    const timingTypeDiv = createElementFromHTML('<div></div>');
    const timingTypeSelect = createElementFromHTML('<select id="lwm_fleet_type"><option value="0">Pick Fleet Timing Function</option><option value="1">One-Way</option><option value="2">Send / Return Balanced</option><option value="3">Send Fast/ Return Slow</option><option value="4">Send Slow/Return Fast</option></select>');
    timingTypeSelect.value = dataValues.timingType;
    timingTypeDiv.appendChild(timingTypeSelect);

    const arrivalSelectDiv = createElementFromHTML('<div></div>');
    const arrivalSelect = createElementFromHTML('<select id="lwm_fleet_selectarrivaltime"><option value="" selected>Pick Arrival Time</option></select>');
    addOptionsToTimeSelect(arrivalSelect, minDateArrival, maxDateArrival);
    arrivalSelect.value = dataValues.arrivalTime;
    arrivalSelectDiv.appendChild(arrivalSelect);

    const returnSelectDiv = createElementFromHTML('<div></div>');
    const returnSelect = createElementFromHTML('<select id="lwm_fleet_selectreturntime"><option value="" selected>Pick Return Time</option></select>');
    addOptionsToTimeSelect(returnSelect, minDateReturn, maxDateReturn);
    returnSelect.value = dataValues.returnTime;
    returnSelectDiv.appendChild(returnSelect);

    // add events to elements
    arrivalSelect.addEventListener('change', () => { calcFleetTime('arrival'); dataValues.arrivalTime = arrivalSelect.value; });
    returnSelect.addEventListener('change', () => { calcFleetTime('return'); dataValues.returnTime = returnSelect.value; });
    timingTypeSelect.addEventListener('change', () => {
      dataValues.timingType = timingTypeSelect.value;
      toggleTimingType();
      if (timingTypeSelect.value === '1') {
        calcFleetTime('arrival');
      } else {
        calcFleetTime('return');
      }
    });

    // add elements to DOM
    const documentContainer = document.querySelector('#timeFlote').nextSibling;
    optionWrapper.appendChild(arrivalSelectDiv);
    optionWrapper.appendChild(returnSelectDiv);
    optionWrapper.appendChild(timingTypeDiv);
    documentContainer.parentNode.insertBefore(optionWrapper, documentContainer);

    toggleTimingType();

    // handle back and forth logic
    const clearData = () => {
      dataValues.arrivalTime = '';
      dataValues.returnTime = '';
      dataValues.timingType = '0';

      siteWindow.jQuery('#backSite').off('click', clearData);
    };

    const rerunCalculations = () => {
      fleetSend().finally(() => {
        if (dataValues.timingType === '0') {
          if (dataValues.returnTime !== '') calcFleetTime('return');
          if (dataValues.arrivalTime !== '') calcFleetTime('arrival');
        } else if (dataValues.timingType === '1') {
          calcFleetTime('arrival');
        } else {
          calcFleetTime('return');
        }

        siteWindow.jQuery('#backSite').off('click', rerunCalculations);
      });
    };

    const removeOptionWrapper = () => {
      optionWrapper.remove();

      siteWindow.jQuery('#nextSite').off('click', removeOptionWrapper);
      siteWindow.jQuery('#backSite').on('click', rerunCalculations);
      siteWindow.jQuery('#backSite').off('click', clearData);
    };

    // when next is clicked, remove wrapper
    siteWindow.jQuery('#nextSite').on('click', removeOptionWrapper);
    siteWindow.jQuery('#backSite').on('click', clearData);
    siteWindow.jQuery('#sendFlote').on('click', clearData);

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
      siteWindow.jQuery.each(siteWindow.jQuery('#lwm_fleet_selectreturntime').find('option:gt(0)'), (i, el) => {
        const $el = siteWindow.jQuery(el);
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
            if (!found) {
              siteWindow.jQuery('#lwm_fleet_selectreturntime').val($el.val());
              calcFleetTime('return');
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
