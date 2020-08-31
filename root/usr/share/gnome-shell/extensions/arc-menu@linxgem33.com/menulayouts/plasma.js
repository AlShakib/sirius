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

const {Clutter, Gio, GLib, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton,{
            Search: true,
            SearchType: Constants.SearchType.LIST_VIEW,
            VerticalMainBox: true
        });
    }

    createLayout(){
        this.searchBox = new MW.SearchBox(this);

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            vertical: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START
        });
        this.leftTopBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            vertical: false,
            y_align: Clutter.ActorAlign.START,
            style: "padding-left: 10px; margin-left: 0.4em"
        });
        this.rightTopBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            vertical: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            style_class: 'popup-menu-item',
            style: "padding: 0px; margin: 0px; spacing: 0px;"
        });

        this.user = new MW.UserMenuIcon(this, 55);
        this.user.actor.x_expand = false;
        this.user.actor.y_expand = false;
        this.user.actor.x_align = Clutter.ActorAlign.CENTER;
        this.user.actor.y_align = Clutter.ActorAlign.CENTER;
        this.leftTopBox.add(this.user.actor);

        this.rightTopBox.add(new St.Label({
            text: GLib.get_real_name(), y_expand: false, x_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style: "padding-left: 0.4em; margin: 0px 10px 0px 15px; font-weight: bold;"
        }));
        this.rightTopBox.add(this.searchBox.actor);

        this.topBox.add(this.leftTopBox);
        this.topBox.add(this.rightTopBox);

        this.searchBarLocation = this._settings.get_enum('searchbar-default-top-location');
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));

        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'vfade',
            overlay_scrollbars: true,
            reactive:true,
            style: "width:450px;"
        });
        
        this.applicationsBox = new St.BoxLayout({ 
            vertical: true
        });

        this.applicationsScrollBox.add_actor(this.applicationsBox);
    
        this.navigateBoxContainer = new St.BoxLayout({ 
            x_expand: true,
            y_expand: false,
            vertical: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START
        });
        this.navigateBox = new St.BoxLayout({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: "spacing: 6px;",
        });
        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_homogeneous: true,
            column_spacing: 10,
            row_spacing: 10
        });
        this.grid = new St.Widget({ 
            layout_manager: layout
        });
        layout.hookup_style(this.grid);
        this.navigateBox.add(this.grid);

        this.pinnedAppsButton = new MW.PlasmaMenuItem(this, _("Pinned Apps"), Me.path + '/media/icons/arc-menu-symbolic.svg');
        this.pinnedAppsButton.connect("activate", () => this.displayFavorites() );
        this.grid.layout_manager.attach(this.pinnedAppsButton, 0, 0, 1, 1);
        this.pinnedAppsButton.set_style_pseudo_class("active-item");

        this.applicationsButton = new MW.PlasmaMenuItem(this, _("Applications"), 'preferences-desktop-apps-symbolic');
        this.applicationsButton.connect("activate", () => this.displayCategories() );
        this.grid.layout_manager.attach(this.applicationsButton, 1, 0, 1, 1);

        this.computerButton = new MW.PlasmaMenuItem(this, _("Computer"), 'computer-symbolic');
        this.computerButton.connect("activate", () => this.displayComputerCategory() );
        this.grid.layout_manager.attach(this.computerButton, 2, 0, 1, 1);

        this.leaveButton = new MW.PlasmaMenuItem(this, _("Power Off"), 'system-shutdown-symbolic');
        this.leaveButton.connect("activate", () => this.displayPowerItems() );
        this.grid.layout_manager.attach(this.leaveButton, 3, 0, 1, 1);
        
        if(this.searchBarLocation === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.actor.style = "padding-top: 3px; padding-bottom: 6px; padding-left: 1em; padding-right: 0.25em; margin-right: .5em;";
            this.topBox.style = 'padding-top: 0.5em;'
            
            this.navigateBoxContainer.add(this.navigateBox);
            this.navigateBoxContainer.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
            this.navigateBoxContainer.y_expand = false;
            this.navigateBoxContainer.y_align = Clutter.ActorAlign.START;
            this.mainBox.add(this.navigateBoxContainer);
            this.mainBox.add(this.applicationsScrollBox);
            this.mainBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));

            this.mainBox.add(this.topBox);
        }
        else if(this.searchBarLocation === Constants.SearchbarLocation.TOP){
            this.searchBox.actor.style = "margin: 0px 10px 5px 10px; padding-top: 3px; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
            
            this.mainBox.add(this.topBox);
            this.mainBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
            this.mainBox.add(this.applicationsScrollBox);
            this.navigateBoxContainer.y_expand = true;
            this.navigateBoxContainer.y_align = Clutter.ActorAlign.END;
            this.navigateBoxContainer.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
            this.navigateBoxContainer.add(this.navigateBox);
            this.mainBox.add(this.navigateBoxContainer);
        }
           
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("Arc Menu Settings")];
        let applicationShortcutsList = this._settings.get_value('application-shortcuts-list').deep_unpack();
        this.applicationShortcuts = [];
        for(let i = 0; i < applicationShortcutsList.length; i++){
            let applicationName = applicationShortcutsList[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcutsList[i][1], applicationShortcutsList[i][2]);
            if(shortcutMenuItem.shouldShow)
                this.applicationShortcuts.push(shortcutMenuItem.actor);
        }

        var SHORTCUT_TRANSLATIONS = [_("Home"), _("Documents"), _("Downloads"), _("Music"), _("Pictures"), _("Videos"), _("Computer"), _("Network")];
        let directoryShortcutsList = this._settings.get_value('directory-shortcuts-list').deep_unpack();
        this._loadPlaces(directoryShortcutsList);
        
        this.externalDevicesBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });	
        this._sections = { };
        this.placesManager = new PlaceDisplay.PlacesManager();
        for (let i = 0; i < Constants.SECTIONS.length; i++) {
            let id = Constants.SECTIONS[i];
            this._sections[id] = new St.BoxLayout({
                vertical: true
            });	
            this.placeManagerUpdatedID = this.placesManager.connect(`${id}-updated`, () => {
                this._redisplayPlaces(id);
            });

            this._createPlaces(id);
            this.externalDevicesBox.add(this._sections[id]);
        }
        
        this.loadFavorites();
        this.loadCategories();
        this.setDefaultMenuView(); 
        this.updateIcons();
    }

    updateIcons(){
        let iconSize = 25;
        this.applicationsMap.forEach((value,key,map)=>{
            map.get(key).forceLargeIcon(iconSize);
        });
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.PINNED_APPS);
        if(categoryMenuItem){
            for(let favoriteMenuItem of categoryMenuItem.appList){
                favoriteMenuItem._icon.icon_size = iconSize;
            }
        }
        if(this.layoutProperties.Search)
            this.newSearch._reset(); 
        for(let i = 0; i < this.applicationShortcuts.length; i++){
            this.applicationShortcuts[i]._icon.icon_size = iconSize;
        }
        for(let i = 0; i < this.directoryShortcuts.length; i++){
            this.directoryShortcuts[i]._icon.icon_size = iconSize;
        }
        for(let id in this._sections){
            this._sections[id].get_children().forEach((child) =>{
                if(child instanceof PlaceDisplay.PlaceMenuItem)
                    child._icon.icon_size = iconSize;
            });
        };
    }

    clearActiveItem(){
        this.pinnedAppsButton.setActive(false);
        this.computerButton.setActive(false);
        this.applicationsButton.setActive(false);
        this.leaveButton.setActive(false);
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum === Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        

        super.loadCategories();
    }

    displayComputerCategory(){
        this._clearActorsFromBox(this.applicationsBox);
        this.applicationsBox.add(this.createLabelRow(_("Application Shortcuts")));
        for(let i = 0; i < this.applicationShortcuts.length; i++){
            this.applicationsBox.add(this.applicationShortcuts[i]);
        }
        this.applicationsBox.add(this.createLabelRow(_("Places")));
        for(let i = 0; i < this.directoryShortcuts.length; i++){
            this.applicationsBox.add(this.directoryShortcuts[i]);
        }
        this.applicationsBox.add(this.externalDevicesBox);
    }

    _createPlaces(id) {
        let places = this.placesManager.get(id);

        if(id === 'bookmarks' && places.length > 0){
            this._sections[id].add_actor(this.createLabelRow(_("Bookmarks")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(places[i], this);
                this._sections[id].add_actor(item); 
            } 
        }

        if(id === 'devices' && places.length > 0){
            this._sections[id].add_actor(this.createLabelRow(_("Devices")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(places[i], this);
                this._sections[id].add_actor(item); 
            }
        }

        if(id === 'network' && places.length > 0){
            this._sections[id].add_actor(this.createLabelRow(_("Network")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(places[i], this);
                this._sections[id].add_actor(item); 
            }
        }
    }   

    createLabelRow(title){
        let labelRow = new PopupMenu.PopupMenuItem(_(title), {
            hover: false,
            can_focus: false
        });  
        labelRow.actor.add_style_pseudo_class = () => { return false;};
        labelRow.label.style = 'font-weight: bold;';
        return labelRow;
    }

    displayFavorites(){
        this.activeCategoryType = Constants.CategoryType.PINNED_APPS;
        super.displayFavorites();
    }

    _loadPlaces(directoryShortcutsList) {
        this.directoryShortcuts = [];
        for (let i = 0; i < directoryShortcutsList.length; i++) {
            let directory = directoryShortcutsList[i];
            let placeInfo, placeMenuItem;
            if(directory[2]=="ArcMenu_Home"){
                let homePath = GLib.get_home_dir();
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
                placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            }
            else if(directory[2]=="ArcMenu_Computer"){
                placeInfo = new PlaceDisplay.RootInfo();
                placeMenuItem = new PlaceDisplay.PlaceMenuItem(placeInfo, this);
            }
            else if(directory[2]=="ArcMenu_Network"){
                placeInfo = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
                placeMenuItem = new PlaceDisplay.PlaceMenuItem(placeInfo, this);    
            }
            else if(directory[2].startsWith("ArcMenu_")){
                let path = directory[2].replace("ArcMenu_",'');

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
                    placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(directory[0]));
                    placeMenuItem = new MW.PlaceMenuItem(this, placeInfo)
                }
            }
            else{
                let path = directory[2];
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(directory[0]), (directory[1] !== "ArcMenu_Folder") ? directory[1] : null);
                placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            }
            
            this.directoryShortcuts.push(placeMenuItem);
        }
    }

    displayPowerItems(){
        this._clearActorsFromBox(this.applicationsBox);
        this.applicationsBox.add(this.createLabelRow(_("Session")));
        if(!this.lock)
            this.lock = new MW.PlasmaPowerItem(this, Constants.PowerType.LOCK, _("Lock"), 'changes-prevent-symbolic');
        this.applicationsBox.add(this.lock);

        if(!this.logOut)
            this.logOut = new MW.PlasmaPowerItem(this, Constants.PowerType.LOGOUT, _("Log Out"), 'application-exit-symbolic');
        this.applicationsBox.add(this.logOut);
        
        this.applicationsBox.add(this.createLabelRow(_("System")));
        if(!this.suspend)
            this.suspend = new MW.PlasmaPowerItem(this, Constants.PowerType.SUSPEND, _("Suspend"), 'media-playback-pause-symbolic');
        this.applicationsBox.add(this.suspend);

        if(!this.powerOff)
            this.powerOff = new MW.PlasmaPowerItem(this, Constants.PowerType.POWEROFF, _("Power Off..."), 'system-shutdown-symbolic');
        this.applicationsBox.add(this.powerOff);
    }

    displayAllApps(){
        super.displayAllApps();
    }

    displayCategories(){
        this.activeCategoryType = Constants.CategoryType.CATEGORIES_LIST;        
        this._clearActorsFromBox(this.applicationsBox);
        
        this.categoryHeader = new MW.PlasmaCategoryHeader(this);
        this.applicationsBox.add_actor(this.categoryHeader);
        let isActiveMenuItemSet = false;
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.applicationsBox.add_actor(categoryMenuItem.actor);	
            if(!isActiveMenuItemSet){
                isActiveMenuItemSet = true;
                this.activeMenuItem = categoryMenuItem;
                if(this.arcMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }	 
        }
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.clearActiveItem();
        this.pinnedAppsButton.set_style_pseudo_class("active-item");
        this.displayFavorites();
    }

    displayCategoryAppList(appList, category){
        this._clearActorsFromBox();
        this.applicationsBox.add_actor(this.categoryHeader);
        this.categoryHeader.setActiveCategory(this.activeCategory);
        this._displayAppList(appList, category);
        this.activeCategoryType = Constants.CategoryType.CATEGORY_APP_LIST; 
    }

    displayFrequentApps(){
        this._clearActorsFromBox();
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        let appList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i]);
                item.forceLargeIcon();
                appList.push(item);
            }
        }
        let activeMenuItemSet = false;
        for (let i = 0; i < appList.length; i++) {
            let item = appList[i];
            if(item.actor.get_parent())
                item.actor.get_parent().remove_actor(item.actor);
            if (!item.actor.get_parent()) 
                this.applicationsBox.add_actor(item.actor);
            if(!activeMenuItemSet){
                activeMenuItemSet = true;  
                this.activeMenuItem = item;
                if(this.arcMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }    
        }
    }

    _onSearchBoxChanged(searchBox, searchString){  
        super._onSearchBoxChanged(searchBox, searchString);  
        if(!searchBox.isEmpty()){
            this.clearActiveItem();
            this.activeCategoryType = Constants.CategoryType.SEARCH_RESULTS;   
        }            
    }
}
