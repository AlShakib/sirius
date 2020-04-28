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

const {Clutter, GLib, Gio, GMenu, Gtk, Shell, St} = imports.gi;
const AppFavorites = imports.ui.appFavorites;
const appSys = Shell.AppSystem.get_default();
const ArcSearch = Me.imports.search;
const ArcGridSearch = Me.imports.searchGrid;
const Constants = Me.imports.constants;
const GnomeSession = imports.misc.gnomeSession;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;

//This class handles the core functionality of all the menu layouts.
//Each menu layout extends this class.
var BaseLayout = class {
    constructor(mainButton, layoutProperties) {
        this._button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.subMenuManager = mainButton.subMenuManager;
        this.leftClickMenu = mainButton.leftClickMenu;
        this.layout = this._settings.get_enum('menu-layout');
        this.layoutProperties = layoutProperties;

        this._session = new GnomeSession.SessionManager();
        
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this.isRunning = true;
        this.shouldLoadFavorites = true;

        if(this.layoutProperties.Search){
            if(this.layoutProperties.SearchType == Constants.SearchType.LIST_VIEW)
                this.newSearch = new ArcSearch.SearchResults(this);    
            else if(this.layoutProperties.SearchType == Constants.SearchType.GRID_VIEW)
                this.newSearch = new ArcGridSearch.SearchResults(this);  
        }

        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));
        
        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', () => {
            this.needsReload = true;
        });

        this._gnomeFavoritesReloadID = AppFavorites.getAppFavorites().connect('changed', () => {
            let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FAVORITES);
            if(categoryMenuItem)
                this._loadGnomeFavorites(categoryMenuItem);
        });

        this.mainBox.vertical = this.layoutProperties.VerticalMainBox;
        this.createLayout();
        this.updateStyle();
    }

    updateIcons(){
        this.applicationsMap.forEach((value,key,map)=>{
            map.get(key)._updateIcon();
        });
        this.newSearch._reset(); 
    }

    resetSearch(){
        this.searchBox.clear();
        this.setDefaultMenuView();  
    }

    setDefaultMenuView(){
        if(this.layoutProperties.Search){
            this.searchBox.clear();
            this.newSearch._reset();
        }

        this._clearActorsFromBox();
        
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        if(this.categoriesScrollBox){
            appsScrollBoxAdj = this.categoriesScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
        if(this.shortcutsScrollBox){
            appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
        if(this.actionsScrollBox){
            appsScrollBoxAdj = this.actionsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
        if(this.vertSep!=null)
            this.vertSep.queue_repaint(); 
    }

    reload(){
        let isReload = true;
        this.destroy(isReload);
        this.createLayout();
        this.updateStyle();
    }

    updateStyle(){
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(this.layoutProperties.Search){
            this.searchBox.updateStyle(this._settings.get_boolean('disable-searchbox-border'))
            addStyle ? this.newSearch.setStyle('arc-menu-status-text') : this.newSearch.setStyle(''); 
            if(addStyle){
                this.searchBox._stEntry.remove_style_class_name('default-search-entry');
                this.searchBox._stEntry.add_style_class_name('arc-search-entry');
            }
            else{
                this.searchBox._stEntry.remove_style_class_name('arc-search-entry');
                this.searchBox._stEntry.add_style_class_name('default-search-entry');
            } 
        }
        if(this.actionsBox){
            this.actionsBox.get_children().forEach((actor) => {
                if(actor instanceof St.Button){
                    addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            });
        }
    }

    loadCategories(categoryWidget = MW.CategoryMenuItem, isIconGrid = false){  
        this.applicationsMap = new Map();    
        this._tree.load_sync();
        let root = this._tree.get_root_directory();
        let iter = root.iter();
        let nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let dir = iter.get_directory();                  
                if (!dir.get_is_nodisplay()) {
                    let categoryId = dir.get_menu_id();
                    let categoryMenuItem = new categoryWidget(this, dir, isIconGrid);
                    this.categoryDirectories.set(categoryId, categoryMenuItem);
                    let foundRecentlyInstallApp = this._loadCategory(isIconGrid, categoryId, dir);
                    categoryMenuItem.setRecentlyInstalledIndicator(foundRecentlyInstallApp);
                    //Sort the App List Alphabetically
                    categoryMenuItem.appList.sort((a, b) => {
                        return a.get_name().toLowerCase() > b.get_name().toLowerCase();
                    });
                }
            }
        }
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.ALL_PROGRAMS);
        if(categoryMenuItem){
            let appList = [];
            this.applicationsMap.forEach((value,key,map) => {
                appList.push(key);
                //Show Recently Installed Indicator on All Programs category
                if(value.isRecentlyInstalled && !categoryMenuItem.isRecentlyInstalled)
                    categoryMenuItem.setRecentlyInstalledIndicator(true);
            });
            appList.sort((a, b) => {
                return a.get_name().toLowerCase() > b.get_name().toLowerCase();
            });
            categoryMenuItem.appList = appList;
        }
        categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FAVORITES);
        if(categoryMenuItem){
            this._loadGnomeFavorites(categoryMenuItem);
        }
    }

    _loadCategory(isIconGrid, categoryId, dir, submenuItem) {
        let iter = dir.iter();
        let nextType;
        let foundRecentlyInstallApp = false;
        let isLayoutSimple2 = this.layout == Constants.MENU_LAYOUT.Simple2;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.ENTRY) {
                let entry = iter.get_entry();
                let id;
                try {
                    id = entry.get_desktop_file_id();
                } catch (e) {
                    continue;
                }
                let app = appSys.lookup_app(id);
                if (!app)
                    app = new Shell.App({ app_info: entry.get_app_info() });
                if (app.get_app_info().should_show()){
                    let item = this.applicationsMap.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app, isIconGrid);
                    }
                    let disabled = this._settings.get_boolean("disable-recently-installed-apps")
                    if(!disabled && item.isRecentlyInstalled)
                        foundRecentlyInstallApp = true;
                    if(!submenuItem){
                        let categoryMenuItem = this.categoryDirectories.get(categoryId);
                        categoryMenuItem.appList.push(app);
                        this.applicationsMap.set(app, item);
                    }
                    else{
                        submenuItem.applicationsMap.set(app, item);
                    }
                } 
            } 
            else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay()){
                    if(this._settings.get_boolean('enable-sub-menus') && !isIconGrid && !isLayoutSimple2){
                        let submenuItem = this.applicationsMap.get(subdir);
                        if (!submenuItem) {
                            submenuItem = new MW.CategorySubMenuItem(this, subdir);
                            submenuItem._setParent(this.leftClickMenu);
                            let categoryMenuItem = this.categoryDirectories.get(categoryId);
                            categoryMenuItem.appList.push(subdir);
                            this.applicationsMap.set(subdir, submenuItem);
                        }
                        let recentlyInstallApp = this._loadCategory(isIconGrid, categoryId, subdir, submenuItem);
                        if(recentlyInstallApp)
                            foundRecentlyInstallApp = true;
                        submenuItem.setRecentlyInstalledIndicator(foundRecentlyInstallApp);
                    }
                    else{
                        let recentlyInstallApp = this._loadCategory(isIconGrid, categoryId, subdir);
                        if(recentlyInstallApp)
                            foundRecentlyInstallApp = true;
                    }
                }    
            }
        }
        return foundRecentlyInstallApp;
    }

    setRecentlyInstalledIndicator(){
        let disabled = this._settings.get_boolean("disable-recently-installed-apps")
        if(!disabled){
            for(let categoryMenuItem of this.categoryDirectories.values()){
                categoryMenuItem.setRecentlyInstalledIndicator(false);
                for(let i = 0; i < categoryMenuItem.appList.length; i++){
                    let item = this.applicationsMap.get(categoryMenuItem.appList[i]);
                    if(item instanceof MW.CategorySubMenuItem){
                        item.setRecentlyInstalledIndicator(false);
                        for(let menuItem of item.applicationsMap.values()){
                            if(menuItem.isRecentlyInstalled){
                                item.setRecentlyInstalledIndicator(true);
                                break;
                            }
                        }
                    }
                    if(item.isRecentlyInstalled){
                        categoryMenuItem.setRecentlyInstalledIndicator(true);
                        break;
                    }   
                }
            }
        }
    }   

    displayCategories(categoriesBox){
        if(!categoriesBox){
            categoriesBox = this.applicationsBox;
        }
        this._clearActorsFromBox(categoriesBox);
        if(this.viewProgramsButton){
            this.viewProgramsButton.actor.hide();
            if(this._settings.get_boolean('enable-pinned-apps'))
                this.backButton.actor.show();
            else{
                this.viewProgramsButton.actor.show();
                this.backButton.actor.hide();
            }
        }
        let isActiveMenuItemSet = false;
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoriesBox.add_actor(categoryMenuItem.actor);	
            if(!isActiveMenuItemSet){
                isActiveMenuItemSet = true;
                this.activeMenuItem = categoryMenuItem;
                if(this.leftClickMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }	 
        }
    }

    displayGnomeFavorites(){
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FAVORITES);
        if(categoryMenuItem){
            this.displayCategoryAppList(categoryMenuItem.appList);
        }
    }

    _loadGnomeFavorites(categoryMenuItem){
        let appList = AppFavorites.getAppFavorites().getFavorites();

        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });

        //Show Recently Installed Indicator on GNOME favorites category
        for(let i = 0; i < appList.length; i++){
            let item = this.applicationsMap.get(appList[i]);
            if(item && item.isRecentlyInstalled && !categoryMenuItem.isRecentlyInstalled)
                categoryMenuItem.setRecentlyInstalledIndicator(true);
        }

        categoryMenuItem.appList = appList;
    }

    _displayPlaces() {
        var SHORTCUT_TRANSLATIONS = [_("Home"), _("Documents"), _("Downloads"), _("Music"), _("Pictures"), _("Videos"), _("Computer"), _("Network")];
        let directoryShortcuts = this._settings.get_value('directory-shortcuts-list').deep_unpack();
        for (let i = 0; i < directoryShortcuts.length; i++) {
            let directory = directoryShortcuts[i];
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
            
            this.shortcutsBox.add_actor(placeMenuItem.actor);
        }
    }

    loadPinnedApps(pinnedAppsArray, separatorIndex){
        let pinnedApps = pinnedAppsArray;
        if(!pinnedApps.length || !Array.isArray(pinnedApps)){
            pinnedApps = this._updatePinnedApps();
        }
        
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');

        for(let i = 0;i<pinnedApps.length;i+=3){
            if(i == separatorIndex * 3 && i != 0)
                this._addSeparator();
            let app = Shell.AppSystem.get_default().lookup_app(pinnedApps[i+2]);
            
            let placeInfo, placeMenuItem;
            if(pinnedApps[i+2]=="ArcMenu_Home"){
                let homePath = GLib.get_home_dir();
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
                placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            }
            else if(pinnedApps[i+2]=="ArcMenu_Computer"){
                placeInfo = new PlaceDisplay.RootInfo();
                placeInfo.icon = placeInfo.icon.to_string();
                placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            }
            else if(pinnedApps[i+2]=="ArcMenu_Network"){
                placeInfo = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
                placeInfo.icon = placeInfo.icon.to_string();
                placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);    
            }
            else if(pinnedApps[i+2] == "ArcMenu_Suspend" || pinnedApps[i+2] == "ArcMenu_LogOut" || pinnedApps[i+2] == "ArcMenu_PowerOff"
                    || pinnedApps[i+2] == "ArcMenu_Lock" || app){
                placeMenuItem = new MW.MintButton(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2]);
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
                    placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
                }
            }
            else{
                let path = pinnedApps[i+2];
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(pinnedApps[i]), (pinnedApps[i+1] !== "ArcMenu_Folder") ? pinnedApps[i+1] : null);
                placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            }   
            if(addStyle) 
                placeMenuItem.actor.add_style_class_name('arc-menu-action');
            placeMenuItem.actor.x_expand = false;
            placeMenuItem.actor.y_expand = false;
            placeMenuItem.actor.y_align = Clutter.ActorAlign.CENTER;
            placeMenuItem.actor.x_align = Clutter.ActorAlign.CENTER;
            this.actionsBox.add(placeMenuItem.actor);
        }  
    }

    loadFavorites(isIconGrid = false) {
        let pinnedApps = this._settings.get_strv('pinned-app-list');
        this.favoritesArray=null;
        this.favoritesArray=[];
        for(let i = 0;i<pinnedApps.length;i+=3){
            if(i == 0 && pinnedApps[0]=="ArcMenu_WebBrowser")
                this._updatePinnedAppsWebBrowser(pinnedApps);
            let favoritesMenuItem = new MW.FavoritesMenuItem(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2], isIconGrid);
            favoritesMenuItem.connect('saveSettings', ()=> {
                let array = [];
                for(let i = 0;i < this.favoritesArray.length; i++){
                    array.push(this.favoritesArray[i]._name);
                    array.push(this.favoritesArray[i]._iconPath);
                    array.push(this.favoritesArray[i]._command);		   
                }
                this._settings.set_strv('pinned-app-list',array);
            });
            this.favoritesArray.push(favoritesMenuItem);
        }   
    }

    _updatePinnedAppsWebBrowser(pinnedApps){
        //Find the Default Web Browser, if found add to pinned apps list, if not found delete the placeholder.
        //Will only run if placeholder is found. Placeholder only found with default settings set.
        if(pinnedApps[0]=="ArcMenu_WebBrowser")
        {     
            let [res, stdout, stderr, status] = GLib.spawn_command_line_sync("xdg-settings get default-web-browser");
            let webBrowser = String.fromCharCode.apply(null, stdout);
            let browserName = webBrowser.split(".desktop")[0];
            browserName+=".desktop";
            this._app = appSys.lookup_app(browserName);
            if(this._app){
                let appIcon = this._app.create_icon_texture(25);
                let iconName = '';
                if(appIcon.icon_name)
                    iconName = appIcon.icon_name;
                else if(appIcon.gicon)
                    iconName = appIcon.gicon.to_string();
                pinnedApps[0] = this._app.get_name();
                pinnedApps[1] = iconName;
                pinnedApps[2] = this._app.get_id();
            }
            else{
                pinnedApps.splice(0,3);
            }
            this.shouldLoadFavorites = false; // We don't want to trigger a setting changed event
            this._settings.set_strv('pinned-app-list',pinnedApps);
            this.shouldLoadFavorites = true;
        }
    }

    displayFavorites() {
        this._clearActorsFromBox();
        if(this.viewProgramsButton){
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }

        for(let i = 0;i < this.favoritesArray.length; i++){
            this.applicationsBox.add_actor(this.favoritesArray[i].actor);	
            if(!this.favoritesArray[i].shouldShow)
                this.favoritesArray[i].actor.hide();
            if(i==0){
                this.activeMenuItem = this.favoritesArray[i];
                if(this.leftClickMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }	   
        }
    }

    placesAddSeparator(id){
        this._sections[id].box.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT));  
    }

    _redisplayPlaces(id) {
        if(this._sections[id].length>0){
            this.bookmarksShorctus = false;
            this.externalDevicesShorctus = false;
            this.networkDevicesShorctus = false;
            this._sections[id].removeAll();
            this._sections[id].box.destroy_all_children();
        }
        this._createPlaces(id);
    }

    _createPlaces(id) {
        let places = this.placesManager.get(id);
        if(this.placesManager.get('network').length>0)
            this.networkDevicesShorctus = true; 
        if(this.placesManager.get('devices').length>0)
            this.externalDevicesShorctus=true;  
        if(this.placesManager.get('bookmarks').length>0)
            this.bookmarksShorctus = true;

        if (this._settings.get_boolean('show-bookmarks')){
            if(id=='bookmarks' && places.length>0){
                for (let i = 0; i < places.length; i++){
                    let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
                    this._sections[id].addMenuItem(item); 
                } 
                //create a separator if bookmark and software shortcut are both shown
                if(this.bookmarksShorctus && this.softwareShortcuts){
                    this.placesAddSeparator(id);
                }
            }
        }
        if (this._settings.get_boolean('show-external-devices')){
            if(id== 'devices'){
                for (let i = 0; i < places.length; i++){
                    let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
                    this._sections[id].addMenuItem(item); 
                }
                if((this.externalDevicesShorctus &&  !this.networkDevicesShorctus)  
                    &&  (this.bookmarksShorctus || this.softwareShortcuts))
                        this.placesAddSeparator(id);
            }
            if(id== 'network'){
                for (let i = 0; i < places.length; i++){
                    let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
                    this._sections[id].addMenuItem(item); 
                }
                if(this.networkDevicesShorctus &&  (this.bookmarksShorctus || this.softwareShortcuts))
                        this.placesAddSeparator(id);                        
            }
        }
    }   

    setActiveCategory(category, setActive = true){
        this.activeMenuItem = category;
        if(setActive){
            category.setFakeActive(true);
            if(this.leftClickMenu.isOpen){
                this.activeMenuItem.actor.grab_key_focus();
            }
        }
        else if(this.leftClickMenu.isOpen){
            this.mainBox.grab_key_focus();
        }
    }

    _clearActorsFromBox(box) {
        if(!box){
            box = this.applicationsBox;
        }
        this.activeMenuItem = null;
        let actors = box.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            if(actor._delegate && actor._delegate instanceof MW.CategorySubMenuItem)
                actor._delegate.menu.close();
            box.remove_actor(actor);
        }
    }

    displayCategoryAppList(appList){
        this._clearActorsFromBox();
        this._displayAppList(appList);
        if(this.viewProgramsButton){
            this.backButton.actor.show();
            this.viewProgramsButton.actor.hide();
            this.currentMenu = Constants.CURRENT_MENU.CATEGORY_APPLIST;
        }
    }

    _displayAppList(apps) {    
        let activeMenuItemSet = false;    
        for (let i = 0; i < apps.length; i++) {
            let app = apps[i];
            let item = this.applicationsMap.get(app);
            if (!item) {
                item = new MW.ApplicationMenuItem(this, app);
                this.applicationsMap.set(app, item);
            }
            if(item.actor.get_parent()){
                item.actor.get_parent().remove_actor(item.actor);
            }
            if (!item.actor.get_parent()) 
                this.applicationsBox.add_actor(item.actor);
            if(item instanceof MW.CategorySubMenuItem){
                this.applicationsBox.add_actor(item.menu.actor);
                item._updateIcons();
            }
            if(!activeMenuItemSet){
                activeMenuItemSet = true;  
                this.activeMenuItem = item;
                if(this.leftClickMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }    
        }
    }

    _displayAppGridList(apps, columns, isFavoriteMenuItem, differentGrid = null) {               
        let count = 0;
        let top = -1;
        let left = 0;
        let grid = differentGrid ? differentGrid : this.grid;
        let activeMenuItemSet = false;
        for (let i = 0; i < apps.length; i++) {
            let app = apps[i];
            let item;
            let shouldShow = true;

            if(isFavoriteMenuItem){
                item = app;
                if(!item.shouldShow)
                    shouldShow = false;
            }
            else
                item = this.applicationsMap.get(app);

            if (!item) {
                let isIconGrid = true;
                item = new MW.ApplicationMenuItem(this, app, isIconGrid);
                this.applicationsMap.set(app, item);
            }

            if(shouldShow){
                if(count % columns == 0){
                    top++;
                    left = 0;
                }
                grid.layout_manager.attach(item, left, top, 1, 1);
                left++;
                count++;
    
                if(!activeMenuItemSet && !differentGrid){
                    activeMenuItemSet = true;  
                    this.activeMenuItem = item;
                    this.firstItem = item;
                    if(this.leftClickMenu.isOpen){
                        this.mainBox.grab_key_focus();
                    }
                }
            }
        }
    }

    displayAllApps(){
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._clearActorsFromBox();
        this._displayAppList(appList);
        if(this.viewProgramsButton){
            this.backButton.actor.show();
            this.viewProgramsButton.actor.hide();  
        }
    }

    _onSearchBoxKeyPress(searchBox, event) {
        let symbol = event.get_key_symbol();
        if (!searchBox.isEmpty() && searchBox.hasKeyFocus()) {
            if (symbol == Clutter.Up) {
                this.newSearch.highlightDefault(false);
                return Clutter.EVENT_PROPAGATE;
            }
            else if (symbol == Clutter.Down) {
                this.newSearch.highlightDefault(false);
                return Clutter.EVENT_PROPAGATE;
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _onSearchBoxKeyFocusIn(searchBox) {
        if (!searchBox.isEmpty()) {
            this.newSearch.highlightDefault(false);
        }
    }

    _onSearchBoxChanged(searchBox, searchString) {        
        if(this.currentMenu != Constants.CURRENT_MENU.SEARCH_RESULTS){              
            this.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;        
        }
        if(searchBox.isEmpty()){  
            this.newSearch.setTerms(['']); 
            this.setDefaultMenuView();                     	          	
            this.newSearch.actor.hide();
        }            
        else{         
            this._clearActorsFromBox(); 
            this.applicationsBox.add(this.newSearch.actor); 
            this.newSearch.highlightDefault(true);
            this.newSearch.actor.show();         
            this.newSearch.setTerms([searchString]); 

            if(this.viewProgramsButton){
                this.backButton.actor.show();
                this.viewProgramsButton.actor.hide();   
            }  
        }            	
    }

    scrollToItem(button, scrollView, direction) {
        if(button!=null){
            let appsScrollBoxAdj = scrollView.get_vscroll_bar().get_adjustment();
            let catsScrollBoxAlloc = scrollView.get_allocation_box();
            let boxHeight = catsScrollBoxAlloc.y2 - catsScrollBoxAlloc.y1;
            let[v, l, upper] = appsScrollBoxAdj.get_values();
            let currentScrollValue = appsScrollBoxAdj.get_value();
            let box = button.actor.get_allocation_box();
            let buttonHeight = box.y1 - box.y2;
    
            if(direction == Constants.DIRECTION.DOWN && currentScrollValue == 0){
                currentScrollValue=.01;
                appsScrollBoxAdj.set_value(currentScrollValue);
            }
            else if(direction == Constants.DIRECTION.UP && (currentScrollValue + boxHeight) == upper){
                currentScrollValue-=0.01;
                appsScrollBoxAdj.set_value(currentScrollValue);
            }
            else{
                direction == Constants.DIRECTION.UP ? buttonHeight = buttonHeight : buttonHeight = - buttonHeight;
                appsScrollBoxAdj.set_value(currentScrollValue + buttonHeight);
            }
        }
    }

    setCurrentMenu(menu){
        this.currentMenu = menu;
    }

    getCurrentMenu(){
        return this.currentMenu;
    } 

    _onMainBoxKeyPress(mainBox, event) {
        if (event.has_control_modifier()) {
            if(this.searchBox)
                this.searchBox.grabKeyFocus();
            return Clutter.EVENT_PROPAGATE;
        }

        let symbol = event.get_key_symbol();
        let key = event.get_key_unicode();

        switch (symbol) {
            case Clutter.KEY_BackSpace:
                if(this.searchBox){
                    if (!this.searchBox.hasKeyFocus()) {
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText().slice(0, -1);
                        this.searchBox.setText(newText);
                    }
                }
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Tab:
            case Clutter.KEY_KP_Tab:
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Up:
            case Clutter.KEY_Down:
            case Clutter.KEY_Left:
            case Clutter.KEY_Right:       
                if(this.layoutProperties.Search && this.searchBox.hasKeyFocus() && this.newSearch._defaultResult){
                    if(this.newSearch.actor.get_parent()){
                        this.newSearch._defaultResult.actor.grab_key_focus();
                        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
                        appsScrollBoxAdj.set_value(0);
                        return Clutter.EVENT_STOP;
                    }                   
                    else{
                        return Clutter.EVENT_PROPAGATE;
                    } 
                }
                else if(this.activeMenuItem!=null && !this.activeMenuItem.actor.has_key_focus()){
                    this.activeMenuItem.actor.grab_key_focus();
                    return Clutter.EVENT_STOP;
                }
                else if(this.activeMenuItem!=null){
                    this.activeMenuItem.actor.grab_key_focus();
                    return Clutter.EVENT_PROPAGATE;
                }
                else if(this.firstItem){
                    this.firstItem.actor.grab_key_focus();
                    this.firstItem = null;
                    return Clutter.EVENT_STOP;
                }
                else{
                    return Clutter.EVENT_PROPAGATE;
                }
            case Clutter.KEY_KP_Enter:
            case Clutter.KEY_Return:
                return Clutter.EVENT_PROPAGATE;
            default:
                if (key.length != 0) {
                    if(this.searchBox){
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText() + key;
                        this.searchBox.setText(newText);
                    }
                }
        }
        return Clutter.EVENT_PROPAGATE;
    }

    destroy(isReload){
        if(this.applicationsMap){
            this.applicationsMap.forEach((value,key,map)=>{
                value.destroy();
            });
            this.applicationsMap = null;
        }

        if(this.categoryDirectories){
            this.categoryDirectories.forEach((value,key,map)=>{
                value.destroy();
            });
            this.categoryDirectories = null;    
        }

        if(this.favoritesArray){
            for (let i = 0; i < this.favoritesArray.length; i++) {
                this.favoritesArray[i].destroy();
            }
            this.favoritesArray = null;
        }

        if(this.network != null){
            this.network.destroy();
            this.networkMenuItem.destroy();
        }

        if(this.computer != null){
            this.computer.destroy();
            this.computerMenuItem.destroy();
        }

        if(this.placesManager != null)
            this.placesManager.destroy();

        if(this.searchBox != null){
            if (this._searchBoxChangedId > 0) {
                this.searchBox.disconnect(this._searchBoxChangedId);
                this._searchBoxChangedId = 0;
            }
            if (this._searchBoxKeyPressId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyPressId);
                this._searchBoxKeyPressId = 0;
            }
            if (this._searchBoxKeyFocusInId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyFocusInId);
                this._searchBoxKeyFocusInId = 0;
            }
        }

        if(!isReload){
            if(this.newSearch){
                this.newSearch.destroy();
            }

            if (this._mainBoxKeyPressId > 0) {
                this.mainBox.disconnect(this._mainBoxKeyPressId);
                this._mainBoxKeyPressId = 0;
            }

            if (this._treeChangedId > 0) {
                this._tree.disconnect(this._treeChangedId);
                this._treeChangedId = 0;
                this._tree = null;
            }
            if(this._gnomeFavoritesReloadID){
                AppFavorites.getAppFavorites().disconnect(this._gnomeFavoritesReloadID);
                this._gnomeFavoritesReloadID = null;
            }

            this.isRunning = false;
        }
       
        this.mainBox.destroy_all_children();
    }

    _createScrollBox(params){
        let scrollBox = new St.ScrollView(params);      

        let panAction = new Clutter.PanAction({ interpolate: false });
        panAction.connect('pan', (action) => {
            this._blockActivateEvent = true;
            this.onPan(action, scrollBox);
        });
        panAction.connect('gesture-cancel',(action) => this.onPanEnd(action, scrollBox));
        panAction.connect('gesture-end', (action) => this.onPanEnd(action, scrollBox));
        scrollBox.add_action(panAction);

        scrollBox.connect('key-press-event', (actor, event) => {
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this.activeMenuItem, scrollBox, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this.activeMenuItem, scrollBox, Constants.DIRECTION.DOWN);
        }) ;         
        scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        scrollBox.clip_to_allocation = true;

        return scrollBox;
    }

    onPan(action, scrollbox) {
        let [dist_, dx_, dy] = action.get_motion_delta(0);
        let adjustment = scrollbox.get_vscroll_bar().get_adjustment();
        adjustment.value -= (dy / scrollbox.height) * adjustment.page_size;
        return false;
    }
    
    onPanEnd(action, scrollbox) {
        let velocity = -action.get_velocity(0)[2];
        let endPanValue = scrollbox.get_vscroll_bar().get_adjustment().value + velocity;
        let adjustment = scrollbox.get_vscroll_bar().get_adjustment();
        adjustment.value = endPanValue;
    }

    _createHorizontalSeparator(style){
        let alignment = Constants.SEPARATOR_ALIGNMENT.HORIZONTAL;
        let hSep = new MW.SeparatorDrawingArea(this._settings, alignment, style,{
            x_expand:true,
            y_expand:false,
            y_align: Clutter.ActorAlign.END
        });
        hSep.queue_repaint();
        return hSep;
    }

    _createVerticalSeparator(style){    
        let alignment = Constants.SEPARATOR_ALIGNMENT.VERTICAL;
        style = style ? style : Constants.SEPARATOR_STYLE.NORMAL;
        this.vertSep = new MW.SeparatorDrawingArea(this._settings, alignment, style,{
            x_expand:true,
            y_expand:true,
            style_class: 'vert-sep'
        });
        this.vertSep.queue_repaint();
        return this.vertSep;
    }
};
