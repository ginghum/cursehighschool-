'use strict';
const byId = (id) => document.getElementById(id);
let chapters = [];
let fontSize = 18;
let showSpeakerNames = true;
try { showSpeakerNames = localStorage.getItem('kasuko-story-speaker-names') !== 'off'; } catch {}
function applySpeakerNames() {
  byId('chapter-text').classList.toggle('hide-speaker-names', !showSpeakerNames);
  const control = byId('speaker-names');
  if (control) control.checked = showSpeakerNames;
}
byId('speaker-names')?.addEventListener('change', (event) => {
  showSpeakerNames = event.target.checked;
  applySpeakerNames();
  try { localStorage.setItem('kasuko-story-speaker-names', showSpeakerNames ? 'on' : 'off'); } catch {}
});
applySpeakerNames();
function renderParagraph(text) {
  const p = document.createElement('p');
  text.split('\n').forEach((line, index) => {
    if (index) p.append(document.createTextNode('\n'));
    const dialogue = line.match(/^([^\s「『」』]+)([「『].*)$/u);
    if (dialogue) {
      const name = document.createElement('span');
      name.className = 'speaker-name';
      name.textContent = dialogue[1];
      p.append(name, document.createTextNode(dialogue[2]));
    } else {
      p.append(document.createTextNode(line));
    }
  });
  return p;
}
try { const saved = Number(localStorage.getItem('kasuko-story-font')); if (saved >= 16 && saved <= 24) fontSize = saved; } catch {}
function applyFont() {
  document.documentElement.style.setProperty('--story-size', `${fontSize}px`);
  byId('font-small').disabled = fontSize <= 16;
  byId('font-large').disabled = fontSize >= 24;
}
function changeFont(delta) {
  fontSize = Math.max(16, Math.min(24, fontSize + delta));
  applyFont();
  try { localStorage.setItem('kasuko-story-font', String(fontSize)); } catch {}
}
byId('font-small').addEventListener('click', () => changeFont(-2));
byId('font-large').addEventListener('click', () => changeFont(2));
applyFont();
function characterCount(body) { return Array.from(body.replace(/\s/g, '')).length; }
function chapterLink(id) { return `#chapter=${encodeURIComponent(id)}`; }
function chapterLabel(index) {
  if (chapters[index].kind === 'prologue') return '序章';
  if (chapters[index].kind === 'extra') return `おまけ${chapters.slice(0, index + 1).filter(chapter => chapter.kind === 'extra').length}`;
  return `第${chapters.slice(0, index + 1).filter(chapter => chapter.kind !== 'prologue' && chapter.kind !== 'extra').length}話`;
}
function showRoute(focus = false) {
  let id = '';
  try { if (location.hash.startsWith('#chapter=')) id = decodeURIComponent(location.hash.slice(9)); } catch {}
  const index = chapters.findIndex(chapter => chapter.id === id);
  const reading = index >= 0;
  byId('contents').hidden = reading;
  byId('reader').hidden = !reading;
  if (!reading) {
    document.title = 'カス高｜メインストーリー';
    if (focus) { byId('contents-title').setAttribute('tabindex', '-1'); byId('contents-title').focus(); }
    return;
  }
  const chapter = chapters[index];
  document.title = `${chapter.title}｜カス高`;
  byId('chapter-label').textContent = chapterLabel(index);
  byId('chapter-title').textContent = chapter.title;
  const countLabel = byId('chapter-character-count');
  if (countLabel) countLabel.textContent = `本文 ${characterCount(chapter.body).toLocaleString('ja-JP')}字`;
  const paragraphs = chapter.body.replace(/\r\n?/g, '\n').split(/\n[\t ]*\n/);
  byId('chapter-text').replaceChildren(...paragraphs.map(renderParagraph));
  for (const [button, target] of [['previous', index - 1], ['next', index + 1]]) {
    const link = byId(button);
    if (chapters[target]) { link.href = chapterLink(chapters[target].id); link.removeAttribute('aria-disabled'); }
    else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
  }
  if (focus) byId('chapter-title').focus();
}
window.addEventListener('hashchange', () => { showRoute(true); window.scrollTo(0, 0); });
async function load() {
  try {
    const response = await fetch('./stories.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error('load failed');
    const data = await response.json();
    const ids = new Set();
    if (!Array.isArray(data.chapters) || data.chapters.some(chapter => {
      if (!chapter || typeof chapter.id !== 'string' || !chapter.id.trim() || ids.has(chapter.id) || typeof chapter.title !== 'string' || !chapter.title.trim() || typeof chapter.body !== 'string') return true;
      ids.add(chapter.id); return false;
    })) throw new Error('invalid chapters');
    chapters = data.chapters;
    byId('chapter-list').replaceChildren(...chapters.map((chapter, index) => {
      const li = document.createElement('li'); const a = document.createElement('a');
      a.href = chapterLink(chapter.id);
      for (const [className, text] of [['chapter-number', chapterLabel(index)], ['chapter-name', chapter.title], ['chapter-arrow', '→']]) {
        const span = document.createElement('span'); span.className = className; span.textContent = text;
        if (className === 'chapter-arrow') span.setAttribute('aria-hidden', 'true');
        a.append(span);
      }
      li.append(a); return li;
    }));
    const extras = chapters.filter(chapter => chapter.kind === 'extra').length;
    const mainCount = chapters.length - extras;
    byId('chapter-count').textContent = chapters.length ? `全${mainCount}話${extras ? `＋おまけ${extras}話` : ''}` : '';
    byId('status').hidden = chapters.length > 0;
    byId('status').textContent = '本文はまだありません。';
    showRoute();
  } catch { byId('status').textContent = '本文を読み込めませんでした。ページを再読み込みしてください。'; }
}
load();
