const grid = document.querySelector('#work-grid');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const workStatus = document.querySelector('#work-status');
const dialog = document.querySelector('#work-dialog');
const dialogMedia = document.querySelector('#dialog-media');
const dialogLink = document.querySelector('#dialog-link');
let lastTrigger;

function makeProjectGraphic(visual) {
  const graphic = document.createElement('div');
  graphic.className = `project-art project-art--${visual}`;
  graphic.setAttribute('aria-hidden', 'true');
  if (visual === 'spark') {
    graphic.innerHTML = '<div class="project-window"><div class="window-bar"><i></i><i></i><i></i><span>spark520.online</span></div><div class="spark-demo"><div class="demo-video"><span class="play-icon"></span></div><span class="demo-arrow">→</span><div class="demo-qr"><i></i><i></i><i></i></div></div></div>';
  } else if (visual === 'recipe') {
    graphic.innerHTML = '<div class="project-window"><div class="window-bar"><i></i><i></i><i></i><span>AI 智能食谱</span></div><div class="recipe-demo"><div class="recipe-copy"><strong>今天吃什么？</strong><span>番茄 · 鸡蛋 · 葱花</span><b>匹配食谱 ↗</b></div><div class="recipe-plate"><i></i><i></i><i></i></div></div></div>';
  }
  return graphic;
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function makeCard(work) {
  const card = document.createElement('article');
  card.className = 'work-card';
  const visual = document.createElement('div');
  visual.className = `work-visual work-visual--${work.id}`;
  if (work.type === 'video') {
    const image = document.createElement('img');
    image.src = work.cover;
    image.alt = '';
    image.loading = 'lazy';
    image.width = 1120;
    image.height = 640;
    visual.append(image);
    const play = textElement('span', 'card-play', '');
    play.innerHTML = '<span class="play-icon"></span>';
    play.setAttribute('aria-hidden', 'true');
    const duration = textElement('span', 'card-duration', work.duration);
    duration.setAttribute('aria-hidden', 'true');
    visual.append(play, duration);
  } else {
    visual.append(makeProjectGraphic(work.visual));
  }

  const captions = document.createElement('div');
  captions.className = 'card-caption';
  const details = document.createElement('div');
  const title = textElement('h3', 'card-title', '');
  const trigger = textElement('button', 'work-card-button', work.title);
  trigger.type = 'button';
  trigger.dataset.open = work.id;
  trigger.setAttribute('aria-haspopup', 'dialog');
  title.append(trigger);
  details.append(textElement('p', 'card-category', work.category), title);
  const arrow = textElement('span', 'card-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  captions.append(details, arrow);
  card.append(visual, captions);
  return card;
}

function renderWorks(filter) {
  const visible = works.filter(work => filter === 'all' || work.type === filter);
  grid.replaceChildren(...visible.map(makeCard));
  workStatus.textContent = `显示 ${visible.length} 项作品`;
  for (const button of filterButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  }
}

function attachVideo(work) {
  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.className = work.portrait ? 'dialog-video dialog-video--portrait' : 'dialog-video';
  video.poster = work.poster || work.cover;
  video.src = work.video;
  video.setAttribute('aria-label', work.title);
  const playbackError = document.createElement('p');
  playbackError.className = 'playback-error';
  playbackError.setAttribute('role', 'status');
  playbackError.hidden = true;
  playbackError.append('浏览器无法播放这支短片。');
  const download = document.createElement('a');
  download.href = work.video;
  download.download = '';
  download.textContent = '下载 MP4';
  playbackError.append(download);
  video.addEventListener('error', () => {
    playbackError.hidden = false;
  }, { once: true });
  dialogMedia.append(video, playbackError);
  return video;
}

function showWork(work, trigger) {
  lastTrigger = trigger;
  dialogMedia.replaceChildren();
  document.querySelector('#dialog-title').textContent = work.title;
  document.querySelector('#dialog-category').textContent = work.category;
  document.querySelector('#dialog-description').textContent = work.description;
  dialogLink.hidden = !work.link;
  if (work.link) {
    dialogLink.href = work.link;
    dialogLink.textContent = '访问项目 ↗';
  } else {
    dialogLink.removeAttribute('href');
  }
  let video;
  if (work.type === 'video') {
    video = attachVideo(work);
  } else {
    dialogMedia.append(makeProjectGraphic(work.visual));
  }
  dialog.showModal();
  document.body.classList.add('dialog-open');
  if (video) {
    // 浏览器限制自动播放时，用户仍可使用原生播放按钮。
    video.play().catch(() => {});
  }
}

for (const button of filterButtons) {
  button.addEventListener('click', () => renderWorks(button.dataset.filter));
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-open]');
  if (!trigger) return;
  const work = works.find(entry => entry.id === trigger.dataset.open);
  if (work) showWork(work, trigger);
});

dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
let pressedBackdrop = false;
dialog.addEventListener('pointerdown', event => {
  pressedBackdrop = event.target === dialog;
});
dialog.addEventListener('click', event => {
  if (pressedBackdrop && event.target === dialog) dialog.close();
  pressedBackdrop = false;
});
dialog.addEventListener('close', () => {
  const video = dialogMedia.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  dialogMedia.replaceChildren();
  document.body.classList.remove('dialog-open');
  lastTrigger?.focus({ preventScroll: true });
});

const filmCount = works.filter(work => work.type === 'video').length;
const projectCount = works.filter(work => work.type === 'web').length;
document.querySelector('#work-count').textContent = `${filmCount} 支短片 / ${projectCount} 个 Web 项目`;
renderWorks('all');
