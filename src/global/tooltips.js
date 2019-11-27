import { siteWindow } from 'config/globals';

const { document } = siteWindow;

export default () => {
  /* tooltip manipulation */
  /* resource tooltips */
  siteWindow.jQuery('.resourceBox').each((i, el) => {
    siteWindow.jQuery(el).on('focus mouseenter', () => {
      const elPerc = `<span class="resourceAmount lwm-resourceAmount">${((parseInt(siteWindow[el.querySelector('.resourceName').innerText], 10) / parseInt(siteWindow[`${el.querySelector('.resourceName').innerText}LagerCapacity`], 10)) * 100).toFixed(2)}%</span>`;
      siteWindow.jQuery(el).contents().css({
        display: 'none',
      });
      siteWindow.jQuery(el).append(elPerc);
      siteWindow.jQuery(el).css({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      });
    });

    siteWindow.jQuery(el).on('blur mouseleave', () => {
      siteWindow.jQuery(el).find('.lwm-resourceAmount').remove();
      siteWindow.jQuery(el).contents().css({
        display: '',
      });
      siteWindow.jQuery(el).css({
        display: '',
        justifyContent: '',
        alignItems: '',
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
