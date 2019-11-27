import { lwmJQ, gmConfig } from 'config/globals';
import config from 'config/lwmConfig';
import numeral from 'numeral';
import moment from 'moment';

const addConfirm = ($el, m = 'Really?') => {
  if ($el.data('has-confirm')) return;
  $el.data('has-confirm', true);
  const onclick = $el.attr('onclick');
  $el.attr('onclick', `r = confirm("${m}?"); if (r == true) ${onclick}`);
};
const addResMemory = ($list, type) => {
  lwmJQ.each($list, (i, el) => {
    lwmJQ(el).click(({ target }) => {
      config.currentSavedProject.fe = numeral(lwmJQ(target).parents('tr').find('.roheisenVariable').text()
        .replace(/\D/, '')).value();
      config.currentSavedProject.kris = numeral(lwmJQ(target).parents('tr').find('.kristallVariable').text()
        .replace(/\D/, '')).value();
      config.currentSavedProject.frub = numeral(lwmJQ(target).parents('tr').find('.frubinVariable').text()
        .replace(/\D/, '')).value();
      config.currentSavedProject.ori = numeral(lwmJQ(target).parents('tr').find('.orizinVariable').text()
        .replace(/\D/, '')).value();
      config.currentSavedProject.fruro = numeral(lwmJQ(target).parents('tr').find('.frurozinVariable').text()
        .replace(/\D/, '')).value();
      config.currentSavedProject.gold = numeral(lwmJQ(target).parents('tr').find('.goldVariable').text()
        .replace(/\D/, '')).value();
      config.currentSavedProject.ts = moment().unix();
      config.currentSavedProject.name = lwmJQ(target).parents('tr').find('.constructionName').text();
      config.currentSavedProject.type = type;
    });
  });
};
const setDataForClocks = () => {
  if (!gmConfig.get('addon_clock')) return true;
  lwmJQ('[id*=\'clock\'],[id*=\'Clock\']').each((i, el) => {
    if (typeof lwmJQ(el).data('clock_seconds') !== 'undefined') return true;

    const time = lwmJQ(el).text().split(':');
    const seconds = parseInt(time[0], 10) * 60 * 60 + parseInt(time[1], 10) * 60 + parseInt(time[2], 10);

    lwmJQ(el).data('clock_seconds', seconds - 1);

    return true;
  });

  return true;
};
const getFirstClassNameFromElement = ($el) => {
  const classList = $el.attr('class');
  if (typeof classList === 'undefined') return false;
  return classList.split(' ')[0];
};
const replaceElementsHtmlWithIcon = ($list, iconClass, amount = 1) => {
  lwmJQ.each($list, (i, el) => {
    let html = '';
    for (let j = 0; j < parseInt(amount, 10); j += 1) html += `<i class="${iconClass}"></i>`;
    lwmJQ(el).html(html);
  });
};
const addIconToHtmlElements = ($list, iconClass, amount = 1) => {
  lwmJQ.each($list, (i, el) => {
    let html = '';
    for (let j = 0; j < parseInt(amount, 10); j += 1) html += `<i class="${iconClass}"></i>`;
    lwmJQ(el).html(`${html}&nbsp;${lwmJQ(el).html()}`);
  });
};
const checkCoords = (coords) => {
  let c = [];
  if (!Array.isArray(coords)) c = coords.split('x');
  else c = coords;
  return Number.isInteger(parseInt(c[0], 10)) && Number.isInteger(parseInt(c[1], 10)) && Number.isInteger(c[2], 10);
};
const getIncomingResArray = () => {
  const to = config.gameData.tradeInfo.trade_offers;
  if (to.length === 0) return [0, 0, 0, 0, 0, 0];

  return [
    lwmJQ.map(to, (t) => parseInt(t.accept, 10) * ((parseInt(t.galaxy, 10) === config.gameData.planetCoords.galaxy
    && parseInt(t.system, 10) === config.gameData.planetCoords.system
    && parseInt(t.planet, 10) === config.gameData.planetCoords.planet)
      ? parseInt(t.resource[12], 10)
      : parseInt(t.resource[6], 10))).reduce((total, num) => total + num),
    lwmJQ.map(to, (t) => parseInt(t.accept, 10) * ((parseInt(t.galaxy, 10) === config.gameData.planetCoords.galaxy
    && parseInt(t.system, 10) === config.gameData.planetCoords.system
    && parseInt(t.planet, 10) === config.gameData.planetCoords.planet)
      ? parseInt(t.resource[13], 10)
      : parseInt(t.resource[7], 10))).reduce((total, num) => total + num),
    lwmJQ.map(to, (t) => parseInt(t.accept, 10) * ((parseInt(t.galaxy, 10) === config.gameData.planetCoords.galaxy
    && parseInt(t.system, 10) === config.gameData.planetCoords.system
    && parseInt(t.planet, 10) === config.gameData.planetCoords.planet)
      ? parseInt(t.resource[14], 10)
      : parseInt(t.resource[8], 10))).reduce((total, num) => total + num),
    lwmJQ.map(to, (t) => parseInt(t.accept, 10) * ((parseInt(t.galaxy, 10) === config.gameData.planetCoords.galaxy
    && parseInt(t.system, 10) === config.gameData.planetCoords.system
    && parseInt(t.planet, 10) === config.gameData.planetCoords.planet)
      ? parseInt(t.resource[15], 10)
      : parseInt(t.resource[9], 10))).reduce((total, num) => total + num),
    lwmJQ.map(to, (t) => parseInt(t.accept, 10) * ((parseInt(t.galaxy, 10) === config.gameData.planetCoords.galaxy
    && parseInt(t.system, 10) === config.gameData.planetCoords.system
    && parseInt(t.planet, 10) === config.gameData.planetCoords.planet)
      ? parseInt(t.resource[16], 10)
      : parseInt(t.resource[10], 10))).reduce((total, num) => total + num),
    lwmJQ.map(to, (t) => parseInt(t.accept, 10) * ((parseInt(t.galaxy, 10) === config.gameData.planetCoords.galaxy
    && parseInt(t.system, 10) === config.gameData.planetCoords.system
    && parseInt(t.planet, 10) === config.gameData.planetCoords.planet)
      ? parseInt(t.resource[17], 10)
      : parseInt(t.resource[11], 10))).reduce((total, num) => total + num),
  ];
};
const throwError = (m = 'Something went wrong while loading the page. Not all features might be fully functional!') => {
  if (lwmJQ('#all').find('.lwm-loaderror').length) return;
  lwmJQ('#all').prepend(`<div class="lwm-loaderror" style="margin-bottom: 20px;background-color: #792121;border: 1px solid rgba(124, 243, 241, 0.5);padding: 2px;"><i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>${m}</div>`);
};
const getActiveObs = (coords) => {
  let c = [];
  if (!Array.isArray(coords)) c = coords.split('x');
  else c = coords;
  return lwmJQ.grep(config.gameData.observationInfo.observationen_informations, (obsData) => parseInt(obsData.galaxy, 10) === parseInt(c[0], 10)
  && parseInt(obsData.system, 10) === parseInt(c[1], 10)
  && parseInt(obsData.planet, 10) === parseInt(c[2], 10));
};

export {
  addConfirm,
  addResMemory,
  setDataForClocks,
  getFirstClassNameFromElement,
  replaceElementsHtmlWithIcon,
  addIconToHtmlElements,
  checkCoords,
  getIncomingResArray,
  throwError,
  getActiveObs,
};
