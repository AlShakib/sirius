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

const {Clutter, GLib, Gio, Gtk, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            SearchType: Constants.SearchType.GRID_VIEW,
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

        this.favoritesButton = new MW.FavoritesButton(this);
        this.favoritesButton.actor.y_expand = true;
        this.favoritesButton.actor.y_align= Clutter.ActorAlign.START;
        this.actionsBox.add(this.favoritesButton.actor, {
            margin:5
        });
        let userButton = new MW.CurrentUserButton(this);
        userButton.actor.expand = false;
        this.actionsBox.add(userButton.actor, {
            margin:5
        });
        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            this.actionsBox.add_actor(placeMenuItem.actor);
        }
        let settingsButton = new MW.SettingsButton(this);
        settingsButton.actor.expand = false;
        this.actionsBox.add(settingsButton.actor, {
            margin:5
        });
        let powerButton = new MW.PowerButton(this);
        powerButton.actor.expand = false;
        this.actionsBox.add(powerButton.actor, {
            margin:5
        });

        this.subMainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });
        this.mainBox.add(this.subMainBox);

        this.user = new MW.UserMenuIcon(this);
        this.user.actor.x_expand = false;
        this.user.actor.y_expand = false;
        this.user.actor.x_align = Clutter.ActorAlign.CENTER;
        this.user.actor.y_align = Clutter.ActorAlign.CENTER;
        this.subMainBox.add(this.user.actor);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px;padding-top: 15px; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.subMainBox.add(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: 10,
            row_spacing: 10 
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
            x_fill: false,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });   
        this.applicationsScrollBox.style = "width:525px;";   

        this.applicationsScrollBox.add_actor( this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);

        this.loadCategories();
        this.displayAllApps();
        this.loadFavorites();
        this._createFavoritesMenu();
        this.setDefaultMenuView();
    }

    _createFavoritesMenu(){
        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_actor(this.dummyCursor);
        this.favoritesMenu = new PopupMenu.PopupMenu(this.dummyCursor, 0, St.Side.TOP);
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

        this.favoritesScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            style_class: 'vfade',
            overlay_scrollbars: true,
            reactive:true
        });   
        
        this.leftPanelPopup.add(this.favoritesScrollBox);
       
        this.favoritesBox = new St.BoxLayout({
            vertical: true
        });     
        this.favoritesScrollBox.add_actor(this.favoritesBox);
       
        this.leftPanelShortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.END,
            vertical: true
        });     

        this.leftPanelPopup.add(this.leftPanelShortcutsBox);

        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            this.leftPanelShortcutsBox.add_actor(placeMenuItem.actor);
        }
        if (GLib.find_program_in_path("gnome-control-center")) {
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _("Settings"), "preferences-system-symbolic", "gnome-control-center");
            this.leftPanelShortcutsBox.add_actor(shortcutMenuItem.actor);
           
        }
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
        this.leftPanelPopup.style = `height: ${height}px`;        
        this.section.actor.add_actor(this.leftPanelPopup); 
        this.displayFavorites();
        this.subMenuManager.addMenu(this.favoritesMenu);
        this.favoritesMenu.actor.hide();
        Main.uiGroup.add_actor(this.favoritesMenu.actor);
    }
    
    toggleFavoritesMenu(){
        let appsScrollBoxAdj = this.favoritesScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
        this.favoritesMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.favoritesMenu.actor.add_style_class_name( addStyle ? 'arc-menu' : 'popup-menu');
        this.favoritesButton.tooltip.hide();
        let themeNode = this.leftClickMenu.actor.get_theme_node();
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

        this.leftClickMenu.actor.get_allocation_box();
        let [x, y] = this.leftClickMenu.actor.get_transformed_position();
        if(this.leftClickMenu._arrowSide == St.Side.TOP)
            y += rise + 1;
        else 
            y += 1;
        if(this.leftClickMenu._arrowSide == St.Side.LEFT)
            x= x+(borderRadius * 2) + rise + 1;
        else
            x = x+(borderRadius * 2);
        this.dummyCursor.set_position(Math.round(x+borderWidth), Math.round(y+borderWidth));
        this.favoritesMenu.toggle();
    }
    
    setDefaultMenuView(){
        super.setDefaultMenuView();
        this._displayAppIcons();
        let appsScrollBoxAdj = this.favoritesScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
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

        let isIconGrid = true;
        super.loadCategories(MW.CategoryMenuItem, isIconGrid);
    }
   
    _displayAppList(apps) {
        super._displayAppGridList(apps, 5);
    }

    displayFavorites() {
        let actors = this.favoritesBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.favoritesBox.remove_actor(actor);
        }
        for(let i = 0;i < this.favoritesArray.length; i++){
            this.favoritesBox.add_actor(this.favoritesArray[i].actor);		   
        }
        this.updateStyle();  
    }

    _displayAppIcons(){
        this.applicationsBox.add(this.grid);
        this.activeMenuItem = this.firstItem;
        if(this.leftClickMenu.isOpen){
            this.mainBox.grab_key_focus();
        }
    }
}
