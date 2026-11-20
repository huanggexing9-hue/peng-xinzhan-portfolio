# 彭新展个人作品集

双击 `index.html` 即可在浏览器中预览。整个目录可以部署到静态网站托管，网页、本地图片和 MP4 需要一起上传。

## 增加一支短片

1. 把网站播放用的 MP4 放进 `assets/videos/`，封面放进 `assets/images/`。建议用英文文件名。
2. 在 `works.js` 的 `works` 数组末尾复制一个短片条目，给 `id` 填写独立的英文标识，再更新标题、分类、时长、媒体路径及简介。
3. 竖屏片建议设置 `portrait: true`，用 `poster` 指向一张竖版静帧。`cover` 为列表使用的横版封面。
4. 刷新页面检查封面、筛选和播放。

`index.html` 包含个人简介、经历及联系信息。Web 项目也可以在 `works.js` 中维护，设置 `link` 后，详情页会显示访问入口。

## 发布

线上地址：[彭新展个人作品集](https://huanggexing9-hue.github.io/peng-xinzhan-portfolio/)。仓库的 `main` 分支用于 GitHub Pages 发布。更新作品后，把改动和媒体文件提交并推送到 `main`。
