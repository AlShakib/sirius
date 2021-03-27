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

const {Clutter, GLib, Gio, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const COLUMN_SPACING = 10;
const ROW_SPACING = 10;
const COLUMN_COUNT = 3;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            SearchType: Constants.SearchType.LIST_VIEW,
            VerticalMainBox: false
        });
    }
    createLayout(){     
        this.actionsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.actionsBox.style = "margin: 0px 5px 0px 10px; spacing: 10px;";
        this.mainBox.add(this.actionsBox);

        this.favoritesButton = new MW.ExtrasButton(this);
        this.favoritesButton.actor.y_expand = true;
        this.favoritesButton.actor.y_align= Clutter.ActorAlign.START;
        this.favoritesButton.actor.margin = 5;
        this.actionsBox.add(this.favoritesButton.actor);
        let userButton = new MW.CurrentUserButton(this);
        userButton.actor.expand = false;
        userButton.actor.margin = 5;
        this.actionsBox.add(userButton.actor);
        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            this.actionsBox.add_actor(placeMenuItem.actor);
        }
        let settingsButton = new MW.SettingsButton(this);
        settingsButton.actor.expand = false;
        settingsButton.actor.margin = 5;
        this.actionsBox.add(settingsButton.actor);
        this.powerButton = new MW.LeaveButton(this);
        this.powerButton.actor.expand = false;
        this.powerButton.actor.margin = 5;
        this.actionsBox.add(this.powerButton.actor);

        this.subMainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.mainBox.add(this.subMainBox);

        this.favoritesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade',
            style: "padding: 0px 12px;"
        });

        this.mainBox.add(this.favoritesScrollBox);
        this.favoritesBox = new St.BoxLayout({ 
            vertical: true,
            x_expand: true
        });
        this.favoritesScrollBox.add_actor(this.favoritesBox);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 0px 10px 0px 10px;padding-top: 15px; padding-left: 0.4em;padding-right: 0.4em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        
        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: COLUMN_SPACING,
            row_spacing: ROW_SPACING 
        });
        this.grid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });

        layout.hookup_style(this.grid);
        this.applicationsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'small-vfade'
        });   
        this.applicationsScrollBox.style = "width:300px;";   

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);
        this.subMainBox.add(this.searchBox.actor);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
        
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
        let applicationShortcutsList = this._settings.get_value('application-shortcuts-list').deep_unpack();
        this.applicationShortcuts = [];
        for(let i = 0; i < applicationShortcutsList.length; i++){
            let applicationName = applicationShortcutsList[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcutsList[i][1], applicationShortcutsList[i][2]);
            if(shortcutMenuItem.shouldShow)
                this.applicationShortcuts.push(shortcutMenuItem.actor);
        }

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
        this.displayAllApps();

        this._createFavoritesMenu();
        this._createLeaveMenu();
        this.setDefaultMenuView();
    }

    _createPlaces(id) {
        let places = this.placesManager.get(id);

        if(id === 'bookmarks' && places.length > 0){
            this._sections[id].add_actor(this.createLabelRow(_("Bookmarks")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(this, places[i]);
                this._sections[id].add_actor(item); 
            } 
        }

        if(id === 'devices' && places.length > 0){
            this._sections[id].add_actor(this.createLabelRow(_("Devices")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(this, places[i]);
                this._sections[id].add_actor(item); 
            }
        }

        if(id === 'network' && places.length > 0){
            this._sections[id].add_actor(this.createLabelRow(_("Network")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(this, places[i]);
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

    _loadPlaces(directoryShortcutsList) {
        this.directoryShortcuts = [];
        for (let i = 0; i < directoryShortcutsList.length; i++) {
            let directory = directoryShortcutsList[i];
            let placeMenuItem = this.createMenuItem(directory, Constants.MenuItemType.MENU_ITEM);         
            this.directoryShortcuts.push(placeMenuItem);
        }
    }

    _createLeaveMenu(){
        this.leaveMenu = new PopupMenu.PopupMenu(this.powerButton, 0.5 , St.Side.BOTTOM);

        let section = new PopupMenu.PopupMenuSection();
        this.leaveMenu.addMenuItem(section);  
        
        let box = new St.BoxLayout({
            vertical: true
        });   
        box._delegate = box;
        section.actor.add_actor(box); 

        box.add(this.createLabelRow(_("Session")));

        this.lock = new MW.PlasmaPowerItem(this, Constants.PowerType.LOCK, _("Lock"), 'changes-prevent-symbolic');
        this.lock._icon.icon_size = 16;
        box.add(this.lock);
        this.logOut = new MW.PlasmaPowerItem(this, Constants.PowerType.LOGOUT, _("Log Out"), 'application-exit-symbolic');
        this.logOut._icon.icon_size = 16;
        box.add(this.logOut);

        box.add(this.createLabelRow(_("System")));

        this.suspend = new MW.PlasmaPowerItem(this, Constants.PowerType.SUSPEND, _("Suspend"), 'media-playback-pause-symbolic');
        this.suspend._icon.icon_size = 16;
        box.add(this.suspend);
        
        this.restart = new MW.PlasmaPowerItem(this, Constants.PowerType.RESTART, _("Restart..."), Me.path + Constants.RESTART_ICON.Path);
        this.restart._icon.icon_size = 16;
        box.add(this.restart);
        
        this.powerOff = new MW.PlasmaPowerItem(this, Constants.PowerType.POWEROFF, _("Power Off..."), 'system-shutdown-symbolic');
        this.powerOff._icon.icon_size = 16;
        box.add(this.powerOff);
        this.subMenuManager.addMenu(this.leaveMenu);
        this.leaveMenu.actor.hide();
        Main.uiGroup.add_actor(this.leaveMenu.actor);
    }

    _createFavoritesMenu(){
        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_actor(this.dummyCursor);
        this.favoritesMenu = new PopupMenu.PopupMenu(this.dummyCursor, 0, St.Side.TOP);
        this.favoritesMenu.connect('open-state-changed', (menu, open) => {
            if(!open){
                this.favoritesButton.fake_release();
                this.favoritesButton.set_hover(false);
            }
            else{
                if(this.menuButton.tooltipShowingID){
                    GLib.source_remove(this.menuButton.tooltipShowingID);
                    this.menuButton.tooltipShowingID = null;
                    this.menuButton.tooltipShowing = false;
                }
                if(this.favoritesButton.tooltip){
                    this.favoritesButton.tooltip.hide();
                    this.menuButton.tooltipShowing = false;
                }
            }
        });
        this.section = new PopupMenu.PopupMenuSection();
        this.favoritesMenu.addMenuItem(this.section);  
        
        this.leftPanelPopup = new St.BoxLayout({
            vertical: true
        });   
        this.leftPanelPopup._delegate = this.leftPanelPopup;
        let headerBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });    
        this.leftPanelPopup.add(headerBox);

        this.backButton = new MW.BackMenuItem(this);
        headerBox.add(this.backButton.actor);
        headerBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));

        this.computerScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'small-vfade',
            overlay_scrollbars: true,
            reactive:true
        });   
        
        this.leftPanelPopup.add(this.computerScrollBox);
       
        this.computerBox = new St.BoxLayout({
            vertical: true
        });     
        this.computerScrollBox.add_actor(this.computerBox);

        this.computerBox.add(this.createLabelRow(_("Application Shortcuts")));
        for(let i = 0; i < this.applicationShortcuts.length; i++){
            this.computerBox.add(this.applicationShortcuts[i]);
        }
        this.computerBox.add(this.createLabelRow(_("Places")));
        for(let i = 0; i < this.directoryShortcuts.length; i++){
            this.computerBox.add(this.directoryShortcuts[i]);
        }
        this.computerBox.add(this.externalDevicesBox);

        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height = Math.round(this._settings.get_int('menu-height') / scaleFactor) - 1;
        this.leftPanelPopup.style = `height: ${height}px`;        
        this.section.actor.add_actor(this.leftPanelPopup); 
        this.displayFavorites();
        this.subMenuManager.addMenu(this.favoritesMenu);
        this.favoritesMenu.actor.hide();
        Main.uiGroup.add_actor(this.favoritesMenu.actor);
    }

    toggleLeaveMenu(){
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        this.leaveMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.leaveMenu.actor.add_style_class_name( addStyle ? 'arc-menu' : 'popup-menu');
        this.leaveMenu.toggle();
    }
    
    toggleFavoritesMenu(){
        let appsScrollBoxAdj = this.favoritesScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        this.favoritesMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.favoritesMenu.actor.add_style_class_name( addStyle ? 'arc-menu' : 'popup-menu');
        this.favoritesButton.tooltip.hide();
        let themeNode = this.arcMenu.actor.get_theme_node();
        let rise = themeNode.get_length('-arrow-rise');
        let backgroundColor = themeNode.get_color('-arrow-background-color');
        let shadeColor;
        let drawBoxshadow = true;
        if(backgroundColor.alpha ==0 || !backgroundColor || backgroundColor === Clutter.Color.TRANSPARENT){
            backgroundColor = themeNode.get_color('background-color');
            if(backgroundColor.alpha==0 || !backgroundColor || backgroundColor === Clutter.Color.TRANSPARENT){
                    drawBoxshadow = false;
            }
                
        }
        let styleProperties;
        if(drawBoxshadow){
            shadeColor = backgroundColor.shade(.35);
            backgroundColor = "rgba("+backgroundColor.red+","+backgroundColor.green+","+backgroundColor.blue+","+backgroundColor.alpha+")";
            shadeColor ="rgba("+shadeColor.red+","+shadeColor.green+","+shadeColor.blue+","+shadeColor.alpha+")";
            styleProperties = "box-shadow: 3px 0px 8px 0px "+shadeColor+";background-color: "+backgroundColor+";";
        }

        let borderRadius = themeNode.get_length('-arrow-border-radius');
        this.favoritesMenu.actor.style = "-boxpointer-gap: 0px; -arrow-border-color:transparent; -arrow-border-width:0px; width: 250px;"
                                            +"-arrow-base:0px;-arrow-rise:0px; -arrow-background-color:transparent;"
                                            +" border-radius: "+borderRadius+"px;" + styleProperties;

        let base = themeNode.get_length('-arrow-base');
        let borderWidth = themeNode.get_length('-arrow-border-width');

        this.arcMenu.actor.get_allocation_box();
        let [x, y] = this.arcMenu.actor.get_transformed_position();
        if(this.arcMenu._arrowSide === St.Side.TOP)
            y += rise + 1;
        else 
            y += 1;
        if(this.arcMenu._arrowSide === St.Side.LEFT)
            x = x + (borderRadius * 2) + rise + 1;
        else
            x = x + (borderRadius * 2);
        this.dummyCursor.set_position(Math.round(x+borderWidth), Math.round(y+borderWidth));
        this.favoritesMenu.toggle();
    }
    
    setDefaultMenuView(){
        super.setDefaultMenuView();

        this.displayAllApps();
        this.displayFavorites();
        let appsScrollBoxAdj = this.favoritesScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }

    loadFavorites(){
        let isIconGrid = true;
        super.loadFavorites(isIconGrid);
    }

    updateIcons(){
        for(let i = 0; i < this.frequentAppsList.length; i++){
            let item = this.frequentAppsList[i];
            item._updateIcon();
        };
        super.updateIcons();
    }

    displayAllApps(isGridLayout = false){
        this._clearActorsFromBox();
        let frequentAppsLabel = new PopupMenu.PopupMenuItem(_("Frequent"), {
            hover: false,
            can_focus: false
        });  
        frequentAppsLabel.actor.add_style_pseudo_class = () => { return false;};
        frequentAppsLabel.actor.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
        frequentAppsLabel.label.style = 'font-weight: bold;';
        this.applicationsBox.add_actor(frequentAppsLabel.actor)

        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        this.frequentAppsList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i]);
                this.frequentAppsList.push(item);
            }
        }
        let activeMenuItemSet = false;
        for (let i = 0; i < this.frequentAppsList.length; i++) {
            let item = this.frequentAppsList[i];
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

        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        
        let displayAllApps = !isGridLayout;
        this._displayAppList(appList, displayAllApps);
    }

    _reload() {
        super.reload();
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
        this.leftPanelPopup.style = `height: ${height}px`;  
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        super.loadCategories();
    }
    
    _clearActorsFromBox(box){
        super._clearActorsFromBox(box);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
    }

    _displayAppList(apps) {
        super._displayAppList(apps, true);
    }

    displayFavorites() {
        super._clearActorsFromBox(this.favoritesBox);
        this.grid.remove_all_children();
        let label = this.createLabelRow(_("Pinned Apps"));
        label.remove_actor(label._ornamentLabel);
        this.favoritesBox.add_actor(label);
        super._displayAppGridList(this.favoritesArray, COLUMN_COUNT, true, this.grid);
        if(!this.favoritesBox.contains(this.grid))
            this.favoritesBox.add(this.grid);
        if(this.arcMenu.isOpen){
            this.mainBox.grab_key_focus();
        }
        this.updateStyle();  
    }
}
