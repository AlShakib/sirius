/*
 * ArcMenu - A traditional application menu for GNOME 3
 *
 * ArcMenu Lead Developer and Maintainer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * ArcMenu Founder, Former Maintainer, and Former Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33 - (No Longer Active)
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
    RECENT_FILES: 4,
    HOME_SCREEN: 5,
    SEARCH_RESULTS: 6,
    CATEGORIES_LIST: 7,
    CATEGORY_APP_LIST: 8,
    ALL_PROGRAMS_BUTTON: 9,
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

var SoftwareManagerIDs = ['org.manjaro.pamac.manager.desktop', 'pamac-manager.desktop', 'io.elementary.appcenter.desktop',
                            'snap-store_ubuntu-software.desktop', 'snap-store_snap-store.desktop', 'org.gnome.Software.desktop'];

var CATEGORIES = [
    {Category: CategoryType.FAVORITES, Name: _("Favorites"), Icon: 'emblem-favorite-symbolic'},
    {Category: CategoryType.FREQUENT_APPS, Name: _("Frequent Apps"), Icon: 'user-bookmarks-symbolic'},
    {Category: CategoryType.ALL_PROGRAMS, Name: _("All Programs"), Icon: 'view-grid-symbolic'},
    {Category: CategoryType.PINNED_APPS, Name: _("Pinned Apps"), Icon: Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg'},
    {Category: CategoryType.RECENT_FILES, Name: _("Recent Files"), Icon: 'document-open-recent-symbolic'}
]

var ArcMenuPlacement = {
    PANEL: 0,
    DTP: 1,
    DASH: 2
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

var TooltipLocation = {
    TOP_CENTERED: 0,
    BOTTOM_CENTERED: 1,
    BOTTOM: 2,
};

var SEPARATOR_ALIGNMENT = {
    VERTICAL: 0,
    HORIZONTAL: 1
};

var MenuItemType = {
    BUTTON: 0,
    MENU_ITEM: 1
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

var HOT_KEY = {
    Undefined: 0,
    Super_L: 1,
    Super_R: 2,
    Custom: 3,
    // Inverse mapping
    0: EMPTY_STRING,
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

var MENU_POSITION = {
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
    SUSPEND: 4,
    RESTART: 5
};

var MENU_ICONS = [
    { path: '/media/icons/menu_button_icons/icons/arcmenu-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/arcmenu-logo-alt-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/arc-menu-old-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/arc-menu-alt-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/arc-menu-old2-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/curved-a-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/focus-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/triple-dash-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/whirl-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/whirl-circle-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/sums-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/arrow-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/lins-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/diamond-square-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/octo-maze-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/search-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/transform-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/3d-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/alien-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/cloud-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/dragon-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/fly-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/pacman-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/peaks-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/pie-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/pointer-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/toxic-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/tree-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/zegon-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/apps-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/bug-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/cita-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/dragonheart-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/eclipse-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/football-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/heddy-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/helmet-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/palette-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/peeks-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/record-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/saucer-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/step-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/vancer-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/vibe-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/start-box-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/dimond-win-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/dolphin-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/dota-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/football2-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/loveheart-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/pyrimid-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/rewind-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/snap-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/time-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/3D-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/a-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/app-launcher-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/bat-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/dra-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/equal-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/gnacs-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/groove-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/kaaet-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/launcher-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/pac-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/robots-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/sheild-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/somnia-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/utool-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/swirl-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/icons/round-symbolic.svg'},
]

var DISTRO_ICONS = [
    { path: 'start-here-symbolic'},
    { path: '/media/icons/menu_button_icons/distro_icons/debian-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/fedora-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/manjaro-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/pop-os-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/ubuntu-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/arch-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/opensuse-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/raspbian-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/kali-linux-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/pureos-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/solus-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/budgie-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/gentoo-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/mx-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/redhat-logo-symbolic.svg'},
    { path: '/media/icons/menu_button_icons/distro_icons/voyager-logo-symbolic.svg'},
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
    Insider: 12,
    Runner: 13,
    Chromebook: 14,
    Raven: 15,
    Tognee: 16,
    Plasma: 17,
    Windows: 18
};

var TRADITIONAL_MENU_STYLE = [   
    { thumbnail: '/media/icons/menu_layout_icons/arc-menu.svg', name: _('ArcMenu'), tweaksName: _('ArcMenu Tweaks'), layout: MENU_LAYOUT.Default},
    { thumbnail: '/media/icons/menu_layout_icons/brisk-menu.svg', name: _('Brisk Menu Style'), tweaksName: _('Brisk Menu Style Tweaks'), layout: MENU_LAYOUT.Brisk},
    { thumbnail: '/media/icons/menu_layout_icons/whisker-menu.svg', name: _('Whisker Menu Style'), tweaksName: _('Whisker Menu Style Tweaks'), layout: MENU_LAYOUT.Whisker},
    { thumbnail: '/media/icons/menu_layout_icons/gnome-menu.svg', name: _('GNOME Menu Style'), tweaksName: _('GNOME Menu Style Tweaks'), layout: MENU_LAYOUT.GnomeMenu},
    { thumbnail: '/media/icons/menu_layout_icons/mint-menu.svg', name: _('Mint Menu Style'), tweaksName: _('Mint Menu Style Tweaks'), layout: MENU_LAYOUT.Mint},
    { thumbnail: '/media/icons/menu_layout_icons/budgie-menu.svg', name: _('Budgie Style'), tweaksName: _('Budgie Style Tweaks'), layout: MENU_LAYOUT.Budgie}];

var MODERN_MENU_STYLE = [
    { thumbnail: '/media/icons/menu_layout_icons/ubuntu-dash-menu.svg', name: _('Ubuntu Dash Style'), tweaksName: _('Ubuntu Dash Style Tweaks'), layout: MENU_LAYOUT.UbuntuDash},
    { thumbnail: '/media/icons/menu_layout_icons/plasma-menu.svg', name: _('Plasma Style'), tweaksName: _('Plasma Style Tweaks'), layout: MENU_LAYOUT.Plasma},
    { thumbnail: '/media/icons/menu_layout_icons/tognee-menu.svg', name: _('tognee Menu'), tweaksName: _('tognee Menu Tweaks'), layout: MENU_LAYOUT.Tognee},
    { thumbnail: '/media/icons/menu_layout_icons/insider.svg', name: _('Insider Menu'), tweaksName: _('Insider Menu Tweaks'), layout: MENU_LAYOUT.Insider},
    { thumbnail: '/media/icons/menu_layout_icons/redmond-style-menu.svg', name: _('Redmond Menu Style'), tweaksName: _('Redmond Menu Style Tweaks'), layout: MENU_LAYOUT.Redmond},
    { thumbnail: '/media/icons/menu_layout_icons/windows.svg', name: _('Windows 10 Style'), tweaksName: _('Windows 10 Style Tweaks'), layout: MENU_LAYOUT.Windows}];

var TOUCH_MENU_STYLE = [   
    { thumbnail: '/media/icons/menu_layout_icons/elementary-menu.svg', name: _('Elementary Menu Style'), tweaksName: _('Elementary Menu Style Tweaks'), layout: MENU_LAYOUT.Elementary},
    { thumbnail: '/media/icons/menu_layout_icons/chromebook-menu.svg', name: _('Chromebook Style'), tweaksName: _('Chromebook Style Tweaks'), layout: MENU_LAYOUT.Chromebook}];

var LAUNCHER_MENU_STYLE = [   
    { thumbnail: '/media/icons/menu_layout_icons/krunner-menu.svg', name: _('KRunner Style'), tweaksName: _('KRunner Style Tweaks'), layout: MENU_LAYOUT.Runner},
    { thumbnail: '/media/icons/menu_layout_icons/gnome-dash-menu.svg', name: _('GNOME Dash Style'), tweaksName: _('GNOME Dash Style Tweaks'), layout: MENU_LAYOUT.GnomeDash}];

var SIMPLE_MENU_STYLE = [   
    { thumbnail: '/media/icons/menu_layout_icons/simple-menu.svg', name: _('Simple Menu Style'), tweaksName: _('Simple Menu Style Tweaks'), layout: MENU_LAYOUT.Simple},
    { thumbnail: '/media/icons/menu_layout_icons/simple-menu-2.svg', name: _('Simple Menu 2 Style'), tweaksName: _('Simple Menu 2 Style Tweaks'), layout: MENU_LAYOUT.Simple2}];

var ALTERNATIVE_MENU_STYLE = [   
    { thumbnail: '/media/icons/menu_layout_icons/raven-menu.svg', name: _('Raven Menu Style'), tweaksName: _('Raven Menu Style Tweaks'), layout: MENU_LAYOUT.Raven}];

var MENU_STYLES = {
    ThumbnailHeight: 150,
    ThumbnailWidth: 150,
    MaxColumns: 6,
    Styles: [ 
        { thumbnail: '/media/icons/menu_layout_icons/category_icons/traditional.svg', name: _('Traditional'), descriptionTitle: _("Traditional Menu Style"), layoutStyle: TRADITIONAL_MENU_STYLE, 
                description: _("Traditional layouts use a familiar style and have a traditional user experience.")},
        { thumbnail: '/media/icons/menu_layout_icons/category_icons/modern.svg', name: _('Modern'), descriptionTitle: _("Modern Menu Style"), layoutStyle: MODERN_MENU_STYLE, 
                description: _("Modern layouts use a style and UX based approach with a focus on design and functionality.")},
        { thumbnail: '/media/icons/menu_layout_icons/category_icons/touch.svg', name: _('Touch'), descriptionTitle: _("Touch Menu Style"), layoutStyle: TOUCH_MENU_STYLE, 
                description: _("Touch layouts contain large menu elements that are well suited for touch based devices.")},
        { thumbnail: '/media/icons/menu_layout_icons/category_icons/simple.svg', name: _('Simple'), descriptionTitle: _("Simple Menu Style"), layoutStyle: SIMPLE_MENU_STYLE, 
                description: _("Simple layouts are designed for mouse based devices and contain simplistic menu elements.")},
        { thumbnail: '/media/icons/menu_layout_icons/category_icons/launcher.svg', name: _('Launcher'), descriptionTitle: _("Launcher Menu Style"), layoutStyle: LAUNCHER_MENU_STYLE, 
                description: _("Launcher layouts are well suited for keyboard driven devices and provide the user with quick and simple menu elements.")},
        { thumbnail: '/media/icons/menu_layout_icons/category_icons/alternative.svg', name: _('Alternative'), descriptionTitle: _("Alternative Menu Style"), layoutStyle: ALTERNATIVE_MENU_STYLE, 
                description: _("Alternative layouts have an unconventional style that provide a unique user experience.")}
    ]
};

var ArcMenu_SettingsCommand = 'gnome-extensions prefs arcmenu@arcmenu.com';

// Path to some files
var RESTART_ICON = {
    Path: '/media/icons/menu_icons/restart-symbolic.svg'
};

var HAMBURGER = {
    Path: '/media/icons/menu_icons/hamburger-symbolic.svg'
};

var DistroIconsDisclaimer = '<i>"All brand icons are trademarks of their respective owners. The use of these trademarks does not indicate endorsement of the trademark holder by ArcMenu project, nor vice versa. Please do not use brand logos for any purpose except to represent the company, product, or service to which they refer."</i>'+
                                '\n\n•   <b>Ubuntu®</b> - Ubuntu name and Ubuntu logo are trademarks of Canonical© Ltd.'+
                                '\n\n•   <b>Fedora®</b> - Fedora and the Infinity design logo are trademarks of Red Hat, Inc.'+
                                '\n\n•   <b>Debian®</b> - is a registered trademark owned by Software in the Public Interest, Inc. Debian trademark is a registered United States trademark of Software in the Public Interest, Inc., managed by the Debian project.'+
                                '\n\n•   <b>Manjaro®</b> - logo and name are trademarks of Manjaro GmbH &amp; Co. KG'+
                                '\n\n•   <b>Pop_OS!®</b> - logo and name are trademarks of system 76© Inc.'+
                                '\n\n•   <b>Arch Linux™</b> - The stylized Arch Linux logo is a recognized trademark of Arch Linux, copyright 2002–2017 Judd Vinet and Aaron Griffin.'+
                                '\n\n•   <b>openSUSE®</b> - logo and name 2001–2020 SUSE LLC, © 2005–2020 openSUSE Contributors &amp; others.'+
                                '\n\n•   <b>Raspberry Pi®</b> - logo and name are part of Raspberry Pi Foundation UK Registered Charity 1129409'+
                                '\n\n•   <b>Kali Linux™</b> - logo and name are part of © OffSec Services Limited 2020'+
                                '\n\n•   <b>PureOS</b> - logo and name are developed by members of the Purism community'+
                                '\n\n•   <b>Solus</b> - logo and name are copyright © 2014–2018 by Solus Project'+
                                '\n\n•   <b>Gentoo Authors©</b> - 2001–2020 Gentoo is a trademark of the Gentoo Foundation, Inc.'+
                                '\n\n•   <b>Voyager© Linux</b> - name and logo'+
                                '\n\n•   <b>MX Linux©</b> - 2020 - Linux - is the registered trademark of Linus Torvalds in the U.S. and other countries.'+
                                '\n\n•   <b>Red Hat, Inc.©</b> - Copyright 2020 name and logo';


var DEVELOPERS = '<b>Andrew Zaech</b> <a href="https://gitlab.com/AndrewZaech">@AndrewZaech</a>\nLead Project Developer and Maintainer\t' +
                '\n\n<b>LinxGem33</b> aka <b>Andy C</b> <a href="https://gitlab.com/LinxGem33">@LinxGem33</a> - <b>(Inactive)</b>\nArcMenu Founder - Former Maintainer - Former Digital Art Designer';
var TRANSLATORS = '<b>Thank you to all translators!</b>\n<a href="https://gitlab.com/arcmenu/ArcMenu#please-refer-to-the-wiki-section-for-a-translation-guide">Full List of Translators</a>';
var CONTRIBUTORS = '<b>Thank you to the following Top Contributors:</b>\n<a href="https://gitlab.com/arcmenu/ArcMenu#top-project-contributors">Top Contributors</a>' +
                    '\n\n<b>A thank you to those who submited Pull Requests</b>\n<a href="https://gitlab.com/arcmenu/ArcMenu#pull-requests">Pull Request Contributors</a>';
var ARTWORK = '<b>LinxGem33</b> aka <b>Andy C</b>\nWiki Screens, Icons, Wire-Frames, ArcMenu Assets' +
                '\n\n<b>Andrew Zaech</b>\nIcons, Wire-Frames';
        
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
	'GNU General Public License, version 2 or later</a> for details.' +
	'</span>';
