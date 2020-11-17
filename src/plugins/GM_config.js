/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable no-plusplus */
/*
Copyright 2009+, GM_config Contributors (https://github.com/sizzlemctwizzle/GM_config)

GM_config Contributors:
    Mike Medley <medleymind@gmail.com>
    Joe Simmons
    Izzy Soft
    Marti Martz

GM_config is distributed under the terms of the GNU Lesser General Public License.

    GM_config is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// ==UserScript==
// @exclude       *
// @author        Mike Medley <medleymind@gmail.com> (https://github.com/sizzlemctwizzle/GM_config)
// @icon          https://raw.githubusercontent.com/sizzlemctwizzle/GM_config/master/gm_config_icon_large.png

// ==UserLibrary==
// @name          GM_config
// @description   A lightweight, reusable, cross-browser graphical settings framework for inclusion in user scripts.
// @copyright     2009+, Mike Medley (https://github.com/sizzlemctwizzle)
// @license       LGPL-3.0-or-later; https://raw.githubusercontent.com/sizzlemctwizzle/GM_config/master/LICENSE

// ==/UserScript==

// ==/UserLibrary==

import {
  gmSetValue, gmGetValue, siteWindow,
} from 'config/globals';

const { document } = siteWindow;

function gmConfigDefaultValue(type, options) {
  let value;
  let t = type;

  if (type.indexOf('unsigned ') === 0) { t = type.substring(9); }

  switch (t) {
    case 'radio': case 'select':
      [value] = options;
      break;
    case 'checkbox':
      value = false;
      break;
    case 'int': case 'integer':
    case 'float': case 'number':
      value = 0;
      break;
    default:
      value = '';
  }

  return value;
}

function GmConfigField(settings, stored, id, customType, configId) {
  // Store the field's settings
  this.settings = settings;
  this.id = id;
  this.configId = configId;
  this.node = null;
  this.wrapper = null;
  this.save = typeof settings.save === 'undefined' ? true : settings.save;

  // Buttons are static and don't have a stored value
  if (settings.type === 'button') this.save = false;

  // if a default value wasn't passed through init() then
  //   if the type is custom use its default value
  //   else use default value for type
  // else use the default value passed through init()
  this.default = typeof settings.default === 'undefined'
    ? customType
      ? customType.default
      : gmConfigDefaultValue(settings.type, settings.options)
    : settings.default;

  // Store the field's value
  this.value = typeof stored === 'undefined' ? this.default : stored;

  // Setup methods for a custom type
  if (customType) {
    this.toNode = customType.toNode;
    this.toValue = customType.toValue;
    this.reset = customType.reset;
  }
}

// This is the initializer function
async function gmConfigInit(config, args) {
  // Initialize instance variables
  if (typeof config.fields === 'undefined') {
    config.fields = {};
    config.onInit = config.onInit || function onInit() {};
    config.onOpen = config.onOpen || function onOpen() {};
    config.onSave = config.onSave || function onSave() {};
    config.onClose = config.onClose || function onClose() {};
    config.onReset = config.onReset || function onReset() {};
    config.isOpen = false;
    config.title = 'User Script Settings';
    config.css = {
      basic: `${[
        '#GM_config * { font-family: arial,tahoma,myriad pro,sans-serif; }',
        '#GM_config { background: #FFF; }',
        "#GM_config input[type='radio'] { margin-right: 8px; }",
        '#GM_config .indent40 { margin-left: 40%; }',
        '#GM_config .field_label { font-size: 12px; font-weight: bold; margin-right: 6px; }',
        '#GM_config .radio_label { font-size: 12px; }',
        '#GM_config .block { display: block; }',
        '#GM_config .saveclose_buttons { margin: 16px 10px 10px; padding: 2px 12px; }',
        '#GM_config .reset, #GM_config .reset a,'
              + ' #GM_config_buttons_holder { color: #000; text-align: right; }',
        '#GM_config .config_header { font-size: 20pt; margin: 0; }',
        '#GM_config .config_desc, #GM_config .section_desc, #GM_config .reset { font-size: 9pt; }',
        '#GM_config .center { text-align: center; }',
        '#GM_config .section_header_holder { margin-top: 8px; }',
        '#GM_config .config_var { margin: 0 0 4px; }',
        '#GM_config .section_header { background: #414141; border: 1px solid #000; color: #FFF;',
        ' font-size: 13pt; margin: 0; }',
        '#GM_config .section_desc { background: #EFEFEF; border: 1px solid #CCC; color: #575757;'
              + ' font-size: 9pt; margin: 0 0 6px; }',
      ].join('\n')}\n`,
      basicPrefix: 'GM_config',
      stylish: '',
    };
  }

  let settings = {};

  if (args.length === 1
        && typeof args[0].id === 'string'
        && typeof args[0].appendChild !== 'function') [settings] = args;
  else {
    // Provide backwards-compatibility with argument style intialization
    settings = {};

    // loop through GM_config.init() arguments
    for (let i = 0, l = args.length, arg; i < l; ++i) {
      arg = args[i];

      // An element to use as the config window
      if (typeof arg.appendChild === 'function') {
        settings.frame = arg;
      } else {
        switch (typeof arg) {
          case 'object':
            Object.keys(arg).forEach((j) => { // could be a callback functions or settings object
              if (typeof arg[j] !== 'function') { // we are in the settings object
                settings.fields = arg; // store settings object
                return false; // leave the loop
              } // otherwise it must be a callback function
              if (!settings.events) settings.events = {};
              settings.events[j] = arg[j];
              return true;
            });
            break;
          case 'function': // passing a bare function is set to open callback
            settings.events = { onOpen: arg };
            break;
          case 'string': // could be custom CSS or the title string
            if (/\w+\s*\{\s*\w+\s*:\s*\w+[\s|\S]*\}/.test(arg)) { settings.css = arg; } else { settings.title = arg; }
            break;
          default:
            break;
        }
      }
    }
  }

  /* Initialize everything using the new settings object */
  // Set the id
  if (settings.id) config.id = settings.id;
  else if (typeof config.id === 'undefined') config.id = 'GM_config';

  // Set the title
  if (settings.title) config.title = settings.title;

  // Set the custom css
  if (settings.css) config.css.stylish = settings.css;

  // Set the frame
  if (settings.frame) config.frame = settings.frame;

  // Set the event callbacks
  if (settings.events) {
    const { events } = settings;
    for (const e in events) { config[`on${e.charAt(0).toUpperCase()}${e.slice(1)}`] = events[e]; }
  }

  // Create the fields
  if (settings.fields) {
    const stored = await config.read(); // read the stored settings
    const { fields } = settings;
    const customTypes = settings.types || {};
    const configId = config.id;

    for (const id in fields) {
      const field = fields[id];

      // for each field definition create a field object
      if (field) {
        config.fields[id] = new GmConfigField(field, stored[id], id,
          customTypes[field.type], configId);
      } else if (config.fields[id]) delete config.fields[id];
    }
  }

  // If the id has changed we must modify the default style
  if (config.id !== config.css.basicPrefix) {
    config.css.basic = config.css.basic.replace(
      new RegExp(`#${config.css.basicPrefix}`, 'gm'), `#${config.id}`,
    );
    config.css.basicPrefix = config.id;
  }
}

// The GM_config constructor
function GmConfigStruct() {
  // call init() if settings were passed to constructor
  if (arguments.length) {
    gmConfigInit(this, arguments).then(() => {
      this.onInit();
    });
  }
}

GmConfigStruct.prototype = {
  // Support old method of initalizing
  async init() {
    await gmConfigInit(this, arguments);
    this.onInit();
  },

  // call GM_config.open() from your script to open the menu
  open() {
    // Die if the menu is already open on this page
    // You can have multiple instances but you can't open the same instance twice
    const match = document.getElementById(this.id);
    if (match && (match.tagName === 'IFRAME' || match.childNodes.length > 0)) return;

    // Sometimes "this" gets overwritten so create an alias
    const config = this;

    // Function to build the mighty config window :)
    function buildConfigWin(body, head) {
      const { create } = config;
      const { fields } = config;
      const configId = config.id;
      const bodyWrapper = create('div', { id: `${configId}_wrapper` });

      // Append the style which is our default style plus the user style
      head.appendChild(
        create('style', {
          type: 'text/css',
          textContent: config.css.basic + config.css.stylish,
        }),
      );

      // Add header and title
      bodyWrapper.appendChild(create('div', {
        id: `${configId}_header`,
        className: 'config_header block center',
      }, config.title));

      // Append elements
      let section = bodyWrapper;
      let secNum = 0; // Section count

      // loop through fields
      for (const id in fields) {
        const field = fields[id];
        const { settings } = field;

        if (settings.section) { // the start of a new section
          section = bodyWrapper.appendChild(create('div', {
            className: 'section_header_holder',
            id: `${configId}_section_${secNum}`,
          }));

          if (Object.prototype.toString.call(settings.section) !== '[object Array]') { settings.section = [settings.section]; }

          if (settings.section[0]) {
            section.appendChild(create('div', {
              className: 'section_header center',
              id: `${configId}_section_header_${secNum}`,
            }, settings.section[0]));
          }

          if (settings.section[1]) {
            section.appendChild(create('p', {
              className: 'section_desc center',
              id: `${configId}_section_desc_${secNum}`,
            }, settings.section[1]));
          }
          ++secNum;
        }

        // Create field elements and append to current section
        section.appendChild((field.wrapper = field.toNode()));
      }

      // Add save and close buttons
      bodyWrapper.appendChild(create('div',
        { id: `${configId}_buttons_holder` },

        create('button', {
          id: `${configId}_saveBtn`,
          textContent: 'Save',
          title: 'Save settings',
          className: 'saveclose_buttons',
          onclick() { config.save(); },
        }),

        create('button', {
          id: `${configId}_closeBtn`,
          textContent: 'Close',
          title: 'Close window',
          className: 'saveclose_buttons',
          onclick() { config.close(); },
        }),

        create('div',
          { className: 'reset_holder block' },

          // Reset link
          create('a', {
            id: `${configId}_resetLink`,
            textContent: 'Reset to defaults',
            href: '#',
            title: 'Reset fields to default values',
            className: 'reset',
            onclick(e) { e.preventDefault(); config.reset(); },
          }))));

      body.appendChild(bodyWrapper); // Paint everything to window at once
      config.center(); // Show and center iframe
      siteWindow.addEventListener('resize', config.center, false); // Center frame on resize

      // Call the open() callback function
      config.onOpen(config.frame.contentDocument || config.frame.ownerDocument,
        config.frame.contentWindow || siteWindow,
        config.frame);

      // Close frame on window close
      siteWindow.addEventListener('beforeunload', () => {
        config.close();
      }, false);

      // Now that everything is loaded, make it visible
      config.frame.style.display = 'block';
      config.isOpen = true;
    }

    // Change this in the onOpen callback using this.frame.setAttribute('style', '')
    const defaultStyle = 'bottom: auto; border: 1px solid #000; display: none; height: 75%;'
        + ' left: 0; margin: 0; max-height: 95%; max-width: 95%; opacity: 0;'
        + ' overflow: auto; padding: 0; position: fixed; right: auto; top: 0;'
        + ' width: 75%; z-index: 9999;';

    // Either use the element passed to init() or create an iframe
    if (this.frame) {
      this.frame.id = this.id; // Allows for prefixing styles with the config id
      this.frame.setAttribute('style', defaultStyle);
      buildConfigWin(this.frame, this.frame.ownerDocument.getElementsByTagName('head')[0]);
    } else {
      // Create frame
      document.body.appendChild((this.frame = this.create('iframe', {
        id: this.id,
        style: defaultStyle,
      })));

      // In WebKit src can't be set until it is added to the page
      this.frame.src = 'about:blank';
      // we wait for the iframe to load before we can modify it
      this.frame.addEventListener('load', () => {
        const { frame } = config;
        const body = frame.contentDocument.getElementsByTagName('body')[0];
        body.id = config.id; // Allows for prefixing styles with the config id
        buildConfigWin(body, frame.contentDocument.getElementsByTagName('head')[0]);
      }, false);
    }
  },

  save() {
    const forgotten = this.write();
    this.onSave(forgotten); // Call the save() callback function
  },

  close() {
    // If frame is an iframe then remove it
    if (this.frame.contentDocument) {
      this.remove(this.frame);
      this.frame = null;
    } else { // else wipe its content
      this.frame.innerHTML = '';
      this.frame.style.display = 'none';
    }

    // Null out all the fields so we don't leak memory
    const { fields } = this;
    for (const id in fields) {
      const field = fields[id];
      field.wrapper = null;
      field.node = null;
    }

    this.onClose(); //  Call the close() callback function
    this.isOpen = false;
  },

  set(name, val) {
    this.fields[name].value = val;

    if (this.fields[name].node) {
      this.fields[name].reload();
    }
  },

  get(name, getLive) {
    const field = this.fields[name];
    let fieldVal = null;

    if (getLive && field.node) {
      fieldVal = field.toValue();
    }

    return fieldVal != null ? fieldVal : field.value;
  },

  write(store, obj) {
    const values = {};
    const forgotten = {};
    if (!obj) {
      const { fields } = this;

      for (const id in fields) {
        const field = fields[id];
        const value = field.toValue();

        if (field.save) {
          if (value != null) {
            values[id] = value;
            field.value = value;
          } else { values[id] = field.value; }
        } else { forgotten[id] = value; }
      }
    }
    try {
      this.setValue(store || this.id, this.stringify(obj || values));
    } catch (e) {
      this.log('GM_config failed to save settings!');
    }

    return forgotten;
  },

  async read(store) {
    let rval;
    try {
      const val = await this.getValue(store || this.id, '{}');
      rval = this.parser(val);
    } catch (e) {
      this.log('GM_config failed to read saved settings!');
      rval = {};
    }
    return rval;
  },

  reset() {
    const { fields } = this;

    // Reset all the fields
    for (const id in fields) fields[id].reset();

    this.onReset(); // Call the reset() callback function
  },

  create() {
    let A;
    let B;
    switch (arguments.length) {
      case 1:
        A = document.createTextNode(arguments[0]);
        break;
      default:
        A = document.createElement(arguments[0]);
        B = arguments[1];
        for (const b in B) {
          if (b.indexOf('on') === 0) { A.addEventListener(b.substring(2), B[b], false); } else if (',style,accesskey,id,name,src,href,which,for'.indexOf(`,${
            b.toLowerCase()}`) !== -1) { A.setAttribute(b, B[b]); } else { A[b] = B[b]; }
        }
        if (typeof arguments[2] === 'string') { A.innerHTML = arguments[2]; } else {
          for (let i = 2, len = arguments.length; i < len; ++i) { A.appendChild(arguments[i]); }
        }
    }
    return A;
  },

  center() {
    const node = this.frame;
    if (!node) return;
    const { style } = node;
    // const beforeOpacity = style.opacity;
    if (style.display === 'none') style.opacity = '0';
    style.display = '';
    style.top = `${Math.floor((siteWindow.innerHeight / 2) - (node.offsetHeight / 2))}px`;
    style.left = `${Math.floor((siteWindow.innerWidth / 2) - (node.offsetWidth / 2))}px`;
    style.opacity = '1';
  },

  remove(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  },
};

// Define a bunch of API stuff
(function () {
  // Define value storing and reading API
  const setValue = function (name, value) {
    return gmSetValue(name, value);
  };
  const getValue = async function (name, def) {
    const s = await gmGetValue(name);
    return s == null ? def : s;
  };

  // We only support JSON parser outside GM
  const stringify = JSON.stringify;
  const parser = JSON.parse;

  GmConfigStruct.prototype.setValue = setValue;
  GmConfigStruct.prototype.getValue = getValue;
  GmConfigStruct.prototype.stringify = stringify;
  GmConfigStruct.prototype.parser = parser;
  GmConfigStruct.prototype.log = console.log;
}());

GmConfigField.prototype = {
  create: GmConfigStruct.prototype.create,

  toNode() {
    const field = this.settings;
    const { value } = this;
    const { options } = field;
    const { type } = field;
    const { id } = this;
    const { configId } = this;
    let { labelPos } = field;
    const { create } = this;

    function addLabel(pos, labelEl, parentNode, beforeEl) {
      if (!beforeEl) beforeEl = parentNode.firstChild;
      switch (pos) {
        case 'right': case 'below':
          if (pos === 'below') { parentNode.appendChild(create('br', {})); }
          parentNode.appendChild(labelEl);
          break;
        default:
          if (pos === 'above') { parentNode.insertBefore(create('br', {}), beforeEl); }
          parentNode.insertBefore(labelEl, beforeEl);
      }
    }

    const retNode = create('div', {
      className: 'config_var',
      id: `${configId}_${id}_var`,
      title: field.title || '',
    });
    let firstProp;

    // Retrieve the first prop
    for (const i in field) { firstProp = i; break; }

    const label = field.label && type !== 'button'
      ? create('label', {
        id: `${configId}_${id}_field_label`,
        for: `${configId}_field_${id}`,
        className: 'field_label',
      }, field.label) : null;

    let wrap;
    let props;
    switch (type) {
      case 'textarea':
        retNode.appendChild((this.node = create('textarea', {
          innerHTML: value,
          id: `${configId}_field_${id}`,
          className: 'block',
          cols: (field.cols ? field.cols : 20),
          rows: (field.rows ? field.rows : 2),
        })));
        break;
      case 'radio':
        wrap = create('div', {
          id: `${configId}_field_${id}`,
        });
        this.node = wrap;

        for (let i = 0, len = options.length; i < len; ++i) {
          const radLabel = create('label', {
            className: 'radio_label',
          }, options[i]);

          const rad = wrap.appendChild(create('input', {
            value: options[i],
            type: 'radio',
            name: id,
            checked: options[i] === value,
          }));

          const radLabelPos = labelPos
              && (labelPos === 'left' || labelPos === 'right')
            ? labelPos : firstProp === 'options' ? 'left' : 'right';

          addLabel(radLabelPos, radLabel, wrap, rad);
        }

        retNode.appendChild(wrap);
        break;
      case 'select':
        wrap = create('select', {
          id: `${configId}_field_${id}`,
        });
        this.node = wrap;

        for (let i = 0, len = options.length; i < len; ++i) {
          const option = options[i];
          wrap.appendChild(create('option', {
            value: option,
            selected: option === value,
          }, option));
        }

        retNode.appendChild(wrap);
        break;
      default: // fields using input elements
        props = {
          id: `${configId}_field_${id}`,
          type,
          value: type === 'button' ? field.label : value,
        };

        switch (type) {
          case 'checkbox':
            props.checked = value;
            break;
          case 'button':
            props.size = field.size ? field.size : 25;
            if (field.script) field.click = field.script;
            if (field.click) props.onclick = field.click;
            break;
          case 'hidden':
            break;
          default:
            // type = text, int, or float
            props.type = 'text';
            props.size = field.size ? field.size : 25;
        }

        retNode.appendChild((this.node = create('input', props)));
    }

    if (label) {
      // If the label is passed first, insert it before the field
      // else insert it after
      if (!labelPos) {
        labelPos = firstProp === 'label' || type === 'radio'
          ? 'left' : 'right';
      }

      addLabel(labelPos, label, retNode);
    }

    return retNode;
  },

  toValue() {
    const { node } = this;
    const field = this.settings;
    let { type } = field;
    let unsigned = false;
    let rval = null;

    if (!node) return rval;

    if (type.indexOf('unsigned ') === 0) {
      type = type.substring(9);
      unsigned = true;
    }

    const num = Number(node.value);
    let radios;
    let warn;
    switch (type) {
      case 'checkbox':
        rval = node.checked;
        break;
      case 'select':
        rval = node[node.selectedIndex].value;
        break;
      case 'radio':
        radios = node.getElementsByTagName('input');
        for (let i = 0, len = radios.length; i < len; ++i) {
          if (radios[i].checked) { rval = radios[i].value; }
        }
        break;
      case 'button':
        break;
      case 'int': case 'integer':
      case 'float': case 'number':

        warn = `Field labeled "${field.label}" expects a${
          unsigned ? ' positive ' : 'n '}integer value`;

        if (isNaN(num) || (type.substr(0, 3) === 'int'
              && Math.ceil(num) !== Math.floor(num))
              || (unsigned && num < 0)) {
          siteWindow.alert(`${warn}.`);
          return null;
        }

        if (!this.checkNumberRange(num, warn)) { return null; }
        rval = num;
        break;
      default:
        rval = node.value;
        break;
    }

    return rval; // value read successfully
  },

  reset() {
    const { node } = this;
    const field = this.settings;
    const { type } = field;

    if (!node) return;

    let radios;
    switch (type) {
      case 'checkbox':
        node.checked = this.default;
        break;
      case 'select':
        for (let i = 0, len = node.options.length; i < len; ++i) {
          if (node.options[i].textContent === this.default) { node.selectedIndex = i; }
        }
        break;
      case 'radio':
        radios = node.getElementsByTagName('input');
        for (let i = 0, len = radios.length; i < len; ++i) {
          if (radios[i].value === this.default) { radios[i].checked = true; }
        }
        break;
      case 'button':
        break;
      default:
        node.value = this.default;
        break;
    }
  },

  remove(el) {
    GmConfigStruct.prototype.remove(el || this.wrapper);
    this.wrapper = null;
    this.node = null;
  },

  reload() {
    const { wrapper } = this;
    if (wrapper) {
      const fieldParent = wrapper.parentNode;
      fieldParent.insertBefore((this.wrapper = this.toNode()), wrapper);
      this.remove(wrapper);
    }
  },

  checkNumberRange(num, warn) {
    const field = this.settings;
    if (typeof field.min === 'number' && num < field.min) {
      siteWindow.alert(`${warn} greater than or equal to ${field.min}.`);
      return null;
    }

    if (typeof field.max === 'number' && num > field.max) {
      siteWindow.alert(`${warn} less than or equal to ${field.max}.`);
      return null;
    }
    return true;
  },
};

// Create default instance of GM_config
const gmConfig = new GmConfigStruct();

export default gmConfig;
