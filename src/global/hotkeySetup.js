import { siteWindow, lwmJQ } from 'config/globals';
import config from 'config/lwmConfig';
import hotkeys from 'hotkeys-js';

export default () => {
  hotkeys('ctrl+shift+c,ctrl+shift+r,ctrl+shift+f,ctrl+shift+p,ctrl+shift+o', (event, handler) => {
    switch (handler.key) {
      case 'ctrl+shift+c': event.preventDefault(); siteWindow.changeContent('construction', 'first', 'Konstruktion'); break;
      case 'ctrl+shift+r': event.preventDefault(); siteWindow.changeContent('research', 'first', 'Forschung'); break;
      case 'ctrl+shift+f': event.preventDefault(); siteWindow.changeContent('flottenkommando', 'second', 'Flotten-Kommando'); break;
      case 'ctrl+shift+p': event.preventDefault(); siteWindow.changeContent('produktion', 'first', 'Produktion'); break;
      case 'ctrl+shift+o': event.preventDefault(); siteWindow.changeContent('ubersicht', 'first', 'Übersicht'); break;
      default: break;
    }
  });

  // add hotkeys for planets
  lwmJQ.each(config.gameData.planets, (i, coords) => {
    hotkeys(`ctrl+shift+${i + 1}`, () => {
      siteWindow.changeCords(coords.galaxy, coords.system, coords.planet);
    });
  });
};
