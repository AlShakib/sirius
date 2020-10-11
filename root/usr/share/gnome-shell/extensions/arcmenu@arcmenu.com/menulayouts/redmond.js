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

const {Clutter, Gtk, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const COLUMN_SPACING = 10;
const ROW_SPACING = 10;
const COLUMN_COUNT = 4;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton,{
            Search: true,
            SearchType: Constants.SearchType.GRID_VIEW,
            VerticalMainBox: false
        });
    }
    createLayout(){
        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px; padding-top: 0.0em; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));

        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.TOP)
            this.subMainBox.add(this.searchBox.actor);
        
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
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });   

        this.applicationsScrollBox.style = "width:450px;";   
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.subMainBox.add(this.applicationsScrollBox);
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.actor.style = "padding-top: 0.75em; padding-bottom: 0.25em; padding-left: 1em; padding-right: 0.25em; margin-right: .5em;";
            this.subMainBox.add(this.searchBox.actor);
        }
            
        this.rightBox = new St.BoxLayout({
            y_align: Clutter.ActorAlign.FILL,
            y_expand: true,
            vertical: true,
            style_class: 'right-box'
        });

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
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'small-vfade'
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
            this._sections[id] = new St.BoxLayout({
                vertical: true
            });	
            this.placeManagerUpdatedID = this.placesManager.connect(`${id}-updated`, () => {
                this._redisplayPlaces(id);
            });

            this._createPlaces(id);
            this.externalDevicesBox.add(this._sections[id]);
        }

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
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
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            hscrollbar_policy: St.PolicyType.AUTOMATIC,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            clip_to_allocation: true,
            overlay_scrollbars: true,
            style_class: 'hfade'
        });

        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: "spacing: 6px;"
        });	

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
        if(this._settings.get_boolean('show-restart-button')){
            let restart = new MW.RestartButton(this);
            this.actionsBox.add(restart.actor);
        }      
        if(this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton(this);
            this.actionsBox.add(power.actor);
        }      
        this.rightBox.add(this.actionsScrollBox);
        
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.shortcutsScrollBox.style = "width: " + rightPanelWidth + "px;";
        
        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.mainBox.add(horizonalFlip ? this.rightBox : this.subMainBox);
        this.mainBox.add(this._createVerticalSeparator());
        this.mainBox.add(horizonalFlip ? this.subMainBox: this.rightBox);  

        this.loadCategories();
        this.displayAllApps();
        this.setDefaultMenuView();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this._displayAppIcons();
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 

        let isIconGrid = true;
        super.loadCategories(MW.CategoryMenuItem, isIconGrid);
    }
    
    _displayAppList(apps) {
        super._displayAppGridList(apps, COLUMN_COUNT);
    }

    _displayAppIcons(){
        this.activeMenuItem = this.grid.layout_manager.get_child_at(0, 0);
        this.applicationsBox.add(this.grid);
        if(this.arcMenu.isOpen){
            this.mainBox.grab_key_focus();
        }
    }
}
