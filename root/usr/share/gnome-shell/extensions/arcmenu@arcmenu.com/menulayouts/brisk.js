/*
 * Arc Menu - A traditional application menu for GNOME 3
 *
 * Arc Menu Lead Developer and Maintainer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * Arc Menu Founder, Former Maintainer, and Former Graphic Designer
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

const {Clutter, Gio, GLib, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
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
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.actor.style = "margin: 0px 10px 5px 10px; padding-top: 0.0em; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
            this.mainBox.add(this.searchBox.actor);
        }

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
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'small-vfade'
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

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add(horizonalFlip ? this.rightBox : this.leftBox);  
        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(horizonalFlip ? this.leftBox : this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'apps-menu small-vfade left-scroll-area-small'
        });

        this.leftBox.add(this.categoriesScrollBox);

        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox);
        
        this.actionsBox = new St.BoxLayout({ 
            vertical: true,
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.END
        });
        this.actionsBox.style = "padding: 5px 0px 0px 0px;"
        this.leftBox.add(this.actionsBox);
        
        //create new section for Power, Lock, Logout, Suspend Buttons
        this.sessionBox = new St.BoxLayout({
            vertical: false,
            x_expand: false,
            y_expand: false,
            y_align: Clutter.ActorAlign.END,
            x_align: Clutter.ActorAlign.CENTER
        });	
        this.sessionBox.style = "spacing: 16px;";

        if(this._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton( this);
            this.sessionBox.add(logout.actor);
        }  
        if(this._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton( this);
            this.sessionBox.add(lock.actor);
        }
        if(this._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton( this);
            this.sessionBox.add(suspend.actor);
        }
        if(this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton( this);
            this.sessionBox.add(power.actor);
        }           
        this.leftBox.add(this.sessionBox);
        
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.actor.style ="margin: 10px 10px 0px 10px;";
            this.mainBox.add(this.searchBox.actor); 
        }

        this.loadFavorites();
        this.loadCategories();
        this.loadPinnedShortcuts();
        this.displayCategories();
        this.setDefaultMenuView();
    }

    updateStyle(){
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(this.sessionBox){
            this.sessionBox.get_children().forEach((actor) => {
                if(actor instanceof St.Button){
                    addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            });
        }
        super.updateStyle();
    }

    loadPinnedShortcuts(){
        this.actionsBox.destroy_all_children();
        this.actionsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
        let pinnedApps = this._settings.get_strv('brisk-shortcuts-list');
        this.favoritesArray=null;
        this.favoritesArray=[];

        for(let i = 0;i<pinnedApps.length;i+=3){
            let app = Shell.AppSystem.get_default().lookup_app(pinnedApps[i+2]);
            
            let placeInfo, placeMenuItem;
            if(pinnedApps[i+2]=="ArcMenu_Home"){
                let homePath = GLib.get_home_dir();
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
                placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            }
            else if(pinnedApps[i+2]=="ArcMenu_Computer"){
                placeInfo = new PlaceDisplay.RootInfo();
                placeInfo.icon = placeInfo.icon.to_string();
                placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            }
            else if(pinnedApps[i+2]=="ArcMenu_Network"){
                placeInfo = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
                placeInfo.icon = placeInfo.icon.to_string();
                placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);    
            }
            else if(pinnedApps[i+2] == "ArcMenu_Software"){
                let software = Utils.findSoftwareManager();
                if(software)
                    placeMenuItem = new MW.ShortcutMenuItem(this, _("Software"), 'system-software-install-symbolic', software);
            }
            else if(pinnedApps[i+2] == Constants.ArcMenu_SettingsCommand || pinnedApps[i+2] == "ArcMenu_Suspend" || pinnedApps[i+2] == "ArcMenu_LogOut" || pinnedApps[i+2] == "ArcMenu_PowerOff"
                    || pinnedApps[i+2] == "ArcMenu_Lock" || app){
                placeMenuItem = new MW.ShortcutMenuItem(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2]);
            }
            else if(pinnedApps[i+2] === "ArcMenu_Trash"){
                placeMenuItem = new MW.ShortcutMenuItem(this, _("Trash"), '', "ArcMenu_Trash");
            }
            else if(pinnedApps[i+2].startsWith("ArcMenu_")){
                let path = pinnedApps[i+2].replace("ArcMenu_",'');

                if(path === "Documents")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS;
                else if(path === "Downloads")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_DOWNLOAD;
                else if(path === "Music")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_MUSIC;
                else if(path === "Pictures")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_PICTURES;
                else if(path === "Videos")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_VIDEOS;

                path = GLib.get_user_special_dir(path);
                if (path != null){
                    placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(pinnedApps[i]));
                    placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
                }
            }
            else{
                let path = pinnedApps[i+2];
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(pinnedApps[i]), (pinnedApps[i+1] !== "ArcMenu_Folder") ? pinnedApps[i+1] : null);
                placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            }   
            if(placeMenuItem){
                placeMenuItem.setIconSizeLarge();
                this.actionsBox.add(placeMenuItem.actor);
            }
        }
        this.actionsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));  
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.categoryDirectories.values().next().value.displayAppList();
        this.activeMenuItem = this.categoryDirectories.values().next().value;
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

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        

        super.loadCategories();
    }
    
    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
