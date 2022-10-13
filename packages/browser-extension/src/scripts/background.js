/**
 * @description API URL
 * @type {string}
 */

const apiUrl = 'https://api.cookie-dialog-monster.com/rest/v2';

/**
 * @description Initial state
 * @type {{ enabled: boolean }}
 */

const initial = { enabled: true };

/**
 * @description Context menu identifier
 * @type {string}
 */

const reportMenuItemId = 'REPORT';

/**
 * @description Refreshes data
 * @param {void?} callback
 */

const refreshData = (callback) => {
  fetch(`${apiUrl}/data/`).then((result) => {
    result.json().then(({ data }) => {
      chrome.storage.local.set({ data });
      callback?.(data);
    });
  });
};

/**
 * @async
 * @description Reports active tab URL
 * @param {any} message
 * @param {chrome.tabs.Tab} tab
 */

const report = async (message, tab) => {
  const reason = message.reason;
  const userAgent = message.userAgent;
  const version = chrome.runtime.getManifest().version;
  const body = JSON.stringify({ reason, url: tab.url, userAgent, version });
  const headers = { 'Content-type': 'application/json' };
  const url = `${apiUrl}/report/`;

  await fetch(url, { body, headers, method: 'POST' });
};

/**
 * @description Listens to context menus clicked
 */

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case reportMenuItemId:
      if (tab) chrome.tabs.sendMessage(tab.id, { type: 'SHOW_REPORT_DIALOG' });
      break;
    default:
      break;
  }
});

/**
 * @description Listens to messages
 */

chrome.runtime.onMessage.addListener((message, sender, callback) => {
  const hostname = message.hostname;
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'DISABLE_ICON':
      if (tabId) chrome.action.setIcon({ path: '/assets/icons/disabled.png', tabId });
      break;
    case 'ENABLE_ICON':
      if (tabId) chrome.action.setIcon({ path: '/assets/icons/enabled.png', tabId });
      break;
    case 'ENABLE_POPUP':
      if (tabId) chrome.action.setPopup({ popup: '/popup.html', tabId });
      break;
    case 'GET_DATA':
      chrome.storage.local.get('data', ({ data }) => {
        if (data) callback(data);
        else refreshData(callback);
      });
      break;
    case 'GET_STATE':
      // prettier-ignore
      if (hostname) chrome.storage.local.get(hostname, (state) => callback(state[hostname] ?? initial));
      break;
    case 'GET_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => callback(tabs[0]));
      break;
    case 'REPORT':
      if (tabId) report(message, sender.tab);
      break;
    case 'UPDATE_STATE':
      if (hostname) chrome.storage.local.set({ [hostname]: message.state });
      break;
    default:
      break;
  }

  return true;
});

/**
 * @description Listens to extension installed
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    contexts: ['all'],
    documentUrlPatterns: chrome.runtime.getManifest().content_scripts[0].matches,
    id: reportMenuItemId,
    title: chrome.i18n.getMessage('contextMenu_reportOption'),
  });
});

/**
 * @description Listens to first start
 */

chrome.runtime.onStartup.addListener(() => {
  refreshData();
});
