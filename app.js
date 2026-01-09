const db = localforage.createInstance({ name: "ProjectA_DB" });
let currentWords = [];
let editingWordId = null;
let isAnkiMode = false;

function togglePanel() {
    document.getElementById('side-panel').classList.toggle('is-open');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.innerText.includes(tab === 'words' ? '単語' : 'ノート')));
    renderList(tab);
}

function toggleAnkiMode() {
    isAnkiMode = document.getElementById('anki-mode-check').checked;
    const container = document.getElementById('panel-content');
    if (isAnkiMode) container.classList.add('anki-mode-on');
    else {
        container.classList.remove('anki-mode-on');
        document.querySelectorAll('.note-card').forEach(c => c.classList.remove('revealed'));
    }
}

async function loadData() {
    currentWords = await db.getItem('saved_words') || [];
    renderList('words');
}

function openAddModal() {
    editingWordId = null;
    document.getElementById('modal-title').innerText = '単語を追加';
    document.getElementById('word-form').reset();
    document.getElementById('word-modal-overlay').classList.add('show');
}

function closeModal() {
    document.getElementById('word-modal-overlay').classList.remove('show');
}

async function handleSaveWord(event) {
    event.preventDefault();
    const wordData = {
        id: editingWordId || Date.now(),
        word: document.getElementById('input-word').value,
        meaning: document.getElementById('input-meaning').value,
        memo: document.getElementById('input-memo').value
    };
    if (editingWordId) currentWords = currentWords.map(w => w.id === editingWordId ? wordData : w);
    else currentWords.push(wordData);

    await db.setItem('saved_words', currentWords);
    closeModal();
    renderList('words');
}

async function deleteWord(id) {
    if(!confirm('削除しますか？')) return;
    currentWords = currentWords.filter(w => w.id !== id);
    await db.setItem('saved_words', currentWords);
    renderList('words');
}

function editWord(id) {
    const w = currentWords.find(item => item.id === id);
    if(!w) return;
    editingWordId = id;
    document.getElementById('modal-title').innerText = '単語を編集';
    document.getElementById('input-word').value = w.word;
    document.getElementById('input-meaning').value = w.meaning;
    document.getElementById('input-memo').value = w.memo || '';
    document.getElementById('word-modal-overlay').classList.add('show');
}

// ノート用データの読み込み（初期化に追加）
let currentNotes = [];

async function loadData() {
    currentWords = await db.getItem('saved_words') || [];
    currentNotes = await db.getItem('saved_notes') || []; // ノートも読み込む
    renderList('words');
}

function renderList(type, filterText = '') {
    const container = document.getElementById('panel-content');
    container.innerHTML = '';

    if (type === 'words') {
        // --- 単語リストの描画（以前の1行スタイル） ---
        const filtered = currentWords.filter(w => 
            w.word.toLowerCase().includes(filterText.toLowerCase()) || 
            w.meaning.toLowerCase().includes(filterText.toLowerCase())
        );
        filtered.forEach(w => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.onclick = () => { if (isAnkiMode) card.classList.toggle('revealed'); };
            card.innerHTML = `
                <div class="word-row">
                    <div class="word-left"><span onclick="event.stopPropagation(); speakText('${w.word}')" style="cursor:pointer">🔊</span> ${w.word}</div>
                    <div class="meaning-right">${w.meaning}</div>
                    <div class="action-group">
                        <button onclick="event.stopPropagation(); editWord(${w.id})">編</button>
                        <button onclick="event.stopPropagation(); deleteWord(${w.id})" style="color:red">消</button>
                    </div>
                </div>
                ${w.memo ? `<div class="memo-row">${w.memo}</div>` : ''}
            `;
            container.appendChild(card);
        });

    } else if (type === 'notes') {
        // --- ノート（段落メモ）の描画（2段ブロック形式） ---
        currentNotes.forEach(n => {
            const card = document.createElement('div');
            card.className = 'note-block-card';
            card.innerHTML = `
                <div class="block-english">${n.originalText}</div>
                <div class="block-memo">${n.translation || '（メモなし）'}</div>
                <div class="note-footer">
                    <button onclick="editNote(${n.id})">編集</button>
                    <button onclick="deleteNote(${n.id})" style="color:red">削除</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function handleSearch() {
    renderList('words', document.getElementById('word-search').value);
}

function speakText(text) {
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    speechSynthesis.speak(uttr);
}
let currentTab = 'words'; // 現在のタブを保持
let editingNoteId = null;

// ★ switchTab をアップデート
function switchTab(tab) {
    currentTab = tab;
    const searchInput = document.getElementById('word-search');
    const ankiWrapper = document.getElementById('anki-wrapper');
    const addBtn = document.getElementById('add-word-btn');

    if (tab === 'notes') {
        ankiWrapper.style.display = 'none'; // 暗記モードを隠す
        searchInput.placeholder = 'ノートを検索...';
        addBtn.onclick = openAddNoteModal; // ボタンの役割をノート追加に変更
    } else {
        ankiWrapper.style.display = 'flex';
        searchInput.placeholder = '単語を検索...';
        addBtn.onclick = openAddModal; // 単語追加に戻す
    }

    document.querySelectorAll('.tab-btn').forEach(b => 
        b.classList.toggle('active', b.innerText.includes(tab === 'words' ? '単語' : 'ノート'))
    );
    renderList(tab);
}

// --- ノート用の関数群 ---
function openAddNoteModal() {
    editingNoteId = null;
    document.getElementById('note-form').reset();
    document.getElementById('note-modal-overlay').classList.add('show');
}

function closeNoteModal() {
    document.getElementById('note-modal-overlay').classList.remove('show');
}

async function handleSaveNote(event) {
    event.preventDefault();
    const noteData = {
        id: editingNoteId || Date.now(),
        originalText: document.getElementById('input-note-eng').value,
        translation: document.getElementById('input-note-memo').value
    };

    if (editingNoteId) {
        currentNotes = currentNotes.map(n => n.id === editingNoteId ? noteData : n);
    } else {
        currentNotes.push(noteData);
    }

    await db.setItem('saved_notes', currentNotes);
    closeNoteModal();
    renderList('notes');
}

function editNote(id) {
    const n = currentNotes.find(item => item.id === id);
    if(!n) return;
    editingNoteId = id;
    document.getElementById('input-note-eng').value = n.originalText;
    document.getElementById('input-note-memo').value = n.translation || '';
    document.getElementById('note-modal-overlay').classList.add('show');
}

async function deleteNote(id) {
    if(!confirm('ノートを削除しますか？')) return;
    currentNotes = currentNotes.filter(n => n.id !== id);
    await db.setItem('saved_notes', currentNotes);
    renderList('notes');
}

// 既存の handleSearch も修正（どちらのタブでも動くように）
function handleSearch() {
    renderList(currentTab, document.getElementById('word-search').value);
}

window.onload = loadData;