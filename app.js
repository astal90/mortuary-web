const API_URL = 'https://script.google.com/macros/s/AKfycbwT0RU7ksDECfgk_M8tY9as8i-Utkgsr9RAU3xWrP8p7E8L-8sDC3c-lTbmdjKcXFbM/exec';

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', loginUserFrontend);
  }
});

async function loginUserFrontend() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');

  msg.innerText = 'Logging in...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'login',
        username,
        password
      })
    });

    const text = await res.text();
    console.log('RAW RESPONSE:', text);

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
      msg.innerText = 'Login gagal: ' + (data.message || 'Unknown error');
    }

  } catch (err) {
    console.error(err);
    msg.innerText = 'Error: ' + err.message;
  }
}
