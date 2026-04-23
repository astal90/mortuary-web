async function syncPendingRequests() {
  const logEl = document.getElementById('syncLog');

  try {
    const items = await getPendingRequests();

    if (!items.length) {
      updatePendingCountUI();
      if (logEl) logEl.textContent = 'Tiada data pending.';
      return;
    }

    if (logEl) logEl.textContent = `Sync bermula... ${items.length} rekod pending.`;

    for (const item of items) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });

        const data = await response.json();

        if (data.ok) {
          await deletePendingRequest(item.id);
        } else {
          if (logEl) {
            logEl.textContent += `\nGagal sync id ${item.id}: ${data.message || 'Unknown error'}`;
          }
        }
      } catch (err) {
        if (logEl) {
          logEl.textContent += `\nRalat sync id ${item.id}: ${err.message}`;
        }
      }
    }

    await updatePendingCountUI();
    if (logEl) logEl.textContent += '\nSync selesai.';
  } catch (err) {
    if (logEl) logEl.textContent = 'Sync error: ' + err.message;
  }
}

window.addEventListener('online', async () => {
  updateOnlineStatus();
  await syncPendingRequests();
});

window.addEventListener('offline', () => {
  updateOnlineStatus();
});