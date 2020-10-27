/* eslint-disable camelcase */

import { siteWindow } from 'config/globals';
import provideIntervalWorker from 'utils/intervalWorker';
import calculateResourcePerSec from 'utils/resourceTickLastWarFuncs';

export default () => {
  siteWindow.stopWorkerForResource();
  siteWindow.stopWorkerForResource = () => {};

  const resWorker = provideIntervalWorker(() => {
    const {
      Energy, lvlRoheisen, lvlKristall, lvlFrubin, lvlOrizin, lvlFrurozin, lvlGold, planeten_klass, rase,
      Roheisen, Kristall, Frubin, Orizin, Frurozin, Gold, RoheisenLagerCapacity, KristallLagerCapacity,
      FrubinLagerCapacity, OrizinLagerCapacity, FrurozinLagerCapacity, GoldLagerCapacity,
    } = siteWindow;

    let energyProc = 0.5;
    if (Energy >= 0) energyProc = 1.0;
    if (Energy === -1) energyProc = 0.9;
    if (Energy === -2) energyProc = 0.8;
    if (Energy === -3) energyProc = 0.7;
    if (Energy === -4) energyProc = 0.6;

    const lvlBuildings = [lvlRoheisen, lvlKristall, lvlFrubin, lvlOrizin, lvlFrurozin, lvlGold];

    const response_from_function = calculateResourcePerSec(lvlBuildings, planeten_klass, rase);

    const sek_Roheisen = response_from_function[0] * energyProc;
    const sek_Kristall = response_from_function[1] * energyProc;
    const sek_Frubin = response_from_function[2] * energyProc;

    const sek_Orizin = response_from_function[3] * energyProc;
    const sek_Frurozin = response_from_function[4] * energyProc;
    const sek_Gold = response_from_function[5] * energyProc;

    if (Roheisen + sek_Roheisen < RoheisenLagerCapacity) {
      siteWindow.Roheisen = Roheisen + sek_Roheisen;
    } else {
      siteWindow.Roheisen = RoheisenLagerCapacity;
    }

    if (Kristall + sek_Kristall < KristallLagerCapacity) {
      siteWindow.Kristall = Kristall + sek_Kristall;
    } else {
      siteWindow.Kristall = KristallLagerCapacity;
    }

    if (Frubin + sek_Frubin < FrubinLagerCapacity) { siteWindow.Frubin = Frubin + sek_Frubin; } else { siteWindow.Frubin = FrubinLagerCapacity; }

    if (Orizin + sek_Orizin < OrizinLagerCapacity) { siteWindow.Orizin = Orizin + sek_Orizin; } else { siteWindow.Orizin = OrizinLagerCapacity; }

    if (Frurozin + sek_Frurozin < FrurozinLagerCapacity) {
      siteWindow.Frurozin = Frurozin + sek_Frurozin;
    } else {
      siteWindow.Frurozin = FrurozinLagerCapacity;
    }

    if (Gold + sek_Gold < GoldLagerCapacity) {
      siteWindow.Gold = Gold + sek_Gold;
    } else {
      siteWindow.Gold = GoldLagerCapacity;
    }

    if (siteWindow.roheisen_kredit_rest > 0) {
      if (siteWindow.roheisen_kredit_rest > siteWindow.roheisen_kredit_per_sec) {
        siteWindow.Roheisen -= siteWindow.roheisen_kredit_per_sec;

        siteWindow.roheisen_kredit_rest -= siteWindow.roheisen_kredit_per_sec;
      } else {
        siteWindow.Roheisen -= siteWindow.roheisen_kredit_rest;

        siteWindow.roheisen_kredit_rest = 0;
      }
    }

    if (siteWindow.kristall_kredit_rest > 0) {
      if (siteWindow.kristall_kredit_rest > siteWindow.kristall_kredit_per_sec) {
        siteWindow.Kristall -= siteWindow.kristall_kredit_per_sec;

        siteWindow.kristall_kredit_rest -= siteWindow.kristall_kredit_per_sec;
      } else {
        siteWindow.Kristall -= siteWindow.kristall_kredit_rest;

        siteWindow.kristall_kredit_rest = 0;
      }
    }

    if (siteWindow.frubin_kredit_rest > 0) {
      if (siteWindow.frubin_kredit_rest > siteWindow.frubin_kredit_per_sec) {
        siteWindow.Frubin -= siteWindow.frubin_kredit_per_sec;

        siteWindow.frubin_kredit_rest -= siteWindow.frubin_kredit_per_sec;
      } else {
        siteWindow.Frubin -= siteWindow.frubin_kredit_rest;

        siteWindow.frubin_kredit_rest = 0;
      }
    }

    if (siteWindow.orizin_kredt_rest > 0) {
      if (siteWindow.orizin_kredt_rest > siteWindow.orizin_kredt_per_sec) {
        siteWindow.Orizin -= siteWindow.orizin_kredt_per_sec;

        siteWindow.orizin_kredt_rest -= siteWindow.orizin_kredt_per_sec;
      } else {
        siteWindow.Orizin -= siteWindow.orizin_kredt_rest;

        siteWindow.orizin_kredt_rest = 0;
      }
    }

    if (siteWindow.frurozin_kredit_rest > 0) {
      if (siteWindow.frurozin_kredit_rest > siteWindow.frurozin_kredit_per_sec) {
        siteWindow.Frurozin -= siteWindow.frurozin_kredit_per_sec;

        siteWindow.frurozin_kredit_rest -= siteWindow.frurozin_kredit_per_sec;
      } else {
        siteWindow.Frurozin -= siteWindow.frurozin_kredit_rest;

        siteWindow.frurozin_kredit_rest = 0;
      }
    }

    siteWindow.document.querySelector('#roheisenAmount').innerHTML = siteWindow.jQuery.number(Math.floor(Roheisen), 0, ',', '.');
    siteWindow.document.querySelector('#kristallAmount').innerHTML = siteWindow.jQuery.number(Math.floor(Kristall), 0, ',', '.');
    siteWindow.document.querySelector('#frubinAmount').innerHTML = siteWindow.jQuery.number(Math.floor(Frubin), 0, ',', '.');
    siteWindow.document.querySelector('#orizinAmount').innerHTML = siteWindow.jQuery.number(Math.floor(Orizin), 0, ',', '.');
    siteWindow.document.querySelector('#frurozinAmount').innerHTML = siteWindow.jQuery.number(Math.floor(Frurozin), 0, ',', '.');
    siteWindow.document.querySelector('#goldAmount').innerHTML = siteWindow.jQuery.number(Math.floor(Gold), 0, ',', '.');

    siteWindow.Roheisen_Full_Storage = Math.round((Roheisen * 100) / RoheisenLagerCapacity);
    siteWindow.Kristall_Full_Storage = Math.round((Kristall * 100) / KristallLagerCapacity);
    siteWindow.Frubin_Full_Storage = Math.round((Frubin * 100) / FrubinLagerCapacity);
    siteWindow.Orizin_Full_Storage = Math.round((Orizin * 100) / OrizinLagerCapacity);
    siteWindow.Frurozin_Full_Storage = Math.round((Frurozin * 100) / FrurozinLagerCapacity);
    siteWindow.Gold_Full_Storage = Math.round((Gold * 100) / GoldLagerCapacity);

    // od 10 pravugaonika koliko je popunjeno ;)

    let Roheisen_Storage_mod_10 = Math.round(siteWindow.Roheisen_Full_Storage / 10);
    let Kristall_Storage_mod_10 = Math.round(siteWindow.Kristall_Full_Storage / 10);
    let Frubin_Storage_mod_10 = Math.round(siteWindow.Frubin_Full_Storage / 10);
    let Orizin_Storage_mod_10 = Math.round(siteWindow.Orizin_Full_Storage / 10);
    let Frurozin_Storage_mod_10 = Math.round(siteWindow.Frurozin_Full_Storage / 10);
    let Gold_Storage_mod_10 = Math.round(siteWindow.Gold_Full_Storage / 10);

    let i;

    for (i = 0; i <= Roheisen_Storage_mod_10; i += 1) {
      if (siteWindow.jQuery(`#roheisenStorageBox${i}`).css('opacity') === 0.2) {
        siteWindow.jQuery(`#roheisenStorageBox${i}`).css('opacity', '1.0');
      }
    }

    Roheisen_Storage_mod_10 += 1;

    for (i = Roheisen_Storage_mod_10; i <= 10; i += 1) {
      if (siteWindow.jQuery(`#roheisenStorageBox${i}`).css('opacity') === 1.0) {
        siteWindow.jQuery(`#roheisenStorageBox${i}`).css('opacity', '0.2');
      } else {
        break;
      }
    }

    for (i = 0; i <= Kristall_Storage_mod_10; i += 1) {
      if (siteWindow.jQuery(`#kristallStorageBox${i}`).css('opacity') === 0.2) {
        siteWindow.jQuery(`#kristallStorageBox${i}`).css('opacity', '1.0');
      }
    }

    Kristall_Storage_mod_10 += 1;

    for (i = Kristall_Storage_mod_10; i <= 10; i += 1) {
      if (siteWindow.jQuery(`#kristallStorageBox${i}`).css('opacity') === 1.0) {
        siteWindow.jQuery(`#kristallStorageBox${i}`).css('opacity', '0.2');
      } else {
        break;
      }
    }

    for (i = 0; i <= Frubin_Storage_mod_10; i += 1) {
      if (siteWindow.jQuery(`#frubinStorageBox${i}`).css('opacity') === 0.2) {
        siteWindow.jQuery(`#frubinStorageBox${i}`).css('opacity', '1.0');
      }
    }

    Frubin_Storage_mod_10 += 1;

    for (i = Frubin_Storage_mod_10; i <= 10; i += 1) {
      if (siteWindow.jQuery(`#frubinStorageBox${i}`).css('opacity') === 1.0) {
        siteWindow.jQuery(`#frubinStorageBox${i}`).css('opacity', '0.2');
      } else {
        break;
      }
    }

    for (i = 0; i <= Orizin_Storage_mod_10; i += 1) {
      if (siteWindow.jQuery(`#orizinStorageBox${i}`).css('opacity') === 0.2) {
        siteWindow.jQuery(`#orizinStorageBox${i}`).css('opacity', '1.0');
      }
    }

    Orizin_Storage_mod_10 += 1;

    for (i = Orizin_Storage_mod_10; i <= 10; i += 1) {
      if (siteWindow.jQuery(`#orizinStorageBox${i}`).css('opacity') === 1.0) {
        siteWindow.jQuery(`#orizinStorageBox${i}`).css('opacity', '0.2');
      } else {
        break;
      }
    }

    for (i = 0; i <= Frurozin_Storage_mod_10; i += 1) {
      if (siteWindow.jQuery(`#frurozinStorageBox${i}`).css('opacity') === 0.2) {
        siteWindow.jQuery(`#frurozinStorageBox${i}`).css('opacity', '1.0');
      }
    }

    Frurozin_Storage_mod_10 += 1;

    for (i = Frurozin_Storage_mod_10; i <= 10; i += 1) {
      if (siteWindow.jQuery(`#frurozinStorageBox${i}`).css('opacity') === 1.0) {
        siteWindow.jQuery(`#frurozinStorageBox${i}`).css('opacity', '0.2');
      } else {
        break;
      }
    }

    for (i = 0; i <= Gold_Storage_mod_10; i += 1) {
      if (siteWindow.jQuery(`#goldStorageBox${i}`).css('opacity') === 0.2) {
        siteWindow.jQuery(`#goldStorageBox${i}`).css('opacity', '1.0');
      }
    }

    Gold_Storage_mod_10 += 1;

    for (i = Gold_Storage_mod_10; i <= 10; i += 1) {
      if (siteWindow.jQuery(`#goldStorageBox${i}`).css('opacity') === 1.0) {
        siteWindow.jQuery(`#goldStorageBox${i}`).css('opacity', '0.2');
      } else {
        break;
      }
    }
  }, 1000);
};
