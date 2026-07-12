const KEY = 'lift-log-mobile-v4';
const $ = (s, root = document) => root.querySelector(s);
const state = JSON.parse(localStorage.getItem(KEY) || '{}');
state.profile ||= null;
state.sessions ||= [];
let draft = null;

const parts = ['胸', '背中', '腕', '脚'];
const defaults = {
  '胸': ['ベンチプレス', 'ダンベルプレス', 'チェストプレス'],
  '背中': ['ラットプルダウン', 'シーテッドロー', 'デッドリフト'],
  '腕': ['ダンベルカール', 'トライセプスプレスダウン', 'ハンマーカール'],
  '脚': ['スクワット', 'レッグプレス', 'レッグカール']
};
const goals = { muscle: '筋肉を大きくしたい', diet: 'ダイエットしたい', health: '健康のために続けたい' };

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function today() { const d = new Date(), o = d.getTimezoneOffset() * 60000; return new Date(d - o).toISOString().slice(0, 10); }
function fmtDate(date) { return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T00:00:00`)); }
function esc(value = '') { const el = document.createElement('div'); el.textContent = value; return el.innerHTML; }
function go(page) { ['onboarding','home','workout','progress','settingsPage'].forEach(id => $(`#${id}`).hidden = id !== page); document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.page === page)); if (page === 'home') renderHome(); if (page === 'workout') renderWorkout(); if (page === 'progress') renderProgress(); if (page === 'settingsPage') renderSettings(); }
function recentFor(part) { return [...state.sessions].sort((a,b) => b.date.localeCompare(a.date)).find(s => s.parts.includes(part)); }
function recommendation() { const dates = parts.map(part => ({ part, date: recentFor(part)?.date || '1900-01-01' })); return dates.sort((a,b) => a.date.localeCompare(b.date))[0].part; }
function calories(session) {
  const weight = Number(state.profile?.weight || 60);
  const strength = (Number(session.duration || 0) / 60) * 3.5 * weight;
  const tm = session.treadmill || {};
  const mins = Number(tm.minutes || 0), speed = mins ? Number(tm.distance || 0) / (mins / 60) : 0;
  const met = Math.max(3, 3.5 + speed * 0.6 + Number(tm.incline || 0) * 0.2);
  const cardio = (mins / 60) * met * weight;
  return Math.round(strength + cardio);
}
function exerciseRow(item = { part: draft?.parts?.[0] || '胸', name: '', weight: '', reps: 10, sets: 3 }) {
  return `<div class="exercise"><label>部位<select name="part">${parts.map(p => `<option ${item.part === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label>種目<input name="name" value="${esc(item.name)}" required></label><label>kg<input name="weight" type="number" min="0" step="0.5" value="${item.weight}" required></label><label>回数<input name="reps" type="number" min="1" value="${item.reps}" required></label><label>セット<input name="sets" type="number" min="1" value="${item.sets}" required></label><button type="button" class="remove" aria-label="種目を削除">×</button></div>`;
}
function openDialog(title, html) { const d = $('#dialog'); d.innerHTML = `<div class="modal-head"><h2>${title}</h2><button class="text" data-close>×</button></div>${html}`; d.showModal(); $('[data-close]',d).onclick = () => d.close(); return d; }

function renderOnboarding() {
  $('#onboarding').innerHTML = `<p class="kicker">LET'S GET STARTED</p><h2>あなた向けの記録を始めよう</h2><p class="lead">体重は消費カロリーの目安を計算するために使います。あとから変更できます。</p><form id="setup" class="stack"><label>体重（kg）<input name="weight" type="number" min="20" max="300" step="0.1" placeholder="例：60" required></label><label>目標<select name="goal"><option value="muscle">筋肉を大きくしたい</option><option value="diet">ダイエットしたい</option><option value="health">健康のために続けたい</option></select></label><button class="primary">はじめる</button></form>`;
  $('#setup').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); state.profile = { weight: Number(f.get('weight')), goal: f.get('goal') }; save(); $('#nav').hidden = false; go('home'); };
}
function renderHome() {
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
  const weekly = state.sessions.filter(s => new Date(`${s.date}T00:00:00`) >= weekStart);
  const selected = draft?.parts || [];
  const rec = recommendation();
  $('#home').innerHTML = `<div class="hero"><span class="date">${fmtDate(today())}</span><h2>今日は何を鍛える？</h2><p>${goals[state.profile.goal]} · 体重 ${state.profile.weight}kg</p></div><div class="section-head"><h2>おすすめ</h2></div><article class="card recommend"><strong>今日は「${rec}」がおすすめ</strong><p>4部位の中で、いちばん長く記録がない部位です。</p></article><div class="section-head"><h2>鍛える部位を選ぶ</h2><button class="text" data-clear-parts>クリア</button></div><div class="part-grid">${parts.map(part => { const last = recentFor(part); return `<button class="part ${selected.includes(part) ? 'selected' : ''}" data-part="${part}"><strong>${part}</strong><small>${last ? `前回：${fmtDate(last.date)}` : '初回の記録を作る'}</small></button>`; }).join('')}</div><div class="actions"><button class="primary" data-start ${selected.length ? '' : 'disabled'}>${selected.length ? `${selected.join('＋')}を始める` : '部位を選んでください'}</button></div><div class="section-head"><h2>今週の記録</h2></div><div class="stats"><div class="card stat"><strong>${weekly.length}</strong><span>回</span></div><div class="card stat"><strong>${weekly.reduce((a,s) => a + s.exercises.length, 0)}</strong><span>種目</span></div><div class="card stat"><strong>${weekly.reduce((a,s) => a + calories(s), 0)}</strong><span>目安 kcal</span></div></div>`;
}
function buildDraft(selected) {
  const exercises = [];
  selected.forEach(part => { const old = recentFor(part); const source = old ? old.exercises.filter(x => x.part === part) : defaults[part].map(name => ({ part, name, weight: '', reps: 10, sets: 3 })); source.forEach(x => exercises.push({ ...x })); });
  draft = { date: today(), parts: selected, exercises, duration: '', treadmill: { minutes: '', incline: '', distance: '' } };
}
function renderWorkout() {
  if (!draft) { $('#workout').innerHTML = `<div class="empty">ホームから鍛える部位を選んでください。</div>`; return; }
  $('#workout').innerHTML = `<div class="section-head"><h2>${draft.parts.join('＋')}の記録</h2><button class="text" data-page="home">戻る</button></div><p class="notice">前回の記録をコピーしています。数字や種目は自由に変更できます。</p><form id="workoutForm" class="stack"><label>日付<input name="date" type="date" value="${draft.date}" required></label><section class="card"><div class="section-head"><h2>筋トレ</h2><button type="button" class="text" id="addExercise">種目を追加</button></div><div id="exerciseList">${draft.exercises.map(exerciseRow).join('')}</div></section><section class="card"><div class="section-head"><h2>トレッドミル</h2><span class="mini-label">任意</span></div><div class="two"><label>時間（分）<input name="tmMinutes" type="number" min="0" value="${draft.treadmill.minutes}"></label><label>傾斜（%）<input name="tmIncline" type="number" min="0" step="0.5" value="${draft.treadmill.incline}"></label></div><label>距離（km）<input name="tmDistance" type="number" min="0" step="0.01" value="${draft.treadmill.distance}"></label></section><section class="card calorie"><label>筋トレの時間（分）<input name="duration" type="number" min="0" value="${draft.duration}" placeholder="例：45"></label><p class="notice">体重と時間から消費カロリーの目安を出します。</p></section><button class="primary">記録を保存</button></form>`;
  $('#addExercise').onclick = () => $('#exerciseList').insertAdjacentHTML('beforeend', exerciseRow());
  $('#exerciseList').onclick = e => e.target.closest('.remove')?.parentElement.remove();
  $('#workoutForm').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), rows = [...document.querySelectorAll('.exercise')]; const exercises = rows.map(row => ({ part: $('[name=part]',row).value, name: $('[name=name]',row).value.trim(), weight: Number($('[name=weight]',row).value), reps: Number($('[name=reps]',row).value), sets: Number($('[name=sets]',row).value) })).filter(x => x.name); const session = { id: crypto.randomUUID(), date: f.get('date'), parts: [...new Set(exercises.map(x => x.part))], exercises, duration: Number(f.get('duration') || 0), treadmill: { minutes: Number(f.get('tmMinutes') || 0), incline: Number(f.get('tmIncline') || 0), distance: Number(f.get('tmDistance') || 0) } }; state.sessions.push(session); save(); draft = null; const kcal = calories(session); const d = openDialog('記録しました', `<p>消費カロリーの目安は <strong>${kcal} kcal</strong> です。</p><p class="notice">運動の強さや休憩時間によって実際の値は変わります。</p><div class="actions"><button class="primary" data-finish>ホームへ</button></div>`); $('[data-finish]',d).onclick = () => { d.close(); go('home'); }; };
}
function renderProgress() {
  const sessions = [...state.sessions].sort((a,b) => a.date.localeCompare(b.date)); const values = sessions.slice(-10).map(s => calories(s)); const max = Math.max(...values, 1); const points = values.map((v,i) => `${(i/(values.length-1 || 1))*320},${120-(v/max)*100}`).join(' ');
  $('#progress').innerHTML = `<div class="section-head"><h2>変化</h2></div><article class="card"><h3>消費カロリーの目安</h3>${values.length ? `<svg class="chart" viewBox="0 0 320 130" preserveAspectRatio="none"><line x1="0" y1="120" x2="320" y2="120"/><polyline points="${points}"/><style>.chart polyline{fill:none;stroke:#ef5143;stroke-width:3}</style></svg>` : '<div class="empty">記録を追加すると表示されます</div>'}</article><div class="section-head"><h2>履歴</h2></div><div class="history">${sessions.slice(-12).reverse().map(s => `<article class="card history-item"><div class="grow"><h3>${fmtDate(s.date)} · ${s.parts.join('＋')}</h3><p>${s.exercises.length}種目${s.treadmill.minutes ? ` · トレッドミル ${s.treadmill.minutes}分` : ''}</p></div><span class="tag">${calories(s)} kcal</span></article>`).join('') || '<div class="empty">まだ記録がありません</div>'}</div>`;
}
function renderSettings() {
  $('#settingsPage').innerHTML = `<div class="section-head"><h2>設定</h2><button class="text" data-page="home">戻る</button></div><form id="settingsForm" class="card stack"><label>体重（kg）<input name="weight" type="number" min="20" max="300" step="0.1" value="${state.profile.weight}" required></label><label>目標<select name="goal">${Object.entries(goals).map(([k,v]) => `<option value="${k}" ${state.profile.goal===k?'selected':''}>${v}</option>`).join('')}</select></label><button class="primary">保存</button></form>`; $('#settingsForm').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); state.profile.weight = Number(f.get('weight')); state.profile.goal = f.get('goal'); save(); go('home'); };
}
document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.page) go(b.dataset.page); if (b.dataset.part) { draft ||= { parts: [] }; draft.parts = draft.parts.includes(b.dataset.part) ? draft.parts.filter(x => x !== b.dataset.part) : [...draft.parts, b.dataset.part]; renderHome(); } if (b.hasAttribute('data-clear-parts')) { draft = null; renderHome(); } if (b.hasAttribute('data-start')) { buildDraft(draft.parts); go('workout'); } });
$('#settings').onclick = () => state.profile && go('settingsPage');
if (!state.profile) { renderOnboarding(); go('onboarding'); } else { $('#nav').hidden = false; go('home'); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js?v=4');
