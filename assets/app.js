'use strict';
const byId = (id) => document.getElementById(id);
let chapters = [];
let fontSize = 18;
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
  return `第${chapters.slice(0, index + 1).filter(chapter => chapter.kind !== 'prologue').length}話`;
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
  byId('chapter-text').replaceChildren(...paragraphs.map(text => {
    const p = document.createElement('p'); p.textContent = text; return p;
  }));
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
    byId('chapter-count').textContent = chapters.length ? `全${chapters.length}話` : '';
    byId('status').hidden = chapters.length > 0;
    byId('status').textContent = '本文はまだありません。';
    showRoute();
  } catch { byId('status').textContent = '本文を読み込めませんでした。ページを再読み込みしてください。'; }
}
load();
