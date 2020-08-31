/*
 * Arc Menu - A traditional application menu for GNOME 3
 *
 * Arc Menu Lead Developer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * Arc Menu Founder/Maintainer/Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var SearchbarLocation = {
    BOTTOM: 0,
    TOP: 1
}

var SearchType = {
    LIST_VIEW: 0,
    GRID_VIEW: 1
}

var CategoryType = {
    FAVORITES: 0,
    FREQUENT_APPS: 1,
    ALL_PROGRAMS: 2,
    PINNED_APPS: 3,
    HOME_SCREEN: 4,
    SEARCH_RESULTS: 5,
    CATEGORIES_LIST: 6,
    CATEGORY_APP_LIST: 7,
    ALL_PROGRAMS_BUTTON: 8,
};

var DefaultMenuView = {
    PINNED_APPS: 0,
    CATEGORIES_LIST: 1,
    FREQUENT_APPS: 2
}

var DefaultMenuViewTognee = {
    CATEGORIES_LIST: 0,
    ALL_PROGRAMS: 1
}

var SoftwareManagerIDs = ['org.gnome.Software.desktop', 'pamac-manager.desktop', 'io.elementary.appcenter.desktop',
                            'snap-store_ubuntu-software.desktop', 'snap-store_snap-store.desktop'];

var CATEGORIES = [
    {Category: CategoryType.FAVORITES, Name: _("Favorites"), Icon: 'emblem-favorite-symbolic'},
    {Category: CategoryType.FREQUENT_APPS, Name: _("Frequent Apps"), Icon: 'user-bookmarks-symbolic'},
    {Category: CategoryType.ALL_PROGRAMS, Name: _("All Programs"), Icon: 'view-grid-symbolic'},
    {Category: CategoryType.PINNED_APPS, Name: _("Pinned Apps"), Icon: Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg'}
]

var ArcMenuPlacement = {
    PANEL: 0,
    DTP: 1,
    DASH: 2
};

var EXTENSION = {
    DTP: 0,
    DTD: 1
};

var DEFAULT_DIRECTORIES = [
    imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS,
    imports.gi.GLib.UserDirectory.DIRECTORY_DOWNLOAD,
    imports.gi.GLib.UserDirectory.DIRECTORY_MUSIC,
    imports.gi.GLib.UserDirectory.DIRECTORY_PICTURES,
    imports.gi.GLib.UserDirectory.DIRECTORY_VIDEOS
];

var DIRECTION = {
    UP: 0,
    DOWN: 1
};

var SEPARATOR_ALIGNMENT = {
    VERTICAL: 0,
    HORIZONTAL: 1
};

var SEPARATOR_STYLE = {
    NORMAL: 0,
    LONG: 1,
    SHORT: 2,
    MAX: 3,
};

var SUPER_L = 'Super_L';
var SUPER_R = 'Super_R';
var EMPTY_STRING = '';

var HOT_KEY = { // See: org.gnome.shell.extensions.arc-menu.menu-hotkey
    Undefined: 0,
    Super_L: 1,
    Super_R: 2,
    Custom: 3,
    // Inverse mapping
    0: EMPTY_STRING,  // Note: an empty string is evaluated to false
    1: SUPER_L,
    2: SUPER_R,
};

var HOT_CORNERS_ACTION = {
    Default: 0,
    Disabled: 1,
    ToggleArcMenu: 2,
    Custom: 3
}

var SECTIONS = [
    'devices',
    'network',
    'bookmarks',
];

var MENU_POSITION = { // See: org.gnome.shell.extensions.arc-menu.menu-position
    Left: 0,
    Center: 1,
    Right: 2
};

var DIALOG_TYPE = {
    Default: 0,
    Mint_Pinned_Apps: 1,
    Application_Shortcuts: 2,
    Directories_Shortcuts: 3
};

var MENU_APPEARANCE = {
    Icon: 0,
    Text: 1,
    Icon_Text: 2,
    Text_Icon: 3,
    None: 4
};

var MENU_BUTTON_ICON = { 
    Arc_Menu: 0,
    Distro_Icon: 1,
    Custom: 2
};

var PowerType = {
    POWEROFF: 1,
    LOCK: 2,
    LOGOUT: 3,
    SUSPEND: 4
};

var MENU_ICONS = [
    { path: '/media/icons/menu_icons/arcmenu-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons/arcmenu-logo-alt-symbolic.svg'},
    { path: '/media/icons/menu_icons/arc-menu-symbolic.svg'},
    { path: '/media/icons/menu_icons/arc-menu-alt-symbolic.svg'},
    { path: '/media/icons/menu_icons/arc-menu-old-symbolic.svg'},
    { path: 'start-here-symbolic'},
    { path: '/media/icons/menu_icons/curved-a-symbolic.svg'},
    { path: '/media/icons/menu_icons/focus-symbolic.svg'},
    { path: '/media/icons/menu_icons/triple-dash-symbolic.svg'},
    { path: '/media/icons/menu_icons/whirl-symbolic.svg'},
    { path: '/media/icons/menu_icons/whirl-circle-symbolic.svg'},
    { path: '/media/icons/menu_icons/sums-symbolic.svg'},
    { path: '/media/icons/menu_icons/arrow-symbolic.svg'},
    { path: '/media/icons/menu_icons/lins-symbolic.svg'},
    { path: '/media/icons/menu_icons/diamond-square-symbolic.svg'},
    { path: '/media/icons/menu_icons/octo-maze-symbolic.svg'},
    { path: '/media/icons/menu_icons/search-symbolic.svg'},
    { path: '/media/icons/menu_icons/transform-symbolic.svg'},
    { path: '/media/icons/menu_icons/3d-symbolic.svg'},
    { path: '/media/icons/menu_icons/alien-symbolic.svg'},
    { path: '/media/icons/menu_icons/cloud-symbolic.svg'},
    { path: '/media/icons/menu_icons/dragon-symbolic.svg'},
    { path: '/media/icons/menu_icons/fly-symbolic.svg'},
    { path: '/media/icons/menu_icons/pacman-symbolic.svg'},
    { path: '/media/icons/menu_icons/peaks-symbolic.svg'},
    { path: '/media/icons/menu_icons/pie-symbolic.svg'},
    { path: '/media/icons/menu_icons/pointer-symbolic.svg'},
    { path: '/media/icons/menu_icons/toxic-symbolic.svg'},
    { path: '/media/icons/menu_icons/tree-symbolic.svg'},
    { path: '/media/icons/menu_icons/zegon-symbolic.svg'},
    { path: '/media/icons/menu_icons/apps-symbolic.svg'},
    { path: '/media/icons/menu_icons/bug-symbolic.svg'},
    { path: '/media/icons/menu_icons/cita-symbolic.svg'},
    { path: '/media/icons/menu_icons/dragonheart-symbolic.svg'},
    { path: '/media/icons/menu_icons/eclipse-symbolic.svg'},
    { path: '/media/icons/menu_icons/football-symbolic.svg'},
    { path: '/media/icons/menu_icons/heddy-symbolic.svg'},
    { path: '/media/icons/menu_icons/helmet-symbolic.svg'},
    { path: '/media/icons/menu_icons/palette-symbolic.svg'},
    { path: '/media/icons/menu_icons/peeks-symbolic.svg'},
    { path: '/media/icons/menu_icons/record-symbolic.svg'},
    { path: '/media/icons/menu_icons/saucer-symbolic.svg'},
    { path: '/media/icons/menu_icons/step-symbolic.svg'},
    { path: '/media/icons/menu_icons/vancer-symbolic.svg'},
    { path: '/media/icons/menu_icons/vibe-symbolic.svg'},
    { path: '/media/icons/menu_icons/start-box-symbolic.svg'},
    { path: '/media/icons/menu_icons/dimond-win-symbolic.svg'},
    { path: '/media/icons/menu_icons/dolphin-symbolic.svg'},
    { path: '/media/icons/menu_icons/dota-symbolic.svg'},
    { path: '/media/icons/menu_icons/football2-symbolic.svg'},
    { path: '/media/icons/menu_icons/loveheart-symbolic.svg'},
    { path: '/media/icons/menu_icons/pyrimid-symbolic.svg'},
    { path: '/media/icons/menu_icons/rewind-symbolic.svg'},
    { path: '/media/icons/menu_icons/snap-symbolic.svg'},
    { path: '/media/icons/menu_icons/time-symbolic.svg'},
    { path: '/media/icons/menu_icons/3D-symbolic.svg'},
    { path: '/media/icons/menu_icons/a-symbolic.svg'},
    { path: '/media/icons/menu_icons/app-launcher-symbolic.svg'},
    { path: '/media/icons/menu_icons/bat-symbolic.svg'},
    { path: '/media/icons/menu_icons/dra-symbolic.svg'},
    { path: '/media/icons/menu_icons/equal-symbolic.svg'},
    { path: '/media/icons/menu_icons/gnacs-symbolic.svg'},
    { path: '/media/icons/menu_icons/groove-symbolic.svg'},
    { path: '/media/icons/menu_icons/kaaet-symbolic.svg'},
    { path: '/media/icons/menu_icons/launcher-symbolic.svg'},
    { path: '/media/icons/menu_icons/pac-symbolic.svg'},
    { path: '/media/icons/menu_icons/robots-symbolic.svg'},
    { path: '/media/icons/menu_icons/sheild-symbolic.svg'},
    { path: '/media/icons/menu_icons/somnia-symbolic.svg'},
    { path: '/media/icons/menu_icons/utool-symbolic.svg'},
]

var DISTRO_ICONS = [
    { path: '/media/icons/menu_icons_distros/debian-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/fedora-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/manjaro-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/pop-os-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/ubuntu-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/arch-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/opensuse-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/raspbian-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/kali-linux-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/pureos-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/solus-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/budgie-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/gentoo-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/mx-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/redhat-logo-symbolic.svg'},
    { path: '/media/icons/menu_icons_distros/voyager-logo-symbolic.svg'},
]

var MENU_LAYOUT = {
    Default: 0,
    Brisk: 1,
    Whisker: 2,
    GnomeMenu: 3,
    Mint: 4,
    Elementary: 5,
    GnomeDash: 6,
    Simple: 7,
    Simple2: 8,
    Redmond: 9,
    UbuntuDash: 10,
    Budgie: 11,
    Windows: 12,
    Runner: 13,
    Chromebook: 14,
    Raven: 15,
    Tognee: 16,
    RavenExtended: 17,
    Dashboard: 18,
    Plasma: 19
};

var TRADITIONAL_MENU_STYLE = [   
    { thumbnail: '/media/layouts/arc-menu.svg', name: _('Arc Menu'), layout: MENU_LAYOUT.Default},
    { thumbnail: '/media/layouts/brisk-menu.svg', name: _('Brisk Menu Style'), layout: MENU_LAYOUT.Brisk},
    { thumbnail: '/media/layouts/whisker-menu.svg', name: _('Whisker Menu Style'), layout: MENU_LAYOUT.Whisker},
    { thumbnail: '/media/layouts/gnome-menu.svg', name: _('GNOME Menu Style'), layout: MENU_LAYOUT.GnomeMenu},
    { thumbnail: '/media/layouts/mint-menu.svg', name: _('Mint Menu Style'), layout: MENU_LAYOUT.Mint},
    { thumbnail: '/media/layouts/budgie-menu.svg', name: _('Budgie Style'), layout: MENU_LAYOUT.Budgie}];

var MODERN_MENU_STYLE = [
    { thumbnail: '/media/layouts/ubuntu-dash-menu.svg', name: _('Ubuntu Dash Style'), layout: MENU_LAYOUT.UbuntuDash},
    { thumbnail: '/media/layouts/plasma-menu.svg', name: _('Plasma Style'), layout: MENU_LAYOUT.Plasma},
    { thumbnail: '/media/layouts/tognee-menu.svg', name: _('tognee Menu'), layout: MENU_LAYOUT.Tognee},
    { thumbnail: '/media/layouts/windows-10.svg', name: _('Windows 10 Style'), layout: MENU_LAYOUT.Windows},
    { thumbnail: '/media/layouts/redmond-style-menu.svg', name: _('Redmond Menu Style'), layout: MENU_LAYOUT.Redmond}];

var TOUCH_MENU_STYLE = [   
    { thumbnail: '/media/layouts/elementary-menu.svg', name: _('Elementary Menu Style'), layout: MENU_LAYOUT.Elementary},
    { thumbnail: '/media/layouts/chromebook-menu.svg', name: _('Chromebook Style'), layout: MENU_LAYOUT.Chromebook}];

var LAUNCHER_MENU_STYLE = [   
    { thumbnail: '/media/layouts/krunner-menu.svg', name: _('KRunner Style'), layout: MENU_LAYOUT.Runner},
    { thumbnail: '/media/layouts/raven-extended.svg', name: _('Raven Extended'), layout: MENU_LAYOUT.RavenExtended},
    { thumbnail: '/media/layouts/dashboard.svg', name: _('Dashboard'), layout: MENU_LAYOUT.Dashboard},
    { thumbnail: '/media/layouts/gnome-dash-menu.svg', name: _('GNOME Dash Style'), layout: MENU_LAYOUT.GnomeDash}];

var SIMPLE_MENU_STYLE = [   
    { thumbnail: '/media/layouts/simple-menu.svg', name: _('Simple Menu Style'), layout: MENU_LAYOUT.Simple},
    { thumbnail: '/media/layouts/simple-menu-2.svg', name: _('Simple Menu 2 Style'), layout: MENU_LAYOUT.Simple2}];

var ALTERNATIVE_MENU_STYLE = [   
    { thumbnail: '/media/layouts/raven-menu.svg', name: _('Raven Menu Style'), layout: MENU_LAYOUT.Raven}];

var MENU_STYLES = {
    ThumbnailHeight: 150,
    ThumbnailWidth: 150,
    MaxColumns: 6,
    Styles: [ 
        { thumbnail: '/media/layouts/categories/traditional-symbolic.svg', name: _('Traditional'), layoutStyle: TRADITIONAL_MENU_STYLE, 
                description: _("Traditional layouts use a familiar style and have a traditional user experience.")},
        { thumbnail: '/media/layouts/categories/modern-symbolic.svg', name: _('Modern'), layoutStyle: MODERN_MENU_STYLE, 
                description: _("Modern layouts use a style and UX based approach with a focus on design and functionality.")},
        { thumbnail: '/media/layouts/categories/touch-symbolic.svg', name: _('Touch'), layoutStyle: TOUCH_MENU_STYLE, 
                description: _("Touch layouts contain large menu elements that are well suited for touch based devices.")},
        { thumbnail: '/media/layouts/categories/simple-symbolic.svg', name: _('Simple'), layoutStyle: SIMPLE_MENU_STYLE, 
                description: _("Simple layouts are designed for mouse based devices and contain simplistic menu elements.")},
        { thumbnail: '/media/layouts/categories/launcher-symbolic.svg', name: _('Launcher'), layoutStyle: LAUNCHER_MENU_STYLE, 
                description: _("Launcher layouts are well suited for keyboard driven devices and provide the user with quick and simple menu elements.")},
        { thumbnail: '/media/layouts/categories/alternative-symbolic.svg', name: _('Alternative'), layoutStyle: ALTERNATIVE_MENU_STYLE, 
                description: _("Alternative layouts have an unconventional style that provide a unique user experience.")}
    ]
};

var ARCMENU_MANUAL_URL = "https://gitlab.com/LinxGem33/Neon/-/raw/master/arc-menu-manual/arcmenu-user-manual.pdf"

var ArcMenu_SettingsCommand = 'gnome-extensions prefs arc-menu@linxgem33.com';

//Path to some files
var ARC_MENU_LOGO = {
    Path: '/media/icons/arc-menu-logo.svg',
    Size: [150, 150]
};

var COLOR_PRESET = {
    Path: '/media/misc/color-preset.svg',
    Size: [200, 35]
};

var WARNING_ICON = {
    Path: '/media/misc/warning-symbolic.svg',
    Size: [30, 30] 
};

var HAMBURGER = {
    Path: '/media/misc/hamburger-symbolic.svg'
};

var KEYBOARD_LOGO = {
    Path: '/media/misc/keyboard-symbolic.svg',
    Size: [256, 72] 
};

var ARC_MENU_MANUAL_ICON = {
    Path: '/media/misc/arcmenu-manual-icon.svg',
    Size: [35, 35]
};

var GITLAB_ICON = {
    Path: '/media/misc/gitlab-icon.svg',
    Size: [35, 35]
};

var DistroIconsDisclaimer = '<i>"All brand icons are trademarks of their respective owners. The use of these trademarks does not indicate endorsement of the trademark holder by Arc Menu project, nor vice versa. Please do not use brand logos for any purpose except to represent the company, product, or service to which they refer."</i>'+
                                '\n\n•   <b>UBUNTU©</b> - Ubuntu name and Ubuntu logo are trademarks of Canonical© Ltd.'+
                                '\n\n•   <b>FEDORA©</b> - Fedora and the Infinity design logo are trademarks of Red Hat, Inc.'+
                                '\n\n•   <b>DEBIAN©</b> - is a registered trademark owned by Software in the Public Interest, Inc. Debian trademark is a registered United States trademark of Software in the Public Interest, Inc., managed by the Debian project.'+
                                '\n\n•   <b>MANJARO©</b> - logo and name are trademarks of Manjaro GmbH &amp; Co. KG'+
                                '\n\n•   <b>POP_OS!©</b> - logo and name are trademarks of system 76© Inc.'+
                                '\n\n•   <b>ARCH LINUX©</b> - The stylized Arch Linux logo is a recognized trademark of Arch Linux, copyright 2002-2017 Judd Vinet and Aaron Griffin.'+
                                '\n\n•   <b>openSUSE©</b> - logo and name 2001–2020 SUSE LLC, © 2005–2020 openSUSE Contributors &amp; others.'+
                                '\n\n•   <b>Raspberry Pi</b> - logo and name are part of Raspberry Pi Foundation UK Registered Charity 1129409'+
                                '\n\n•   <b>Kali Linux</b> - logo and name are part of © OffSec Services Limited 2020'+
                                '\n\n•   <b>PureOS</b> - logo and name are developed by members of the Purism community'+
                                '\n\n•   <b>Solus</b> - logo and name are copyright © 2014-2018 by Solus Project'+
                                '\n\n•   <b>Gentoo Authors©</b> - 2001–2020 Gentoo is a trademark of the Gentoo Foundation, Inc.'+
                                '\n\n•   <b>Voyager© Linux</b> - name and logo'+
                                '\n\n•   <b>MXLinux©</b> - 2020 - Linux - is the registered trademark of Linus Torvalds in the U.S. and other countries.'+
                                '\n\n•   <b>Red Hat, Inc.©</b> - Copyright 2020 name and logo';

var DEVELOPERS = '<b>Andrew Zaech</b> <a href="https://gitlab.com/AndrewZaech">@AndrewZaech</a>\nLead Project Developer - UX/Backend Developer\t' +
                '\n\n<b>LinxGem33</b> aka <b>Andy C</b> <a href="https://gitlab.com/LinxGem33">@LinxGem33</a>\nFounder - Maintainer - Digital Art Designer';
var TRANSLATORS = '<b>Thank you to all translators!</b>\n<a href="https://gitlab.com/arcmenu-team/Arc-Menu#please-refer-to-the-wiki-section-for-a-translation-guide">Full List of Translators</a>';
var CONTRIBUTORS = '<b>Thank you to the following Top Contributors:</b>\n<a href="https://gitlab.com/arcmenu-team/Arc-Menu#top-project-contributors">Top Contributors</a>' +
                    '\n\n<b>A thank you to those who submited Pull Requests</b>\n<a href="https://gitlab.com/arcmenu-team/Arc-Menu#pull-requests">Pull Request Contributors</a>';
var ARTWORK = '<b>LinxGem33</b> aka <b>Andy C</b>\nWiki Screens, Icons, Wire-Frames, Arc Menu Assets' +
                '\n\n<b>Andrew Zaech</b>\nIcons, Wire-Frames';
var DOCUMENTATION = '<b>LinxGem33</b> aka <b>Andy C</b>\nMaintainer - Contributor' +
                    '\n\n<b>Andrew Zaech</b>\nContributor';
        
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
	'GNU General Public License, version 2 or later</a> for details.' +
	'</span>';
