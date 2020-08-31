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
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const COLUMN_SPACING = 10;
const ROW_SPACING = 10;
const COLUMN_COUNT = 4;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            SearchType: Constants.SearchType.GRID_VIEW,
            VerticalMainBox: false
        });
    }
    createLayout(){
        let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
        if(homeScreen)
            this.activeCategory = _("Pinned Apps");
        else
            this.activeCategory = _("All Programs");

        this.arcMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px; -boxpointer-gap: 0px;"; 
        this.arcMenu.box.style = "padding-bottom:0px; padding-top:0px; margin:0px;";
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
        this.actionsBoxContainer.add(this.actionsBox);
        this.actionsBox.style = "spacing: 5px;";
        this.actionsBoxContainer.style = "margin: 0px 0px 0px 0px; spacing: 10px;background-color:rgba(186, 196,201, 0.1) ; padding: 5px 5px;"+
                                "border-color:rgba(186, 196,201, 0.2) ; border-right-width: 1px;";
        this.mainBox.add(this.actionsBoxContainer);

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.subMainBox.add(this.topBox);
        this.mainBox.add(this.subMainBox);
        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px;padding-top: 25px; padding-bottom: 0.0em;padding-left: 0.7em;padding-right: 0.7em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style: "padding-bottom: 10px;"
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
            style_class: 'vfade'
        });   
        this.applicationsScrollBox.style = "width:410px;";    
  
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);
   
        this.weatherBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            vertical: true
        });
        this.weatherBox.style = "width:410px;"; 
        this._weatherItem = new MW.WeatherSection();
        this._weatherItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._weatherItem.connect("clicked", ()=> this.arcMenu.close());
        this._clocksItem = new MW.WorldClocksSection();
        this._clocksItem.x_expand = true;
        this._clocksItem.x_align = Clutter.ActorAlign.FILL;
        this._clocksItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._clocksItem.connect("clicked", ()=> this.arcMenu.close());

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
        this.displayFavorites();
        this.setDefaultMenuView();
    }
    
    loadFavorites(){
        let isIconGrid = true;
        super.loadFavorites(isIconGrid);
    }

    updateLocation(){       
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton.menuButtonWidget.actor);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        let screenHeight = monitorWorkArea.height;   
     
        let height =  Math.round(screenHeight / scaleFactor);
        this.mainBox.style = `height: ${height}px`;
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
        let gapAdjustment = this._settings.get_int('gap-adjustment');

        addStyle ? this._clocksItem.add_style_class_name('arc-menu-action') : this._clocksItem.remove_style_class_name('arc-menu-action');
        addStyle ? this._weatherItem.add_style_class_name('arc-menu-action') : this._weatherItem.remove_style_class_name('arc-menu-action');

        this.arcMenu.actor.style = "-arrow-base:0px; -arrow-rise:0px; -boxpointer-gap: " + gapAdjustment + "px;";
        this.arcMenu.box.style = "padding-bottom:0px; padding-top:0px; margin:0px;";
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
        super._displayAppGridList(apps, COLUMN_COUNT, isFavoriteMenuItem, differentGrid);
        let favsLabel = new PopupMenu.PopupMenuItem(differentGrid ? _("Shortcuts") : _(this.activeCategory), {
            hover: false,
            can_focus: false
        });  
        favsLabel.remove_actor(favsLabel._ornamentLabel)
        favsLabel.actor.style = "padding-left: 10px;";
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
    }
   
    destroy(isReload){
        if(this._clocksItem)
            this._clocksItem.destroy();
        if(this._weatherItem)
            this._weatherItem.destroy();
        
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;
            
        super.destroy(isReload);
    }
}
