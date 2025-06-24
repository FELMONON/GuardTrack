const CACHE_NAME = 'guard-patrol-v1';
const OFFLINE_URL = '/';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache opened successfully
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              // Deleting old cache
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Ensure the new service worker takes control immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first, then show offline message
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a custom offline response for API requests
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'This request requires an internet connection' 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // For all other requests (HTML, CSS, JS, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response before caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'patrol-logs-sync') {
    event.waitUntil(syncPatrolLogs());
  }
});

// Sync patrol logs when back online
async function syncPatrolLogs() {
  try {
    // This would integrate with the IndexedDB offline storage
    // to sync any pending patrol logs when the device comes back online
    // Syncing patrol logs...
    
    // In a real implementation, this would:
    // 1. Open IndexedDB
    // 2. Get unsynced logs
    // 3. Send them to the server
    // 4. Mark them as synced
    
    // Patrol logs sync completed
  } catch (error) {
    console.error('Failed to sync patrol logs:', error);
    throw error; // This will cause the sync to be retried
  }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'patrol-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification('Guard Patrol', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
