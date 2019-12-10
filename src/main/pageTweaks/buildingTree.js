import config from 'config/lwmConfig';
import {
  siteWindow,
} from 'config/globals';
import {
  throwError,
} from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import { createElementFromHTML, docQuery } from 'utils/domHelper';

const docQueryAll = (query) => siteWindow.document.querySelectorAll(query);

export default () => {
  config.promises.content = getPromise('#constructionTreeTable,#researcheTreeTable,#shipTreeTable,#defenseTreeTable');
  config.promises.content.then(() => {
    // add a button that filters unlocked stuff in the tree
    const div = createElementFromHTML('<div class="tableFilters"><div class="tableFilters_header">Filter</div><div class="tableFilters_content"></div></div>');
    const filterButton = createElementFromHTML('<div class="buttonRowInbox" id="lwm_filterBuildingTree"><a class="formButton" href="javascript:void(0)">Filter Achieved</a></div>');
    div.querySelector('.tableFilters_content').appendChild(filterButton);
    const elTables = docQuery('#Tables');
    filterButton.addEventListener('click', ({ target }) => {
      target.classList.toggle('activeBox');
      const completedNodes = docQueryAll('#Tables tr > td:nth-child(2) > img[src*=\'green\']');
      const hideIds = [];
      completedNodes.forEach((node) => {
        const parent = node.closest('tr');
        hideIds.push(parent.getAttribute('id') || parent.getAttribute('class') || parent.querySelector('td:first-child').getAttribute('id'));
      });
      if (target.classList.contains('activeBox')) {
        const hideSelector = `tr#${hideIds.join(',tr#')},tr#${hideIds.join('+tr,tr#')}+tr,tr.${hideIds.join(',tr.')},tr.${hideIds.join('+tr,tr.')}+tr,td#${hideIds.join(',td#')}`;
        const hideNodes = elTables.querySelectorAll(hideSelector);
        hideNodes.forEach((node) => {
          if (node.nodeName === 'TD') {
            const parent = node.closest('tr');
            parent.style.display = 'none';
            parent.nextSibling.style.display = 'none';
          } else {
            node.style.display = 'none';
          }
        });
        const headerNodes = elTables.querySelectorAll('th');
        headerNodes.forEach((node) => {
          const parent = node.closest('tr');
          parent.style.display = '';
        });
        // lwmJQ('#Tables').find(`tr#${hideIds.join(',tr#')}`).hide();
        // lwmJQ('#Tables').find(`tr#${hideIds.join(',tr#')}`).next().hide();
        // lwmJQ('#Tables').find(`tr.${hideIds.join(',tr.')}`).hide();
        // lwmJQ('#Tables').find(`tr.${hideIds.join(',tr.')}`).next().hide();
        // lwmJQ('#Tables').find(`td#${hideIds.join(',td#')}`).parents('tr').hide();
        // lwmJQ('#Tables').find(`td#${hideIds.join(',td#')}`).parents('tr').next()
        //   .hide();
        // lwmJQ('#Tables').find('th').parents('tr').show();
      } else {
        const trNodes = elTables.querySelectorAll('tr');
        trNodes.forEach((node) => {
          node.style.display = '';
        });
        // lwmJQ('#Tables tr').show();
      }
    });
    elTables.prepend(div);
    config.loadStates.content = false;
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
