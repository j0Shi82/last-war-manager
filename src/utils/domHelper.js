import { siteWindow } from 'config/globals';

const createElementFromHTML = (htmlString) => {
  const template = siteWindow.document.createElement('template');
  template.innerHTML = htmlString.trim();

  if (template.content.childNodes.length > 1) return template.content.childNodes;
  return template.content.firstChild;
};

const docQuery = (query) => siteWindow.document.querySelector(query);

export { createElementFromHTML, docQuery };
