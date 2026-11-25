const repository = 'https://github.com/huanggexing9-hue/peng-xinzhan-portfolio';
const storageKey = 'pxz-portfolio-pending-upload';
const form = document.querySelector('#upload-form');
const progress = document.querySelector('#publish-progress');
const publishStatus = document.querySelector('#publish-status');
const checkButton = document.querySelector('#check-publish');
const resumeLink = document.querySelector('#resume-publish');
const editLink = document.querySelector('#edit-release');
const viewLink = document.querySelector('#view-published');
const nextUpload = document.querySelector('#next-upload');
let pending;
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (/^work-[a-z0-9]+-[a-f0-9]{8}$/.test(saved?.tag) && typeof saved.title === 'string') pending = saved;
} catch {
  // 允许在禁用浏览器存储时继续发布。
}

function newReleaseUrl(work) {
  const url = new URL(`${repository}/releases/new`);
  url.searchParams.set('tag', work.tag);
  url.searchParams.set('target', 'main');
  url.searchParams.set('title', work.title);
  url.searchParams.set('body', `作品分类：${work.category}\n\n${work.description}`);
  return url.href;
}

function showProgress() {
  progress.hidden = false;
  document.querySelector('#pending-title').textContent = pending.title;
  const releaseTag = encodeURIComponent(pending.tag);
  resumeLink.href = newReleaseUrl(pending);
  editLink.href = `${repository}/releases/edit/${releaseTag}`;
  viewLink.href = `./?show=${releaseTag}#${releaseTag}`;
  resumeLink.hidden = false;
  editLink.hidden = true;
  viewLink.hidden = true;
  nextUpload.hidden = true;
  publishStatus.textContent = '在 GitHub 添加附件并发布后，可在这里检查是否上线。';
}

async function checkPublication() {
  if (!pending || checkButton.disabled) return;
  const tag = pending.tag;
  checkButton.disabled = true;
  try {
    const response = await fetch(`upload-status.json?check=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Status unavailable');
    const results = await response.json();
    if (pending?.tag !== tag) return;
    const result = results[tag];
    resumeLink.hidden = Boolean(result);
    editLink.hidden = result?.state !== 'error';
    viewLink.hidden = result?.state !== 'published';
    nextUpload.hidden = viewLink.hidden;
    if (result?.state === 'published') {
      publishStatus.textContent = '已上线。新作品已添加到作品集顶部。';
    } else if (result?.state === 'error') {
      publishStatus.textContent = result.message;
    } else {
      publishStatus.textContent = '作品还未上线。若已在 GitHub 点发布，请稍等片刻再检查。';
    }
  } catch {
    if (pending?.tag === tag) publishStatus.textContent = '暂时无法查询进度，请稍后再试。';
  } finally {
    checkButton.disabled = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(form);
  const title = fields.get('title').trim();
  const category = fields.get('category').trim() || '剪辑作品';
  const description = fields.get('description').trim();
  if (pending?.title !== title || pending.category !== category || pending.description !== description) {
    pending = { title, category, description, tag: `work-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}` };
  }
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
  } catch {
    // 当前页面仍可查询发布进度。
  }
  showProgress();
  window.open(resumeLink.href, '_blank', 'noopener,noreferrer');
  progress.scrollIntoView({ block: 'nearest' });
});

nextUpload.addEventListener('click', () => {
  pending = undefined;
  progress.hidden = true;
  form.reset();
  form.elements.title.focus();
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // 可以在无浏览器存储的情况下继续使用表单。
  }
});
checkButton.addEventListener('click', checkPublication);
window.addEventListener('focus', checkPublication);
if (pending) {
  form.elements.title.value = pending.title;
  form.elements.category.value = pending.category;
  form.elements.description.value = pending.description;
  showProgress();
  checkPublication();
}
form.querySelector('[type="submit"]').disabled = false;
