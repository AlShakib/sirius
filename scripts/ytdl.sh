#!/usr/bin/env bash

# Name: Minimal YouTube video downloader.
# Author: Al Shakib

VERSION=1.2
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
QUALITY=720
isAudio=0
VALID_URL_REGEX='(https?|ftp|file)://[-A-Za-z0-9\+&@#/%?=~_|!:,.;]*[-A-Za-z0-9\+&@#/%=~_|]'
TMP=$(dirname $(mktemp -u))
RANDOM_DIR=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16 ; echo '')
TEMP_DIR="$TMP/ytdl/$RANDOM_DIR"
DOWNLOAD_DIR="$HOME/Downloads/YouTube"

isFailed() {
  if [[ "$?" != 0 ]]; then
    if [[ -n "$1" ]]; then
      echo -e "${RED}[x]${NC} $1" >&2
      rm -rf "$TMP/ytdl"
      exit 1
    fi
  fi
}

isWarning() {
  if [[ "$?" != 0 ]]; then
    if [[ -n "$1" ]]; then
      echo -e "${RED}[x]${NC} $1" >&2
    fi
  fi
}

print() {
  echo -e "${NC}[-] $1"
}

isSuccessful() {
  echo -e "${GREEN}[\xE2\x9C\x94]${NC} $1"
}

if ! [ -x "$(command -v youtube-dl)" ]; then
  echo -e "${RED}[x]${NC} youtube-dl is not found." >&2
  exit 1
fi

downloadVideo() {
  print "Getting metadata: $1"
  videoTitle=$(youtube-dl --get-title "$1") >/dev/null 2>&1
  isFailed "Can't get metadata from: $1"
  print "Name: $videoTitle"
  print "Quality: <=${QUALITY}p"
  print "Downloading..."
  mkdir -p "$TEMP_DIR"
  youtube-dl --quiet --output "$TEMP_DIR/%(title)s.%(ext)s" \
             -f "best[height=${QUALITY}][ext=mp4]/bestvideo[height<=${QUALITY}][ext=mp4]+bestaudio[ext=m4a]" \
             --merge-output-format mp4 "$1" >/dev/null 2>&1
  isFailed "Can't downlaod video from: $1"
  mkdir -p "$DOWNLOAD_DIR"
  mv -f "${TEMP_DIR}/"* "${DOWNLOAD_DIR}/"
  isSuccessful "Done."
}

extractAudio() {
  print "Getting metadata: $1"
  videoTitle=$(youtube-dl --get-title "$1") >/dev/null 2>&1
  isFailed "Can't get metadata from: $1"
  print "Name: $videoTitle"
  print "Format: mp3"
  print "Downloading..."
  mkdir -p "$TEMP_DIR"
  youtube-dl --quiet --output "$TEMP_DIR/%(title)s.%(ext)s" \
             --extract-audio --audio-format mp3 "$1" >/dev/null 2>&1
  isFailed "Can't downlaod audio from: $1"
  mkdir -p "$DOWNLOAD_DIR"
  mv -f "${TEMP_DIR}/"* "${DOWNLOAD_DIR}/"
  isSuccessful "Done."
}

for var in $@
do
  if [[ "${var:0:1}" == "-" ]]; then
    shift
    if [[ "$var" == "-v" ]]; then
      echo "$VERSION"
      exit
    elif [[ "$var" == "-h" ]]; then
      echo "Usage: ytdl [OPTION] [URL...]"
      echo ""
      echo "OPTIONS:"
      echo "    -h          Print this help text and exit"
      echo "    -v          Print program version and exit"
      echo "    -2160p      Download 2160p video"
      echo "    -1440p      Download 1440p video"
      echo "    -1080p      Download 1080p video"
      echo "    -720p       Download 720p video"
      echo "    -480p       Download 480p video"
      echo "    -360p       Download 360p video"
      echo "    -240p       Download 240p video"
      echo "    -mp3        Download mp3 audio"
      exit;
    elif [[ "$var" == "-2160p" ]]; then
      QUALITY=2160
    elif [[ "$var" == "-1440p" ]]; then
      QUALITY=1440
    elif [[ "$var" == "-1080p" ]]; then
      QUALITY=1080
    elif [[ "$var" == "-720p" ]]; then
      QUALITY=720
    elif [[ "$var" == "-480p" ]]; then
      QUALITY=480
    elif [[ "$var" == "-360p" ]]; then
      QUALITY=360
    elif [[ "$var" == "-240p" ]]; then
      QUALITY=240
    elif [[ "$var" == "-mp3" ]]; then
      isAudio=1
    else
      isFailed "Invalid argument: $var"
    fi
  fi
done

if [ $# -eq 0 ]; then
  echo -e "Usage: ytdl [OPTIONS] URL [URL...]" >&2
  echo ""
  echo -e "${RED}Error:${NC} You must provide at least one URL."
  echo -e "Type ytdl -h to see a list of all options."
  exit 1
fi

if [[ -d "$TMP/ytdl" ]]; then
  rm -rf "$TMP/ytdl"
fi

for var in $@
do
  if [[ -f "$var" ]]; then
    while IFS="" read -r p || [ -n "$p" ]; do
      if [[ "$p" =~ $VALID_URL_REGEX ]]; then
        if [[ "$isAudio" == 1 ]]; then
          extractAudio "$p"
        else
          downloadVideo "$p"
        fi
      else
        isWarning "$p is not a valid URL."
      fi
    done < "$var"
  else
    if [[ "$var" =~ $VALID_URL_REGEX ]]; then 
      if [[ "$isAudio" == 1 ]]; then
        extractAudio "$var"
      else
        downloadVideo "$var"
      fi
    else
      isFailed "$var is not a valid URL."
    fi
  fi
done

print "Cleaning up..."
if [[ -d "$TMP/ytdl" ]]; then
  rm -rf "$TMP/ytdl"
fi
isFailed "Can't delete $TEMP_DIR. You can do it manually."
isSuccessful "Done."
