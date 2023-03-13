ZSH_THEME="agnoster"
plugins=(git zsh-autosuggestions)
~ENABLE_CORRECTION="true"
ZSH_DISABLE_COMPFIX="true"
>export EDITOR='vim'
>alias ls="ls --color=tty --ignore=lost+found"
>alias cmus='screen -q -r -D cmus || screen -S cmus $(which --skip-alias cmus)'
>alias editor=gnome-text-editor
