#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )";
GSETTINGS="${SRC_DIR}/config/gsettings"

# print <arg>
print() {
  echo -e "${NC}[+] ${1}${NC}"
}

# print_warning <arg>
print_warning() {
  echo -e "${NC}[${YELLOW}!${NC}] ${1}${NC}"
}

# print_failed <arg>
print_failed() {
  echo -e "${NC}[${RED}x${NC}] ${1}${NC}"
}

# print_success <arg>
print_success() {
  echo -e "${NC}[${GREEN}\xE2\x9C\x94${NC}] ${1}${NC}"
}

# print_suggestion <arg>
print_suggestion() {
  echo -e "${NC}[${BLUE}#${NC}] ${1}${NC}"
}

is_administrator_privileges() {
  if [[ "$(id -u)" -eq 0 ]]; then
    print_failed "This program should not run with administrator privileges. Program terminated."
    exit 1
  fi
}

set_gsettings() {
  if [[ -f "${GSETTINGS}" ]]; then
    print "Setting up gsettings values"
    while read line; do
      schema="$(echo "${line}" | cut -d " " -f1)"
      key="$(echo "${line}" | cut -d " " -f2)"
      val="$(echo "${line}" | cut -d " " -f3-)"
      gsettings set "${schema}" "${key}" "${val}"
      if [[ "$?" == 0 ]]; then
        print_success "Set: ${line}"
      else
        print_failed "Failed: ${line}"
      fi
    done <<< "$(sed -r '/(^#|^!|^ *$)/d;' "${GSETTINGS}")"
  else
    print_failed "gsettings file is not found"
    exit 1
  fi
}

start() {
  is_administrator_privileges
  echo "+----------------------------------------------------------------------------+"
  echo "|                                                                            |"
  echo "|                                                                            |"
  echo "|               _____   _____   _____    _____   _    _    _____             |"
  echo "|              / ____| |_   _| |  __ \  |_   _| | |  | |  / ____|            |"
  echo "|             | (___     | |   | |__) |   | |   | |  | | | (___              |"
  echo "|              \___ \    | |   |  _  /    | |   | |  | |  \___ \             |"
  echo "|              ____) |  _| |_  | | \ \   _| |_  | |__| |  ____) |            |"
  echo "|             |_____/  |_____| |_|  \_\ |_____|  \____/  |_____/             |"
  echo "|                                                                            |"
  echo "|                                                                            |"
  echo "+----------------------------------------------------------------------------+"
  echo "|                                                                            |"
  echo "|  1. Set GSettings Values                                                   |"
  echo "|  0. Quit                                                                   |"
  echo "|                                                                            |"
  echo "+----------------------------------------------------------------------------+"
  read -p "$(print 'Enter Selection [0-1]:') "
  if [[ "${REPLY}" == "0" ]]; then
    print_success "Program terminated"
  elif [[ "${REPLY}" == "1" ]]; then
    set_gsettings
  else
    print_failed "Invalid selection"
    exit 1
  fi
  exit
}

# Let's start
start
