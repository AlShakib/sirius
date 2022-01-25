#!/usr/bin/env bash

# Copyright 2021 Al Shakib (shakib@alshakib.dev)

# This file is part of Sirius.

# Sirius is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# Sirius is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with Sirius.  If not, see <https://www.gnu.org/licenses/>.

# Name: Sunday Suspense downloader from YouTube.
# Author: Al Shakib

VERSION=1.1
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
TMP=$(dirname $(mktemp -u))
QUALITY=both
VALID_URL_REGEX='(https?|ftp|file)://[-A-Za-z0-9\+&@#/%?=~_|!:,.;]*[-A-Za-z0-9\+&@#/%=~_|]'
RANDOM_DIR=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16 ; echo '')
TEMP_DIR="$TMP/ssdl/$RANDOM_DIR"

DOWNLOAD_DIR="$HOME/Downloads/Sunday Suspense"
LQ_DIR="$DOWNLOAD_DIR/LQ"
HQ_DIR="$DOWNLOAD_DIR/HQ"


isFailed() {
  if [[ "$?" != 0 ]]; then
    if [[ -n "$1" ]]; then
      echo -e "${RED}[x]${NC} $1" >&2
      rm -rf "$TMP/ssdl"
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

convertHighQuality() {
  mkdir -p "$DOWNLOAD_DIR/HQ"
  filename="${1##*/}"
  print "Converting a high quality version..."
  if [[ -e "$HQ_DIR/$filename" ]]; then
    filename="(new)_$filename"
  fi
  ffmpeg -i "$1" -hide_banner -loglevel panic \
         -codec:a libmp3lame -ar 44100 \
         -vsync 2 "$HQ_DIR/$filename" >/dev/null 2>&1
  isFailed "Conversion failed."
  isSuccessful "Done."
}

convertLowQuality() {
  mkdir -p "$DOWNLOAD_DIR/LQ"
  filename="${1##*/}"
  print "Converting a low quality version..."
  if [[ -e "$LQ_DIR/$filename" ]]; then
    filename="(new)_$filename"
  fi
  ffmpeg -i "$1" -hide_banner -loglevel panic \
         -codec:a libmp3lame -qscale:a 7 \
         -ac 1 -ar 44100 -vsync 2 "$LQ_DIR/$filename" >/dev/null 2>&1
  isFailed "Conversion failed."
  isSuccessful "Done."
}

if ! [ -x "$(command -v yt-dlp)" ]; then
  echo -e "${RED}[x]${NC} yt-dlp is not found." >&2
  exit 1
fi

if ! [ -x "$(command -v ffmpeg)" ]; then
  echo -e "${RED}[x]${NC} ffmpeg is not found." >&2
  exit 1
fi

for var in $@
do
  if [[ "${var:0:1}" == "-" ]]; then
    shift
    if [[ "$var" == "-v" ]]; then
      echo "$VERSION"
      exit
    elif [[ "$var" == "-h" ]]; then
      echo "Usage: ssdl [OPTION] [URL...]"
      echo ""
      echo "OPTIONS:"
      echo "    -h          Print this help text and exit"
      echo "    -v          Print program version and exit"
      echo "    -hq         High quality only (>=128kbps)"
      echo "    -lq         Low quality only (<=64kbps)"
      exit;
    elif [[ "$var" == "-hq" ]]; then
      QUALITY=hq
    elif [[ "$var" == "-lq" ]]; then
      QUALITY=lq
    else
      isFailed "Invalid argument: $var"
    fi
  fi
done

extractAudio() {
  print "Getting metadata: $1"
  videoTitle=$(yt-dlp --get-title "$1") >/dev/null 2>&1
  isFailed "Can't get metadata from: $1"
  print "Name: $videoTitle"
  print "Format: mp3"
  print "Extracting audio.."
  yt-dlp --quiet --output "$TEMP_DIR/%(title)s.%(ext)s" \
             --extract-audio --audio-format mp3 "$1" >/dev/null 2>&1
  isFailed "Can't downlaod audio from: $1"
  isSuccessful "Done."
}

if [ $# -eq 0 ]; then
  echo -e "Usage: ssdl [OPTIONS] URL [URL...]" >&2
  echo ""
  echo -e "${RED}Error:${NC} You must provide at least one URL."
  echo -e "Type ssdl -h to see a list of all options."
  exit 1
fi

if [[ -d "$TMP/ssdl" ]]; then
  rm -rf "$TMP/ssdl"
fi

mkdir -p "$TEMP_DIR"

for var in $@
do
  if [[ -f "$var" ]]; then
    while IFS="" read -r p || [ -n "$p" ]; do
      if [[ "$p" =~ $VALID_URL_REGEX ]]; then
        extractAudio "$p"
      else
        isWarning "$p is not a valid URL."
      fi
    done < "$var"
  else
    if [[ "$var" =~ $VALID_URL_REGEX ]]; then
      extractAudio "$var"
    else
      isFailed "$var is not a valid URL."
    fi
  fi
done

for file in $TEMP_DIR/*; 
do
  if [[ "$QUALITY" == "both" ]]; then
    convertHighQuality "$file"
    convertLowQuality "$file"
  elif [[ "$QUALITY" == "hq" ]]; then
    convertHighQuality "$file"
  elif [[ "$QUALITY" == "lq" ]]; then
    convertLowQuality "$file"
  fi
done

print "Cleaning up..."
if [[ -d "$TMP/ssdl" ]]; then
  rm -rf "$TMP/ssdl"
fi
isFailed "Can't delete $TEMP_DIR. You can do it manually."
isSuccessful "Done."
