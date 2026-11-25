"""Package the static site and its published portfolio video uploads."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILES = (
    "index.html", "styles.css", "site.js", "works.js",
    "manage.html", "manage.js", "manage.css",
)
TAG_PATTERN = re.compile(r"work-[a-z0-9]{1,16}-[a-f0-9]{8}")
SUPPORTED_EXTENSIONS = {".mp4", ".mov"}
MAX_UPLOAD_BYTES = 500_000_000
MAX_DURATION_SECONDS = 600
MAX_SITE_BYTES = 950_000_000
MOV_INPUT = ["-f", "mov", "-protocol_whitelist", "file", "-enable_drefs", "0"]


class UploadError(ValueError):
    pass


class Releases:
    def __init__(self, repository, token):
        self.url = f"https://api.github.com/repos/{repository}/releases"
        self.token = token

    def request(self, path, accept="application/vnd.github+json"):
        request = Request(self.url + path, headers={
            "Accept": accept,
            "User-Agent": "PXZ portfolio build",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        if self.token:
            request.add_unredirected_header("Authorization", f"Bearer {self.token}")
        return urlopen(request, timeout=90)

    def published_works(self):
        page = 1
        while True:
            with self.request(f"?per_page=50&page={page}") as response:
                releases = json.load(response)
            yield from (release for release in releases if (
                not release["draft"] and release["published_at"]
                and TAG_PATTERN.fullmatch(release["tag_name"])
            ))
            if len(releases) < 50:
                return
            page += 1

    def download(self, asset, destination):
        asset_id = int(asset["id"])
        with self.request(f"/assets/{asset_id}", "application/octet-stream") as response, destination.open("wb") as target:
            size = 0
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise UploadError("视频超过 500 MB。请压缩后重新上传。")
                target.write(chunk)
        if size != asset["size"]:
            raise OSError(f"Incomplete download for release asset {asset_id}")


def video_asset(release):
    files = [asset for asset in release["assets"] if (
        asset["state"] == "uploaded"
        and Path(asset["name"]).suffix.lower() in SUPPORTED_EXTENSIONS
    )]
    if len(files) != 1:
        raise UploadError("请在 GitHub 发布页添加一支 MP4 或 MOV 视频，然后保存。")
    asset, = files
    if not 0 < asset["size"] <= MAX_UPLOAD_BYTES:
        raise UploadError("请选择大小在 500 MB 以内的视频，然后保存。")
    return asset


def probe(path):
    result = subprocess.run([
        "ffprobe", "-v", "error", *MOV_INPUT, "-select_streams", "V:0",
        "-show_entries", "format=duration:stream=width,height", "-of", "json", str(path),
    ], check=True, capture_output=True, text=True, timeout=30)
    data = json.loads(result.stdout)
    video, = data["streams"]
    duration = float(data["format"]["duration"])
    if not (duration > 0 and video["width"] > 0 and video["height"] > 0):
        raise ValueError("Missing video metadata")
    return duration, video["width"], video["height"]


def ffmpeg(args, timeout):
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", *args,
    ], check=True, capture_output=True, timeout=timeout)


def prepare_video(source, video, poster):
    try:
        duration, _, _ = probe(source)
        if duration > MAX_DURATION_SECONDS:
            raise UploadError("视频超过 10 分钟。请缩短后重新上传。")
        ffmpeg([
            *MOV_INPUT, "-i", str(source), "-map", "0:V:0", "-map", "0:a:0?",
            "-vf", "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
            "-fpsmax", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
            "-crf", "22", "-maxrate", "2000k", "-bufsize", "3000k",
            "-c:a", "aac", "-b:a", "112k", "-ac", "2", "-movflags", "+faststart", str(video),
        ], timeout=900)
        duration, width, height = probe(video)
        ffmpeg([
            "-ss", str(min(3, duration * 0.18)), *MOV_INPUT, "-i", str(video), "-frames:v", "1",
            "-vf", "scale=1120:1120:force_original_aspect_ratio=decrease:force_divisible_by=2",
            "-c:v", "libwebp", "-quality", "84", str(poster),
        ], timeout=35)
        if not poster.is_file():
            raise ValueError("Missing cover frame")
    except (subprocess.SubprocessError, KeyError, ValueError) as error:
        if isinstance(error, UploadError):
            raise
        raise UploadError("视频无法处理。请用剪映导出为 MP4 后重新上传。") from error
    return duration, width < height


def build_work(releases, release, working_files, output, remaining_bytes):
    asset = video_asset(release)
    slug = release["tag_name"]
    source = working_files / "source.mp4"
    encoded = working_files / "playback.mp4"
    frame = working_files / "poster.webp"
    releases.download(asset, source)
    duration, portrait = prepare_video(source, encoded, frame)
    size = encoded.stat().st_size + frame.stat().st_size
    if size > remaining_bytes:
        raise UploadError("作品集容量已满。请缩小视频或移除其他上传的作品。")
    video = f"assets/videos/{slug}-{int(asset['id'])}.mp4"
    poster = f"assets/images/{slug}-{int(asset['id'])}.webp"
    shutil.move(encoded, output / video)
    shutil.move(frame, output / poster)

    title = (release["name"] or "").strip() or Path(asset["name"]).stem
    description = (release["body"] or "").strip()
    category = "剪辑作品"
    first_line, _, rest = description.partition("\n")
    if first_line.startswith("作品分类："):
        category = first_line.removeprefix("作品分类：").strip()[:28] or category
        description = rest.strip()
    minutes, seconds = divmod(round(duration), 60)
    return {
        "id": slug, "type": "video", "title": title[:70], "category": category,
        "description": description[:180], "duration": f"{minutes}:{seconds:02d}",
        "cover": poster, "poster": poster, "video": video, "portrait": portrait,
    }, size


def assemble_site(releases, output):
    output.mkdir(parents=True, exist_ok=False)
    for filename in SOURCE_FILES:
        shutil.copy2(ROOT / filename, output / filename)
    shutil.copytree(ROOT / "assets", output / "assets")
    remaining_bytes = MAX_SITE_BYTES - sum(
        file.stat().st_size for file in output.rglob("*") if file.is_file()
    )
    catalog = []
    status = {}
    # Earlier uploads retain priority if the collection reaches its size limit.
    for release in sorted(releases.published_works(), key=lambda item: (item["published_at"], item["id"])):
        slug = release["tag_name"]
        try:
            with TemporaryDirectory(prefix="portfolio-video-") as directory:
                work, size = build_work(releases, release, Path(directory), output, remaining_bytes)
        except UploadError as error:
            print(f"{slug}: {error}", flush=True)
            status[slug] = {"state": "error", "message": str(error)}
        else:
            catalog.append(work)
            remaining_bytes -= size
            status[slug] = {"state": "published"}
            print(f"{slug}: processed", flush=True)

    script = f"const uploadedWorks = {json.dumps(list(reversed(catalog)), ensure_ascii=True, indent=2)};\n"
    (output / "uploads.js").write_text(script, encoding="utf-8")
    (output / "upload-status.json").write_text(json.dumps(status, ensure_ascii=False), encoding="utf-8")
    version = hashlib.sha256(script.encode()).hexdigest()[:12]
    homepage = output / "index.html"
    homepage.write_text(homepage.read_text(encoding="utf-8").replace("uploads.js?v=local", f"uploads.js?v={version}"), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New directory for the site files")
    arguments = parser.parse_args()
    releases = Releases(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"])
    assemble_site(releases, arguments.output.resolve())


if __name__ == "__main__":
    main()
