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

VERSION=1.0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

print() {
  echo -e "${NC}[+] $1"
}

print_success() {
  echo -e "${NC}[${GREEN}\xE2\x9C\x94${NC}]${NC} $1${NC}"
}

print_warning() {
  echo -e "${NC}[${YELLOW}!${NC}]${NC} $1${NC}" >&2
}

print_failed() {
  echo -e "${NC}[${RED}x${NC}]${NC} $1${NC}${NC}" >&2
}

is_done() {
  if [[ "$?" -ne 0 ]]; then
    print_warning "${2}"
  else
    print_success "${1}"
  fi
}

# pull_from_remote <name> <local> <remote>
function pull_from_remote() {
  print "Syncing ${YELLOW}$1:$3${NC} => ${YELLOW}$2${NC}"
  echo ""
  rclone sync -P --exclude '.*{/**,}' "${1}":"${3}" "${2}"
  echo ""
  is_done "Done" "Failed to sync from ${1}:${3}"
}

# push_to_remote <name> <local> <remote>
function push_to_remote() {
  print "Syncing ${YELLOW}$2${NC} => ${YELLOW}$1:$3${NC}"
  echo ""
  rclone sync -P --exclude '.*{/**,}' "$2" "$1":"$3"
  echo ""
  is_done "Done" "Failed to sync to ${1}:${3}"
}

if [[ "$1" == "" ]]; then
  print_failed "No argument found"
  echo "    Try csync help"
  exit
fi

if ! [ -x "$(command -v rclone)" ]; then
  isWarning "rclone is not found."
  exit 1
fi

if [[ ! -e "$HOME/.config/csync/cloud.conf" ]]; then
  mkdir -p "$HOME/.config/csync"
  touch "$HOME/.config/csync/cloud.conf"
  if [[ "$?" -ne 0 ]]; then
    print_failed "Failed to create config file."
    exit 1
  fi
fi

CONFIG_FILE="$HOME/.config/csync/cloud.conf"

if [[ "$1" == "help" ]]; then
  echo "Usage: csync [OPTION] [ARG...]"
  echo ""
  echo "OPTIONS:"
  echo "    help                                Print this help text and exit"
  echo "    version                             Print program version and exit"
  echo "    push                                Push local dir to remote dir"
  echo "    pull                                Pull remote dir to local dir"
  echo "    show config                         Print config file"
  echo "    remove config <config_number>       Remove a config by config number"
  echo "    add <name>:<local>:<remote>         Add a config"
  exit;
fi

if [[ "$1" == "version" ]]; then
  print "$VERSION"
  exit
fi

if [[ "$1" == "show" ]]; then
  if [[ "$2" == "config" ]]; then
    counter=1
    if [[ -e "$CONFIG_FILE" ]]; then
      sed -r '/(^#|^ *$)/d;/.*:.*:.*/!d' "$CONFIG_FILE" | while read line; do
        echo "[$counter]  $line"
        ((counter++))
      done
    fi
  fi
  exit
fi

if [[ "$1" == "remove" ]]; then
  if [[ "$2" == "config" ]]; then
    line="$(sed -n "$3p" $CONFIG_FILE)"
    sed -i "$3d" "$CONFIG_FILE"
    if [[ "$line" != "" ]]; then
      print_success "$line removed successfully"
    else
      print_failed "Config not found"
    fi
  fi
  exit
fi

if [[ "$1" == "add" ]]; then
  pat="^.+:.+:.+$"
  if [[ "$2" =~ $pat ]]; then
    echo "$2" >> "$CONFIG_FILE"
    if [[ "$?" == 0 ]]; then
      print_success "$2 added to config file."
    else
      print_failed "Failed to add config"
    fi
  else
    print_failed "Invalid format. Try <name>:<local>:<remote>"
  fi
  exit
fi

sed -r '/(^#|^ *$)/d;/.*:.*:.*/!d' "$CONFIG_FILE" | while read line; do
  name=$(echo "$line" | cut -d\: -f1 | xargs)
  local_dir=$(echo "$line" | cut -d\: -f2 | xargs)
  remote_dir=$(echo "$line" | cut -d\: -f3 | xargs)
  if [[ "$1" == "pull" ]]; then
    pull_from_remote "$name" "$local_dir" "$remote_dir"
  elif [[ "$1" == "push" ]]; then
    push_to_remote "$name" "$local_dir" "$remote_dir"
  fi
done
