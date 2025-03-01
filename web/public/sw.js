const CACHE_NAME = 'memos-share-cache-v1';
const DB_NAME = 'memos-share-db';
const DB_VERSION = 1;
const STORE_NAME = 'shared-data';


async function sendEvent() {
  const allClients = await self.clients.matchAll({
    includeUncontrolled: true
  });

  for (const client of allClients) {
    client.postMessage({action: 'NEW_SHARE'});
    console.log('post NEW_SHARE');
  }
}

// Open IndexedDB
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject('Error opening IndexedDB');
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Store data in IndexedDB
async function storeInIndexedDB(id, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put({ id, data });

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error storing data in IndexedDB');

    transaction.oncomplete = () => db.close();
  });
}

// Handle the fetch event for the share target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  console.log('request ======== ', event.request.method, url.pathname);
  // Handle POST requests to /share-target
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event));
  }
});

async function handleShareTarget(event) {
  const formData = await event.request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  const files = formData.getAll('files');

  // Store shared text content in IndexedDB
  const sharedContent = url || text || title;
  if (sharedContent) {
    await storeInIndexedDB('share-target-content', sharedContent);
  }

  // Store files in cache if any
  if (files && files.length > 0) {
    const fileInfoList = await cacheFiles(files);
    await storeInIndexedDB('share-target-files', fileInfoList);
    await storeInIndexedDB('share-target-has-files', true);
  }
  sendEvent();
  // Redirect to the main page after processing
  return Response.redirect('/', 303);
}

async function cacheFiles(files) {
  const cache = await caches.open(CACHE_NAME);
  const fileInfoList = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Create a URL for the file
    const response = new Response(file);
    // Generate a unique cache key that includes the original filename
    const originalFilename = file.name || `unknown-${Date.now()}`;
    const safeFilename = encodeURIComponent(originalFilename);
    const uniqueId = `${Date.now()}-${i}`;
    const cacheKey = `/shared-files/${uniqueId}-${safeFilename}`;

    // Store the file in the cache
    await cache.put(cacheKey, response);

    // Add file info to the list
    fileInfoList.push({
      cacheKey,
      type: file.type,
      originalFilename
    });
  }

  return fileInfoList;
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'CLEAR_SHARE_CACHE') {
    clearCache();
  }
});

async function clearCache() {
  try {
    await caches.delete(CACHE_NAME);

    // Also clear IndexedDB
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.clear();
    transaction.oncomplete = () => db.close();
  } catch (error) {
    console.error('Failed to clear share cache:', error);
  }
}
