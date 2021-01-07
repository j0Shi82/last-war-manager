import config from 'config/lwmConfig';
import gmConfig from 'plugins/GM_config';
import { siteWindow } from 'config/globals';
import { getPromise } from 'utils/loadPromises';
import {
  addResMemory, addConfirm, setDataForClocks, throwError,
} from 'utils/helper';
import { Sentry } from 'plugins/sentry';
import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

const { document: doc } = siteWindow;

export default () => {
  config.promises.content = getPromise('.hauptgebaude');
  config.promises.content.then(() => {
    addResMemory(doc.querySelectorAll('.greenButton'), 'building');
    doc.querySelectorAll('.greenButton,.yellowButton,.redButton').forEach((el) => {
      const textAppendix = el.classList.contains('greenButton') ? ' bauen' : ' abbrechen';
      const td = el.parentElement;
      td.style.cursor = 'hand';
      td.setAttribute('onclick', el.getAttribute('onclick'));
      el.setAttribute('onclick', '');
      if (gmConfig.get('confirm_const')) addConfirm(td, td.parentElement.querySelector('.constructionName').innerText + textAppendix);
      if (gmConfig.get('addon_clock')) {
        clearInterval(siteWindow.timeinterval_construction);
        clearInterval(siteWindow.timeinterval_construction2);
        setDataForClocks();
      }
    });

    if (parseInt(siteWindow.BuildingNumber, 10) === 0 && parseInt(siteWindow.BuildingNumber2, 10) === 0 && gmConfig.get('construction_buildingcountdown')) {
      const resPerHour = siteWindow.getResourcePerHour()[0];
      doc.querySelectorAll('.defaultButton').forEach((el, i) => {
        let remainingSec = null;
        const tr = el.parentElement.parentElement;
        tr.querySelectorAll('.noResource').forEach((td) => {
          if (td.classList.contains('constructionName')) return true;
          const value = parseInt(td.innerText.replace('.', ''), 10);
          let type = ['roheisen', 'Roheisen'];
          if (td.classList.contains('kristallVariable')) type = ['kristall', 'Kristall'];
          if (td.classList.contains('frubinVariable')) type = ['frubin', 'Frubin'];
          if (td.classList.contains('orizinVariable')) type = ['orizin', 'Orizin'];
          if (td.classList.contains('frurozinVariable')) type = ['frurozin', 'Frurozin'];
          if (td.classList.contains('goldVariable')) type = ['gold', 'Gold'];
          const missing = value - siteWindow[type[1]];
          if (remainingSec === null || remainingSec < parseInt((missing / resPerHour[type[0]]) * 60 * 60, 10)) {
            remainingSec = parseInt((missing / resPerHour[type[0]]) * 60 * 60, 10);
          }
          return true;
        });
        el.parentElement.setAttribute('id', `clock_buildingcountdown_${i}`);
        el.parentElement.classList.add('noResource');
        el.parentElement.innerHTML = moment.duration(remainingSec, 'seconds').format('HH:mm:ss', { trim: false, forceLength: true });
      });

      setDataForClocks();
    }

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
