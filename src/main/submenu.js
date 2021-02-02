import config from 'config/lwmConfig';
import { lwmJQ, lwmWindow } from 'config/globals';
import { getLoadStatePromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import { throwError } from 'utils/helper';

export default {
  move(page) {
    // setup page => data-page pairs that should get ignored
    const ignoreItems = {
      produktion: ['raumdock'],
      aktuelle_produktion: ['raumdock'],
      schiffskomponenten: ['raumdock'],
      recycling_anlage: ['raumdock'],
      raumdock: ['flottenbewegungen', 'trade_offer'],
      flottenkommando: ['flottenbewegungen', 'trade_offer'],
      get_info_for_flotten_pages: ['flottenbewegungen', 'trade_offer'],
      get_info_for_flotten_view: ['flottenbewegungen', 'trade_offer'],
      get_change_flotten_info: ['flottenbewegungen', 'trade_offer'],
      flotten_view: ['flottenbewegungen', 'trade_offer'],
      flottenbasen_planet: ['flottenbewegungen', 'trade_offer'],
      flottenbasen_all: ['flottenbewegungen', 'trade_offer'],
      fremde_flottenbasen: ['flottenbewegungen', 'trade_offer'],
      flottenbewegungen: ['raumdock', 'spionage', 'flottenkommando', 'flottenbewegungen'],
    };
      // submenu loads after content
    config.loadStates.submenu = true;
    config.promises.submenu = getLoadStatePromise('content');
    config.promises.submenu.then(() => {
      lwmJQ('#link .navButton, #veticalLink .navButton').each((i, el) => {
        // remove acceptAllTradeOffers, because syntax is out of general concept and leads to exception
        if(lwmJQ(el).attr('onclick').match(/acceptAllTradeOffers\(\)\;/)){
          lwmJQ(el).remove(); 
          return true;
        }
        lwmJQ(el).attr('data-page', lwmJQ(el).attr('onclick').match(/('|")([a-z0-9A-Z_]*)('|")/)[2]);
        // check if items can be skipped
        if (ignoreItems[page] && ignoreItems[page].includes(lwmJQ(el).attr('data-page'))) {
          lwmJQ(el).remove();
          return true;
        }
        lwmJQ(el).find('i').remove(); // remove icons to avoid situations in which buttons could have more than one icon
        switch (lwmJQ(el).attr('data-page')) {
          case 'trade_offer': lwmJQ(el).prepend('<i class="fas fa-handshake"></i>'); break;
          case 'handelsposten': lwmJQ(el).prepend('<i class="fas fa-dollar-sign"></i>'); break;
          case 'building_tree': lwmJQ(el).prepend('<i class="fas fa-warehouse"></i>'); break;
          case 'research_tree': lwmJQ(el).prepend('<i class="fas fa-database"></i>'); break;
          case 'shiptree': lwmJQ(el).prepend('<i class="fas fa-fighter-jet"></i>'); break;
          case 'verteidigung_tree': lwmJQ(el).prepend('<i class="fas fa-shield-alt"></i>'); break;
          case 'planeten_tree': lwmJQ(el).prepend('<i class="fas fa-globe"></i>'); break;
          case 'rohstoffe': lwmJQ(el).prepend('<i class="fas fa-gem"></i>'); break;
          case 'eigenschaften': lwmJQ(el).prepend('<i class="fas fa-chart-bar"></i>'); break;
          case 'highscore_player': lwmJQ(el).prepend('<i class="fas fa-trophy"></i>'); break;
          case 'highscore_alliance': lwmJQ(el).prepend('<i class="fas fa-users"></i>'); break;
          case 'newPrivateMessage': lwmJQ(el).prepend('<i class="fas fa-envelope-open"></i>'); break;
          case 'privateMessageList': lwmJQ(el).prepend('<i class="fas fa-envelope"></i>'); break;
          case 'notifiscationMessageList': lwmJQ(el).prepend('<i class="fas fa-bell"></i>'); break;
          case 'reportMessageList': lwmJQ(el).prepend('<i class="fas fa-bomb"></i>'); lwmJQ(el).html(lwmJQ(el).html().replace('Kampf-Berichte', 'KBs')); break;
          case 'adminMessageList': lwmJQ(el).prepend('<i class="fas fa-user-cog"></i>'); break;
          case 'delitedMessageList': lwmJQ(el).prepend('<i class="fas fa-trash-alt"></i>'); break;
          case 'flottenbewegungen': lwmJQ(el).prepend('<i class="fas fa-wifi"></i>'); break;
          case 'raumdock': lwmJQ(el).prepend('<i class="fas fa-plane-arrival"></i>'); break;
          case 'flottenkommando': lwmJQ(el).prepend('<i class="fas fa-plane-departure"></i>'); break;
          case 'spionage': lwmJQ(el).prepend('<i class="fas fa-search"></i>'); break;
          case 'aktuelle_produktion': lwmJQ(el).prepend('<i class="fas fa-tools"></i>'); break;
          case 'schiffskomponenten': lwmJQ(el).prepend('<i class="fas fa-cogs"></i>'); break;
          case 'upgrade_ships': lwmJQ(el).prepend('<i class="fas fa-arrow-alt-circle-up"></i>'); break;
          case 'verteidigung': lwmJQ(el).prepend('<i class="fas fa-shield-alt"></i>'); break;
          case 'produktion': lwmJQ(el).prepend('<i class="fas fa-fighter-jet"></i>'); break;
          case 'upgrade_defence': lwmJQ(el).prepend('<i class="fas fa-arrow-alt-circle-up"></i>'); break;
          case 'recycling_defence': lwmJQ(el).prepend('<i class="fas fa-recycle"></i>'); break;
          case 'recycling_anlage': lwmJQ(el).prepend('<i class="fas fa-recycle"></i>'); break;
          case 'new_trade_offer': lwmJQ(el).prepend('<i class="fas fa-plus-circle"></i>'); break;
          case 'flottenbasen_planet': lwmJQ(el).prepend('<i class="fas fa-plane-departure"></i>'); break;
          case 'flottenbasen_all': lwmJQ(el).prepend('<i class="fas fa-plane-departure"></i>'); break;
          case 'fremde_flottenbasen': lwmJQ(el).prepend('<i class="fas fa-plane-departure"></i>'); break;
          case 'bank': lwmJQ(el).prepend('<i class="fas fa-university"></i>'); break;
          case 'kreditinstitut': lwmJQ(el).prepend('<i class="fab fa-cc-visa"></i>'); break;
          default: break;
        }
        return true;
      });

      if (lwmWindow.matchMedia('(min-width: 849px)').matches) {
        // layout fix v0.9.0
        let $secondMenuLine = lwmJQ('.menu .secound_line');
        if (!$secondMenuLine.length) {
          $secondMenuLine = lwmJQ('<div class="secound_line"></div>');
          lwmJQ('.menu').append($secondMenuLine);
        }
        lwmJQ('#link .navButton, #veticalLink .navButton').appendTo($secondMenuLine);
        $secondMenuLine.toggle($secondMenuLine.find('.navButton').length > 0);
      } else {
        let $submenuLinkBox = lwmJQ('.pageContent #link');
        if (!$submenuLinkBox.length) {
          $submenuLinkBox = lwmJQ('<div id="link"></div>');
          lwmJQ('.pageContent').first().prepend($submenuLinkBox);
        }
        lwmJQ('#link .navButton, #veticalLink .navButton').appendTo($submenuLinkBox);
        $submenuLinkBox.toggleClass('active', $submenuLinkBox.find('.navButton').length > 0);
      }

      config.loadStates.submenu = false;
    }).catch((e) => {
      Sentry.captureException(e);
      // console.log(e);
      throwError();
      config.loadStates.submenu = false;
    });
  },
  clear() {
    lwmJQ('.secound_line .navButton').remove();
    // lwmJQ('#link').html('');
  },
};
