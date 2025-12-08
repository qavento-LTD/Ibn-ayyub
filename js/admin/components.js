// components.js - Helper to dynamically load HTML components

/**
 * Cache for fetched component HTML strings.
 */
const componentCache = new Map();

/**
 * Load an HTML fragment and inject it into a container element.
 * @param {string} url - Relative URL to the component HTML file.
 * @param {string} containerId - ID of the container element where the fragment will be placed.
 */
export async function loadComponent(url, containerId) {
  try {
    let html;
    if (componentCache.has(url)) {
      html = componentCache.get(url);
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load component: ${url}`);
      html = await response.text();
      componentCache.set(url, html);
    }
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
    } else {
      console.warn(`Container #${containerId} not found for component ${url}`);
    }
  } catch (err) {
    console.error(err);
  }
}

// Load all admin components
export async function initAdminComponents() {
  // Header (if needed)
  await loadComponent('./components/header.html', 'admin-header');
  // Search bar
  await loadComponent('./components/search-bar.html', 'search-bar');
  // Invoice tabs
  await loadComponent('./components/invoice-tabs.html', 'invoice-tabs');
  // Category pills
  await loadComponent('./components/category-pills.html', 'category-pills');
  // Cart section
  await loadComponent('./components/cart-section.html', 'cart-section');
  // Modals (all combined into one placeholder)
  const modalsContainer = document.getElementById('admin-modals');
  if (modalsContainer) {
    const modalFiles = [
      './components/modals/shift-modal.html',
      './components/modals/print-options-modal.html',
      './components/modals/shortcuts-modal.html'
    ];
    const fragments = await Promise.all(modalFiles.map(f => fetch(f).then(r => r.text())));
    modalsContainer.innerHTML = fragments.join('\n');
  }
}
