let offlineDb;

function initOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MortuaryOfflineDB', 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
    };

    request.onsuccess = function (event) {
      offlineDb = event.target.result;
      resolve(offlineDb);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function ensureOfflineDb() {
  if (!offlineDb) {
    await initOfflineDb();
  }
}

async function savePendingRequest(payload) {
  await ensureOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = offlineDb.transaction('pendingRequests', 'readwrite');
    const store = tx.objectStore('pendingRequests');

    store.add({
      payload,
      createdAt: new Date().toISOString()
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingRequests() {
  await ensureOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = offlineDb.transaction('pendingRequests', 'readonly');
    const store = tx.objectStore('pendingRequests');
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deletePendingRequest(id) {
  await ensureOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = offlineDb.transaction('pendingRequests', 'readwrite');
    tx.objectStore('pendingRequests').delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingCount() {
  const items = await getPendingRequests();
  return items.length;
}