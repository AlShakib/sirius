# csync - A rclone wrapper

csync is a rclone wrapper that pulls files from remote and pushes files to remote.

## Table of Contents

- [csync - A rclone wrapper](#csync---a-rclone-wrapper)
  - [Table of Contents](#table-of-contents)
  - [Usages](#usages)
  - [Options](#options)
    - [push](#push)
    - [pull](#pull)
    - [show config](#show-config)
    - [remove config <config_number>](#remove-config-config_number)
    - [add \<name\>:\<local>:\<remote>](#add-%5Cname%5C%5Clocal%5Cremote)
      - [Configuration file](#configuration-file)

## Usages

```
Usage: csync [OPTION] [ARG...]

OPTIONS:
    help                                Print this help text and exit
    version                             Print program version and exit
    push                                Push local dir to remote dir
    pull                                Pull remote dir to local dir
    show config                         Print config file
    remove config <config_number>       Remove a config by config number
    add <name>:<local>:<remote>         Add a config`
```

## Options

There are several options for `csync`

### push

`csync push` will push files from the local directory to the remote directory. It will push the identical directory to the remote. If you delete a file in the local directory, the push will delete the file from remote as well. If you create a file in the remote but do not have that file in the local, the push will delete that file from the remote as well.

### pull

`csync pull` will pull files from the remote directory to the local directory. It will pull the identical directory from the remote. If you delete a file from the remote, the pull will delete the file from local as well. If you create a file in the local but do not have that file in the remote, the pull will delete that file from the local as well.

### show config

`csync show config` will print the configurations file.

### remove config <config_number>

`csync remove config <config_number>` will remove an entry from configuration file.

### add \<name\>:\<local>:\<remote>

`csync add <name>:<local>:<remote>` will add a new entry to configuration file.

#### Configuration file

The `~/.config/csync/cloud.conf` contains the local and remote file locations. The basic format of an entry is `<rclone remote name>:<local dir>:<remote dir>`.
