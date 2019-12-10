import { siteWindow } from 'config/globals';

const createElementFromHTML = (htmlString) => {
  const div = siteWindow.document.createElement('div');
  div.innerHTML = htmlString.trim();

  if (div.childNodes.length > 1) return div.childNodes;
  return div.firstChild;
};

const docQuery = (query) => siteWindow.document.querySelector(query);

export { createElementFromHTML, docQuery };
