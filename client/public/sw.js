const CACHE_NAME = 'promo-g-v2';
const STATIC_CACHE = 'promo-g-static-v2';
const DYNAMIC_CACHE = 'promo-g-dynamic-v2';
const API_CACHE = 'promo-g-api-v2';

const urlsToCache = [
  '/',
  '/auth',
  '/orientation',
  '/subscription',
  '/home',
  '/tasks',
  '/wallet',
  '/notifications',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// API endpoints to cache for offline use
const apiEndpointsToCache = [
  '/api/tasks/orientation',
  '/api/users/',
  '/api/notifications/'
];

// Network-first resources (always try network first)
const networkFirstPatterns = [
  /\/api\/auth\//,
  /\/api\/paypal\//,
  /\/api\/webhooks\//
];

// Cache-first resources (serve from cache, fallback to network)
const cacheFirstPatterns = [
  /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/,
  /\/api\/tasks\/orientation/
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Opened static cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Static resources cached');
        self.skipWaiting(); // Force activation
      })
      .catch(error => {
        console.error('Cache install failed:', error);
      })
  );
});

// Fetch event with advanced caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (cacheFirstPatterns.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(handleCacheFirst(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(handleNetworkFirst(request));
});

// Cache-first strategy for static assets
async function handleCacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for dynamic content
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Network-first for critical API calls
  if (networkFirstPatterns.some(pattern => pattern.test(url.pathname))) {
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Network unavailable', code: 'OFFLINE' },
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Cache-first for orientation tasks and user data
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Try to update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(API_CACHE).then(cache => {
            cache.put(request, response.clone());
          });
        }
      }).catch(() => {
        // Ignore background update failures
      });
      
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline response for API calls
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Service unavailable offline', code: 'OFFLINE' },
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle navigation requests (SPA routing)
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached index.html for offline navigation
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ProMo-G - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <h1>ProMo-G</h1>
          <p class="offline">You are currently offline. Please check your internet connection.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('v2')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'task-submission') {
    event.waitUntil(syncTaskSubmissions());
  } else if (event.tag === 'user-data-sync') {
    event.waitUntil(syncUserData());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Sync offline task submissions
async function syncTaskSubmissions() {
  try {
    console.log('Syncing offline task submissions...');
    
    // Get offline submissions from IndexedDB
    const offlineSubmissions = await getOfflineSubmissions();
    
    for (const submission of offlineSubmissions) {
      try {
        const response = await fetch('/api/user-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          await removeOfflineSubmission(submission.id);
          console.log('Task submission synced:', submission.id);
          
          // Notify client of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              payload: { type: 'task-submission', id: submission.id }
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync task submission:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync user data
async function syncUserData() {
  try {
    console.log('Syncing user data...');
    
    // Refresh user profile and wallet data
    const userDataEndpoints = [
      '/api/users/me',
      '/api/users/me/wallet',
      '/api/users/me/notifications'
    ];
    
    for (const endpoint of userDataEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          cache.put(endpoint, response.clone());
        }
      } catch (error) {
        console.error(`Failed to sync ${endpoint}:`, error);
      }
    }
  } catch (error) {
    console.error('User data sync failed:', error);
  }
}

// Sync notifications
async function syncNotifications() {
  try {
    console.log('Syncing notifications...');
    
    const response = await fetch('/api/users/me/notifications');
    if (response.ok) {
      const notifications = await response.json();
      
      // Show new notifications
      const unreadNotifications = notifications.data?.filter(n => !n.isRead) || [];
      
      for (const notification of unreadNotifications.slice(0, 3)) { // Limit to 3
        await self.registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: `notification-${notification.id}`,
          data: notification,
          actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });
      }
    }
  } catch (error) {
    console.error('Notification sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineSubmissions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PromoGOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readonly');
      const store = transaction.objectStore('submissions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('submissions')) {
        db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function removeOfflineSubmission(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PromoGOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notification handling
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.id
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Update notification
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.ports[0].postMessage({
      type: 'UPDATE_AVAILABLE',
      payload: self.registration.waiting !== null
    });
  }
});
