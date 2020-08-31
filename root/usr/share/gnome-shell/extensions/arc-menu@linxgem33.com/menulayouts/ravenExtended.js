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
                let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
                if(homeScreen && this.activeCategoryType !== Constants.CategoryType.HOME_SCREEN)
                    this.setDefaultMenuView();
                else if(!homeScreen && this.activeCategoryType !== Constants.CategoryType.ALL_PROGRAMS)
                    this.setDefaultMenuView();  
                else
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
            vertical: true,
        });

        this.dashboardBoxContainer = new St.BoxLayout();
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
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });

        this.actionsBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });
        this.actionsBox.connect("key-press-event", (actor, keyEvent)=>{
            switch (keyEvent.get_key_symbol()) {
            case Clutter.KEY_Right:
                this.activeMenuItem.grab_key_focus();
                return Clutter.EVENT_STOP;
            case Clutter.KEY_Left:
                this.activeMenuItem.grab_key_focus();
                return Clutter.EVENT_STOP;
            default:
                return Clutter.EVENT_PROPAGATE;
            }
        });
        this.actionsBoxContainer.add(this.actionsBox);
        this.actionsBox.style = "spacing: 5px;";
        this.actionsBoxContainer.style = "margin: 0px 0px 0px 0px; spacing: 10px;background-color:rgba(186, 196,201, 0.1) ; padding: 5px 5px;"+
                                "border-color:rgba(186, 196,201, 0.2) ; border-right-width: 1px;";
        this.dashboard.add_child(this.actionsBoxContainer);

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
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
            vertical: true
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
            y_align: Clutter.ActorAlign.FILL,
            overlay_scrollbars: true,
            style_class: 'vfade',
        });    
  
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);
   
        this.weatherBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            vertical: false,
            style_class: 'show-apps'
        });
        
        this._weatherItem = new MW.WeatherSection();
        this._weatherItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._weatherItem.x_expand = true;
        this._weatherItem.x_align = Clutter.ActorAlign.FILL;
        this._weatherItem.connect("clicked", ()=> this.dashboard.close());
        this._clocksItem = new MW.WorldClocksSection();
        this._clocksItem.x_expand = true;
        this._clocksItem.x_align = Clutter.ActorAlign.FILL;
        this._clocksItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._clocksItem.connect("clicked", ()=> this.dashboard.close());

        this.weatherBox.add(this._clocksItem);
        this.weatherBox.add(this._weatherItem);
        
        this.appShortcuts = [];
        this.shortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });

        layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: COLUMN_SPACING,
            row_spacing: ROW_SPACING
        });
        this.shortcutsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });
        layout.hookup_style(this.shortcutsGrid);

        this.shortcutsBox.add(this.shortcutsGrid);

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
        this.columnCount = Math.floor((6 * (width / 10 )) / (140 + COLUMN_SPACING));
        this.newSearch.setMaxDisplayedResults(this.columnCount);
        this.mainBox.style = `height: ${height}px; width: ${width}px;`;
        this.applicationsBox.style = "width: " + Math.round(6 * (width / 10)) + "px; padding-bottom: 25px;";
        this.weatherBox.style = "width: " + Math.round(6 * (width / 10)) + "px;";
        this.dashboard.style = `height: ${height}px; width: ${width}px;`;
        this.actionsBoxContainer.style = "height: "+ height +"px;margin: 0px 0px 0px 0px; spacing: 10px;background-color:rgba(186, 196,201, 0.1) ; padding: 5px 5px;" +
                                            "border-color:rgba(186, 196,201, 0.2) ; border-right-width: 1px;";
        this.bgManager.backgroundActor.set_position(natX - monitorWorkArea.x, natY - monitorWorkArea.y);
        this.dashboard.set_position(monitorWorkArea.x, monitorWorkArea.y);
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
        if(homeScreen){
            this.activeCategory = _("Pinned Apps");
            this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
            this.displayFavorites();
        }
        else{
            this.activeCategory = _("All Programs");
            let isGridLayout = true;
            this.displayAllApps(isGridLayout); 
            this.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS;  
        }
    }

    updateStyle(){
        super.updateStyle();
        
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');

        addStyle ? this.dashboard.add_style_class_name('arc-menu-dashboard') : this.dashboard.remove_style_class_name('arc-menu-dashboard');
        addStyle ? this._clocksItem.add_style_class_name('arc-menu-action') : this._clocksItem.remove_style_class_name('arc-menu-action');
        addStyle ? this._weatherItem.add_style_class_name('arc-menu-action') : this._weatherItem.remove_style_class_name('arc-menu-action');

        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.updateStyle();	 
        }    
        this.updateLocation();
    }

    updateSearch(){
        this.newSearch._reloadRemoteProviders();
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        let categoryMenuItem = new MW.CategoryMenuButton(this, Constants.CategoryType.HOME_SCREEN);
        this.categoryDirectories.set(Constants.CategoryType.HOME_SCREEN, categoryMenuItem);

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum == Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuButton(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        let isIconGrid = true;
        super.loadCategories(MW.CategoryMenuButton, isIconGrid);
    }

    displayCategories(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.actionsBox.add_actor(categoryMenuItem.actor);	 
        }
    }

    displayFavorites() {
        if(this.activeCategoryType === Constants.CategoryType.HOME_SCREEN)
            this._clearActorsFromBox(this.applicationsBox);
        else
            this._clearActorsFromBox();
        this._displayAppList(this.favoritesArray, true);
        this._displayAppList(this.appShortcuts, true, this.shortcutsGrid);
        if(!this.applicationsBox.contains(this.shortcutsBox))
            this.applicationsBox.add(this.shortcutsBox);
        let actors = this.weatherBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            this.weatherBox.remove_actor(actors[i]);
        }
        if(this._settings.get_boolean('enable-clock-widget-raven')){
            this.weatherBox.add(this._clocksItem);
        }
        if(this._settings.get_boolean('enable-weather-widget-raven')){
            this.weatherBox.add(this._weatherItem);
        }
        if(!this.subMainBox.contains(this.weatherBox))
            this.subMainBox.add(this.weatherBox);
    }

    displayCategoryAppList(appList){
        this._clearActorsFromBox();
        this._displayAppList(appList);
    }
    
    _clearActorsFromBox(box) {
        if(this.subMainBox.contains(this.weatherBox)){
            this.subMainBox.remove_actor(this.weatherBox);
        }
        super._clearActorsFromBox(box);
    }

    _displayAppList(apps, isFavoriteMenuItem = false, differentGrid = null){  
        let grid = differentGrid ? differentGrid : this.grid;  
        grid.remove_all_children();
        if(this.columnCount)
            super._displayAppGridList(apps, this.columnCount, isFavoriteMenuItem, differentGrid);
        else
            return;
        let favsLabel = new PopupMenu.PopupMenuItem(differentGrid ? _("Shortcuts") : _(this.activeCategory), {
            hover: false,
            can_focus: false
        });  
        favsLabel.remove_actor(favsLabel._ornamentLabel)
        favsLabel.actor.style = "padding-left: 10px;";
        favsLabel.label.style_class = "search-statustext";
        if(differentGrid)
            favsLabel.actor.style += "padding-top: 20px;";
        favsLabel.actor.add_style_pseudo_class = () => { return false;};
        favsLabel.actor.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.MAX));
        favsLabel.label.style = 'font-weight: bold;';
        differentGrid ? this.applicationsBox.insert_child_at_index(favsLabel.actor, 2) : this.applicationsBox.insert_child_at_index(favsLabel.actor, 0);
        this._displayAppIcons();
    }

    _displayAppIcons(){
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        if(!this.applicationsBox.contains(this.grid))
            this.applicationsBox.add(this.grid);
        this.mainBox.grab_key_focus();
    }
   
    destroy(isReload){
        if (this._mainBoxKeyPressId > 0) {
            this.mainBox.disconnect(this._mainBoxKeyPressId);
            this._mainBoxKeyPressId = 0;
        }
        if(this._clocksItem)
            this._clocksItem.destroy();
        if(this._weatherItem)
            this._weatherItem.destroy();
            
        this.arcMenu = this.oldArcMenu;
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;
        
        super.destroy(isReload);
        this.dashboard.destroy();
    }
}
