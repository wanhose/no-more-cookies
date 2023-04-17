/**
 * @description Data properties
 * @type {{ classes: string[], fixes: string[], elements: string[], skips: string[], tags: string[] }?}
 */

let data = null;

/**
 * @description Shortcut to send messages to background script
 */

const dispatch = chrome.runtime.sendMessage;

/**
 * @description Current hostname
 * @type {string}
 */

const hostname = document.location.hostname.split('.').slice(-3).join('.').replace('www.', '');

/**
 * @description Options provided to observer
 * @type {MutationObserverInit}
 */

const options = { childList: true, subtree: true };

/**
 * @description Is consent preview page?
 */

const preview = hostname.startsWith('consent.') || hostname.startsWith('myprivacy.');

/**
 * @description Element that were being removed count
 * @type {number}
 */

let elementCount = 0;

/**
 * @description Extension state
 * @type {{ enabled: boolean }}
 */

let state = { enabled: true };

/**
 * @description Cleans DOM
 * @param {Element[]} nodes
 * @param {boolean?} skipMatch
 * @returns {void}
 */

const clean = (nodes, skipMatch) => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (match(node, skipMatch)) {
      const observer = new MutationObserver(() => {
        node.style.setProperty('display', 'none', 'important');
      });

      if (!node.hasAttribute('data-cookie-dialog-monster')) {
        elementCount += 1;
        node.setAttribute('data-cookie-dialog-monster', 'true');
        node.style.setProperty('display', 'none', 'important');
        observer.observe(node, { attributes: true, attributeFilter: ['style'] });
      }
    }
  }
};

/**
 * @description Cleans DOM
 * @returns {void}
 */

const forceClean = () => {
  if (data?.elements.length && state.enabled && !preview) {
    const nodes = [...document.querySelectorAll(data.elements)];

    if (nodes.length) {
      fix();
      clean(nodes, true);
      elementCount += nodes.length;
    }
  }
};

/**
 * @description Checks if an element is visible in the viewport
 * @param {HTMLElement} node
 * @returns {boolean}
 */

const isInViewport = (node) => {
  const bounding = node.getBoundingClientRect();

  return (
    bounding.top >= -node.offsetHeight &&
    bounding.left >= -node.offsetWidth &&
    bounding.right <=
      (window.innerWidth || document.documentElement.clientWidth) + node.offsetWidth &&
    bounding.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) + node.offsetHeight
  );
};

/**
 * @description Matches if node element is removable
 * @param {Element} node
 * @param {boolean?} skipMatch
 * @returns {boolean}
 */

const match = (node, skipMatch) => {
  if (node instanceof HTMLElement) {
    const style = window.getComputedStyle(node);
    const skipIsInViewport =
      (style.animationName !== 'none' && style.animationPlayState === 'running') ||
      style.display === 'none' ||
      style.height === '0px' ||
      style.opacity === '0' ||
      style.transitionProperty !== 'none' ||
      style.visibility === 'hidden';

    return (
      !data?.tags.includes(node.tagName?.toUpperCase?.()) &&
      (skipIsInViewport || isInViewport(node)) &&
      (!!node.offsetParent || style.position === 'fixed') &&
      !!node.parentElement &&
      (skipMatch || node.matches(data?.elements ?? []))
    );
  }

  return false;
};

/**
 * @description Fixes scroll issues
 */

const fix = () => {
  const backdrop = document.getElementsByClassName('modal-backdrop')[0];
  const facebook = document.getElementsByClassName('_31e')[0];
  const fixes = data?.fixes ?? [];
  const skips = data?.skips ?? [];

  if (backdrop?.children.length === 0) {
    backdrop.remove();
  }

  facebook?.classList.remove('_31e');

  for (const fix of fixes) {
    const [match, selector, action, property] = fix.split('##');

    if (hostname.includes(match)) {
      switch (action) {
        case 'click': {
          const node = document.querySelector(selector);
          node?.click();
          break;
        }
        case 'remove': {
          const node = document.querySelector(selector);
          node?.style?.removeProperty(property);
          break;
        }
        case 'reset': {
          const node = document.querySelector(selector);
          node?.style?.setProperty(property, 'initial', 'important');
          break;
        }
        case 'resetAll': {
          const nodes = document.querySelectorAll(selector);
          nodes.forEach((node) => node?.style?.setProperty(property, 'initial', 'important'));
          break;
        }
        default:
          break;
      }
    }
  }

  if (!skips.some((skip) => skip.includes(hostname))) {
    for (const item of [document.body, document.documentElement]) {
      item?.classList.remove(...(data?.classes ?? []));
      item?.style.setProperty('position', 'initial', 'important');
      item?.style.setProperty('overflow-y', 'initial', 'important');
    }
  }
};

/**
 * @description Mutation Observer instance
 * @type {MutationObserver}
 */

const observer = new MutationObserver((mutations) => {
  const nodes = mutations.map((mutation) => Array.from(mutation.addedNodes)).flat();

  fix();
  if (data?.elements.length && !preview) clean(nodes);
});

/**
 * @description Fixes already existing element when page load issues
 * @listens window#load
 */

window.addEventListener('load', () => {
  if (elementCount < 2) forceClean();
});

/**
 * @description Fixes bfcache issues
 * @listens window#pageshow
 */

window.addEventListener('pageshow', (event) => {
  if (event.persisted) forceClean();
});

/**
 * @async
 * @description Sets up everything
 */

(async () => {
  state = (await dispatch({ hostname, type: 'GET_STATE' })) ?? state;
  dispatch({ type: 'ENABLE_POPUP' });

  if (state.enabled) {
    data = await dispatch({ hostname, type: 'GET_DATA' });
    dispatch({ type: 'ENABLE_ICON' });
    observer.observe(document.body ?? document.documentElement, options);
  }
})();
