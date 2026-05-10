const $ = id => document.getElementById(id);

/** 表示高さ（vh）を計算し、画面回転時のみ更新する（ガクつき防止） */
let lastOrient = window.orientation;
function adjustViewport() {
  const currentOrient = window.orientation;
  // 初回実行、または向きが変わった時だけ計算
  if (currentOrient !== lastOrient || !document.documentElement.style.getPropertyValue('--vh')) {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    lastOrient = currentOrient;
  }
}
window.addEventListener('resize', adjustViewport);
adjustViewport();

['contextmenu', 'dragstart'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

$('stone-count').textContent = localStorage.getItem('ra_stone_count') || '0';
const readStories = JSON.parse(localStorage.getItem('ra_read_stories') || '[]');

fetch('storys/meta.json')
  .then(r => r.json())
  .then(data => {
    $('story-list').innerHTML = data.ra_story_metadatas.map(item => {
      const [num, title] = item.title.split(' - ');
      return `<li>
        <div class="episode-link" onclick="location.href='storys/index.html?scene=${item.id}/01'">
          <span class="ep-number">${num || ''}</span>
          <span class="ep-title">${title || ''}</span>
          ${readStories.includes(item.id) ? '' : '<img src="assets/img/panel/stone_1.png" class="read-icon">'}
        </div>
      </li>`;
    }).join('');
  })
  .catch(e => console.error(e));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    const req = () => navigator.serviceWorker.controller?.postMessage({ type: 'GET_VERSION' });
    navigator.serviceWorker.addEventListener('controllerchange', req);
    navigator.serviceWorker.ready.then(reg => reg.active?.postMessage({ type: 'GET_VERSION' }));
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'VERSION_INFO') $('app-version').textContent = e.data.version;
  });
}

const openStoneDialog = () => $('stone-dialog').classList.remove('hidden');
const closeStoneDialog = () => $('stone-dialog').classList.add('hidden');
const openConfirmDialog = () => { closeStoneDialog(); $('confirm-dialog').classList.remove('hidden'); };
const closeConfirmDialog = () => $('confirm-dialog').classList.add('hidden');
const executeReset = () => {
  localStorage.removeItem('ra_stone_count');
  localStorage.removeItem('ra_read_stories');
  location.reload();
};

async function forceUpdate() {
  if ('caches' in window) (await caches.keys()).map(k => caches.delete(k));
  if ('serviceWorker' in navigator) (await navigator.serviceWorker.getRegistrations()).map(r => r.unregister());
  location.reload();
}

const shareUrl = () => navigator.clipboard.writeText(location.href).then(() => alert('コピーしました'));