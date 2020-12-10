import config from 'config/lwmConfig';
import { siteWindow } from 'config/globals';
import gmConfig from 'plugins/GM_config';
import {
  throwError, addConfirm, addIconToHtmlElements,
} from 'utils/helper';
import { createElementFromHTML, docQuery } from 'utils/domHelper';
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

    // add filter table
    const filterWrapper = createElementFromHTML('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
    const percentageFilterInput = createElementFromHTML('<input type="number" id="lwm_percentageFilter" value="0" min="0" max="100" step="1" />');
    const percentageFilterLabel = createElementFromHTML('<label for="lwm_percentageFilter">Show upgrade percentages over </label>');

    percentageFilterInput.addEventListener('change', () => {
      siteWindow.document.querySelectorAll('.UpdateTD').forEach((td) => {
        const shipID = parseInt(td.parentNode.getAttribute('class').match(/\d+/)[0], 10);
        const percentage = parseInt(td.innerText.match(/\d+/)[0], 10);
        const value = parseInt(percentageFilterInput.value, 10);
        if (percentage < value) {
          siteWindow.document.querySelectorAll(`.s_${shipID}`).forEach((cell) => {
            cell.style.display = 'none';
          });
        } else {
          siteWindow.document.querySelectorAll(`.s_${shipID}`).forEach((cell) => {
            cell.style.display = 'table-row';
          });
        }
      });
    });

    docQuery('#upgradeShipsDiv').parentNode.insertBefore(filterWrapper, docQuery('#upgradeShipsDiv'));
    filterWrapper.appendChild(percentageFilterLabel);
    filterWrapper.appendChild(percentageFilterInput);

    // recalculate upgrade res
    siteWindow.document.querySelectorAll('[onclick*=\'addNumberUpgradeShips\'],[onclick*=\'subNumberUpgradeShips\']').forEach((el) => {
      const matches = el.getAttribute('onclick').match(/\d+/g);
      const shipID = parseInt(matches[1], 10);
      const shipTR = siteWindow.document.querySelectorAll(`tr.s_${shipID}`).item(3);
      const feTD = shipTR.querySelector('.roheisenVariable');
      const krisTD = shipTR.querySelector('.kristallVariable');
      const frubTD = shipTR.querySelector('.frubinVariable');
      const oriTD = shipTR.querySelector('.orizinVariable');
      const fruroTD = shipTR.querySelector('.frurozinVariable');
      const goldTD = shipTR.querySelector('.goldVariable');
      const shipQuantity = parseInt(docQuery(`#shipQuantity${shipID}`).innerText.replace('.', ''), 10);

      const addListener = () => {
        let nextNumber; let curNumber;
        const isSub = el.classList.contains('fa-angle-left');
        if (!isSub) {
          nextNumber = parseInt(docQuery(`#number_input_ship_${shipID}`).innerText, 10);
          curNumber = nextNumber - 1;
          curNumber = curNumber === 0 ? 1 : curNumber;
        } else {
          nextNumber = parseInt(docQuery(`#number_input_ship_${shipID}`).innerText, 10);
          curNumber = nextNumber + 1;
          nextNumber = nextNumber === 0 ? 1 : nextNumber;
        }

        const fe = parseInt((parseInt(feTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const kris = parseInt((parseInt(krisTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const frub = parseInt((parseInt(frubTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const ori = parseInt((parseInt(oriTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const fruro = parseInt((parseInt(fruroTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
        const gold = parseInt((parseInt(goldTD.innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);

        feTD.innerHTML = siteWindow.jQuery.number(fe, 0, ',', '.');
        krisTD.innerHTML = siteWindow.jQuery.number(kris, 0, ',', '.');
        frubTD.innerHTML = siteWindow.jQuery.number(frub, 0, ',', '.');
        oriTD.innerHTML = siteWindow.jQuery.number(ori, 0, ',', '.');
        fruroTD.innerHTML = siteWindow.jQuery.number(fruro, 0, ',', '.');
        goldTD.innerHTML = siteWindow.jQuery.number(gold, 0, ',', '.');

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
