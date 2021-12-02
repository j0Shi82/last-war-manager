import {
  siteWindow,
} from 'config/globals';
import gmConfig from 'plugins/GM_config';
import { setDataForClocks } from 'utils/helper';

export default () => {
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

  // kill annoying idle alert
  siteWindow.document.removeEventListener('visibilitychange', siteWindow.handleVisibilityChange);
};
