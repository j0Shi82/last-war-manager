import {
  lwmJQ, siteWindow, lwmWindow, gmConfig,
} from 'config/globals';
import { Sentry } from 'plugins/sentry';
import { getPageLoadPromise } from 'utils/loadPromises';
import config from 'config/lwmConfig';
import { setDataForClocks } from 'utils/helper';
import { changePlanet } from 'utils/requests';
import uninstall from 'main/index';
import tweakTooltips from 'global/tooltips';

const { document, alert } = lwmWindow;
const isPremium = () => siteWindow.premium_account === 1;

export default () => {
  /* delete propassssss */
  lwmJQ('#propassssss').trigger('blur');
  lwmJQ('#propassssss,#loader,.ui-loader').remove();

  // add mobile support
  lwmJQ('meta[name=\'viewport\']').remove();
  lwmJQ('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0">');

  // attach loader for first page load
  lwmJQ('body').append('<div class="loader lwm-firstload"></div><div class="status lwm-firstload"></div>');

  // remove native mobile support
  lwmJQ('#portrait_screen').remove();

  // add mobile header collapse menu
  const $menuToggle = lwmJQ('<div id=\'lwm_menu_toggle\'>'
                                        + '<div class=\'lwm_menu-content\'>'
                                        + '<div class=\'lwm_menu-item\'>'
                                            + '<i class="fas fa-home"></i><i class="fas fa-warehouse"></i><i class="fas fa-database"></i><i class="fas fa-shield-alt"></i><i class="fas fa-fighter-jet"></i>'
                                            + '<i class="fas fa-plane-departure"></i><i class="fas fa-handshake"></i><i class="fas fa-envelope"></i><i class="fas icon-galaxy"></i><i class="fas fa-sign-out-alt"></i>'
                                            + '</div>'
                                            + '<div class=\'lwm_menu-item\'>'
                                            + '<div class="planet-changer"></div>'
                                            + '</div>'
                                            + '<div class=\'lwm_menu-item\'>'
                                            + '<i class="toggle fas fa-3x fa-plus-circle">'
                                            + '</div>'
                                        + '</div>'
                                    + '</div>');
  $menuToggle.find('.fa-home').click(() => { siteWindow.changeContent('ubersicht', 'first', 'Übersicht'); });
  $menuToggle.find('.fa-warehouse').click(() => { siteWindow.changeContent('construction', 'first', 'Konstruktion'); });
  $menuToggle.find('.fa-database').click(() => { siteWindow.changeContent('research', 'first', 'Forschung'); });
  $menuToggle.find('.fa-shield-alt').click(() => { siteWindow.changeContent('verteidigung', 'first', 'Verteidigung'); });
  $menuToggle.find('.fa-fighter-jet').click(() => { siteWindow.changeContent('produktion', 'first', 'Produktion'); });
  $menuToggle.find('.fa-plane-departure').click(() => { siteWindow.changeContent('flottenkommando', 'second', 'Flotten-Kommando'); });
  $menuToggle.find('.fa-handshake').click(() => { siteWindow.changeContent('new_trade_offer', 'second', 'Handelsangebot'); });
  $menuToggle.find('.fa-envelope').click(() => { siteWindow.changeContent('inbox', 'first', 'Nachrichten', 'notifiscationMessageList'); });
  $menuToggle.find('.icon-galaxy').click(() => { siteWindow.changeContent('galaxy_view', 'first', 'Galaxieansicht'); });
  $menuToggle.find('.fa-sign-out-alt').click(() => { siteWindow.logoutRequest(); });
  $menuToggle.find('.toggle').click((e) => {
    lwmJQ('#Header').toggle();
    lwmJQ(e.target).toggleClass('fa-plus-circle fa-minus-circle');
  });
  $menuToggle.prependTo(lwmJQ('#Main'));
  lwmJQ('.select_box_cordinaten').clone().appendTo($menuToggle.find('.planet-changer'));
  $menuToggle.find('.planet-changer').click((e) => { e.stopPropagation(); });
  $menuToggle.find('.planet-changer').find('select').change((e) => {
    lwmJQ('.profileInfo #allCordinaten').val(lwmJQ(e.target).find('select').val());
    changePlanet(e.target.value);
  });

  // main-mobile fixes
  if (!lwmJQ('#Footer').length) {
    const $footer = lwmJQ('<div id="Footer"><div class="resourceBoxs"></div></div>');
    lwmJQ('.resourceBox').appendTo($footer.find('.resourceBoxs'));
    lwmJQ('#Content').find('.resourceBoxs').remove();
    $footer.appendTo(lwmJQ('#Main'));
  }

  if (!lwmJQ('.menu > .first_line').length) {
    lwmJQ('<div class="first_line"></div>').appendTo(lwmJQ('.menu'));
    lwmJQ('.menu > .menu_box').appendTo(lwmJQ('.menu > .first_line'));
  }

  // make sure header is always visible on desktop
  // https://codepen.io/ravenous/pen/BgGKA
  function watchMenuOnWindowResize() {
    if (lwmWindow.matchMedia('(max-width: 850px)').matches) {
      lwmJQ('#Header').hide();
      $menuToggle.find('i.toggle').addClass('fa-plus-circle').removeClass('fa-minus-circle');

      lwmJQ('.secound_line .navButton').appendTo('#link, #veticalLink');
      lwmJQ('.secound_line').toggle(lwmJQ('.secound_line .navButton').length > 0);
    } else {
      lwmJQ('#Header').show();
      $menuToggle.find('i.toggle').addClass('fa-minus-circle').removeClass('fa-plus-circle');

      lwmJQ('#link .navButton, #veticalLink .navButton').appendTo('.secound_line');
      lwmJQ('.secound_line').toggle(lwmJQ('.secound_line .navButton').length > 0);
    }
  }
  lwmWindow.addEventListener('resize', watchMenuOnWindowResize, false);

  // remove unnecessary br
  lwmJQ('.middleContent > br').remove();

  // move menu into same container
  const divs = lwmJQ('.secound_line').find('div');
  lwmJQ.each(divs, (i, el) => {
    lwmJQ(el).appendTo('.first_line');
  });

  // add events to highlight current menus
  lwmJQ(document).on('click', '.menu_box', (e) => {
    lwmJQ('.menu_box').removeClass('activeBox');
    lwmJQ(e.target).closest('.menu_box').addClass('activeBox');
  });
  lwmJQ(document).on('click', '.secound_line .navButton', (e) => {
    lwmJQ('.secound_line .navButton').removeClass('activeBox');
    lwmJQ(e.target).closest('.navButton').addClass('activeBox');
  });
  lwmJQ(document).on('click', '#veticalLink .navButton', (e) => {
    lwmJQ('#veticalLink .navButton').removeClass('activeBox');
    lwmJQ(e.target).closest('.navButton').addClass('activeBox');
  });

  lwmJQ(document).on('click', '.menu_box[onclick*=changeContent],.secound_line .navButton[onclick*=changeContent],#veticalLink .navButton[onclick*=changeContent]', (e) => {
    // override changeContent to avoid multiple page calls
    // they are re-attached once a page loads or fails
    siteWindow.changeContent = () => {};
    siteWindow.changeInboxContent = () => {};

    const $button = lwmJQ(e.target).is('[onclick*=changeContent]') ? lwmJQ(e.target) : lwmJQ(e.target).parents('[onclick*=changeContent]');
    $button.attr('data-onclick', $button.attr('onclick')).attr('onclick', '');

    getPageLoadPromise().then(() => {
      siteWindow.changeContent = config.unsafeWindow.changeContent;
      siteWindow.changeInboxContent = config.unsafeWindow.changeInboxContent;
      $button.attr('onclick', $button.attr('data-onclick'));
    }).catch((event) => {
      Sentry.captureException(event);
      siteWindow.changeContent = config.unsafeWindow.changeContent;
      siteWindow.changeInboxContent = config.unsafeWindow.changeInboxContent;
      $button.attr('onclick', $button.attr('data-onclick'));
    });
  });

  // rewrite clock functions so we can kill timers
  //
  if (gmConfig.get('addon_clock')) {
    const clocks = ['initializeAktuelleProduktionClock', 'initializeClock', 'initializeClock2', 'initializeResearchClock', 'initializeUberClock', 'initializeFlottenbewegungenClock'];
    clocks.forEach((clock) => {
      const oldClock = siteWindow[clock];
      siteWindow[clock] = (idTr, idTd, idTime, totalSecounds, secounds, constructionNumber) => {
        oldClock(idTr, idTd, idTime, totalSecounds, secounds, constructionNumber);
        clearInterval(siteWindow.timeinterval_construction);
        clearInterval(siteWindow.timeinterval_construction2);
        clearInterval(siteWindow.timeinterval_research);
        clearInterval(siteWindow.timeinterval_uber);
        clearInterval(siteWindow.timeinterval_aktuelle_produktion);
        clearInterval(siteWindow.timeinterval_flottenbewegungen);
        setDataForClocks();
      };
    });
  }

  // register events to navigate with arrow keys
  lwmJQ(document).keyup((event) => {
    const isGalaxy = lwmJQ('#galaxyViewDiv').length > 0;
    const isInbox = lwmJQ('#messagesListTableInbox').length > 0;
    const isMessage = lwmJQ('.messages').length > 0 && lwmJQ('#newMessageInsert').length === 0;
    if (!isGalaxy && !isInbox && !isMessage) return;
    if (event.which === 37 && isGalaxy) siteWindow.goToPrevSystem();
    if (event.which === 39 && isGalaxy) siteWindow.goToNextSystem();
    if (event.which === 37 && isInbox) siteWindow.previousPage();
    if (event.which === 39 && isInbox) siteWindow.nextPage();
    if (event.which === 37 && isMessage) lwmJQ('.controller a:contains(\'<<\')').click();
    if (event.which === 39 && isMessage) lwmJQ('.controller a:contains(\'>>\')').click();
  });

  // replace the profile image box
  lwmJQ('#profileImageBox').css('background-image', `url(https://last-war.de/${lwmJQ('#imageAvatarPattern').attr('xlink:href')})`);

  // add menu icons
  lwmJQ('#ubersicht').prepend('<i class="fas fa-home"></i>');
  lwmJQ('#construction').prepend('<i class="fas fa-warehouse"></i>');
  lwmJQ('#research').prepend('<i class="fas fa-database"></i>');
  lwmJQ('#verteidigung').prepend('<i class="fas fa-shield-alt"></i>');
  lwmJQ('#produktion').prepend('<i class="fas fa-fighter-jet"></i>');
  lwmJQ('#flottenbewegungen').after(lwmJQ('#flottenbewegungen').clone().prepend('<i class="far fa-calendar"></i>').attr('id', 'calendar'));
  lwmJQ('#calendar span').text('Kalender');
  if (isPremium()) {
    lwmJQ('#flottenbewegungen').after(lwmJQ('#flottenbewegungen').clone().prepend('<i class="far fa-clipboard"></i>').attr('id', 'clipboard')
      .attr('onclick', ''));
    lwmJQ('#clipboard span').text('Notizblock');
  }
  lwmJQ('#flottenbewegungen').prepend('<i class="fas fa-plane-departure"></i>').attr('id', 'raumdock').attr('onclick', 'changeContent(\'flottenkommando\', \'second\', \'Flotten-Kommando\');');
  lwmJQ('#trade_offer').prepend('<i class="fas fa-handshake"></i>');
  lwmJQ('#rohstoffe').prepend('<i class="fas fa-gem"></i>');
  lwmJQ('#planeten').prepend('<i class="fas fa-globe"></i>');
  lwmJQ('#building_tree').prepend('<i class="fas fa-th-list"></i>');
  lwmJQ('#highscore_player').prepend('<i class="fas fa-trophy"></i>');
  lwmJQ('#create_new_allianze').prepend('<i class="fas fa-users"></i>');
  lwmJQ('#alliance').prepend('<i class="fas fa-users"></i>');
  lwmJQ('#inbox').prepend('<i class="fas fa-envelope"></i>');
  lwmJQ('#account').prepend('<i class="fas fa-user-circle"></i>');
  lwmJQ('#forum').prepend('<i class="fab fa-wpforms"></i>');
  lwmJQ('#chatMenu').prepend('<i class="fas fa-comments"></i>');
  lwmJQ('#logout').prepend('<i class="fas fa-sign-out-alt"></i>');

  if (isPremium()) {
    // memo block
    lwmJQ('#clipboard').click(() => {
      if (lwmJQ('.lwm-memo-container').length > 0) {
        lwmJQ('.lwm-memo-container').remove();
        return;
      }
      // add memo
      if (gmConfig.get('menu_clipboard')) {
        lwmJQ('#Main').css({
          opacity: '0.5',
          position: 'fixed',
          pointerEvents: 'none',
        });
      }
      const $closeButton = lwmJQ('<div class=\'lwm-memo-close\'><i class="fas fa-times-circle"></i></div>');
      $closeButton.click(() => {
        lwmJQ('#Main').css({
          opacity: '',
          position: '',
          pointerEvents: '',
        });
        lwmJQ('.lwm-memo-container').remove();
      });
      const $memoText = lwmJQ('<textarea class=\'lwm-memo-text\'></textarea>').text(siteWindow.memo_text);
      const $saveButton = lwmJQ('<div class="lwm-memo-save"><a class="buttonAccount" href="#"><i class="fas fa-check"></i> Speichern</a></div>');
      $saveButton.click(() => {
        const memoText = lwmJQ('.lwm-memo-text').val();

        if (isPremium() && memoText && memoText.length > 0) {
          siteWindow.jQuery.ajax({
            type: 'POST',
            dataType: 'json',
            url: './ajax_request/save_memo_text.php',
            data: { memo_text: memoText },
            error(jqXHR, textStatus, errorThrown) {
              alert(`${textStatus}: ${errorThrown}`);
            },
            success(data) {
              if (!data) {
                siteWindow.logoutRequest();
              } else if (data === -1) {
                alert("Your premium account is expired or you don't have it.");
                document.location.reload();
              } else if (data === -2) {
                alert('Please insert some text.');
              } else {
                siteWindow.memo_text = memoText;
                alert('Notizen gespeichert');
              }
            },
          });
        }
      });
      const $container = lwmJQ('<div class="lwm-memo-container"><div class="lwm-memo-menu"></div><div class="lwm-memo-body"></div></div>');
      if (!gmConfig.get('menu_clipboard')) $container.addClass('lwm-memo-container-inline');
      $container.find('.lwm-memo-body').append($memoText);
      $container.find('.lwm-memo-menu').append([$closeButton, $saveButton]);
      if (gmConfig.get('menu_clipboard')) lwmJQ('body').append($container); else lwmJQ('#Content').prepend($container);
    });
  }

  // add managerButton
  const $managerButton = lwmJQ('<div class="menu_box"><i class="fas fa-cogs"></i><span style="margin-right:2px;">Manager</span></div>');
  $managerButton.click(() => { gmConfig.open(); });
  lwmJQ('.first_line .menu_box:nth-last-child(2)').after($managerButton);

  // add manager unload on logout
  lwmJQ('#logout').click(() => { uninstall(); });

  // move galaxy view and resources into same container
  lwmJQ('.galaxyView').appendTo('.resourceBoxs');

  /* loader */
  lwmJQ('#all').before('<div class="loader"></div>');

  // tooltips
  tweakTooltips();

  /* font awesome */
  lwmJQ('head').append('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.2/css/all.css" integrity="sha384-fnmOCqbTlWIlj8LyTjo7mOUStjsKC4pOpQbqyi7RrhN7udi9RwhKkMHpvLbHG9Sr" crossorigin="anonymous">');
  lwmJQ('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome-animation/0.2.1/font-awesome-animation.min.css">');
};
