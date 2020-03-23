#! /bin/bash

init() {
  if [[ "$(id -u)" == 0 ]]; then
    echo "This program should not be run with administrator privileges." >&2
    read -p "Do you really want to continue? [y,N]: "
    if [[ "$REPLY" =~ ^[yYnN]$ ]]; then
      if [[ "$REPLY" =~ ^[nN]$ ]]; then
        echo "Program terminated."
        exit
      fi
    else
      echo "Invalid entry" >&2
      exit 1
    fi
  fi
}

setGsettings() {
  if [[ -f config/gsettings ]]; then
    echo "Setting up gsettings values..."
    grep '^[^#]' config/gsettings | while read -r line ; do
      schema="$(echo "$line" | cut -d " " -f1)"
      key="$(echo "$line" | cut -d " " -f2)"
      val="$(echo "$line" | cut -d " " -f3-)"
      gsettings set "$schema" "$key" "$val"
      if [[ "$?" == 0 ]]; then
        echo "Set: $line"
      else
        echo "Failed: $line"
      fi
    done
  else
    echo "gsettings file does not exist." >&2
    exit 1
  fi
}

init
setGsettings
