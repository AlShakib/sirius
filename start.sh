#!/usr/bin/env bash

HOSTNAME="sirius"
OS_ID="fedora"
RELEASE_VER="31"
CPU_ARCH="x86_64"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )";
TMP_DIR=$(dirname $(mktemp -u))
RANDOM_DIR=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16 ; echo '')
TMP_DIR="${TMP_DIR}/${RANDOM_DIR}"
LOG_DIR="${SRC_DIR}/log"
LOG_FILE="${LOG_DIR}/sirius-$(date +%d%m%y-%H%M).log";
mkdir -p "${LOG_DIR}"
touch "${LOG_FILE}"
chown "${SUDO_USER}":"${SUDO_USER}" -R "${LOG_DIR}"

# print <arg>
print() {
  echo -e "${NC}[+] ${1}${NC}"
  echo -e "[+] ${1}" &>> "$LOG_FILE"
}

# print_warning <arg>
print_warning() {
  echo -e "${NC}[${YELLOW}!${NC}] ${1}${NC}"
  echo -e "[!] ${1}" &>> "$LOG_FILE"
}

# print_failed <arg>
print_failed() {
  echo -e "${NC}[${RED}x${NC}] ${1}${NC}"
  echo -e "[x] ${1}" &>> "$LOG_FILE"
}

# print_success <arg>
print_success() {
  echo -e "${NC}[${GREEN}\xE2\x9C\x94${NC}] ${1}${NC}"
  echo -e "[✔] ${1}" &>> "$LOG_FILE"
}

# print_suggestion <arg>
print_suggestion() {
  echo -e "${NC}[${BLUE}#${NC}] ${1}${NC}"
  echo -e "[#] ${1}" &>> "$LOG_FILE"
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

check_root_access() {
  local HAS_ACCESS=1
  if [[ "$(id -u)" -ne 0 ]]; then
    print_failed "This program must be run with administrator privileges. Try with sudo"
    HAS_ACCESS=0
  fi
  if [[ "$(grep "^ID=" /etc/os-release | cut -d '=' -f2)" != "${OS_ID}" ||\
         "$(grep "^VERSION_ID=" /etc/os-release | cut -d '=' -f2)" != "${RELEASE_VER}" ]]; then
    print_failed "This script is for Fedora ${RELEASE_VER} ${CPU_ARCH}"
    HAS_ACCESS=0
  fi
  if [[ "$HAS_ACCESS" -eq 1 ]]; then
    SUDO_HOME=$(grep ${SUDO_USER} "/etc/passwd" | cut -d: -f6)
  else
    exit 1
  fi
}

backup_vnstat_database() {
  if [[ -d "/var/lib/vnstat" ]]; then
    mkdir -p "${SRC_DIR}/backup/vnstat"
    rsync -av --delete --chown="${SUDO_USER}":"${SUDO_USER}" "/var/lib/vnstat/" "${SRC_DIR}/backup/vnstat" &>> "${LOG_FILE}"
    is_failed "Vnstat Database backup completed successfully" "Skipping: Vnstat Database backup did not complete successfully. See log for more info."
  else
    print_warning "Skipping: Vnstat Database is not found"
  fi
}

backup_rclone_config() {
  if [[ -d "${SUDO_HOME}/.config/rclone" ]]; then
    mkdir -p "${SRC_DIR}/backup/rclone"
    rsync -av --delete --chown="${SUDO_USER}":"${SUDO_USER}" "${SUDO_HOME}/.config/rclone/" "${SRC_DIR}/backup/rclone" &>> "${LOG_FILE}"
    is_failed "Rclone backup completed successfully" "Skipping: Rclone backup did not complete successfully. See log for more info."
  else
    print_warning "Skipping: Rclone is not found"
  fi
}

backup_csync_config() {
  if [[ -d "${SUDO_HOME}/.config/csync" ]]; then
    mkdir -p "${SRC_DIR}/backup/csync"
    rsync -av --delete --chown="${SUDO_USER}":"${SUDO_USER}" "${SUDO_HOME}/.config/csync/" "${SRC_DIR}/backup/csync" &>> "${LOG_FILE}"
    is_failed "Csync configuration backup completed successfully" "Skipping: Csync configuration backup did not complete successfully. See log for more info."
  else
    print_warning "Skipping: Csync configuration is not found"
  fi
}

create_backup() {
  backup_vnstat_database
  backup_rclone_config
  backup_csync_config
  # make available for non root user
  if [[ -d "${SRC_DIR}/backup" ]]; then
    chown "${SUDO_USER}":"${SUDO_USER}" -R "${SRC_DIR}/backup"
  fi
}

# uncomment <file> <line>
uncomment() {
  sed -i "/^#\s*${2}/ c${2}" "${1}"
}

# edit <src> <dest>
#
# entry=value  : if entry already present in conf, override value in conf if different otherwise append entry to conf.
# @entry|value : append value to entry's value if present in conf.
# $entry=value : change value if and only if entry exists.
# !entry       : remove entry from conf if present.
# >entry       : forcefully append to conf.
# ~entry       : uncomment an entry from conf. (Only # is supported)
#
edit() {
  test -s "${1}"
  # read only lines matching valid entry pattern
  sed -r '/(^#|^ *$)/d;' "${1}" | while read line; do
    # remove entry
    if [[ "$line" =~ ^\! ]]; then
      entry=$(echo "${line#?}" | sed -e 's%[\%&]%\\&%g')
      # remove from $build if present
      grep -q "$entry" "$2" && sed "/$entry/d" -i "$2"
    # append string
    elif [[ "$line" =~ ^\@ ]]; then
      entry=$(echo "${line#?}" | sed -e 's%[\%&]%\\&%g')
      var=$(echo "$entry" | cut -d\| -f1)
      app=$(echo "$entry" | cut -d\| -f2)
      # append string to $var's value if present in $build
      grep -q "$var" "$2" && sed "s%^$var=.*$%&$app%" -i "$2"
    # change value if and only if entry exists
    elif [[ "$line" =~ ^\$ ]]; then
      entry=$(echo "${line#?}" | sed -e 's%[\%&]%\\&%g')
      var=$(echo "$entry" | cut -d\= -f1)
      new=$(echo "$entry" | cut -d\= -f2)
      # change $var's value iif $var present in $build
      echo "$var:$new"
      grep -q "$var=" "$2" && sed "s%^$var=.*$%$var=$new%" -i "$2"
    # comment out a entry
    elif [[ "$line" =~ ^\~ ]]; then
      entry=$(echo "${line#?}" | sed -e 's%[\%&]%\\&%g')
      sed -i "/^#\s*${entry}/ c${entry}" "${2}"
    elif [[ "$line" =~ ^\> ]]; then
      entry=$(echo "${line#?}" | sed -e 's%[\%&]%\\&%g')
      echo "$entry" | tee -a "$2" 1>/dev/null
    # add or override entry
    else
      var=$(echo "$line" | cut -d= -f1)
      # if variable already present in $build
      if grep -q "$var" "$2"; then
        # override value in $build if different
        grep -q "$(grep "$var" "$1")" "$2" || sed "s%^$var=.*$%$line%" -i "$2"
      # else append entry to $build
      else
        echo "$line" | tee -a "$2" 1>/dev/null
      fi
    fi
  done
}

add_repos() {
  # add flathub repo
  print "Installing FlatHub repo"
  yes | flatpak remote-add --if-not-exists flathub "https://flathub.org/repo/flathub.flatpakrepo" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: FlatHub repo did not install successfully. See log for more info."

  # add sublime text repo
  print "Importing Sublime HQ gpg key"
  rpm --import "https://download.sublimetext.com/sublimehq-rpm-pub.gpg" &>> "${LOG_FILE}"
  is_failed "Done." "Sublime HQ gpg key did not import successfully. See log for more info."
  print "Installing Sublime HQ repo"
  dnf config-manager -y --add-repo "https://download.sublimetext.com/rpm/stable/${CPU_ARCH}/sublime-text.repo" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Sublime HQ repo did not install successfully. See log for more info."

  # import google chrome key
  print "Importing Google Chrome pub key"
  rpm --import "https://dl.google.com/linux/linux_signing_key.pub" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Google Chrome pub key did not import successfully. See log for more info."

  # import teamviewer asc key
  print "Importing TeamViewer asc key"
  rpm --import "http://linux.teamviewer.com/pubkey/currentkey.asc" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: TeamViewer asc key did not import successfully. See log for more info."

  # add microsoft dot net repo
  print "Importing Microsoft asc key"
  rpm --import "https://packages.microsoft.com/keys/microsoft.asc" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Microsoft asc key did not import successfully. See log for more info."
  print "Installing Microsoft repo"
  wget "https://packages.microsoft.com/config/fedora/${RELEASE_VER}/prod.repo" -O "/etc/yum.repos.d/microsoft-prod.repo" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Microsoft repo did not install successfully. See log for more info."

  # enable papirus icon repo
  print "Enabling dirkdavidis/papirus-icon-theme copr repo"
  dnf copr -y enable "dirkdavidis/papirus-icon-theme" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: dirkdavidis/papirus-icon-theme repo did not enable successfully. See log for more info."

  # enable materia theme repo
  print "Enabling tcg/themes copr repo"
  dnf copr -y enable "tcg/themes" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: tcg/themes repo did not enable successfully. See log for more info."

  # add rpmfusion repo
  print "Installing RPM Fusion repo"
  dnf install -y "https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-${RELEASE_VER}.noarch.rpm" \
              "https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-${RELEASE_VER}.noarch.rpm" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: RPM Fusion repo did not install successfully. See log for more info."

  # clean dnf cache
  print "Cleaning up DNF cache"
  dnf clean all &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: DNF cache cleanup failed. See log for more info."
}

# install bash scripts
install_bash_scripts() {
  for script in $(find "${SRC_DIR}/scripts/" -name "*.sh"); do
    filename="${script##*/}"
    name="${filename%.*}"
    print "Installing ${name}"
    cp "${script}" "/usr/local/bin/${name}" &>> "${LOG_FILE}"
    chmod +x "/usr/local/bin/${name}"
    is_failed "Done" "Skipping: ${name} did not install successfully. See log for more info."
  done
}

copy_to_system() {
  print "Copying file to root directory"
  rsync -av --chown=root:root --exclude-from="${SRC_DIR}/config/root.edit" "${SRC_DIR}/root/" "/" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Copying to root directory did not complete successfully. See log for more info."
  print "Copying file to home directory"
  rsync -av --chown="${SUDO_USER}":"${SUDO_USER}" --exclude-from="${SRC_DIR}/config/home.edit" "${SRC_DIR}/home/" "${SUDO_HOME}/" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Copying to home directory did not complete successfully. See log for more info."
}

install_flathub_packages() {
  local FLATHUB_PKG="${SRC_DIR}/packages/flathub"
  if [[ -f "${FLATHUB_PKG}" ]]; then
    FLATHUB_LIST=""
    while read line; do
      FLATHUB_LIST="${FLATHUB_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^!|^ *$)/d;' "${FLATHUB_PKG}")"
    FLATHUB_LIST=$(echo "${FLATHUB_LIST}" | awk '{$1=$1;print}')
    print "Installing packages from FlatHub"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${FLATHUB_LIST}" != "" ]]; then
      flatpak install -y --noninteractive flathub ${FLATHUB_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Packages installation from FlatHub did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be installed"
    fi
  else
    print_warning "Skipping: FlatHub package list is not found"
  fi
}

remove_flathub_packages() {
  local FLATHUB_PKG="${SRC_DIR}/packages/flathub"
  if [[ -f "${FLATHUB_PKG}" ]]; then
    FLATHUB_LIST=""
    while read line; do
      FLATHUB_LIST="${FLATHUB_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^ *$)/d;/(^\!)/!d' "${FLATHUB_PKG}")"
    FLATHUB_LIST=$(echo "${FLATHUB_LIST}" | awk '{$1=$1;print}')
    print "Removing packages using Flatpak"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${FLATHUB_LIST}" != "" ]]; then
      flatpak uninstall -y --noninteractive ${FLATHUB_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Packages un-installation  using Flatpak did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be uninstalled"
    fi
  else
    print_warning "Skipping: Flatpak package list is not found"
  fi
}

install_dnf_packages() {
  local DNF_PKG="${SRC_DIR}/packages/dnf"
  if [[ -f "${DNF_PKG}" ]]; then
    DNF_LIST=""
    while read line; do
      DNF_LIST="${DNF_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^!|^ *$)/d;' "${DNF_PKG}")"
    DNF_LIST=$(echo "${DNF_LIST}" | awk '{$1=$1;print}')
    print "Installing packages using DNF"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${DNF_LIST}" != "" ]]; then
      dnf install -y ${DNF_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Package installation from DNF did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be installed"
    fi
  else
    print_warning "Skipping: DNF package list is not found"
  fi
}

remove_dnf_packages() {
  local DNF_PKG="${SRC_DIR}/packages/dnf"
  if [[ -f "${DNF_PKG}" ]]; then
    DNF_LIST=""
    while read line; do
      line=$(echo "${line#?}" | sed -e 's%[\%&]%\\&%g');
      DNF_LIST="${DNF_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^ *$)/d;/(^\!)/!d' "${DNF_PKG}")"
    DNF_LIST=$(echo "${DNF_LIST}" | awk '{$1=$1;print}')
    print "Removing packages using DNF"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${DNF_LIST}" != "" ]]; then
      dnf remove -y ${DNF_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Package un-installation using DNF did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be uninstalled"
    fi
  else
    print_warning "Skipping: DNF package list is not found"
  fi
}

install_npm_packages() {
  local NPM_PKG="${SRC_DIR}/packages/npm"
  if [[ -f "${NPM_PKG}" ]]; then
    NPM_LIST=""
    while read line; do
      NPM_LIST="${NPM_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^!|^ *$)/d;' "${NPM_PKG}")"
    NPM_LIST=$(echo "${NPM_LIST}" | awk '{$1=$1;print}')
    print "Installing packages using npm"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${NPM_LIST}" != "" ]]; then
      npm install -g ${NPM_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Package installation using npm did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be installed"
    fi
  else
    print_warning "Skipping: npm package list is not found"
  fi
}

remove_npm_packages() {
  local NPM_PKG="${SRC_DIR}/packages/npm"
  if [[ -f "${NPM_PKG}" ]]; then
    NPM_LIST=""
    while read line; do
      NPM_LIST="${NPM_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^ *$)/d;/(^\!)/!d' "${NPM_PKG}")"
    NPM_LIST=$(echo "${NPM_LIST}" | awk '{$1=$1;print}')
    print "Removing packages using npm"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${NPM_LIST}" != "" ]]; then
      npm uninstall -g --save ${NPM_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Package un-installation using npm did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be uninstalled"
    fi
  else
    print_warning "Skipping: npm package list is not found"
  fi
}

install_pip_packages() {
  local PIP_PKG="${SRC_DIR}/packages/pip"
  if [[ -f "${PIP_PKG}" ]]; then
    PIP_LIST=""
    while read line; do
      PIP_LIST="${PIP_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^!|^ *$)/d;' "${PIP_PKG}")"
    PIP_LIST=$(echo "${PIP_LIST}" | awk '{$1=$1;print}')
    print "Installing packages using pip"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${PIP_LIST}" != "" ]]; then
      sudo -u "${SUDO_USER}" pip install --no-cache-dir --user ${PIP_LIST} &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Package installation using pip did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be installed"
    fi
  else
    print_warning "Skipping: pip package list is not found"
  fi
}

remove_pip_packages() {
  local PIP_PKG="${SRC_DIR}/packages/pip"
  if [[ -f "${PIP_PKG}" ]]; then
    PIP_LIST=""
    while read line; do
      PIP_LIST="${PIP_LIST} ${line}"
    done <<< "$(sed -r '/(^#|^ *$)/d;/(^\!)/!d' "${PIP_PKG}")"
    PIP_LIST=$(echo "${PIP_LIST}" | awk '{$1=$1;print}')
    print "Removing packages using pip"
    print_suggestion "It might take a while... DO NOT PANIC!"
    if [[ "${PIP_LIST}" != "" ]]; then
      pip uninstall $PIP_LIST &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Package un-installation using pip did not complete successfully. See log for more info."
    else
      print_warning "Skipping: No package to be uninstalled"
    fi
  else
    print_warning "Skipping: pip package list is not found"
  fi
}

install_youtube_dl() {
  print "Installing youtube-dl"
  if [[ -x "$(command -v youtube-dl)" ]]; then
    print_success "Skipping: youtube-dl is already installed"
  else
    print "Downloading youtube-dl"
    wget "https://yt-dl.org/downloads/latest/youtube-dl" -O "/usr/local/bin/youtube-dl" &>> "${LOG_FILE}"
    if [[ "$?" -eq 0 ]]; then
      print_success "Done"
      print "Installing binary"
      chmod a+rx "/usr/local/bin/youtube-dl"
      is_failed "Done" "Skipping: youtube-dl installation did not complete successfully. See log for more info."
    else
      print_failed "Skipping: Downloading youtube-dl binary is failed. See log for more info."
    fi
  fi
}

install_rclone() {
  print "Installing rclone"
  if [[ -x "$(command -v rclone)" ]]; then
    print_success "Skipping: rclone is already installed"
  else
    mkdir -p "${TMP_DIR}/rclone"
    print "Downloading rclone pre compiled binary"
    wget "https://downloads.rclone.org/rclone-current-linux-amd64.zip" -O "${TMP_DIR}/rclone/rclone-current-linux-amd64.zip" &>> "${LOG_FILE}"
    if [[ "$?" -ne 0 ]]; then
      print_failed "Skipping: rclone downloading did not complete successfully. See log for more info."
    else
      print_success "Done"
      cd "${TMP_DIR}/rclone"
      print "Unzipping rclone zip bundle"
      unzip -j "rclone-current-linux-amd64.zip" &>> "${LOG_FILE}"
      is_failed "Done" "Skipping. Unzipping rclone zip bundle is failed. See log for more info."
      print "Installing rclone man file"
      mkdir -p "/usr/local/share/man/man1" &>> "${LOG_FILE}"
      rsync -av --chown=root:root "${TMP_DIR}/rclone/rclone.1" "/usr/local/share/man/man1" &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Rclone man file installation is failed. See log for more info."
      print "Updating mandb"
      mandb &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: Updating mandb is failed"
      print "Installing rclone binary"
      rsync -av --chown=root:root "${TMP_DIR}/rclone/rclone" "/usr/local/bin" &>> "${LOG_FILE}"
      chmod +x "/usr/local/bin/rclone" &>> "${LOG_FILE}"
      is_failed "Done" "Skipping: rclone installation did not complete successfully. See log for more info."
      cd "${OLDPWD}"
    fi
  fi
}

install_ibus_avro() {
  print "Installing ibus-avro"
  if [[ -d "${SRC_DIR}/apps/ibus-avro" ]]; then
    print "Copying source file to temporary directory"
    rsync -av "${SRC_DIR}/apps/ibus-avro" "${TMP_DIR}/" &>> "${LOG_FILE}"
    is_failed "Done" "Skipping: Copying source file is failed"
    local AVRO_SRC_DIR="${TMP_DIR}/ibus-avro"
    cd "${AVRO_SRC_DIR}"
    print "Installing"
    aclocal && autoconf && automake --add-missing &>> "${LOG_FILE}"
    ./configure --prefix=/usr &>> "${LOG_FILE}"
    make install &>> "${LOG_FILE}"
    is_failed "Done" "Skipping: ibus-avro installation did not complete successfully. See log for more info."
    cd "${OLDPWD}"
  else
    print_warning "Skipping: ibus-avro source code did not found"
  fi
}

install_oh_my_zsh() {
  print "Installing oh-my-zsh for user ${SUDO_USER}"
  usermod --shell "$(which zsh)" "${SUDO_USER}" &>> "${LOG_FILE}"
  sudo -u "${SUDO_USER}" sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)" "" --unattended &>> "${LOG_FILE}"
  sudo -u "${SUDO_USER}" git clone "https://github.com/zsh-users/zsh-autosuggestions" "${SUDO_HOME}/.oh-my-zsh/custom/plugins/zsh-autosuggestions" &>> "${LOG_FILE}"
  chown "${SUDO_USER}":"${SUDO_USER}" "${SUDO_HOME}/.zshrc.pre-oh-my-zsh" &>> "${LOG_FILE}"
  edit "${SRC_DIR}/home/.zshrc" "${SUDO_HOME}/.zshrc" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: oh-my-zsh installation did not complete successfully for user ${SUDO_USER}. See log for more info."
  print "Installing oh-my-zsh for user root"
  usermod --shell "$(which zsh)" root &>> "${LOG_FILE}"
  sudo -u root sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)" "" --unattended &>> "${LOG_FILE}"
  git clone "https://github.com/zsh-users/zsh-autosuggestions" "/root/.oh-my-zsh/custom/plugins/zsh-autosuggestions" &>> "${LOG_FILE}"
  edit "${SRC_DIR}/root/root/.zshrc" "/root/.zshrc" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: oh-my-zsh installation did not complete successfully for user root. See log for more info."
}

edit_root_configurations() {
  while read line; do
    print "Editing ${line}"
    if [[ "${line}" == "/etc/default/grub" ]]; then
      edit "${SRC_DIR}/root/etc/default/grub" "${line}" &>> "${LOG_FILE}"
      is_failed "${line} modified successfully" "Skipping: ${line} modification is failed. See log for more info."
      print "Updating grub"
      if [[ -e "/sys/firmware/efi" ]]; then
        grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg &>> "${LOG_FILE}"
      else
        grub2-mkconfig -o /boot/grub2/grub.cfg &>> "${LOG_FILE}"
      fi
      is_failed "Done" "Skipping: Updating grub is failed"
    else
      edit "${SRC_DIR}/root${line}" "${line}" &>> "${LOG_FILE}"
      is_failed "${line} modified successfully" "Skipping: ${line} modification is failed. See log for more info."
    fi
  done <<< "$(sed -r '/(^#|^ *$)/d;' "${SRC_DIR}/config/root.edit")"
}

edit_home_configurations() {
  while read line; do
    print "Editing ${line}"
    edit "${SRC_DIR}/home${line}" "${SUDO_HOME}${line}" &>> "${LOG_FILE}"
    is_failed "${line} modified successfully" "Skipping: ${line} modification is failed. See log for more info."
  done <<< "$(sed -r '/(^#|^ *$)/d;' "${SRC_DIR}/config/home.edit")"
}

restore_vnstat_database() {
  if [[ -d "${SRC_DIR}/backup/vnstat" ]]; then
    print "Restoring vnstat database"
    mkdir -p "/var/lib/vnstat"
    rsync -av --chown=vnstat:vnstat "${SRC_DIR}/backup/vnstat/" "/var/lib/vnstat" &>> "${LOG_FILE}"
    systemctl restart vnstat &>> "${LOG_FILE}"
    is_failed "Done" "Skipping: Restoring vnstat database is failed. See log for more info."
  else
    print_warning "Skipping: Vnstat database backup is not found"
  fi
}

restore_rclone_config() {
  if [[ -d "${SRC_DIR}/backup/rclone" ]]; then
    print "Restoring rclone configuration"
    mkdir -p "${SUDO_HOME}/.config/rclone"
    rsync -av --chown="${SUDO_USER}":"${SUDO_USER}" "${SRC_DIR}/backup/rclone/" "${SUDO_HOME}/.config/rclone" &>> "${LOG_FILE}"
    is_failed "Done" "Skipping: Restoring rclone configuration is failed. See log for more info."
  else
    print_warning "Skipping: Rclone configuration backup is not found"
  fi
}

restore_csync_config() {
  if [[ -d "${SRC_DIR}/backup/csync" ]]; then
    print "Restoring csync configuration"
    mkdir -p "${SUDO_HOME}/.config/csync"
    rsync -av --chown="${SUDO_USER}":"${SUDO_USER}" "${SRC_DIR}/backup/csync/" "${SUDO_HOME}/.config/csync" &>> "${LOG_FILE}"
    is_failed "Done" "Skipping: Restoring csync configuration is failed. See log for more info."
  else
    print_warning "Skipping: Csync configuration backup is not found"
  fi
}

restore_backup() {
  restore_csync_config
  restore_rclone_config
  restore_vnstat_database
}

cleanup() {
  print "Cleaning up"
  rm -rf "${TMP_DIR}"
  print_success "Done"
}

set_misc_flags() {
  print "Set hostname to ${HOSTNAME}"
  echo "${HOSTNAME}" | tee "/etc/hostname" 1>/dev/null
  is_failed "Done" "Skipping: Setting up hostname is failed. See log for more info."

  # enable some apps to run on boot
  print "Enabling httpd, mariadb, php-fpm and vnstat to run on boot"
  systemctl enable httpd mariadb php-fpm vnstat &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Enabling is failed. See log for more info."

  # allow httpd to make network connections
  print "Allowing httpd to make network connections"
  setsebool -P httpd_can_network_connect 1 &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Allowing httpd to make network connections is failed. See log for more info."

  # open 80 and 443 port
  print "Opening port 80 and 443"
  firewall-cmd --quiet --add-service=http --add-service=https --permanent &>> "${LOG_FILE}"
  firewall-cmd --quiet --reload &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Opening port 80 and 443 is failed. See log for more info."

  # Symlink vim as vi
  print "Symlink vim as vi"
  ln -s "/usr/bin/vim" "/usr/bin/vi" &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Symlinking vim as vi is failed. See log for more info."

  # update font cache
  print "Updating font cache"
  fc-cache -fv &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Updating font cache is failed. See log for more info."

  # set default plymouth theme charge
  print "Set default plymouth theme to charge"
  plymouth-set-default-theme charge -R &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Setting default plymouth theme to charge is failed. See log for more info."
  
  # add non root user to adbusers
  print "Add non root user to group adbusers"
  groupadd adbusers "${SUDO_USER}" &>> "${LOG_FILE}"
  usermod -a -G adbusers "${SUDO_USER}" &>> "${LOG_FILE}"
  systemctl restart systemd-udevd.service &>> "${LOG_FILE}"
  is_failed "Done" "Skipping: Adding non root user to group adbusers is failed. See log for more info."
}

setup_operating_system() {
  copy_to_system
  install_youtube_dl
  install_rclone
  install_bash_scripts
  add_repos
  install_flathub_packages
  remove_flathub_packages
  install_dnf_packages
  remove_dnf_packages
  install_npm_packages
  remove_npm_packages
  install_pip_packages
  remove_pip_packages
  install_ibus_avro
  set_misc_flags
  edit_root_configurations
  edit_home_configurations
  restore_rclone_config
  restore_csync_config
  restore_vnstat_database
  install_oh_my_zsh
}

start() {
  check_root_access
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
  echo "|  1. Setup Operating System                                                 |"
  echo "|  2. Install Scripts                                                        |"
  echo "|  3. Restore Backup                                                         |"
  echo "|  4. Backup                                                                 |"
  echo "|  0. Quit                                                                   |"
  echo "|                                                                            |"
  echo "+----------------------------------------------------------------------------+"
  read -p "$(print 'Enter Selection [0-4]:') "
  if [[ "${REPLY}" == "0" ]]; then
    print_success "Program terminated"
  elif [[ "${REPLY}" == "1" ]]; then
    setup_operating_system
  elif [[ "${REPLY}" == "2" ]]; then
    install_bash_scripts
  elif [[ "${REPLY}" == "3" ]]; then
    restore_backup
  elif [[ "${REPLY}" == "4" ]]; then
    create_backup
  else
    print_failed "Invalid selection"
    cleanup
    exit 1
  fi
  cleanup
  exit
}

# Let's start!
start
