/**
 * RA Engine - JSONキー構造に完全準拠したコントローラー
 */

async function loadScene(jsonPath) {
  console.log("Attempting to load:", jsonPath); // デバッグ用：どのパスを読み込もうとしているか表示
  try {
    const response = await fetch(jsonPath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    renderScene(data);
  } catch (error) {
    console.error("JSON読み込み失敗:", error);
  }
}

// 2. 画面を構築するメイン関数
function renderScene(data) {
  const root = data.ra_scene_container;
  if (!root) return;

  // --- 背景 (background) ---
  // 指定がない場合は黒、ある場合はJSONのパスをそのまま使用
  const bg = document.getElementById('background');
  if (root.background) {
    bg.style.backgroundImage = `url(${root.background})`;
  } else {
    bg.style.backgroundImage = 'none';
    bg.style.backgroundColor = '#000';
  }

  // --- パネル (panels) ---
  const panelLayer = document.getElementById('panel-layer');
  panelLayer.innerHTML = ''; // 前のシーンの残骸を消去

  if (root.panels && root.panels.url) {
    const container = document.createElement('div');
    container.className = 'panel-container';

    // 感嘆符 (emote)
    if (root.panels.emote) {
      const emoteImg = document.createElement('img');
      emoteImg.src = root.panels.emote;
      emoteImg.className = 'emote-icon';
      container.appendChild(emoteImg);
    }

    // メイン画像
    const mainImg = document.createElement('img');
    mainImg.src = root.panels.url;
    // property (character/item/panel) と animation をクラス名に適用
    const prop = root.panels.property || 'character';
    const ani = root.panels.animation || '';
    mainImg.className = `panel type-${prop} ${ani}`;
    container.appendChild(mainImg);

    panelLayer.appendChild(container);
  }

  // --- テキスト & 選択肢 (texts) ---
  const msgWin = document.getElementById('message-window');
  const choiceBox = document.getElementById('choice-container');
  const nameTag = document.getElementById('name-tag');
  const textArea = document.getElementById('text-area');

  choiceBox.classList.add('hidden'); // 選択肢を一旦隠す

  if (root.texts) {
    msgWin.classList.remove('hidden');

    // 名前表示の制御
    if (root.texts.name) {
      nameTag.textContent = root.texts.name;
      nameTag.classList.remove('hidden');
    } else {
      nameTag.classList.add('hidden');
    }

    // セリフ表示
    textArea.textContent = root.texts.text ? root.texts.text[0] : '';

    // ウィンドウクリック時のイベント設定
    msgWin.onclick = (e) => {
      e.stopPropagation();

      // 選択肢がある場合
      if (root.texts.choices && root.texts.choices.length > 0) {
        showChoices(root.texts.choices);
      }
      // 選択肢がなく、次のJSON指定がある場合
      else if (root.texts.text && root.texts.text[1]) {
        // シナリオファイルは 'scenario/' フォルダ内にあると想定
        loadScene(`story/${root.texts.text[1]}`);
      }
    };
  } else {
    msgWin.classList.add('hidden');
  }

  // --- 画面転換 (transition) ---
  const transLayer = document.getElementById('transition-layer');
  if (root.transition) {
    transLayer.style.backgroundColor = root.transition.color || '#000';
    const duration = (root.transition.duration || 1) * 1000;

    transLayer.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: duration,
      fill: 'forwards'
    });
  } else {
    // transition の記述がない場合は即座に透明にする
    transLayer.style.opacity = 0;
  }
}

/**
 * 選択肢の表示処理 (choices)
 */
function showChoices(choices) {
  const box = document.getElementById('choice-container');
  box.innerHTML = '';
  box.classList.remove('hidden');

  choices.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'choice-btn';
    btn.textContent = c.label; // label
    btn.onclick = (e) => {
      e.stopPropagation();
      loadScene(`story/${c.next_json}`); // next_json
      box.classList.add('hidden');
    };
    box.appendChild(btn);
  });
}

// 初期ロード
loadScene('story/s1_1_01.json');