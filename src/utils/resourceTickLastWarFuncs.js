/* eslint-disable no-lonely-if */
/* eslint-disable default-case */
/* eslint-disable no-self-assign */
/* eslint-disable eqeqeq */
/* eslint-disable max-len */
/* eslint-disable camelcase */

function getBonus(planeten_klass, rase) {
  let bonus_roheisen = 0;
  let bonus_kristall = 0;
  let bonus_frubin = 0;
  let bonus_orizin = 0;
  let bonus_furozin = 0;

  let add_roheisen = 0;
  let add_kristall = 0;
  let add_frubin = 0;
  let add_orizin = 0;
  let add_furozin = 0;

  switch (planeten_klass) {
    case 'M':

      break;

    case 'N':

      bonus_roheisen = 0.1;
      bonus_kristall = 0.15;
      bonus_frubin = 0.05;
      bonus_orizin = 0.1;
      bonus_furozin = 0.05;

      add_roheisen = -1;
      add_kristall = 1;
      add_frubin = -1;
      add_orizin = 1;
      add_furozin = 1;

      break;

    case 'O':

      bonus_roheisen = 0.15;
      bonus_kristall = 0.2;
      bonus_frubin = 0.1;
      bonus_orizin = 0.1;
      bonus_furozin = 0.2;

      add_roheisen = 1;
      add_kristall = 1;
      add_frubin = -1;
      add_orizin = -1;
      add_furozin = -1;

      break;

    case 'P':

      bonus_roheisen = 0.05;
      bonus_kristall = 0.05;
      bonus_furozin = 0.05;

      add_roheisen = -1;
      add_kristall = 1;
      add_furozin = 1;

      break;

    case 'Q':

      bonus_roheisen = 0.05;
      bonus_kristall = 0.1;
      bonus_frubin = 0.05;
      bonus_furozin = 0.05;

      add_roheisen = 1;
      add_kristall = -1;
      add_frubin = 1;
      add_furozin = 1;

      break;

    case 'R':

      bonus_roheisen = 0.2;
      bonus_kristall = 0.15;
      bonus_frubin = 0.3;
      bonus_orizin = 0.25;
      bonus_furozin = 0.35;

      add_roheisen = -1;
      add_kristall = -1;
      add_frubin = 1;
      add_orizin = 1;
      add_furozin = 1;

      break;

    case 'T':

      bonus_roheisen = 0.05;
      bonus_kristall = 0.15;
      bonus_frubin = 0.05;
      bonus_furozin = 0.05;

      add_roheisen = 1;
      add_kristall = 1;
      add_frubin = 1;
      add_furozin = 1;

      break;

    case 'U':

      bonus_kristall = 0.1;
      bonus_frubin = 0.2;
      bonus_orizin = 0.05;
      bonus_furozin = 0.15;

      add_kristall = -1;
      add_frubin = -1;
      add_orizin = -1;
      add_furozin = -1;

      break;

    case 'V':

      bonus_roheisen = 0.1;
      bonus_orizin = 0.1;

      add_roheisen = 1;
      add_orizin = -1;

      break;

    case 'S':

      bonus_orizin = 0.15;

      add_orizin = 1;

      break;

    case 'W':

      bonus_kristall = 0.05;
      bonus_frubin = 0.1;
      bonus_orizin = 0.05;
      bonus_furozin = 0.05;

      add_kristall = -1;
      add_frubin = -1;
      add_orizin = 1;
      add_furozin = 1;

      break;

    case 'X':

      bonus_roheisen = 0.4;
      bonus_kristall = 0.1;
      bonus_frubin = 0.25;
      bonus_orizin = 0.15;
      bonus_furozin = 0.25;

      add_roheisen = 1;
      add_kristall = -1;
      add_frubin = -1;
      add_orizin = -1;
      add_furozin = -1;

      break;

    case 'Y':

      bonus_roheisen = 0.15;
      bonus_kristall = 0.2;
      bonus_orizin = 0.2;
      bonus_furozin = 0.15;

      add_roheisen = -1;
      add_kristall = 1;
      add_orizin = -1;
      add_furozin = -1;

      break;

    case 'A':

      bonus_kristall = 0.1;
      bonus_furozin = 0.05;

      add_kristall = 1;
      add_furozin = 1;

      break;

    case 'B':

      bonus_roheisen = 0.1;
      bonus_kristall = 0.1;
      bonus_furozin = 0.1;

      add_roheisen = 1;
      add_kristall = 1;
      add_furozin = -1;

      break;

    case 'C':

      bonus_kristall = 0.05;
      bonus_frubin = 0.05;
      bonus_furozin = 0.2;

      add_kristall = -1;
      add_frubin = -1;
      add_furozin = 1;

      break;
  }

  if (rase == 'Xianier') {
    if (add_roheisen >= 0) {
      // ovo ovde je ako muje ovaj resurs pozitivan
      bonus_roheisen += 0.1;
      add_roheisen = 1;
    } else {
      // a ovde ako je negativan
      if (bonus_roheisen > 0.1) {
        // e sada ovde radim ako je veca negativna vrednost i resurs i dalje ostaje negativan
        bonus_roheisen -= 0.1;
        add_roheisen = -1;
      } else if (bonus_roheisen < 0.1) {
        // ovde radim kada je resurs manji i prelazi u pozitivnu vrednost
        bonus_roheisen = 0.1 - bonus_roheisen;
        add_roheisen = 1;
      } else if (bonus_roheisen == 0.1) {
        // ovde radim kada on gubi pozitivnost
        bonus_roheisen -= 0.1;
        add_roheisen = 0;
      }
    }

    if (add_kristall >= 0) {
      // ovo ovde je ako muje ovaj resurs pozitivan
      bonus_kristall += 0.1;
      add_kristall = 1;
    } else {
      // a ovde ako je negativan
      if (bonus_kristall > 0.1) {
        // e sada ovde radim ako je veca negativna vrednost i resurs i dalje ostaje negativan
        bonus_kristall -= 0.1;
        add_kristall = -1;
      } else if (bonus_kristall < 0.1) {
        // ovde radim kada je resurs manji i prelazi u pozitivnu vrednost
        bonus_kristall = 0.1 - bonus_kristall;
        add_kristall = 1;
      } else if (bonus_kristall == 0.1) {
        // ovde radim kada on gubi pozitivnost
        bonus_kristall -= 0.1;
        add_kristall = 0;
      }
    }

    if (add_frubin >= 0) {
      // ovo ovde je ako muje ovaj resurs pozitivan
      bonus_frubin += 0.1;
      add_frubin = 1;
    } else {
      // a ovde ako je negativan
      if (bonus_frubin > 0.1) {
        // e sada ovde radim ako je veca negativna vrednost i resurs i dalje ostaje negativan
        bonus_frubin -= 0.1;
        add_frubin = -1;
      } else if (bonus_frubin < 0.1) {
        // ovde radim kada je resurs manji i prelazi u pozitivnu vrednost
        bonus_frubin = 0.1 - bonus_frubin;
        add_frubin = 1;
      } else if (bonus_frubin == 0.1) {
        // ovde radim kada on gubi pozitivnost
        bonus_frubin -= 0.1;
        add_frubin = 0;
      }
    }

    if (add_orizin >= 0) {
      // ovo ovde je ako muje ovaj resurs pozitivan
      bonus_orizin += 0.1;
      add_orizin = 1;
    } else {
      // a ovde ako je negativan
      if (bonus_orizin > 0.1) {
        // e sada ovde radim ako je veca negativna vrednost i resurs i dalje ostaje negativan
        bonus_orizin -= 0.1;
        add_orizin = -1;
      } else if (bonus_orizin < 0.1) {
        // ovde radim kada je resurs manji i prelazi u pozitivnu vrednost
        bonus_orizin = 0.1 - bonus_orizin;
        add_orizin = 1;
      } else if (bonus_orizin == 0.1) {
        // ovde radim kada on gubi pozitivnost
        bonus_orizin -= 0.1;
        add_orizin = 0;
      }
    }

    if (add_furozin >= 0) {
      // ovo ovde je ako muje ovaj resurs pozitivan
      bonus_furozin += 0.1;
      add_furozin = 1;
    } else {
      // a ovde ako je negativan
      if (bonus_furozin > 0.1) {
        // e sada ovde radim ako je veca negativna vrednost i resurs i dalje ostaje negativan
        bonus_furozin -= 0.1;
        add_furozin = -1;
      } else if (bonus_furozin < 0.1) {
        // ovde radim kada je resurs manji i prelazi u pozitivnu vrednost
        bonus_furozin = 0.1 - bonus_furozin;
        add_furozin = 1;
      } else if (bonus_furozin == 0.1) {
        // ovde radim kada on gubi pozitivnost
        bonus_furozin -= 0.1;
        add_furozin = 0;
      }
    }
  }

  return {
    bonus_frubin,
    bonus_furozin,
    bonus_kristall,
    bonus_orizin,
    bonus_roheisen,
    add_frubin,
    add_furozin,
    add_kristall,
    add_orizin,
    add_roheisen,
  };
}

function calculateResourcePerSec(lvlBuildings, planeten_klass, rase) {
  const {
    bonus_frubin,
    bonus_furozin,
    bonus_kristall,
    bonus_orizin,
    bonus_roheisen,
    add_frubin,
    add_furozin,
    add_kristall,
    add_orizin,
    add_roheisen,
  } = getBonus(planeten_klass, rase);

  const lvlRoheisen = lvlBuildings[0];
  const lvlKristall = lvlBuildings[1];
  const lvlFrubin = lvlBuildings[2];
  const lvlOrizin = lvlBuildings[3];
  const lvlFrurozin = lvlBuildings[4];
  const lvlGold = lvlBuildings[5];

  let sek_Roheisen = 0;
  let sek_Kristall = 0;
  let sek_Frubin = 0;
  let sek_Orizin = 0;
  let sek_Frurozin = 0;
  let sek_Gold = 0;

  if (lvlRoheisen == 1) {
    sek_Roheisen = 11 / 3600;
  } else if (lvlRoheisen == 2) { sek_Roheisen = 19 / 3600; } else { sek_Roheisen = (4.5 * lvlRoheisen * lvlRoheisen - 10.5 * lvlRoheisen + 26) / 3600; }

  if (lvlKristall == 1) {
    sek_Kristall = 9 / 3600;
  } else if (lvlKristall == 2) { sek_Kristall = 15 / 3600; } else { sek_Kristall = (3.8 * lvlKristall * lvlKristall - 10.5 * lvlKristall + 23) / 3600; }

  if (lvlFrubin == 1) {
    sek_Frubin = 7 / 3600;
  } else if (lvlFrubin == 2) { sek_Frubin = 11 / 3600; } else { sek_Frubin = (3.5 * lvlFrubin * lvlFrubin - 10.5 * lvlFrubin + 20) / 3600; }

  if (lvlOrizin == 1) {
    sek_Orizin = 7 / 3600;
  } else if (lvlOrizin == 2) { sek_Orizin = 11 / 3600; } else { sek_Orizin = (3.5 * lvlOrizin * lvlOrizin - 10.5 * lvlOrizin + 20) / 3600; }

  if (lvlFrurozin == 0) {
    sek_Frurozin = 0;
  } else if (lvlFrurozin == 1) {
    sek_Frurozin = 4 / 3600;
  } else if (lvlFrurozin == 2) { sek_Frurozin = 9 / 3600; } else { sek_Frurozin = (3 * lvlFrurozin * lvlFrurozin - 10.5 * lvlFrurozin + 15) / 3600; }

  if (lvlGold == 0) {
    sek_Gold = 0;
  } else if (lvlGold == 1) {
    sek_Gold = 1 / 3600;
  } else if (lvlGold == 2) {
    sek_Gold = 2 / 3600;
  } else {
    sek_Gold = (lvlGold * (lvlGold / 2)) / 3600;
  }

  sek_Roheisen += sek_Roheisen * bonus_roheisen * add_roheisen;
  sek_Kristall += sek_Kristall * add_kristall * bonus_kristall;
  sek_Frubin += sek_Frubin * add_frubin * bonus_frubin;
  sek_Orizin += sek_Orizin * add_orizin * bonus_orizin;
  sek_Frurozin += sek_Frurozin * add_furozin * bonus_furozin;
  sek_Gold = sek_Gold;

  return [sek_Roheisen, sek_Kristall, sek_Frubin, sek_Orizin, sek_Frurozin, sek_Gold];
}

export default calculateResourcePerSec;
