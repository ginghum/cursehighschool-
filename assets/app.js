'use strict';
const byId = (id) => document.getElementById(id);
let chapters = [];
const bookmarkKey = 'kasuko-story-bookmark-v1';
let bookmark = null;
let pendingBookmark = null;
let bookmarkNoticeTimer;
const bookmarkTools = document.createElement('aside');
bookmarkTools.className = 'bookmark-tools';
bookmarkTools.setAttribute('aria-label', '読書の栞');
const saveBookmarkButton = document.createElement('button');
saveBookmarkButton.type = 'button';
saveBookmarkButton.textContent = '栞を挟む';
const resumeBookmarkButton = document.createElement('button');
resumeBookmarkButton.type = 'button';
resumeBookmarkButton.textContent = '栞から再開';
const clearBookmarkButton = document.createElement('button');
clearBookmarkButton.type = 'button';
clearBookmarkButton.textContent = '栞を解除';
const bookmarkToggleButton = document.createElement('button');
bookmarkToggleButton.type = 'button';
bookmarkToggleButton.className = 'bookmark-toggle';
bookmarkToggleButton.setAttribute('aria-controls', 'bookmark-actions');
const bookmarkActions = document.createElement('div');
bookmarkActions.id = 'bookmark-actions';
bookmarkActions.className = 'bookmark-actions';
let bookmarkToolsExpanded = false;
try { bookmarkToolsExpanded = localStorage.getItem('kasuko-story-bookmark-tools') === 'open'; } catch {}
const bookmarkNotice = document.createElement('p');
bookmarkNotice.className = 'bookmark-notice';
bookmarkNotice.setAttribute('role', 'status');
bookmarkNotice.setAttribute('aria-live', 'polite');
bookmarkActions.append(saveBookmarkButton, resumeBookmarkButton, clearBookmarkButton);
bookmarkTools.append(bookmarkToggleButton, bookmarkActions, bookmarkNotice);
document.body.append(bookmarkTools);
try {
  const saved = JSON.parse(localStorage.getItem(bookmarkKey));
  if (saved && typeof saved.chapterId === 'string' && Number.isInteger(saved.paragraphIndex) && saved.paragraphIndex >= 0 && typeof saved.text === 'string' && Number.isFinite(saved.fraction) && saved.fraction >= 0 && saved.fraction <= 1) bookmark = saved;
} catch {}
function currentChapterId() {
  try { return location.hash.startsWith('#chapter=') ? decodeURIComponent(location.hash.slice(9)) : ''; } catch { return ''; }
}
function updateBookmarkTools() {
  const reading = chapters.some(chapter => chapter.id === currentChapterId());
  bookmarkActions.hidden = !bookmarkToolsExpanded;
  bookmarkToggleButton.textContent = bookmarkToolsExpanded ? '閉じる' : '栞';
  bookmarkToggleButton.setAttribute('aria-expanded', String(bookmarkToolsExpanded));
  bookmarkToggleButton.title = bookmarkToolsExpanded ? '栞メニューを小さくする' : '栞メニューを開く';
  saveBookmarkButton.hidden = !reading;
  const savedChapter = bookmark && chapters.find(chapter => chapter.id === bookmark.chapterId);
  resumeBookmarkButton.hidden = !savedChapter;
  clearBookmarkButton.hidden = !bookmark;
  bookmarkTools.hidden = !reading && !bookmark && !bookmarkNotice.textContent;
  resumeBookmarkButton.title = savedChapter ? `${savedChapter.title}の保存した位置へ戻る` : '';
}
function announceBookmark(message) {
  clearTimeout(bookmarkNoticeTimer);
  bookmarkNotice.textContent = message;
  updateBookmarkTools();
  bookmarkNoticeTimer = setTimeout(() => { bookmarkNotice.textContent = ''; updateBookmarkTools(); }, 4500);
}
bookmarkToggleButton.addEventListener('click', () => {
  bookmarkToolsExpanded = !bookmarkToolsExpanded;
  updateBookmarkTools();
  try { localStorage.setItem('kasuko-story-bookmark-tools', bookmarkToolsExpanded ? 'open' : 'closed'); } catch {}
});
function paragraphText(paragraph) { return paragraph.textContent.trim(); }
saveBookmarkButton.addEventListener('click', () => {
  const chapterId = currentChapterId();
  if (!chapters.some(chapter => chapter.id === chapterId)) return;
  const paragraphs = [...byId('chapter-text').children].filter(node => node.tagName === 'P');
  if (!paragraphs.length) return;
  const foundIndex = paragraphs.findIndex(node => node.getBoundingClientRect().bottom > 72);
  const paragraphIndex = foundIndex < 0 ? paragraphs.length - 1 : foundIndex;
  const paragraph = paragraphs[paragraphIndex];
  const rect = paragraph.getBoundingClientRect();
  const saved = {chapterId, paragraphIndex, text: paragraphText(paragraph), fraction: Math.max(0, Math.min(1, (72 - rect.top) / Math.max(1, rect.height)))};
  try {
    localStorage.setItem(bookmarkKey, JSON.stringify(saved));
    bookmark = saved;
    updateBookmarkTools();
    announceBookmark('この位置に栞を挟みました');
  } catch { announceBookmark('栞を保存できませんでした。ブラウザの保存設定をご確認ください'); }
});
clearBookmarkButton.addEventListener('click', () => {
  try {
    localStorage.removeItem(bookmarkKey);
    bookmark = null;
    pendingBookmark = null;
    for (const paragraph of byId('chapter-text').querySelectorAll('.bookmark-target')) paragraph.classList.remove('bookmark-target');
    announceBookmark('栞を解除しました');
    if (!saveBookmarkButton.hidden) saveBookmarkButton.focus({preventScroll: true});
    else { byId('contents-title').setAttribute('tabindex', '-1'); byId('contents-title').focus({preventScroll: true}); }
  } catch { announceBookmark('栞を解除できませんでした。ブラウザの保存設定をご確認ください'); }
});
function restoreBookmark(saved) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!bookmark || bookmark !== saved || currentChapterId() !== saved.chapterId) return;
    const paragraphs = [...byId('chapter-text').children].filter(node => node.tagName === 'P');
    let paragraph = paragraphs[saved.paragraphIndex];
    if (!paragraph || paragraphText(paragraph) !== saved.text) paragraph = paragraphs.find(node => paragraphText(node) === saved.text) || paragraphs[Math.min(saved.paragraphIndex, paragraphs.length - 1)];
    if (!paragraph) return;
    const rect = paragraph.getBoundingClientRect();
    window.scrollTo({top: Math.max(0, window.scrollY + rect.top + rect.height * saved.fraction - 72), behavior: 'instant'});
    paragraph.classList.add('bookmark-target');
    setTimeout(() => paragraph.classList.remove('bookmark-target'), 1800);
    announceBookmark('栞の位置から再開しました');
  }));
}
resumeBookmarkButton.addEventListener('click', () => {
  if (!bookmark || !chapters.some(chapter => chapter.id === bookmark.chapterId)) return;
  if (currentChapterId() === bookmark.chapterId) restoreBookmark(bookmark);
  else { pendingBookmark = bookmark; location.hash = chapterLink(bookmark.chapterId); }
});
updateBookmarkTools();
let illustrations = {};
let showIllustrations = true;
try { showIllustrations = localStorage.getItem('kasuko-story-illustrations') !== 'off'; } catch {}
function applyIllustrations() {
  byId('illustrations').checked = showIllustrations;
  for (const figure of byId('chapter-text').querySelectorAll('.story-illustration')) {
    figure.hidden = !showIllustrations;
    const img = figure.querySelector('img');
    if (showIllustrations && !img.hasAttribute('src')) img.src = img.dataset.src;
  }
}
byId('illustrations').addEventListener('change', (event) => {
  showIllustrations = event.target.checked;
  applyIllustrations();
  try { localStorage.setItem('kasuko-story-illustrations', showIllustrations ? 'on' : 'off'); } catch {}
});
function renderIllustration(item) {
  const figure = document.createElement('figure');
  figure.className = 'story-illustration';
  const img = document.createElement('img');
  img.dataset.src = item.src;
  img.alt = item.alt;
  img.width = item.width;
  img.height = item.height;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => { figure.hidden = true; });
  figure.append(img);
  return figure;
}
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
  const episode = chapters[index].id.match(/^chapter(\d+)-episode(\d+)$/);
  if (episode) return `第${episode[2]}話`;
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
  updateBookmarkTools();
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
  const nodes = [];
  const chapterImages = illustrations[chapter.id] || [];
  for (const paragraph of paragraphs) {
    nodes.push(renderParagraph(paragraph));
    for (const item of chapterImages) {
      if (paragraph.trim() === item.after) nodes.push(renderIllustration(item));
    }
  }
  byId('chapter-text').replaceChildren(...nodes);
  applyIllustrations();
  for (const [button, target] of [['previous', index - 1], ['previous-top', index - 1], ['next', index + 1], ['next-top', index + 1]]) {
    const link = byId(button);
    if (chapters[target]) { link.href = chapterLink(chapters[target].id); link.removeAttribute('aria-disabled'); }
    else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
  }
  if (focus) byId('chapter-title').focus();
}
window.addEventListener('hashchange', () => {
  showRoute(true);
  window.scrollTo(0, 0);
  if (pendingBookmark) { const saved = pendingBookmark; pendingBookmark = null; restoreBookmark(saved); }
});
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
    try {
      const imageResponse = await fetch('./illustrations.json', {cache: 'no-cache'});
      if (imageResponse.ok) illustrations = (await imageResponse.json()).chapters || {};
    } catch { /* 本文は挿絵データの読み込みに依存しない。 */ }
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
