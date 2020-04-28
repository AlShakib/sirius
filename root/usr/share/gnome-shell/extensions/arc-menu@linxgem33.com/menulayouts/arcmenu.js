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

const {Clutter, Gtk, Shell, St} = imports.gi;
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
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        if(this._settings.get_enum('searchbar-location') === Constants.SearchbarLocation.TOP){
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

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: true,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'left-box'
        });

        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = this._createScrollBox({
            x_fill: true,
            y_fill: false,
            x_expand: true,
            y_expand: true, 
            y_align: Clutter.ActorAlign.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true,
            reactive:true
        });
        this.leftBox.add(this.applicationsScrollBox);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.leftBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
        
        this.backButton = new MW.BackMenuItem(this);
        this.leftBox.add(this.backButton.actor);
        
        this.viewProgramsButton = new MW.ViewAllPrograms(this);
        this.leftBox.add(this.viewProgramsButton.actor);
        if(this._settings.get_enum('searchbar-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.actor.style = "padding-top: 0.75em; padding-bottom: 0.25em; padding-left: 1em; padding-right: 0.25em; margin-right: .5em;";
            this.leftBox.add(this.searchBox.actor);
        }
            
        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add(horizonalFlip ? this.rightBox : this.leftBox);  
        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(horizonalFlip ? this.leftBox : this.rightBox);

        this.placesShortcuts = false;
        this.externalDevicesShorctus = false;
        this.networkDevicesShorctus = false;
        this.bookmarksShorctus = false;
        this.softwareShortcuts = false;

        if(!this._settings.get_boolean('disable-user-avatar')){
            this.user = new MW.UserMenuItem(this);
            this.rightBox.add(this.user.actor);
            this.rightBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT));
        }

        this.shortcutsBox = new St.BoxLayout({
            vertical: true
        });

        this.shortcutsScrollBox = this._createScrollBox({
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });    

        this.shortcutsScrollBox.add_actor(this.shortcutsBox);
        this.rightBox.add(this.shortcutsScrollBox);

        // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
        this._displayPlaces();

        //draw bottom right horizontal separator + logic to determine if should show
        let shouldDraw = false;
        if(this._settings.get_value('directory-shortcuts-list').deep_unpack().length>0){
            this.placesShortcuts=true;
        }
        if(this._settings.get_value('application-shortcuts-list').deep_unpack().length>0){
            this.softwareShortcuts = true;
        }
        
        //check to see if should draw separator
        if(this.placesShortcuts && (this._settings.get_boolean('show-external-devices') || this.softwareShortcuts || this._settings.get_boolean('show-bookmarks'))  )
            shouldDraw=true;  
        if(shouldDraw){
            this.shortcutsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT));
        }

        //External Devices and Bookmarks Shortcuts
        this.externalDevicesBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });	
        this.shortcutsBox.add(this.externalDevicesBox);   

        this._sections = { };
        this.placesManager = new PlaceDisplay.PlacesManager();
        for (let i = 0; i < Constants.SECTIONS.length; i++) {
            let id = Constants.SECTIONS[i];
            this._sections[id] = new PopupMenu.PopupMenuSection({
                vertical: true
            });	
            this.placesManager.connect(`${id}-updated`, () => {
                this._redisplayPlaces(id);
            });

            this._createPlaces(id);
            this.externalDevicesBox.add(this._sections[id].actor);
        }

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("Arc Menu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2]);
            if(shortcutMenuItem.shouldShow)
                this.shortcutsBox.add(shortcutMenuItem.actor);
        }
        this.actionsScrollBox = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.END,
            x_align: Clutter.ActorAlign.CENTER,
            x_fill: true,
            y_fill: true
        });
        this.actionsScrollBox.set_policy(Gtk.PolicyType.EXTERNAL, Gtk.PolicyType.NEVER);
        this.actionsScrollBox.clip_to_allocation = true;

        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.CENTER,
        });	
        this.actionsBox.style = "spacing: 16px;";
        this.actionsScrollBox.add_actor(this.actionsBox);  

        if(this._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton(this);
            this.actionsBox.add(logout.actor);
        }  
        if(this._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton(this);
            this.actionsBox.add(lock.actor);
        }
        if(this._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton(this);
            this.actionsBox.add(suspend.actor);
        }
        if(this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton(this);
            this.actionsBox.add(power.actor);
        }      
        this.rightBox.add(this.actionsScrollBox);
        
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.shortcutsScrollBox.style = "width: " + rightPanelWidth + "px;";

        this.loadCategories();
        this.loadFavorites();
        this.setDefaultMenuView(); 
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();
        
        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.FREQUENT_APPS);
        this.categoryDirectories.set(Constants.CategoryType.FREQUENT_APPS, categoryMenuItem);
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show())
                categoryMenuItem.appList.push(mostUsed[i]);
        }

        super.loadCategories();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        if(this._settings.get_boolean('enable-pinned-apps')){
            this.currentMenu = Constants.CURRENT_MENU.FAVORITES;
            this.displayFavorites();
        }	
        else{
            this.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
            this.displayCategories();
        }
        this.backButton.actor.hide();
        this.viewProgramsButton.actor.show();
    }
}
