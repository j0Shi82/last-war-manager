import config from 'config/lwmConfig';
import { siteWindow } from 'config/globals';
import gmConfig from 'plugins/GM_config';
import {
  throwError,
} from 'utils/helper';
import { getPromise } from 'utils/loadPromises';
import { Sentry } from 'plugins/sentry';
import submenu from 'main/submenu';
import { createElementFromHTML, docQuery } from 'utils/domHelper';

const { document } = siteWindow;

export default () => {
  // clear content so loadStates doesn't fire too early
  // lwmJQ('#inboxContent').html('');
  config.promises.content = getPromise('.inboxDeleteMessageButtons,#messagesListTableInbox');
  config.promises.content.then(() => {
    config.loadStates.content = false;

    // workaround to bring the submenu in if you come to message from anywhere else than the message menu button
    if (docQuery('#veticalLink a.navButton') !== null && docQuery('.secound_line a.navButton') === null) submenu.move();

    // go through messages and add direct link to fight and spy reports
    // we do this after updating loadstate to not slow down page load
    const addReportLink = (message) => {
      const type = message.subject.search(/Kampfbericht/) !== -1 ? 'view_report_attack' : 'planetenscanner_view';
      const linkElement = createElementFromHTML(`<a target='_blank' href='${siteWindow.location.origin}/${type}.php?id=${message.reportID}&user=${config.gameData.playerID}'><i style='margin-left: 5px;' class='fas fa-external-link-alt'></i></a>`);
      const msgEl = docQuery(`[onclick*='${message.id}']`);
      if (msgEl !== null) msgEl.parentNode.appendChild(linkElement);
    };

    // install handler to attach report links on browsing message pages
    if (!config.pages.inbox.reportHandler) {
      document.addEventListener('click', (e) => {
        if (!['get_inbox_message', 'get_message_info'].includes(config.loadStates.lastLoadedPage)) return;
        if (!e.target.classList.contains('formButton')) return;
        if (e.target.getAttribute('onclick').search(/nextPage|previousPage/) === -1) return;
        if (![2, 4].includes(siteWindow.window.current_view_type)) return;
        config.gameData.messageData[1].forEach((m) => {
          if (m.subject.search(/Kampfbericht|Spionagebericht/) !== -1 && m.user_nickname === 'Systemnachricht') addReportLink(m);
        });
      });
      config.pages.inbox.reportHandler = true;
    }

    if ([2, 4].includes(siteWindow.window.current_view_type) && gmConfig.get('message_spylinks')) {
      config.gameData.messageData[1].forEach((m, i) => {
        if (m.subject.search(/Kampfbericht|Spionagebericht/) !== -1 && m.user_nickname === 'Systemnachricht') {
          siteWindow.jQuery.ajax({
            url: `/ajax_request/get_message_info.php?id_conversation=${m.id}&current_view_type=${siteWindow.window.current_view_type}`,
            dataType: 'json',
            data: { lwm_ignoreProcess: 1 },
            success(data) {
              // add reportID to data for future use
              [, config.gameData.messageData[1][i].reportID] = data[0][0].text.match(/id=(\d*)/);

              addReportLink(config.gameData.messageData[1][i]);
            },
            timeout: config.promises.interval.ajaxTimeout,
          });
        }
      });
    }
  }).catch((e) => {
    Sentry.captureException(e);
    // console.log(e);
    throwError();
    config.loadStates.content = false;
  });
};
