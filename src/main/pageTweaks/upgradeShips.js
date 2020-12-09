import config from 'config/lwmConfig';
import { siteWindow } from 'config/globals';
import gmConfig from 'plugins/GM_config';
import {
  throwError, addConfirm, addIconToHtmlElements,
} from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';

export default () => {
  config.promises.content = getPromise('#upgradeShipsDiv');
  config.promises.content.then(() => {
    // add confirm to recycle buttons
    siteWindow.document.querySelectorAll('button[onclick*=\'upgradeShipsFunction\']').forEach((el) => {
      if (gmConfig.get('confirm_production')) addConfirm(el);
    });

    addIconToHtmlElements(siteWindow.document.querySelectorAll('button[onclick*=\'upgradeShipsFunction\']'), 'fas fa-2x fa-arrow-alt-circle-up');

    // recalculate upgrade res
    siteWindow.document.querySelectorAll('[onclick*=\'addNumberUpgradeShips\']').forEach((el) => {
      const matches = el.getAttribute('onclick').match(/\d+/g);
      const shipID = parseInt(matches[1], 10);
      const shipTR = siteWindow.document.querySelectorAll(`tr.s_${shipID}`).item(3);
      const feTD = shipTR.querySelector('.roheisenVariable');
      const krisTD = shipTR.querySelector('.kristallVariable');
      const frubTD = shipTR.querySelector('.frubinVariable');
      const oriTD = shipTR.querySelector('.orizinVariable');
      const fruroTD = shipTR.querySelector('.frurozinVariable');
      const goldTD = shipTR.querySelector('.goldVariable');
      const shipQuantity = parseInt(siteWindow.document.querySelector(`#shipQuantity${shipID}`).innerText.replace('.', ''), 10);

      const addListener = () => {
        const nextNumber = parseInt(siteWindow.document.querySelector(`#number_input_ship_${shipID}`).innerText, 10);
        let curNumber = nextNumber - 1;
        curNumber = curNumber === 0 ? 1 : curNumber;
        const fe = parseInt((parseInt(feTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const kris = parseInt((parseInt(krisTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const frub = parseInt((parseInt(frubTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const ori = parseInt((parseInt(oriTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const fruro = parseInt((parseInt(fruroTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const gold = parseInt((parseInt(goldTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);

        feTD.innerHTML = fe;
        krisTD.innerHTML = kris;
        frubTD.innerHTML = frub;
        oriTD.innerHTML = ori;
        fruroTD.innerHTML = fruro;
        goldTD.innerHTML = gold;

        if (nextNumber === shipQuantity) el.removeEventListener('click', addListener);
      };

      el.addEventListener('click', addListener);
    });

    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
