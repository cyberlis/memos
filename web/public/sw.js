const CACHE_NAME = 'memos-share-cache-v1';

// Handle the fetch event for the share target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  console.log('request ======== ', event.request.method, url.pathname)
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

  // Store shared text content in localStorage
  const sharedContent = url || text || title;
  if (sharedContent) {
    await storeShareData('share-target-content', sharedContent);
  }

  // Store files in cache if any
  if (files && files.length > 0) {
    await cacheFiles(files);
    await storeShareData('share-target-has-files', 'true');
  }

  // Redirect to the main page after processing
  return Response.redirect('/', 303);
}

async function storeShareData(key, value) {
  // We can't directly access localStorage from a service worker
  // So we use clients to find an open window and send a message
  const allClients = await self.clients.matchAll({
    includeUncontrolled: true
  });

  for (const client of allClients) {
    client.postMessage({
      action: 'STORE_SHARE_DATA',
      key,
      value
    });
  }
}

async function cacheFiles(files) {
  const cache = await caches.open(CACHE_NAME);

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

    // Store the file name in the list of shared files
    const allClients = await self.clients.matchAll({
      includeUncontrolled: true
    });

    for (const client of allClients) {
      client.postMessage({
        action: 'ADD_SHARED_FILE',
        cacheKey,
        type: file.type,
        originalFilename
      });
    }
  }
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
  } catch (error) {
    console.error('Failed to clear share cache:', error);
  }
}
