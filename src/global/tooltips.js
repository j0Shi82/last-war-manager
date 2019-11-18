import { lwmJQ, siteWindow } from 'config/globals';

const { document } = siteWindow;

export default () => {
  /* tooltip manipulation */
  /* need to work with timeouts here to make sure events fire after original ones */
  lwmJQ(document).on('mouseenter', '.popover,.constructionName', () => {
    setTimeout(() => {
      lwmJQ('.big_img').appendTo('body').attr('class', 'big_img_alt');
    }, 50);
  });

  lwmJQ(document).on('mousemove', '.popover,.constructionName', (e) => {
    setTimeout(() => {
      lwmJQ('.big_img_alt').css({ top: e.pageY - 50, left: e.pageX + 10, });
    }, 50);
  });

  lwmJQ(document).on('mouseleave', '.popover,.constructionName', () => {
    lwmJQ('.big_img_alt').remove();
  });
  /* tooltip manipulation end */
};
