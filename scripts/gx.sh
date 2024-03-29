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

VERSION=1.0.0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

CONFIG_DIR="${HOME}/.config/gx"
CONFIG_FILE="${CONFIG_DIR}/gx.conf"

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

if [[ ! -e "${CONFIG_FILE}" ]]; then
  mkdir -p "${CONFIG_DIR}"
  touch "${CONFIG_FILE}"
  if [[ "$?" -ne 0 ]]; then
    print_failed "Failed to create config file."
    exit 1
  else
    echo "GITHUB_USERNAME=" >> "${CONFIG_FILE}"
    echo "GITHUB_TOKEN=" >> "${CONFIG_FILE}"
    chmod 600 "${CONFIG_FILE}"
  fi
fi

if ! [ -x "$(command -v git)" ]; then
  print_warning "git is not found."
  exit 1
fi

if ! [ -x "$(command -v jq)" ]; then
  print_warning "jq is not found."
  exit 1
fi

if ! [ -x "$(command -v curl)" ]; then
  print_warning "curl is not found."
  exit 1
fi

if [[ "${1}" == "" ]]; then
  print_failed "No argument found"
  echo "    Try gx help"
  exit
fi

clone_from_organization() {
  per_page=50

  org_info=$(curl --silent https://api.github.com/orgs/${3} -u ${1}:${2})
  total_private_repos=`echo "${org_info}" | jq .total_private_repos | sed -e 's/^"//'  -e 's/"$//'`
  public_repos=`echo "${org_info}" | jq .public_repos | sed -e 's/^"//'  -e 's/"$//'`
  total_repo=$((total_private_repos+public_repos))
  page=$(((total_repo+per_page-1)/per_page))

  mkdir -p "${3}"
  counter=0
  for (( i = 1; i <= $page; ++i )); do
    repo_list=$(curl --silent https://api.github.com/orgs/${3}/repos?type=all\&sort=updated\&direction=desc\&per_page=${per_page}\&page=${i} -u ${1}:${2} | \
                jq .[].ssh_url | sed -e 's/^"//'  -e 's/"$//')
    for repo in $repo_list; do
      ((++counter))
      echo -e "[${counter}/${total_repo}] Cloning now => ${YELLOW}${repo}${NC}"
      echo ""
      git -C "${3}" clone "${repo}"
      echo ""
    done
  done
}

if [[ "${1}" == "help" ]]; then
  echo "Usage: gx [OPTION] [ARG...]"
  echo ""
  echo "OPTIONS:"
  echo "    help                  Print this help text and exit"
  echo "    version               Print program version and exit"
  echo "    push                  Push git repository to remote"
  echo "    push all              Push all git repositories in sub directories to remote"
  echo "    clone [ORG]           Clone GitHub organizations"
  echo "    clone clean [ORG]     Clone GitHub organizations and remove git related files"
  exit 0;
fi

if [[ "${1}" == "version" ]]; then
  echo "Version: ${VERSION}"
  exit 0
fi

if [[ "${1}" == "push" ]]; then
  if [[ "${2}" == "all" ]]; then
    for d in `find "${PWD}" -type d -exec test -d {}/.git \; -prune -print`; do
      print "git push origin HEAD => ${YELLOW}${d}${NC}"
      echo ""
      cd "${d}"
      git push origin HEAD
      cd "${OLD_PWD}"
      echo ""
    done
  else
    git push origin HEAD
  fi
  exit 0
fi

if [[ "${1}" == "clone" ]]; then
  source "${CONFIG_FILE}"
  if [[ "${GITHUB_USERNAME}" == "" || "${GITHUB_TOKEN}" == "" ]]; then
    print_failed "GitHub username and token is required. Save them here, ${CONFIG_FILE}"
    exit 1
  fi
  if [[ "${2}" == "clean" ]]; then
    if [[ "${3}" == "" ]]; then
      print_failed "No organization found."
      exit 1
    fi
    clone_from_organization "${GITHUB_USERNAME}" "${GITHUB_TOKEN}" "${3}"
    find "${3}" \( -name ".git" -o -name "vcs.xml" -o -name ".gitmodules" \) -exec rm -rf -- {} +
  else
    if [[ "${2}" == "" ]]; then
      print_failed "No organization found."
      exit 1
    fi
    clone_from_organization "${GITHUB_USERNAME}" "${GITHUB_TOKEN}" "${2}"
  fi
  exit 0
fi
