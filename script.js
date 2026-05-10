// 右クリックメニュー（長押しメニュー）を無効化
document.addEventListener('contextmenu', e => e.preventDefault());
// 画像などのドラッグを無効化
document.addEventListener('dragstart', e => e.preventDefault());

// ローカルストレージから石の数と既読情報を取得（初期値の設定）
const totalStones = localStorage.getItem('ra_stone_count') || '0';
document.getElementById('stone-count').textContent = totalStones;

// 既読済みIDのリストを取得 (例: ["scene1", "scene2"])
const readStoriesJson = localStorage.getItem('ra_read_stories');
const readStories = readStoriesJson ? JSON.parse(readStoriesJson) : [];

// meta.jsonを読み込んでストーリーリストを生成
fetch('storys/meta.json')
  .then(response => response.json())
  .then(data => {
    const list = document.getElementById('story-list');
    list.innerHTML = ''; // 既存の静的なリストをクリア
    data.ra_story_metadatas.forEach(item => {
      const li = document.createElement('li');
      // "第１話 - はじまりの場所" を分割して表示
      const parts = item.title.split(' - ');
      const epNum = parts[0] || '';
      const epTitle = parts[1] || '';

      // 既読かどうかを判定
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

// Service Workerの登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registered');

        // Service Workerが準備できたらバージョンを要求する
        const requestVersion = () => {
          const controller = navigator.serviceWorker.controller;
          if (controller) {
            controller.postMessage({ type: 'GET_VERSION' });
          } else {
            // 更新直後などでコントローラーが未確立の場合は、準備完了を待ってからアクティブなWorkerに送信
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

// 石ダイアログの制御
function openStoneDialog() {
  document.getElementById('stone-dialog').classList.remove('hidden');
}

function closeStoneDialog() {
  document.getElementById('stone-dialog').classList.add('hidden');
}

// リセット確認ダイアログの制御
function openConfirmDialog() {
  document.getElementById('stone-dialog').classList.add('hidden');
  document.getElementById('confirm-dialog').classList.remove('hidden');
}

function closeConfirmDialog() {
  document.getElementById('confirm-dialog').classList.add('hidden');
}

// リセットの実行
function executeReset() {
  localStorage.removeItem('ra_stone_count');
  localStorage.removeItem('ra_read_stories');
  location.reload();
}

// キャッシュをクリアして強制的に最新データを再取得する
async function forceUpdate() {
  try {
    // キャッシュストレージを全て削除
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    // 登録されているService Workerを解除
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) await registration.unregister();
    }
    // ページをリロード（サーバーから最新を読み込む）
    window.location.reload();
  } catch (e) {
    console.error('Update failed:', e);
    window.location.reload();
  }
}

// URLをクリップボードにコピーする
function shareUrl() {
  const url = 'https://r-amano.github.io/webnovel-test/';
  navigator.clipboard.writeText(url).then(() => {
    alert('URLをクリップボードにコピーしました！');
  }).catch(err => {
    console.error('コピーに失敗しました:', err);
  });
}