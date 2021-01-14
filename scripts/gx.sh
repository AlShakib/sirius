#!/usr/bin/env bash

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
  mkdir -p "${3}"
  repo_list=$(curl --silent https://api.github.com/orgs/${3}/repos?type=private -u ${1}:${2}  | \
            jq .[].ssh_url | sed -e 's/^"//'  -e 's/"$//')
  for repo in $repo_list; do
    print "Repo found => ${YELLOW}${repo}${NC}"
    echo ""
    git  -C "${3}" clone "${repo}"
    echo ""
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
