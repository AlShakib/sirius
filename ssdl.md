# ssdl - Sunday Suspense downloader

`ssdl` is a `youtube-dl` wrapper that downloads [Sunday Suspense](https://www.radiomirchi.com/kolkata/program-guide/show/sunday-suspense/416) from the [YouTube](https://youtube.com). All you have to do is `ssdl <youtube_link_of_sunday_suspense>` or `ssdl <text_file_that_contains_url>` 

## Table of Contents

- [ssdl - Sunday Suspense downloader](#ssdl---sunday-suspense-downloader)
  - [Table of Contents](#table-of-contents)
  - [Prerequisite](#prerequisite)
  - [Usages](#usages)

## Prerequisite

- [youtube-dl](https://youtube-dl.org/)

## Usages

```
Usage: ssdl [OPTION] [URL...]

OPTIONS:
    -h          Print this help text and exit
    -v          Print program version and exit
    -hq         High quality only (>=128kbps)
    -lq         Low quality only (<=64kbps)
```

`ytdl` downloads all audios in `mp3` format.
