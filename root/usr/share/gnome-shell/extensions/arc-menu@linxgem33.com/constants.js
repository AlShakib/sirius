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
    CATEGORY_APP_LIST: 7
};

var CATEGORIES = [
    {Category: CategoryType.FAVORITES, Name: _("Favorites"), Icon: 'emblem-favorite-symbolic'},
    {Category: CategoryType.FREQUENT_APPS, Name: _("Frequent Apps"), Icon: 'user-bookmarks-symbolic'},
    {Category: CategoryType.ALL_PROGRAMS, Name: _("All Programs"), Icon: 'view-grid-symbolic'},
    {Category: CategoryType.PINNED_APPS, Name: _("Pinned Apps"), Icon: Me.path + '/media/icons/arc-menu-symbolic.svg'}
]

var ARC_MENU_PLACEMENT = {
    PANEL: 0,
    DTP: 1,
    DTD: 2
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
    // Inverse mapping
    0: EMPTY_STRING,  // Note: an empty string is evaluated to false
    1: SUPER_L,
    2: SUPER_R
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
    System: 1,
    Distro_Icon: 2,
    Custom: 3
};

var ARC_MENU_ICON = { 
    name: _("Arc Menu"), 
    path: '/media/icons/arc-menu-symbolic.svg'
};

var MENU_ICONS = [
    { name: _("Arc Menu Alt"), path: '/media/icons/arc-menu-alt-symbolic.svg'},
    { name: _("Arc Menu Original"), path: '/media/icons/arc-menu-old-symbolic.svg'},
    { name: _("Curved A"), path: '/media/icons/curved-a-symbolic.svg'},
    { name: _("Start Box"), path: '/media/icons/start-box-symbolic.svg'},
    { name: _("Focus"), path: '/media/icons/focus-symbolic.svg'},
    { name: _("Triple Dash"), path: '/media/icons/triple-dash-symbolic.svg'},
    { name: _("Whirl"), path: '/media/icons/whirl-symbolic.svg'},
    { name: _("Whirl Circle"), path: '/media/icons/whirl-circle-symbolic.svg'},
    { name: _("Sums"), path: '/media/icons/sums-symbolic.svg'},
    { name: _("Arrow"), path: '/media/icons/arrow-symbolic.svg'},
    { name: _("Lins"), path: '/media/icons/lins-symbolic.svg'},
    { name: _("Diamond Square"), path: '/media/icons/diamond-square-symbolic.svg'},
    { name: _("Octo Maze"), path: '/media/icons/octo-maze-symbolic.svg'},
    { name: _("Search"), path: '/media/icons/search-symbolic.svg'},
    { name: _("3d"), path: '/media/icons/3d-symbolic.svg'},
    { name: _("Alien"), path: '/media/icons/alien-symbolic.svg'},
    { name: _("Cloud"), path: '/media/icons/cloud-symbolic.svg'},
    { name: _("Dragon"), path: '/media/icons/dragon-symbolic.svg'},
    { name: _("Fly"), path: '/media/icons/fly-symbolic.svg'},
    { name: _("Pacman"), path: '/media/icons/pacman-symbolic.svg'},
    { name: _("Peaks"), path: '/media/icons/peaks-symbolic.svg'},
    { name: _("Pie"), path: '/media/icons/pie-symbolic.svg'},
    { name: _("Pointer"), path: '/media/icons/pointer-symbolic.svg'},
    { name: _("Toxic"), path: '/media/icons/toxic-symbolic.svg'},
    { name: _("Tree"), path: '/media/icons/tree-symbolic.svg'},
    { name: _("Zegon"), path: '/media/icons/zegon-symbolic.svg'}
]

var DISTRO_ICONS = [
    { name: _("Debian"), path: '/media/icons/distros/debian-logo-symbolic.svg'},
    { name: _("Fedora"), path: '/media/icons/distros/fedora-logo-symbolic.svg'},
    { name: _("Manjaro"), path: '/media/icons/distros/manjaro-logo-symbolic.svg'},
    { name: _("Pop!_OS"), path: '/media/icons/distros/pop-os-logo-symbolic.svg'},
    { name: _("Ubuntu"), path: '/media/icons/distros/ubuntu-logo-symbolic.svg'},
    { name: _("Arch Linux"), path: '/media/icons/distros/arch-logo-symbolic.svg'},
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
    Raven: 15
};

var TRADITIONAL_MENU_STYLE = [   
    { thumbnail: '/media/layouts/arc-menu.svg', name: _('Arc Menu'), layout: MENU_LAYOUT.Default},
    { thumbnail: '/media/layouts/brisk-menu.svg', name: _('Brisk Menu Style'), layout: MENU_LAYOUT.Brisk},
    { thumbnail: '/media/layouts/whisker-menu.svg', name: _('Whisker Menu Style'), layout: MENU_LAYOUT.Whisker},
    { thumbnail: '/media/layouts/gnome-menu.svg', name: _('GNOME Menu Style'), layout: MENU_LAYOUT.GnomeMenu},
    { thumbnail: '/media/layouts/mint-menu.svg', name: _('Mint Menu Style'), layout: MENU_LAYOUT.Mint},
    { thumbnail: '/media/layouts/budgie-menu.svg', name: _('Budgie Style'), layout: MENU_LAYOUT.Budgie}];

var MODERN_MENU_STYLE = [   
    { thumbnail: '/media/layouts/windows-10.svg', name: _('Windows 10 Style'), layout: MENU_LAYOUT.Windows},
    { thumbnail: '/media/layouts/ubuntu-dash-menu.svg', name: _('Ubuntu Dash Style'), layout: MENU_LAYOUT.UbuntuDash},
    { thumbnail: '/media/layouts/redmond-style-menu.svg', name: _('Redmond Menu Style'), layout: MENU_LAYOUT.Redmond}];

var TOUCH_MENU_STYLE = [   
    { thumbnail: '/media/layouts/elementary-menu.svg', name: _('Elementary Menu Style'), layout: MENU_LAYOUT.Elementary},
    { thumbnail: '/media/layouts/chromebook-menu.svg', name: _('Chromebook Style'), layout: MENU_LAYOUT.Chromebook}];

var LAUNCHER_MENU_STYLE = [   
    { thumbnail: '/media/layouts/krunner-menu.svg', name: _('KRunner Style'), layout: MENU_LAYOUT.Runner},
    { thumbnail: '/media/layouts/gnome-dash-menu.svg', name: _('GNOME Dash Style'), layout: MENU_LAYOUT.GnomeDash}];

var SIMPLE_MENU_STYLE = [   
    { thumbnail: '/media/layouts/simple-menu.svg', name: _('Simple Menu Style'), layout: MENU_LAYOUT.Simple},
    { thumbnail: '/media/layouts/simple-menu-2.svg', name: _('Simple Menu 2 Style'), layout: MENU_LAYOUT.Simple2}];

var ALTERNATIVE_MENU_STYLE = [   
    { thumbnail: '/media/layouts/raven-menu.svg', name: _('Raven Menu Style'), layout: MENU_LAYOUT.Raven}];

var MENU_STYLES = {
    ThumbnailHeight: 175,
    ThumbnailWidth: 175,
    MaxColumns: 6,
    Styles: [ 
        { thumbnail: '/media/layouts/categories/traditional-symbolic.svg', name: _('Traditional Layouts'), layoutStyle: TRADITIONAL_MENU_STYLE, 
                description: _("Traditional layouts use a familiar style and have a traditional user experience.")},
        { thumbnail: '/media/layouts/categories/modern-symbolic.svg', name: _('Modern Layouts'), layoutStyle: MODERN_MENU_STYLE, 
                description: _("Modern layouts use a style and UX based approach with a focus on design and functionality.")},
        { thumbnail: '/media/layouts/categories/touch-symbolic.svg', name: _('Touch Layouts'), layoutStyle: TOUCH_MENU_STYLE, 
                description: _("Touch layouts contain large menu elements that are well suited for touch based devices.")},
        { thumbnail: '/media/layouts/categories/simple-symbolic.svg', name: _('Simple Layouts'), layoutStyle: SIMPLE_MENU_STYLE, 
                description: _("Simple layouts are designed for mouse based devices and contain simplistic menu elements.")},
        { thumbnail: '/media/layouts/categories/launcher-symbolic.svg', name: _('Launcher Layouts'), layoutStyle: LAUNCHER_MENU_STYLE, 
                description: _("Launcher layouts are well suited for keyboard driven devices and provide the user with quick and simple menu elements.")},
        { thumbnail: '/media/layouts/categories/alternative-symbolic.svg', name: _('Alternative Layouts'), layoutStyle: ALTERNATIVE_MENU_STYLE, 
                description: _("Alternative layouts have an unconventional style that provide a unique user experience.")}
    ]
};

var ARCMENU_MANUAL_URL = "https://gitlab.com/LinxGem33/Neon/-/raw/master/arc-menu-manual/arcmenu-user-manual.pdf"

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
    Path: '/media/misc/warning.svg',
    Size: [30, 30] 
};

var HAMBURGER = {
    Path: '/media/misc/hamburger-symbolic.svg'
};

var KEYBOARD_LOGO = {
    Path: '/media/misc/keyboard.svg',
    Size: [256, 72] 
};

var ARC_MENU_MANUAL_ICON = {
    Path: '/media/misc/arcmenu-manual-icon.svg',
    Size: [30, 30]
};

var GITLAB_ICON = {
    Path: '/media/misc/gitlab-icon.svg',
    Size: [30, 30]
};

var DistroIconsDisclaimer = '<i>"All brand icons are trademarks of their respective owners. The use of these trademarks does not indicate endorsement of the trademark holder by Arc Menu project, nor vice versa. Please do not use brand logos for any purpose except to represent the company, product, or service to which they refer."</i>'+
                                '\n\n•   <b>UBUNTU©</b> - Ubuntu name and Ubuntu logo are trademarks of Canonical© Ltd.'+
                                '\n\n•   <b>FEDORA©</b> - Fedora and the Infinity design logo are trademarks of Red Hat, Inc.'+
                                '\n\n•   <b>DEBIAN©</b> - is a registered trademark owned by Software in the Public Interest, Inc. Debian trademark is a registered United States trademark of Software in the Public Interest, Inc., managed by the Debian project.'+
                                '\n\n•   <b>MANJARO©</b> - logo and name are trademarks of Manjaro GmbH &amp; Co. KG'+
                                '\n\n•   <b>POP_OS!©</b> - logo and name are trademarks of system 76© Inc.'+
                                '\n\n•   <b>ARCH LINUX©</b> - The stylized Arch Linux logo is a recognized trademark of Arch Linux, copyright 2002-2017 Judd Vinet and Aaron Griffin.';

var CREDITS = '\n<b>Credits:</b>'+
		'\n\nCurrent Active Developers'+
		'\n <a href="https://gitlab.com/LinxGem33">@LinxGem33</a>  (Founder/Maintainer/Graphic Designer)'+
		'\n<a href="https://gitlab.com/AndrewZaech">@AndrewZaech</a>  (Lead JavaScript/UX Developer)'+
		'\n\nPast Developers'+
		'\n <a href="https://github.com/lexruee">@lexruee</a>  (Developer)'+
		'\n\n\n<b>A Special Thanks To:</b>'+
		'\n\nTranslators'+
		'\n<a href="https://gitlab.com/arcmenu-team/Arc-Menu#please-refer-to-the-wiki-section-for-a-translation-guide">Full List</a>'+
		'\nPlease See Details'+
		'\n\nOther'+
		'\n<a href="https://gitlab.com/tingvarsson">@Thomas Ingvarsson</a>  (Contributor)'+
		'\n<a href="https://github.com/charlesg99">@charlesg99</a>  (Contributor)'+
		'\n<a href="https://github.com/JasonLG1979">@JasonLG1979</a>  (Contributor)'+
		'\n<a href="https://github.com/fishears/Arc-Menu">@fishears</a>  (Contributor)'+
        '\n';
        
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
	'GNU General Public License, version 2 or later</a> for details.' +
	'</span>';
