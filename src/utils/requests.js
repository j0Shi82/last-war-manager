import { siteWindow } from 'config/globals';
import config from 'config/lwmConfig';

const getFlottenbewegungenInfo = () => siteWindow.jQuery.ajax({
  url: `/ajax_request/get_flottenbewegungen_info.php?galaxy=${config.gameData.planetCoords.galaxy}&system=${config.gameData.planetCoords.system}&planet=${config.gameData.planetCoords.planet}`,
  dataType: 'json',
  timeout: config.promises.interval.ajaxTimeout,
});
const getSpionageInfo = () => siteWindow.jQuery.ajax({
  url: `/ajax_request/get_spionage_info.php?galaxy_check=${config.gameData.planetCoords.galaxy}&system_check=${config.gameData.planetCoords.system}&planet_check=${config.gameData.planetCoords.planet}`,
  dataType: 'json',
  data: { lwm_ignoreProcess: 1 },
  timeout: config.promises.interval.ajaxTimeout,
});
const getObsInfo = () => siteWindow.jQuery.ajax({
  url: '/ajax_request/get_info_for_observationen_page.php',
  dataType: 'json',
  data: { lwm_ignoreProcess: 1 },
  timeout: config.promises.interval.ajaxTimeout,
});
const changePlanet = (coords) => {
  const coordsSplit = coords.split('x');
  return siteWindow.jQuery.ajax({
    url: '/ajax_request/change_cordinates.php',
    method: 'post',
    data: {
      galaxy: coordsSplit[0],
      system: coordsSplit[1],
      planet: coordsSplit[2],
    },
    timeout: config.promises.interval.ajaxTimeout,
    success: (data) => {
      if (data === '1') {
        siteWindow.location.reload();
      } else if (!data) {
        siteWindow.logoutRequest();
      }
    },
  });
};

export {
  getFlottenbewegungenInfo, getSpionageInfo, getObsInfo, changePlanet,
};
