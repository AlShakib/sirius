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

const {Clutter, Gtk, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            SearchType: Constants.SearchType.LIST_VIEW,
            VerticalMainBox: true
        });
    }
    createLayout(){
        this.searchBox = new MW.SearchBox(this);
        this.searchBox.actor.style ="margin: 0px 10px 5px 10px; padding-top: 0.0em; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.mainBox.add(this.searchBox.actor);

        //subMainBox stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.mainBox.add(this.subMainBox);
        
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 70;
        this.rightBox = new St.BoxLayout({
            style: "width: " + rightPanelWidth + "px;",
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            vertical: true,
            style_class: 'right-box'
        });

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });   
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.subMainBox.add(this.leftBox);

        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: false,
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });
        this.categoriesScrollBox.style = "width:225px;";

        this.leftBox.add(this.categoriesScrollBox);

        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox);
        
        this.shortcutsBox = new St.BoxLayout({ 
            vertical: true,
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.END
        });
        this.shortcutsBox.style = "padding: 5px 0px 0px 0px;"
        this.leftBox.add(this.shortcutsBox);

        this.shortcutsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));

        let shortcutMenuItem = new MW.ShortcutMenuItem(this, _("Software"), 'org.gnome.Software-symbolic', 'ArcMenu_Software');
        shortcutMenuItem.setIconSizeLarge();
        this.shortcutsBox.add(shortcutMenuItem.actor);

        shortcutMenuItem = new MW.ShortcutMenuItem(this, _("Settings"), 'preferences-system-symbolic', 'gnome-control-center');
        shortcutMenuItem.setIconSizeLarge();
        this.shortcutsBox.add(shortcutMenuItem.actor);

        this.shortcutsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));    
        
        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: false,
            x_expand: false,
            y_expand: false,
            y_align: Clutter.ActorAlign.END,
            x_align: Clutter.ActorAlign.CENTER
        });	
        this.actionsBox.style = "spacing: 16px;";

        if(this._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton( this);
            this.actionsBox.add(logout.actor);
        }  
        if(this._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton( this);
            this.actionsBox.add(lock.actor);
        }
        if(this._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton( this);
            this.actionsBox.add(suspend.actor);
        }
        if(this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton( this);
            this.actionsBox.add(power.actor);
        }           
        this.leftBox.add(this.actionsBox);
        
        this.loadCategories();
        this.displayCategories();
        this.setDefaultMenuView();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayGnomeFavorites();
    }
    
    reload() {
        super.reload(); 
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 70;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.FAVORITES);
        this.categoryDirectories.set(Constants.CategoryType.FAVORITES, categoryMenuItem);

        categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.ALL_PROGRAMS);
        this.categoryDirectories.set(Constants.CategoryType.ALL_PROGRAMS, categoryMenuItem);

        super.loadCategories();
    }
    
    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
