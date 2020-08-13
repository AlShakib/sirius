<!-- START doctoc generated TOC please keep comment here to allow auto update -->
# ytdl - A youtube-dl wrapper

`ytdl` is a `youtube-dl` wrapper that downloads videos and audios from the [YouTube](https://youtube.com). All you have to do is `ytdl <youtube_video_url>` or `ytdl <text_file_that_contains_url>` 

## Table of Contents

- [ytdl - A youtube-dl wrapper](#ytdl---a-youtube-dl-wrapper)
  - [Table of Contents](#table-of-contents)
  - [Prerequisite](#prerequisite)
  - [Usages](#usages)

## Prerequisite

- [youtube-dl](https://youtube-dl.org/)

## Usages

```
Usage: ytdl [OPTION] [URL...]

OPTIONS:
    -h          Print this help text and exit
    -v          Print program version and exit
    -2160p      Download 2160p video
    -1440p      Download 1440p video
    -1080p      Download 1080p video
    -720p       Download 720p video
    -480p       Download 480p video
    -360p       Download 360p video
    -240p       Download 240p video
    -mp3        Download mp3 audio
```

`ytdl` downloads all videos in `mp4` format and all audios in `mp3` format.
