/**
 * RA Engine - JSONキー構造に完全準拠したコントローラー
 */

const CONFIG = {
  ASSET_BASE_PATH: '../assets/img/',
  DEFAULT_TYPING_SPEED: 30,
  PAUSE_CHARS: {
    '。': 500,
    '、': 200
  }
};

const DOM = {
  bg: document.getElementById('background'),
  panelLayer: document.getElementById('panel-layer'),
  msgWin: document.getElementById('message-window'),
  nameTag: document.getElementById('name-tag'),
  textArea: document.getElementById('text-area'),
  transLayer: document.getElementById('transition-layer'),
  tapLayer: null // initMenu内で生成
};

const state = {
  currentTypingTimer: null,
  isTyping: false,
  currentFullText: "",
  currentSceneData: null,
  metaData: null,
  currentTexts: null
};

// ==========================================
// 1. 初期設定・ユーティリティ
// ==========================================

/** モバイル端末での表示高さ（vh）を正しく計算 */
function adjustViewport() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewport);
window.addEventListener('orientationchange', adjustViewport);
setTimeout(adjustViewport, 100);

/** アセットのフルパスを取得 */
function getAssetPath(path) {
  return path ? CONFIG.ASSET_BASE_PATH + path : '';
}

/** 画像をプリロード */
function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    img.src = url;
    img.onload = resolve;
    img.onerror = resolve;
  });
}

// ==========================================
// 2. データロード関連
// ==========================================

async function loadMetaData() {
  try {
    const response = await fetch('meta.json');
    state.metaData = await response.json();
  } catch (error) {
    console.error("Failed to load meta.json:", error);
  }
}

function updateStoryInfoUI(jsonPath) {
  if (!state.metaData) return;

  const [storyId, sceneFile] = jsonPath.replace('.json', '').split('/');
  const sceneNum = parseInt(sceneFile, 10);

  const meta = state.metaData.ra_story_metadatas.find(m => m.id === storyId);
  if (meta) {
    document.getElementById('story-info-title').textContent = meta.title;
    document.getElementById('story-info-progress').textContent = `Page: ${sceneNum} / ${meta.max_scene}`;
  }
}

async function loadScene(jsonPath) {
  const finalPath = jsonPath.endsWith('.json') ? jsonPath : `${jsonPath}.json`;
  console.log("Loading scene:", finalPath);

  try {
    if (!state.metaData) await loadMetaData();
    updateStoryInfoUI(jsonPath);

    const response = await fetch(finalPath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    state.currentSceneData = data;
    renderScene(data);
  } catch (error) {
    console.error("Failed to load scene:", error);
  }
}

// ==========================================
// 3. 描画・演出エンジン
// ==========================================

async function renderScene(data) {
  const root = data.ra_scene_container;
  if (!root) return;

  const menuBtn = document.getElementById('menu-hamburger');
  if (menuBtn) menuBtn.classList.add('hidden');

  // UIクリーンアップ
  DOM.textArea.textContent = '';
  DOM.msgWin.classList.add('hidden');
  if (state.currentTypingTimer) {
    clearTimeout(state.currentTypingTimer);
    state.currentTypingTimer = null;
    state.isTyping = false;
  }

  const bgUrl = getAssetPath(root.background);
  const panelUrl = root.panels?.url ? getAssetPath(root.panels.url) : null;
  const emoteUrl = root.panels?.emote ? getAssetPath(root.panels.emote) : null;

  if (root.transition) {
    await handleTransition(0, 1, 1, root.transition.color);
    await Promise.all([preloadImage(bgUrl), preloadImage(panelUrl), preloadImage(emoteUrl)]);
    updateBackground(root.background);
    updatePanels(root.panels);
    await new Promise(resolve => setTimeout(resolve, (root.transition.duration || 0) * 1000));
    await handleTransition(1, 0, 1, root.transition.color);
  } else {
    await Promise.all([preloadImage(bgUrl), preloadImage(panelUrl), preloadImage(emoteUrl)]);
    updateBackground(root.background);
    updatePanels(root.panels);
    DOM.transLayer.style.opacity = 0;
  }

  updateTexts(root.texts);
  if (menuBtn) menuBtn.classList.remove('hidden');
}

function handleTransition(start, end, duration, color) {
  DOM.transLayer.style.backgroundColor = color || '#000';
  const anim = DOM.transLayer.animate(
    [{ opacity: start }, { opacity: end }],
    { duration: duration * 1000, fill: 'forwards' }
  );
  return anim.finished;
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
  state.currentTexts = texts;
  
  if (!texts) {
    DOM.msgWin.classList.add('hidden');
    if (DOM.tapLayer) DOM.tapLayer.classList.add('hidden');
    return;
  }

  DOM.msgWin.classList.remove('hidden');
  if (DOM.tapLayer) DOM.tapLayer.classList.remove('hidden');

  state.currentFullText = texts.text?.[0] || "";
  DOM.nameTag.textContent = texts.name || "";
  DOM.nameTag.classList.toggle('hidden', !texts.name);

  typeText(DOM.textArea, state.currentFullText);
}

// ==========================================
// 4. テキストタイピング制御
// ==========================================

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

// ==========================================
// 5. ストーリー進行ロジック
// ==========================================

async function handleStoryProgress() {
  const texts = state.currentTexts;
  if (!texts) return;

  if (state.isTyping) {
    skipTyping(DOM.textArea, state.currentFullText);
    return;
  }

  if (texts.text?.[1]) {
    if (texts.text[1] === "end") {
      DOM.msgWin.classList.add('hidden');
      const menuBtn = document.getElementById('menu-hamburger');
      if (menuBtn) menuBtn.classList.add('hidden');
      await handleTransition(0, 1, 1, '#000');
      window.location.href = '../index.html';
    } else {
      loadScene(texts.text[1]);
    }
  }
}

// ==========================================
// 6. メニュー・ユーザーインターフェース
// ==========================================

function initMenu() {
  // 全面タップ用のレイヤー作成
  DOM.tapLayer = document.createElement('div');
  DOM.tapLayer.id = 'tap-layer';
  DOM.tapLayer.className = 'hidden';
  Object.assign(DOM.tapLayer.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: '50', backgroundColor: 'transparent' });
  document.body.appendChild(DOM.tapLayer);

  const handleTap = (e) => {
    e.stopPropagation();
    const dialog = document.getElementById('menu-dialog');
    const menuBtn = document.getElementById('menu-hamburger');
    if ((dialog && !dialog.classList.contains('hidden')) || (menuBtn && menuBtn.classList.contains('hidden'))) return;
    handleStoryProgress();
  };
  DOM.tapLayer.onclick = handleTap;
  DOM.msgWin.onclick = handleTap;

  const btn = document.createElement('div');
  btn.id = 'menu-hamburger';
  btn.innerHTML = '&#9776;';
  document.body.appendChild(btn);

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

  btn.onclick = (e) => {
    e.stopPropagation();
    dialog.classList.remove('hidden');
  };
  document.getElementById('menu-close-btn').onclick = (e) => {
    e.stopPropagation();
    dialog.classList.add('hidden');
  };
  document.getElementById('menu-home-btn').onclick = (e) => {
    e.stopPropagation();
    window.location.href = '../index.html';
  };
  document.getElementById('menu-back-btn').onclick = (e) => {
    e.stopPropagation();
    const backId = state.currentSceneData?.ra_scene_container?.back_id;
    if (backId) {
      dialog.classList.add('hidden');
      loadScene(backId);
    } else {
      alert("前のシーンが設定されていません。");
    }
  };
}

// ==========================================
// 7. エントリーポイント（実行開始）
// ==========================================

initMenu();

const urlParams = new URLSearchParams(window.location.search);
const sceneParam = urlParams.get('scene');
const initialScene = sceneParam || '1-1/01';

loadScene(initialScene);