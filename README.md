# 彭新展个人作品集

双击 `index.html` 可以预览本地的初始作品。已通过管理页上传的作品以线上版本为准。

## 上传视频

1. 打开[作品管理](https://huanggexing9-hue.github.io/peng-xinzhan-portfolio/manage.html)，填好作品标题，可选填分类和简介。
2. 点「前往 GitHub 上传视频」，用 `huanggexing9-hue` 账号登录。在附件区域选择一支 MP4 或 MOV，最长 10 分钟、最大 500 MB。
3. 上传完成后点 **Publish release**。回到作品管理点「检查上线」。发布完成后，作品集会显示封面和播放入口。

每次新增作品用一个发布条目。可以在 GitHub 的 Releases 页面找到该作品，修改标题、简介或更换附件。

## 维护网站

首页内容在 `index.html`，原有作品和 Web 项目在 `works.js`。GitHub Actions 从 `main` 构建网站，并把已发布的视频处理成网页播放用的 MP4。源视频来自仓库的 Releases。同步失败时可在 Actions 页面手动运行「发布作品集」。
