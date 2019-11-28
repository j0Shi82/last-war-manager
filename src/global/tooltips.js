import { siteWindow } from 'config/globals';
import { getIncomingResArray, setDataForClocks } from 'utils/helper';
import { createElementFromHTML } from 'utils/domHelper';

import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

const { document } = siteWindow;

export default () => {
  /* tooltip manipulation */
  /* resource tooltips */
  siteWindow.jQuery('.resourceBox').each((i, el) => {
    siteWindow.jQuery(el).on('focus mouseenter', () => {
      // add time that's needed to reach capacity
      const resTotal = siteWindow.getResourcePerHour();
      const resTypes = ['Roheisen', 'Kristall', 'Frubin', 'Orizin', 'Frurozin', 'Gold'];
      const resValue = [siteWindow.Roheisen, siteWindow.Kristall, siteWindow.Frubin, siteWindow.Orizin, siteWindow.Frurozin, siteWindow.Gold];
      const incomingRes = getIncomingResArray();

      const typeIndex = resTypes.indexOf(el.querySelector('.resourceName').innerText);
      const hoursTillFull = (siteWindow.resourceCapacityArray[typeIndex] - resValue[typeIndex] - incomingRes[typeIndex])
                            / (resTotal[0][resTypes[typeIndex].toLowerCase()]);
      const elHourstillFull = createElementFromHTML(`<div class='lwm-resourceClock ${hoursTillFull < 8 ? 'redBackground' : ''}' id='clock_lwm_${resTypes[typeIndex]}'>${moment.duration(hoursTillFull, 'hours').format('HH:mm:ss', { trim: false, forceLength: true })}</div>`);

      const elPerc = `<div class="resourceAmount lwm-resourceAmount">${((parseInt(siteWindow[el.querySelector('.resourceName').innerText], 10) / parseInt(siteWindow[`${el.querySelector('.resourceName').innerText}LagerCapacity`], 10)) * 100).toFixed(2)}%</div>`;
      siteWindow.jQuery(el).contents().css({
        display: 'none',
      });
      siteWindow.jQuery(el).append(elPerc);
      siteWindow.jQuery(el).append(elHourstillFull); setDataForClocks();
      siteWindow.jQuery(el).css({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      });
    });

    siteWindow.jQuery(el).on('blur mouseleave', () => {
      siteWindow.jQuery(el).find('.lwm-resourceAmount').remove();
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
