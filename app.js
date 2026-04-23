const API_URL = 'https://script.google.com/macros/s/AKfycbwT0RU7ksDECfgk_M8tY9as8i-Utkgsr9RAU3xWrP8p7E8L-8sDC3c-lTbmdjKcXFbM/exec';

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof initOfflineDb === 'function') {
    try {
      await initOfflineDb();
    } catch (err) {
      console.warn('Offline DB init gagal:', err);
    }
  }

  setupPage();

  if (typeof updateOnlineStatus === 'function') {
    updateOnlineStatus();
  }

  if (typeof updatePendingCountUI === 'function') {
    updatePendingCountUI();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
});

function setupPage() {
  const isLoginPage = !!document.getElementById('loginBtn');
  const isRegisterPage = !!document.getElementById('registerBtn');
  const isAppPage = !!document.getElementById('logoutBtn');

  if (isLoginPage) {
    document.getElementById('loginBtn').addEventListener('click', loginUserFrontend);
    return;
  }

  if (isRegisterPage) {
    document.getElementById('registerBtn').addEventListener('click', registerUserFrontend);
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

    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn && typeof syncPendingRequests === 'function') {
      manualSyncBtn.addEventListener('click', syncPendingRequests);
    }
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
  if (!el || typeof getPendingCount !== 'function') return;

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

  msg.innerText = 'Logging in...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        username,
        password
      })
    });

    const text = await res.text();
    console.log('RAW RESPONSE LOGIN:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      msg.innerText = 'Response bukan JSON. Semak console.';
      return;
    }

    if (data.ok) {
      localStorage.setItem('mortuaryUser', JSON.stringify(data.user));
      msg.innerText = 'Login berjaya!';
      setTimeout(() => {
        window.location.href = 'app.html';
      }, 500);
    } else {
      msg.innerText = data.message || 'Login gagal';
    }

  } catch (err) {
    console.error(err);
    msg.innerText = 'Error: ' + err.message;
  }
}

async function registerUserFrontend() {
  const fullName = document.getElementById('registerFullName').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const msg = document.getElementById('registerMsg');

  msg.innerText = 'Sedang daftar...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        fullName,
        username,
        password,
        confirmPassword
      })
    });

    const text = await res.text();
    console.log('RAW RESPONSE REGISTER:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      msg.innerText = 'Response bukan JSON. Semak console.';
      return;
    }

    if (data.ok) {
      msg.innerText = data.message || 'Pendaftaran berjaya';
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    } else {
      msg.innerText = data.message || 'Pendaftaran gagal';
    }

  } catch (err) {
    console.error(err);
    msg.innerText = 'Error: ' + err.message;
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

  if (!navigator.onLine && typeof savePendingRequest === 'function') {
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
    if (typeof savePendingRequest === 'function') {
      await savePendingRequest(payload);
      await updatePendingCountUI();
      msg.textContent = 'Line bermasalah. Data disimpan offline sementara.';
    } else {
      msg.textContent = 'Error: ' + err.message;
    }
  }
}

async function saveDb1Frontend() {
  await saveWithOfflineSupport(buildDb1Payload(), 'db1Msg', 'DB1 berjaya disimpan.');
}

async function saveDb2Frontend() {
  await saveWithOfflineSupport(buildDb2Payload(), 'db2Msg', 'DB2 berjaya disimpan.');
}

async function saveBothFrontend() {
  await saveWithOfflineSupport(buildBothPayload(), 'bothMsg', 'DB1 dan DB2 berjaya disimpan.');
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
