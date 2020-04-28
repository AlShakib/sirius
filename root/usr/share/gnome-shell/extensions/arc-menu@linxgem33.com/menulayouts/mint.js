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

const {Clutter, GLib, Gio, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
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
            VerticalMainBox: false
        });
    }
    createLayout(){
        //Stores the Pinned Icons on the left side
        this.actionsScrollBox = new St.ScrollView({
            x_expand: false,
            y_expand: false,
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.CENTER,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });   
        this.actionsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.actionsBox = new St.BoxLayout({ 
            vertical: true
        });
        this.actionsScrollBox.add_actor( this.actionsBox);
        this.actionsScrollBox.clip_to_allocation = true;
        
        this.actionsScrollBox.style = "width:62px; margin: 0px 20px 0 20px;";
        this.actionsBox.style = "background-color:rgba(186, 196,201, 0.1) ;border-color:rgba(186, 196,201, 0.2) ; border-width: 1px; border-radius: 5px;margin: 0px 0px; spacing: 5px; padding: 5px 0px;";
        //check if custom arc menu is enabled
        if( this._settings.get_boolean('enable-custom-arc-menu'))
            this.actionsBox.add_style_class_name('arc-menu');
        
        this.loadFavorites();   

        this.mainBox.add(this.actionsScrollBox);
        this.rightMenuBox= new St.BoxLayout({ 
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true 
        });
        this.mainBox.add(this.rightMenuBox);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px; padding-top: 0.0em; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.rightMenuBox.add(this.searchBox.actor);

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.rightMenuBox.add(this.subMainBox);

        this.rightBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
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

        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 45;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style_class: 'left-box'
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
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true
        });

        this.leftBox.add(this.categoriesScrollBox);
        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor( this.categoriesBox);  
        this.categoriesScrollBox.clip_to_allocation = true;

        this.loadCategories();
        this.displayCategories();
        this.setDefaultMenuView(); 
    }

    _addSeparator(){
        this.actionsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT));
    }    
   
    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayGnomeFavorites();
    }

    _reload() {
        super.reload(); 
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 45;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.FAVORITES);
        this.categoryDirectories.set(Constants.CategoryType.FAVORITES, categoryMenuItem);

        categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.ALL_PROGRAMS);
        this.categoryDirectories.set(Constants.CategoryType.ALL_PROGRAMS, categoryMenuItem);

        super.loadCategories();
    }
   
    loadFavorites() {
        this.actionsScrollBox.remove_actor(this.actionsBox);
        this.actionsBox.destroy_all_children();
        this.actionsBox.destroy();
        this.actionsBox = new St.BoxLayout({ 
            vertical: true
        });
        this.actionsBox.style = "background-color:rgba(186, 196,201, 0.1) ;border-color:rgba(186, 196,201, 0.2) ; border-width: 1px; border-radius: 5px;margin: 0px 0px; spacing: 5px; padding: 5px 0px;";
        this.actionsScrollBox.add_actor(this.actionsBox);

        super.loadPinnedApps(this._settings.get_strv('mint-pinned-app-list'), this._settings.get_int('mint-separator-index'));
    }

    _updatePinnedApps(){
        let pinnedApps = [];
        //Find the Default Web Browser, if found add to pinned apps list, if not found delete the placeholder.
        //Will only run if placeholder is found. Placeholder only found with default settings set.  
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
            pinnedApps.push(this._app.get_name(), iconName, this._app.get_id());
        }
        pinnedApps.push(_("Terminal"), "utilities-terminal", "org.gnome.Terminal.desktop");
        pinnedApps.push(_("Settings"), "emblem-system-symbolic", "gnome-control-center.desktop");
        let software = '';
        if(GLib.find_program_in_path('gnome-software')){
            software = 'org.gnome.Software.desktop';
        }
        else if(GLib.find_program_in_path('pamac-manager')){
            software = 'pamac-manager.desktop';
        }
        else if(GLib.find_program_in_path('io.elementary.appcenter')){
            software = 'io.elementary.appcenter.desktop';
        }
        pinnedApps.push(_("Software"), 'system-software-install-symbolic', software);
        pinnedApps.push(_("Files"), "system-file-manager", "org.gnome.Nautilus.desktop");
        pinnedApps.push(_("Log Out"), "application-exit-symbolic", "ArcMenu_LogOut");
        pinnedApps.push(_("Lock"), "changes-prevent-symbolic", "ArcMenu_Lock");
        pinnedApps.push(_("Power Off"), "system-shutdown-symbolic", "ArcMenu_PowerOff");

        this.shouldLoadFavorites = false; // We don't want to trigger a setting changed event
        this._settings.set_strv('mint-pinned-app-list', pinnedApps);
        this.shouldLoadFavorites = true;
        return pinnedApps;  
    }   

    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
