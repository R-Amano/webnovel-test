/**
 * RA Engine - JSONキー構造に完全準拠したコントローラー
 */

// --- 設定・定数 ---
const CONFIG = {
  ASSET_BASE_PATH: '../assets/img/',
  DEFAULT_TYPING_SPEED: 30,
  PAUSE_CHARS: {
    '。': 500,
    '、': 200
  }
};

// --- DOM要素のキャッシュ ---
const DOM = {
  bg: document.getElementById('background'),
  panelLayer: document.getElementById('panel-layer'),
  msgWin: document.getElementById('message-window'),
  nameTag: document.getElementById('name-tag'),
  textArea: document.getElementById('text-area'),
  transLayer: document.getElementById('transition-layer')
};

// --- エンジン状態 ---
const state = {
  currentTypingTimer: null,
  isTyping: false,
  currentFullText: "",
  currentSceneData: null, // 現在のシーン情報を保持
  metaData: null // meta.jsonの情報を保持
};

/**
 * モバイル端末での表示高さ（vh）を正しく計算する
 * 特にiOS PWAの初回起動時のズレを解消します
 */
function adjustViewport() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewport);
window.addEventListener('orientationchange', adjustViewport);
// 初期実行（少し遅らせることでPWAの起動タイミングに合わせる）
setTimeout(adjustViewport, 100);

/**
 * メタデータを読み込む
 */
async function loadMetaData() {
  try {
    const response = await fetch('meta.json');
    state.metaData = await response.json();
  } catch (error) {
    console.error("Failed to load meta.json:", error);
  }
}

/**
 * 左上のストーリー情報を更新する
 */
function updateStoryInfoUI(jsonPath) {
  if (!state.metaData) return;

  // "1-1/01" のような形式からIDとシーン番号を抽出
  const [storyId, sceneFile] = jsonPath.replace('.json', '').split('/');
  const sceneNum = parseInt(sceneFile, 10);

  const meta = state.metaData.ra_story_metadatas.find(m => m.id === storyId);
  if (meta) {
    document.getElementById('story-info-title').textContent = meta.title;
    document.getElementById('story-info-progress').textContent = `Page: ${sceneNum} / ${meta.max_scene}`;
  }
}

/**
 * シーンJSONをロードする
 */
async function loadScene(jsonPath) {
  // .json が含まれていない場合は自動で付与する
  const finalPath = jsonPath.endsWith('.json') ? jsonPath : `${jsonPath}.json`;
  console.log("Loading scene:", finalPath);

  try {
    if (!state.metaData) await loadMetaData(); // 初回のみメタ読み込み
    updateStoryInfoUI(jsonPath);

    const response = await fetch(finalPath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    state.currentSceneData = data; // データを保存
    renderScene(data);
  } catch (error) {
    console.error("Failed to load scene:", error);
  }
}

/**
 * シーンを描画する
 */
async function renderScene(data) {
  const root = data.ra_scene_container;
  if (!root) return;

  // 暗転（トランジション）開始時にメニューボタンを隠す
  const menuBtn = document.getElementById('menu-hamburger');
  if (menuBtn) menuBtn.classList.add('hidden');

  // --- 新しいシーンの描画前に、メッセージウィンドウとテキストをクリアし、非表示にする ---
  DOM.textArea.textContent = ''; // テキストエリアの内容を即座にクリア
  DOM.msgWin.classList.add('hidden'); // メッセージウィンドウを非表示にする
  if (state.currentTypingTimer) { // 進行中のタイピングがあれば停止
    clearTimeout(state.currentTypingTimer);
    state.currentTypingTimer = null;
    state.isTyping = false;
  }
  // --- クリーンアップ終了 ---

  if (root.transition) {
    // 1. フェードアウト (透明 -> 黒) 1秒固定
    await handleTransition(0, 1, 1, root.transition.color);

    // 2. 画面が完全に暗いうちに素材を更新
    updateBackground(root.background);
    updatePanels(root.panels);

    // 3. 真っ暗な状態を維持 (JSONで指定された秒数)
    await new Promise(resolve => setTimeout(resolve, (root.transition.duration || 0) * 1000));

    // 4. フェードイン (黒 -> 透明) 1秒固定
    await handleTransition(1, 0, 1, root.transition.color);
  } else {
    // トランジション指定がない場合は即座に更新
    updateBackground(root.background);
    updatePanels(root.panels);
    DOM.transLayer.style.opacity = 0;
  }

  updateTexts(root.texts);

  // シーンの準備が整ったらメニューボタンを再表示する
  if (menuBtn) menuBtn.classList.remove('hidden');
}

/**
 * アセットのフルパスを取得する
 */
function getAssetPath(path) {
  return path ? CONFIG.ASSET_BASE_PATH + path : '';
}

function updateBackground(background) {
  const assetPath = getAssetPath(background);
  DOM.bg.style.backgroundImage = assetPath ? `url(${assetPath})` : 'none';
  DOM.bg.style.backgroundColor = assetPath ? '' : '#000';
}

function updatePanels(panels) {
  DOM.panelLayer.innerHTML = '';
  if (!panels?.url) return;

  const container = document.createElement('div');
  container.className = 'panel-container';

  if (panels.emote) {
    const emoteImg = document.createElement('img');
    emoteImg.src = getAssetPath(panels.emote);
    emoteImg.className = 'emote-icon';
    container.appendChild(emoteImg);
  }

  const mainImg = document.createElement('img');
  mainImg.src = getAssetPath(panels.url);
  const prop = panels.property || 'character';
  mainImg.className = `panel type-${prop}`;
  container.appendChild(mainImg);

  DOM.panelLayer.appendChild(container);
}

function updateTexts(texts) {
  if (!texts) {
    DOM.msgWin.classList.add('hidden');
    return;
  }

  DOM.msgWin.classList.remove('hidden');
  state.currentFullText = texts.text?.[0] || "";

  // 名前タグの表示
  DOM.nameTag.textContent = texts.name || "";
  DOM.nameTag.classList.toggle('hidden', !texts.name);

  // セリフのタイピング開始
  typeText(DOM.textArea, state.currentFullText);

  // クリックイベントの再設定
  DOM.msgWin.onclick = (e) => {
    e.stopPropagation();

    if (state.isTyping) {
      skipTyping(DOM.textArea, state.currentFullText);
      return;
    }

    if (texts.text?.[1]) {
      loadScene(texts.text[1]);
    }
  };
}

/**
 * 指定した不透明度へのアニメーションを実行する
 */
function handleTransition(start, end, duration, color) {
  DOM.transLayer.style.backgroundColor = color || '#000';
  const anim = DOM.transLayer.animate(
    [{ opacity: start }, { opacity: end }],
    { duration: duration * 1000, fill: 'forwards' }
  );
  return anim.finished;
}

function typeText(element, text, speed = CONFIG.DEFAULT_TYPING_SPEED) {
  if (state.currentTypingTimer) clearTimeout(state.currentTypingTimer);
  element.textContent = "";
  let i = 0;
  state.isTyping = true;

  const timer = () => {
    if (i < text.length) {
      const char = text.charAt(i++);
      element.textContent += char;
      const delay = CONFIG.PAUSE_CHARS[char] || speed;
      state.currentTypingTimer = setTimeout(timer, delay);
    } else {
      state.isTyping = false;
      state.currentTypingTimer = null;
    }
  };
  timer();
}

function skipTyping(element, fullText) {
  if (state.currentTypingTimer) clearTimeout(state.currentTypingTimer);
  element.textContent = fullText;
  state.isTyping = false;
  state.currentTypingTimer = null;
}

/**
 * 設定メニュー（ハンバーガーメニュー）の初期化
 */
function initMenu() {
  // ハンバーガーアイコン作成
  const btn = document.createElement('div');
  btn.id = 'menu-hamburger';
  btn.innerHTML = '&#9776;'; // 三本線
  document.body.appendChild(btn);

  // ダイアログ作成
  const dialog = document.createElement('div');
  dialog.id = 'menu-dialog';
  dialog.className = 'hidden';
  dialog.innerHTML = `
    <div class="menu-content">
      <button id="menu-back-btn" class="menu-btn">前のシーンに戻る</button>
      <button id="menu-home-btn" class="menu-btn">シナリオ選択に戻る</button>
      <button id="menu-close-btn" class="menu-btn" style="background:#444;">閉じる</button>
    </div>
  `;
  document.body.appendChild(dialog);

  // イベント登録
  btn.onclick = () => dialog.classList.remove('hidden');
  
  document.getElementById('menu-close-btn').onclick = () => dialog.classList.add('hidden');

  // シナリオ選択に戻る
  document.getElementById('menu-home-btn').onclick = () => {
    window.location.href = '../index.html';
  };

  // 前のシーンに戻る
  document.getElementById('menu-back-btn').onclick = () => {
    const backId = state.currentSceneData?.ra_scene_container?.back_id;
    if (backId) {
      dialog.classList.add('hidden');
      loadScene(backId);
    } else {
      alert("前のシーンが設定されていません。");
    }
  };

}

// メニュー初期化
initMenu();

/**
 * URLパラメータ (?scene=xxx) から初期シーンを特定してロードする
 */
const urlParams = new URLSearchParams(window.location.search);
const sceneParam = urlParams.get('scene');
const initialScene = sceneParam || '1-1/01';

loadScene(initialScene);