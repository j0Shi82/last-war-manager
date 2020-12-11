import { siteWindow } from 'config/globals';

const addProductionCalculator = (el, resCells, goButton, quantityElement, quantityProperty, isSub = false) => {
  let currentNumber = parseInt(quantityElement[quantityProperty], 10);
  const addListener = () => {
    if (currentNumber === parseInt(quantityElement[quantityProperty], 10)) {
      return;
    }
    currentNumber = parseInt(quantityElement[quantityProperty], 10);

    let nextNumber; let curNumber;
    if (!isSub) {
      nextNumber = parseInt(quantityElement[quantityProperty], 10);
      curNumber = nextNumber - 1;
      curNumber = curNumber === 0 ? 1 : curNumber;
    } else {
      nextNumber = parseInt(quantityElement[quantityProperty], 10);
      curNumber = nextNumber + 1;
      nextNumber = nextNumber === 0 ? 1 : nextNumber;
    }

    const fe = parseInt((parseInt(resCells[0].innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
    const kris = parseInt((parseInt(resCells[1].innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
    const frub = parseInt((parseInt(resCells[2].innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
    const ori = parseInt((parseInt(resCells[3].innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
    const fruro = parseInt((parseInt(resCells[4].innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);
    const gold = parseInt((parseInt(resCells[5].innerText.replace('.', ''), 10) / curNumber) * nextNumber, 10);

    resCells[0].classList.toggle('noResource', fe > siteWindow.Roheisen);
    resCells[1].classList.toggle('noResource', kris > siteWindow.Kristall);
    resCells[2].classList.toggle('noResource', frub > siteWindow.Frubin);
    resCells[3].classList.toggle('noResource', ori > siteWindow.Orizin);
    resCells[4].classList.toggle('noResource', fruro > siteWindow.Frurozin);
    resCells[5].classList.toggle('noResource', gold > siteWindow.Gold);

    if (fe > siteWindow.Roheisen
          || kris > siteWindow.Kristall
          || frub > siteWindow.Frubin
          || ori > siteWindow.Orizin
          || fruro > siteWindow.Frurozin
          || gold > siteWindow.Gold
    ) {
      goButton.style.opacity = '0.5';
      goButton.style.pointerEvents = 'none';
    } else {
      goButton.style.opacity = '1';
      goButton.style.pointerEvents = 'auto';
    }

    resCells[0].innerHTML = siteWindow.jQuery.number(fe, 0, ',', '.');
    resCells[1].innerHTML = siteWindow.jQuery.number(kris, 0, ',', '.');
    resCells[2].innerHTML = siteWindow.jQuery.number(frub, 0, ',', '.');
    resCells[3].innerHTML = siteWindow.jQuery.number(ori, 0, ',', '.');
    resCells[4].innerHTML = siteWindow.jQuery.number(fruro, 0, ',', '.');
    resCells[5].innerHTML = siteWindow.jQuery.number(gold, 0, ',', '.');
  };

  el.addEventListener('click', addListener);
};

export { addProductionCalculator };
