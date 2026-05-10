document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

const totalStones = localStorage.getItem('ra_stone_count') || '0';
document.getElementById('stone-count').textContent = totalStones;

const readStoriesJson = localStorage.getItem('ra_read_stories');
const readStories = readStoriesJson ? JSON.parse(readStoriesJson) : [];

fetch('storys/meta.json')
  .then(response => response.json())
  .then(data => {
    const list = document.getElementById('story-list');
    list.innerHTML = '';
    data.ra_story_metadatas.forEach(item => {
      const li = document.createElement('li');
      const parts = item.title.split(' - ');
      const epNum = parts[0] || '';
      const epTitle = parts[1] || '';
      const isRead = readStories.includes(item.id);

      li.innerHTML = `
                    <div class="episode-link" onclick="location.href='storys/index.html?scene=${item.id}/01'">
                        <span class="ep-number">${epNum}</span>
                        <span class="ep-title">${epTitle}</span>
                        ${isRead ? '' : '<img src="assets/img/panel/stone_1.png" class="read-icon">'}
                    </div>
                `;
      list.appendChild(li);
    });
  })
  .catch(err => console.error('meta.jsonの読み込みに失敗しました:', err));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registered');
        const requestVersion = () => {
          const controller = navigator.serviceWorker.controller;
          if (controller) {
            controller.postMessage({ type: 'GET_VERSION' });
          } else {
            navigator.serviceWorker.ready.then(registration => {
              if (registration.active) registration.active.postMessage({ type: 'GET_VERSION' });
            });
          }
        };

        navigator.serviceWorker.addEventListener('controllerchange', requestVersion);
        requestVersion();
      })
      .catch(err => console.log('Service Worker registration failed', err));
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'VERSION_INFO') {
      document.getElementById('app-version').textContent = `${event.data.version}`;
    }
  });
}

function openStoneDialog() {
  document.getElementById('stone-dialog').classList.remove('hidden');
}

function closeStoneDialog() {
  document.getElementById('stone-dialog').classList.add('hidden');
} 

function openConfirmDialog() {
  document.getElementById('stone-dialog').classList.add('hidden');
  document.getElementById('confirm-dialog').classList.remove('hidden');
}

function closeConfirmDialog() {
  document.getElementById('confirm-dialog').classList.add('hidden');
} 

function executeReset() {
  localStorage.removeItem('ra_stone_count');
  localStorage.removeItem('ra_read_stories');
  location.reload();
}

async function forceUpdate() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) await registration.unregister();
    }
    window.location.reload();
  } catch (e) {
    console.error('Update failed:', e);
    window.location.reload();
  }
}

function shareUrl() {
  const url = 'https://r-amano.github.io/webnovel-test/';
  navigator.clipboard.writeText(url).then(() => {
    alert('URLをクリップボードにコピーしました！');
  }).catch(err => {
    console.error('コピーに失敗しました:', err);
  });
}