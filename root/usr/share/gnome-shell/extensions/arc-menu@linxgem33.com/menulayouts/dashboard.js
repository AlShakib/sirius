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

const {Clutter, Gtk, Meta, Shell, St} = imports.gi;
const Background = imports.ui.background;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const COLUMN_SPACING = 30;
const ROW_SPACING = 30;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            SearchType: Constants.SearchType.GRID_VIEW,
            VerticalMainBox: false,
            isDashboard: true
        });
    }

    createLayout(){
        this.oldArcMenu = this.arcMenu;
        this.columnCount = null;
        this.visible = false;

        if (this._mainBoxKeyPressId > 0) {
            this.mainBox.disconnect(this._mainBoxKeyPressId);
            this._mainBoxKeyPressId = 0;
        }
        
        Main.layoutManager.connect("startup-complete",()=>{
            this.updateLocation();
            this.setDefaultMenuView();
        })

        this.dashboard = new MW.Dashboard(this);
        this.dashboard.set_offscreen_redirect(Clutter.OffscreenRedirect.ALWAYS);
        this.dashboard.connect("key-press-event", (actor, keyEvent) => {
            switch (keyEvent.get_key_symbol()) {
            case Clutter.KEY_Escape:
                this.dashboard.close();
                this.newSearch.highlightDefault(false);
                return;
            default:
                this._onMainBoxKeyPress(actor, keyEvent);
            }
        });

        this.arcMenu = this.dashboard;
        this.arcMenu.isOpen = false;

        let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
        if(homeScreen)
            this.activeCategory = _("Pinned Apps");
        else
            this.activeCategory = _("All Programs");
        
        this.mainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
        });

        this.dashboardBoxContainer = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
        });
        this.mainBox.add_actor(this.dashboardBoxContainer);

        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton.menuButtonWidget.actor);

        this.bgManager = new Background.BackgroundManager({ 
            container: this.dashboard,
            monitorIndex: monitorIndex,
            vignette: true 
        });

        this.dashboard.add_child(this.mainBox);
        Main.uiGroup.add_actor(this.dashboard);

        this.actionsBoxContainer = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.FILL,
        });

        this.actionsBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });

        this.actionsBoxContainer.add(this.actionsBox);
        this.actionsBox.style = "width: 250px; spacing: 5px;";

        this.topBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        this.subMainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.subMainBox.add(this.topBox);
        this.dashboardBoxContainer.add(this.subMainBox);
        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="width: 320px; padding-top: 25px; padding-bottom: 25px;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });

        this.applicationsBoxContainer = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: false
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: COLUMN_SPACING,
            row_spacing: ROW_SPACING 
        });
        this.grid = new St.Widget({ 
            x_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });
        layout.hookup_style(this.grid);

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade',
        });    

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsBoxContainer);
           
        this.appShortcuts = [];

        this.shortcutsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            overlay_scrollbars: true,
            style_class: 'vfade',
        });  
        
        this.leftPanelBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });

        this.shortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.shortcutsScrollBox.add_actor(this.shortcutsBox);

        layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: COLUMN_SPACING,
            row_spacing: ROW_SPACING
        });
        this.shortcutsGrid = new St.Widget({ 
            x_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });
        layout.hookup_style(this.shortcutsGrid);

        this.sessionButtonsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            vertical: false,
            style: 'spacing: ' + COLUMN_SPACING + 'px; padding: 10px 0px;'
        });
        if(this._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton(this);
            logout.style = "border-radius: 34px; padding: 16px"
            logout._icon.icon_size = 30;
            this.sessionButtonsBox.add(logout.actor);
        }  
        if(this._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton(this);
            lock.style = "border-radius: 34px; padding: 16px"
            lock._icon.icon_size = 30;
            this.sessionButtonsBox.add(lock.actor);
        }
        if(this._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton(this);
            suspend.style = "border-radius: 34px; padding: 16px"
            suspend._icon.icon_size = 30;
            this.sessionButtonsBox.add(suspend.actor);
        }
        if(this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton(this);
            power.style = "border-radius: 34px; padding: 16px"
            power._icon.icon_size = 30;
            this.sessionButtonsBox.add(power.actor);
        }      

        this.shortcutsBox.add(this.shortcutsGrid);
        this.leftPanelBox.add(this.shortcutsScrollBox);
        this.leftPanelBox.add(this.sessionButtonsBox);

        this.applicationsBoxContainer.add_actor(this.leftPanelBox);
        this.applicationsBoxContainer.add_actor(this.applicationsScrollBox);
        this.applicationsBoxContainer.add_actor(this.actionsBoxContainer);

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("Arc Menu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2]);
            shortcutMenuItem.setAsIcon();
            this.appShortcuts.push(shortcutMenuItem);
        }

        this.loadFavorites();
        this.loadCategories();
        this.displayCategories();
        this.updateLocation();
        this.setDefaultMenuView();
    }
    
    loadFavorites(){
        let isIconGrid = true;
        super.loadFavorites(isIconGrid);
    }

    updateLocation(){       
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton.menuButtonWidget.actor);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let natX = Main.layoutManager.monitors[monitorIndex].x;
        let natY = Main.layoutManager.monitors[monitorIndex].y;
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        let screenHeight = monitorWorkArea.height;
        let screenWidth = monitorWorkArea.width;
     
        let height = Math.round(screenHeight / scaleFactor);
        let width = Math.round(screenWidth / scaleFactor);
        //each icon is 140px width + padding
        this.columnCount = Math.floor((width - 250) / (140 + COLUMN_SPACING));
        this.pinnedAppsColumn = Math.round(4 * (this.columnCount / 10));
        this.appsColumn = Math.round(6 * (this.columnCount / 10));
        this.newSearch.setMaxDisplayedResults(this.columnCount);
        this.mainBox.style = `height: ${height}px; width: ${width}px;`;
        this.applicationsBox.style = "width: " + Math.round(6 * ((width - 250) / 10)) + "px; padding-bottom: 30px;";
        this.shortcutsBox.style = "width: " + Math.round(4 * ((width - 250) / 10)) + "px;";

        this.dashboard.style = `height: ${height}px; width: ${width}px;`;
        this.bgManager.backgroundActor.set_position(natX - monitorWorkArea.x, natY - monitorWorkArea.y);
        this.dashboard.set_position(monitorWorkArea.x, monitorWorkArea.y);
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();

        this.displayFavorites();
        this.categoryDirectories.values().next().value.displayAppList();
    }

    updateStyle(){
        super.updateStyle();
        
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        addStyle ? this.dashboard.add_style_class_name('arc-menu-dashboard') : this.dashboard.remove_style_class_name('arc-menu-dashboard');
        
        this.sessionButtonsBox.get_children().forEach((actor) => {
            if(actor instanceof St.Button){
                addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
            }
        });
        
        this.updateLocation();
    }

    updateSearch(){
        this.newSearch._reloadRemoteProviders();
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum == Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        let isIconGrid = true;
        super.loadCategories(MW.CategoryMenuItem, isIconGrid);
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.box.remove_actor(categoryMenuItem._icon);
            if(categoryMenuItem._arrowIcon)
                categoryMenuItem.box.remove_actor(categoryMenuItem._arrowIcon);
        }
    }

    displayCategories(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.actionsBox.add_actor(categoryMenuItem.actor);	 
        }
    }

    displayFavorites(){
        this.shortcutsBox.remove_all_children();
        this.shortcutsBox.add(this.shortcutsGrid);
        this._displayAppList(this.favoritesArray, true, this.shortcutsGrid);
    }

    displayCategoryAppList(appList){
        this._clearActorsFromBox();
        this._displayAppList(appList);
    }
    
    _clearActorsFromBox(box) {
        super._clearActorsFromBox(box);
        if(!this.applicationsBoxContainer.contains(this.leftPanelBox))
            this.applicationsBoxContainer.insert_child_at_index(this.leftPanelBox, 0);
    }

    _displayAppList(apps, isFavoriteMenuItem = false, differentGrid = null){  
        let grid = differentGrid ? differentGrid : this.grid;  
        grid.remove_all_children();
        if(this.columnCount)
            super._displayAppGridList(apps, differentGrid ? this.pinnedAppsColumn : this.appsColumn, isFavoriteMenuItem, differentGrid);
        else
            return;
        let favsLabel = new PopupMenu.PopupMenuItem(differentGrid ? _("Pinned Apps") : _(this.activeCategory), {
            hover: false,
            can_focus: false
        });  
        favsLabel.remove_actor(favsLabel._ornamentLabel)
        favsLabel.actor.style = "padding-left: 10px;";
        favsLabel.label.style_class = "search-statustext";

        favsLabel.actor.add_style_pseudo_class = () => { return false;};
        favsLabel.actor.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.MAX));
        favsLabel.label.style = 'font-weight: bold;';
        differentGrid ? this.shortcutsBox.insert_child_at_index(favsLabel.actor, 0) : this.applicationsBox.insert_child_at_index(favsLabel.actor, 0);
        this._displayAppIcons();
    }

    _displayAppIcons(){
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        if(!this.applicationsBox.contains(this.grid))
            this.applicationsBox.add(this.grid);
        this.mainBox.grab_key_focus();
    }

    _onSearchBoxChanged(searchBox, searchString) {        
        if(searchBox.isEmpty()){  
            this.newSearch.setTerms(['']); 
            this.setDefaultMenuView();                     	          	
            this.newSearch.actor.hide();
            if(!this.applicationsBoxContainer.contains(this.leftPanelBox))
                this.applicationsBoxContainer.insert_child_at_index(this.leftPanelBox, 0);
        }            
        else{         
            this._clearActorsFromBox(); 
            if(this.applicationsBoxContainer.contains(this.leftPanelBox))
                this.applicationsBoxContainer.remove_actor(this.leftPanelBox);
            let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
            this.applicationsBox.add(this.newSearch.actor); 
            this.newSearch.actor.show();         
            this.newSearch.setTerms([searchString]); 
            this.newSearch.highlightDefault(true);
        }            	
    }

    destroy(isReload){
        if (this._mainBoxKeyPressId > 0) {
            this.mainBox.disconnect(this._mainBoxKeyPressId);
            this._mainBoxKeyPressId = 0;
        }

        this.arcMenu = this.oldArcMenu;
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;
        
        super.destroy(isReload);
        this.dashboard.destroy();
    }
}