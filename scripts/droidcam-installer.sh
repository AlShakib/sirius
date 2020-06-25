#!/usr/bin/env bash

# Name: DroidCam driver installer
# Author: Al Shakib

VERSION=1.0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
TMP_DIR=$(dirname $(mktemp -u))
RANDOM_DIR=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16 ; echo '')
TMP_DIR="${TMP_DIR}/${RANDOM_DIR}"
DL_URL="https://files.dev47apps.net/linux/droidcam_latest.zip"

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

# is_failed <success_message> <failed_message>
is_failed() {
  if [[ "$?" -eq 0 ]]; then
    print_success "${1}"
  else
    print_failed "${2}"
  fi
}

# is_warning <success_message> <warning_message>
is_warning() {
  if [[ "$?" -eq 0 ]]; then
    print_success "${1}"
  else
    print_warning "${2}"
  fi
}

install_droidcam() {
  mkdir -p "${TMP_DIR}/droidcam"
  print "Downloading DroidCam pre compiled binary"
  wget "${DL_URL}" -O "${TMP_DIR}/droidcam/droidcam.zip" &>> /dev/null
  if [[ "$?" -ne 0 ]]; then
    print_failed "Skipping: DroidCam downloading did not complete successfully."
  else
    print_success "Done"
    cd "${TMP_DIR}/droidcam"
    print "Extracting DroidCam bundle"
    unzip "droidcam.zip" &>> /dev/null
    is_failed "Done" "Skipping. Extracting DroidCam bundle is failed."
    print "Installing DroidCam binary"
    chmod +x ./install
    rmmod v4l2loopback_dc &>> /dev/null
    ./install 1920 1080
    is_failed "Installed successfully." "Skipping: DroidCam installation did not complete successfully."
    cd "${OLDPWD}"
    mkdir -p /opt/DroidCam &>> /dev/null
    mv ls /opt/droidcam-uninstall /opt/DroidCam/ &>> /dev/null
    rm -rf "${TMP_DIR}"
  fi
}

if [[ "$(id -u)" -ne 0 ]]; then
  print_failed "This program must be run with administrator privileges. Try with sudo"
  exit 1
fi

if [ $# -eq 0 ]; then
  echo -e "Usage: droidcam-installer [OPTIONS]" >&2
  echo ""
  echo -e "${RED}Error:${NC} You must provide at least one option."
  echo -e "Type droidcam-installer -h to see a list of all options."
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
      echo "Usage: droidcam-installer [OPTION]"
      echo ""
      echo "OPTIONS:"
      echo "    -h          Print this help text and exit"
      echo "    -v          Print program version and exit"
      echo "    -i          Install DroidCam driver"
      echo "    -r          Reinstall DroidCam driver"
      exit;
    elif [[ "$var" == "-i" ]]; then
      print "Installing DroidCam driver"
      if [[ -x "$(command -v droidcam)" ]]; then
        print_success "Skipping: DroidCam driver is already installed"
      else
        install_droidcam
      fi
    elif [[ "$var" == "-r" ]]; then
      print "Reinstalling DroidCam driver"
      install_droidcam
    else
      print_failed "Invalid argument: $var"
    fi
  fi
done
