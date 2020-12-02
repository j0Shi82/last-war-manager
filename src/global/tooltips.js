import { siteWindow } from 'config/globals';
import { getIncomingResArray, setDataForClocks } from 'utils/helper';
import { createElementFromHTML } from 'utils/domHelper';

import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

const { document } = siteWindow;

const addResourceTooltips = (el) => {
  // add time that's needed to reach capacity
  const resTypes = ['Roheisen', 'Kristall', 'Frubin', 'Orizin', 'Frurozin', 'Gold'];
  const resTotal = siteWindow.getResourcePerHour();
  const resValue = [siteWindow.Roheisen, siteWindow.Kristall, siteWindow.Frubin, siteWindow.Orizin, siteWindow.Frurozin, siteWindow.Gold];
  const incomingRes = getIncomingResArray();

  const typeIndex = resTypes.indexOf(el.querySelector('.resourceName').innerText);
  const capacityReached = resValue[typeIndex] + incomingRes[typeIndex] > siteWindow.resourceCapacityArray[typeIndex];
  const resourceFormatted = siteWindow.jQuery.number(resValue[typeIndex] + incomingRes[typeIndex], 0, ',', '.');
  const elResourceAmount = `<div class="${(capacityReached ? 'redBackground ' : '')}resourceAmount lwm-resourceAmount">${resourceFormatted}</div>`;

  const hoursTillFull = (siteWindow.resourceCapacityArray[typeIndex] - resValue[typeIndex] - incomingRes[typeIndex])
                        / (resTotal[0][resTypes[typeIndex].toLowerCase()]);
  const elHourstillFull = createElementFromHTML(`<div class='lwm-resourceClock ${hoursTillFull < 8 ? 'redBackground' : ''}' id='clock_lwm_${resTypes[typeIndex]}'>${moment.duration(hoursTillFull, 'hours').format('HH:mm:ss', { trim: false, forceLength: true })}</div>`);

  const capacityFormatted = siteWindow.jQuery.number(siteWindow.resourceCapacityArray[typeIndex], 0, ',', '.');
  const elCapacity = `<div class="resourceAmount lwm-resourceCapacity">(${capacityFormatted})</div>`;

  // const perc = (resValue[typeIndex] + incomingRes[typeIndex]) / siteWindow.resourceCapacityArray[typeIndex];
  // const elPerc = `<div class="${(capacityReached ? 'redBackground ' : '')}resourceName lwm-resourcePerc">${(perc * 100).toFixed(2)}%</div>`;
  siteWindow.jQuery(el).contents().css({
    display: 'none',
  });
  siteWindow.jQuery(el).append(elResourceAmount);
  siteWindow.jQuery(el).append(elCapacity);
  siteWindow.jQuery(el).append(elHourstillFull); setDataForClocks();
  siteWindow.jQuery(el).css({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  });
};

const removeResourceTooltips = (el) => {
  siteWindow.jQuery(el).find('.lwm-resourceAmount').remove();
  siteWindow.jQuery(el).find('.lwm-resourceCapacity').remove();
  siteWindow.jQuery(el).find('.lwm-resourceClock').remove();
  siteWindow.jQuery(el).contents().css({
    display: '',
  });
  siteWindow.jQuery(el).css({
    display: '',
    justifyContent: '',
    alignItems: '',
    flexDirection: '',
  });
};

const isTouchDevice = () => 'ontouchstart' in siteWindow;

export default () => {
  /* tooltip manipulation */
  /* resource tooltips */
  siteWindow.jQuery('#Footer').on('mouseenter', () => {
    siteWindow.jQuery('.resourceBox').each((i, el) => {
      if (!isTouchDevice()) addResourceTooltips(el);
    });
  });

  siteWindow.jQuery('#Footer').on('mouseleave blur', () => {
    siteWindow.jQuery('.resourceBox').each((i, el) => {
      removeResourceTooltips(el);
    });
  });

  siteWindow.jQuery('#Footer').on('click', () => {
    siteWindow.jQuery('.resourceBox').each((i, el) => {
      if (siteWindow.jQuery(el).find('.lwm-resourceCapacity').length) {
        if (isTouchDevice()) removeResourceTooltips(el);
      } else if (isTouchDevice()) addResourceTooltips(el);
    });
  });

  /* need to work with timeouts here to make sure events fire after original ones */
  siteWindow.jQuery(document).on('mouseenter', '.popover,.constructionName', () => {
    setTimeout(() => {
      siteWindow.jQuery('.big_img').appendTo('body').attr('class', 'big_img_alt');
    }, 50);
  });

  siteWindow.jQuery(document).on('mousemove', '.popover,.constructionName', (e) => {
    setTimeout(() => {
      siteWindow.jQuery('.big_img_alt').css({ top: e.pageY - 50, left: e.pageX + 10, });
    }, 50);
  });

  siteWindow.jQuery(document).on('mouseleave', '.popover,.constructionName', () => {
    siteWindow.jQuery('.big_img_alt').remove();
  });
  /* tooltip manipulation end */
};
