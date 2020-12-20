import { siteWindow } from 'config/globals';

const addProductionCalculator = (el, resCells, goButton, quantityElement, quantityProperty) => {
  const baseFe = parseInt(resCells[0].innerText.replace('.', ''), 10);
  const baseKris = parseInt(resCells[1].innerText.replace('.', ''), 10);
  const baseFrub = parseInt(resCells[2].innerText.replace('.', ''), 10);
  const baseOri = parseInt(resCells[3].innerText.replace('.', ''), 10);
  const baseFruro = parseInt(resCells[4].innerText.replace('.', ''), 10);
  const baseGold = parseInt(resCells[5].innerText.replace('.', ''), 10);
  const addListener = () => {
    let currentNumber = parseInt(quantityElement[quantityProperty], 10);
    if (currentNumber < 1) currentNumber = 1;

    const fe = baseFe * currentNumber;
    const kris = baseKris * currentNumber;
    const frub = baseFrub * currentNumber;
    const ori = baseOri * currentNumber;
    const fruro = baseFruro * currentNumber;
    const gold = baseGold * currentNumber;

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

  if (quantityProperty === 'value' && !quantityElement.getAttribute('data-prod-calc')) {
    quantityElement.addEventListener('change', addListener);
    quantityElement.setAttribute('data-prod-calc', true);
  }

  el.addEventListener('click', addListener);
};

export { addProductionCalculator };
