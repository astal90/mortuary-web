const API_URL = 'https://script.google.com/macros/s/AKfycbwT0RU7ksDECfgk_M8tY9as8i-Utkgsr9RAU3xWrP8p7E8L-8sDC3c-lTbmdjKcXFbM/exec';

document.addEventListener('DOMContentLoaded', async () => {
  await initOfflineDb().catch(() => {});
  setupPage();
  updateOnlineStatus();
  updatePendingCountUI();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
});

function setupPage() {
  const isLoginPage = !!document.getElementById('loginBtn');
  const isAppPage = !!document.getElementById('logoutBtn');

  if (isLoginPage) {
    document.getElementById('loginBtn').addEventListener('click', loginUserFrontend);
    return;
  }

  if (isAppPage) {
    requireLogin();

    const user = getSessionUser();
    const userInfo = document.getElementById('userInfo');
    if (userInfo && user) {
      userInfo.textContent = `${user.fullName || user.username} (${user.role || 'USER'})`;
    }

    setTodayDefault('db1Tarikh');
    setTodayDefault('db2Tarikh');

    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    document.getElementById('saveDb1Btn').addEventListener('click', saveDb1Frontend);
    document.getElementById('saveDb2Btn').addEventListener('click', saveDb2Frontend);
    document.getElementById('saveBothBtn').addEventListener('click', saveBothFrontend);
    document.getElementById('searchBtn').addEventListener('click', searchCaseFrontend);
    document.getElementById('manualSyncBtn').addEventListener('click', syncPendingRequests);
  }
}

function setTodayDefault(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  el.value = `${yyyy}-${mm}-${dd}`;
}

function getSessionUser() {
  try {
    return JSON.parse(localStorage.getItem('mortuaryUser') || 'null');
  } catch {
    return null;
  }
}

function requireLogin() {
  const user = getSessionUser();
  if (!user) {
    window.location.href = 'index.html';
  }
}

function logoutUser() {
  localStorage.removeItem('mortuaryUser');
  window.location.href = 'index.html';
}

function updateOnlineStatus() {
  const badge = document.getElementById('onlineBadge');
  if (!badge) return;

  if (navigator.onLine) {
    badge.textContent = 'Online';
    badge.className = 'badge online';
  } else {
    badge.textContent = 'Offline';
    badge.className = 'badge offline';
  }
}

async function updatePendingCountUI() {
  const el = document.getElementById('pendingCount');
  if (!el) return;

  try {
    const count = await getPendingCount();
    el.textContent = `Pending: ${count}`;
  } catch {
    el.textContent = 'Pending: -';
  }
}

async function loginUserFrontend() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');

  msg.textContent = '';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        username,
        password
      })
    });

    const data = await response.json();

    if (!data.ok) {
      msg.textContent = data.message || 'Login gagal';
      return;
    }

    localStorage.setItem('mortuaryUser', JSON.stringify(data));
    window.location.href = 'app.html';
  } catch (err) {
    msg.textContent = 'Tidak dapat hubung ke server: ' + err.message;
  }
}

function buildDb1Payload() {
  const user = getSessionUser();

  return {
    action: 'saveDB1Data',
    syncTarget: 'DB1',
    username: user?.username || '',
    tarikh: document.getElementById('db1Tarikh').value,
    noSiri: document.getElementById('db1NoSiri').value,
    nama: document.getElementById('db1Nama').value,
    noKp: document.getElementById('db1NoKp').value,
    jantina: document.getElementById('db1Jantina').value,
    umur: document.getElementById('db1Umur').value,
    bangsa: document.getElementById('db1Bangsa').value,
    waris: document.getElementById('db1Waris').value,
    telWaris: document.getElementById('db1TelWaris').value,
    hubungan: document.getElementById('db1Hubungan').value,
    catatan: document.getElementById('db1Catatan').value
  };
}

function buildDb2Payload() {
  const user = getSessionUser();

  return {
    action: 'saveDB2Data',
    syncTarget: 'DB2',
    username: user?.username || '',
    tarikh: document.getElementById('db2Tarikh').value,
    kategoriDb2: document.getElementById('db2Kategori').value,
    nama: document.getElementById('db2Nama').value,
    noKp: document.getElementById('db2NoKp').value,
    catatan: document.getElementById('db2Catatan').value
  };
}

function buildBothPayload() {
  const db1 = buildDb1Payload();
  const db2 = buildDb2Payload();

  return {
    action: 'saveForm',
    syncTarget: 'FORM',
    username: db1.username,
    tarikh: db1.tarikh || db2.tarikh,
    noSiri: db1.noSiri,
    nama: db1.nama || db2.nama,
    noKp: db1.noKp || db2.noKp,
    jantina: db1.jantina,
    umur: db1.umur,
    bangsa: db1.bangsa,
    waris: db1.waris,
    telWaris: db1.telWaris,
    hubungan: db1.hubungan,
    catatan: db1.catatan || db2.catatan,
    kategoriDb2: db2.kategoriDb2
  };
}

async function saveWithOfflineSupport(payload, msgElementId, successText) {
  const msg = document.getElementById(msgElementId);
  msg.textContent = '';

  if (!navigator.onLine) {
    await savePendingRequest(payload);
    await updatePendingCountUI();
    msg.textContent = 'Offline: data disimpan sementara dalam PC ini.';
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
      msg.textContent = data.message || 'Gagal simpan data';
      return;
    }

    msg.textContent = successText;
  } catch (err) {
    await savePendingRequest(payload);
    await updatePendingCountUI();
    msg.textContent = 'Line bermasalah. Data disimpan offline sementara.';
  }
}

async function saveDb1Frontend() {
  await saveWithOfflineSupport(
    buildDb1Payload(),
    'db1Msg',
    'DB1 berjaya disimpan.'
  );
}

async function saveDb2Frontend() {
  await saveWithOfflineSupport(
    buildDb2Payload(),
    'db2Msg',
    'DB2 berjaya disimpan.'
  );
}

async function saveBothFrontend() {
  await saveWithOfflineSupport(
    buildBothPayload(),
    'bothMsg',
    'DB1 dan DB2 berjaya disimpan.'
  );
}

async function searchCaseFrontend() {
  const keyword = document.getElementById('searchKeyword').value.trim();
  const resultsBox = document.getElementById('searchResults');
  const user = getSessionUser();

  resultsBox.innerHTML = '';

  if (!navigator.onLine) {
    resultsBox.innerHTML = '<p class="muted">Carian perlukan internet.</p>';
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'searchCase',
        username: user?.username || '',
        keyword
      })
    });

    const data = await response.json();

    if (!data.ok) {
      resultsBox.innerHTML = `<p>${data.message || 'Carian gagal'}</p>`;
      return;
    }

    if (!data.results.length) {
      resultsBox.innerHTML = '<p class="muted">Tiada rekod dijumpai.</p>';
      return;
    }

    resultsBox.innerHTML = data.results.map(item => `
      <div class="result-card">
        <div><strong>${item.nama || '-'}</strong></div>
        <div>No KP: ${item.noKp || '-'}</div>
        <div>Tarikh: ${item.tarikh || '-'}</div>
        <div>Waris: ${item.waris || '-'}</div>
        <div>Tahun/Bulan: ${item.year || '-'} / ${item.month || '-'}</div>
        <div>Sheet DB1: ${item.sheetName || '-'} | Row: ${item.rowNo || '-'}</div>
      </div>
    `).join('');
  } catch (err) {
    resultsBox.innerHTML = `<p>Ralat carian: ${err.message}</p>`;
  }
}