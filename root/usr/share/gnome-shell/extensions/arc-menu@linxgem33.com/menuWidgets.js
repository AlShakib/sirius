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

// Import Libraries
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Atk, Clutter, Gio, GLib, GMenu, GObject, Gtk, Shell, St} = imports.gi;
const AccountsService = imports.gi.AccountsService;
const AppFavorites = imports.ui.appFavorites;
const Constants = Me.imports.constants;
const Dash = imports.ui.dash;
const DND = imports.ui.dnd;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const LoginManager = imports.misc.loginManager;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;
const Util = imports.misc.util;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;
const { loadInterfaceXML } = imports.misc.fileUtils;

const ClocksIntegrationIface = loadInterfaceXML('org.gnome.Shell.ClocksIntegration');
const ClocksProxy = Gio.DBusProxy.makeProxyWrapper(ClocksIntegrationIface);

const SWITCHEROO_BUS_NAME = 'net.hadess.SwitcherooControl';
const SWITCHEROO_OBJECT_PATH = '/net/hadess/SwitcherooControl';

const SwitcherooProxyInterface = loadInterfaceXML('net.hadess.SwitcherooControl');
const SwitcherooProxy = Gio.DBusProxy.makeProxyWrapper(SwitcherooProxyInterface);

// Menu Size variables
const LARGE_ICON_SIZE = 34;
const MEDIUM_ICON_SIZE = 25;
const INDICATOR_ICON_SIZE = 18;
const SMALL_ICON_SIZE = 16;
const USER_AVATAR_SIZE = 28;

var AppRightClickMenu = class ArcMenu_AppRightClickMenu extends PopupMenu.PopupMenu {
    constructor(actor, app, button){
        super(actor, 0.0, St.Side.TOP);
        this._button = button;
        this._settings = this._button._settings;
        this._app = app;
        this.layout = this._settings.get_enum('menu-layout');
        this._boxPointer.setSourceAlignment(.20);
        
        this.discreteGpuAvailable = false;
        Gio.DBus.system.watch_name(SWITCHEROO_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            this._switcherooProxyAppeared.bind(this),
            () => {
                this._switcherooProxy = null;
                this._updateDiscreteGpuAvailable();
            });
        this.redisplay();
    }

    centerBoxPointerPosition(){
        this._boxPointer.setSourceAlignment(.50);
        this._arrowAlignment = .5;
    }

    set isPinnedApp(isPinnedApp){
        this._isPinnedApp = isPinnedApp;
    }

    set path(path){
        this._path = path;
    }
    
    _updateDiscreteGpuAvailable() {
        if (!this._switcherooProxy)
            this.discreteGpuAvailable = false;
        else
            this.discreteGpuAvailable = this._switcherooProxy.HasDualGpu;
    }

    _switcherooProxyAppeared() {
        this._switcherooProxy = new SwitcherooProxy(Gio.DBus.system, SWITCHEROO_BUS_NAME, SWITCHEROO_OBJECT_PATH,
            (proxy, error) => {
                if (error) {
                    log(error.message);
                    return;
                }
                this._updateDiscreteGpuAvailable();
            });
    }
    closeMenus(){
        this.close();
        this._button.leftClickMenu.toggle(); 
    }
    redisplay(){
        this.removeAll();
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(addStyle){
            this.actor.style_class = 'arc-right-click-boxpointer';
            this.actor.add_style_class_name('arc-right-click');
            this.actor.set_name('rightClickMenu');
        }
        else{
            this.actor.style_class = 'popup-menu-boxpointer';
            this.actor.add_style_class_name('popup-menu');   
        }
        if(this._app instanceof Shell.App){
            if(this._path != undefined){
                this._newWindowMenuItem = this._appendMenuItem(_("Open Folder Location"));
                this._newWindowMenuItem.connect('activate', () => {
                    Util.spawnCommandLine('nautilus "' +this._path +'"');
                    this.emit('activate-window', null);
                    this.closeMenus();
                });  
            }
            else{
                this.appInfo = this._app.get_app_info();
                let actions = this.appInfo.list_actions();
                
                let windows = this._app.get_windows().filter(
                    w => !w.skip_taskbar
                );
    
                if (windows.length > 0){    
                    let item = new PopupMenu.PopupMenuItem(_("Current Windows:"),{reactive:false,can_focus:false});
                    item.actor.add_style_class_name('inactive');  
                    this.addMenuItem(item);
                }
    
                windows.forEach(window => {
                    let title = window.title ? window.title
                                            : this._app.get_name();
                    let item = this._appendMenuItem(title);
                    item.connect('activate', () => {
                        this.closeMenus();
                        this.emit('activate-window', window);
                        Main.activateWindow(window);                        
                    });
                });
                if (!this._app.is_window_backed()) {
                    this._appendSeparator();
                    if (this._app.can_open_new_window() && !actions.includes('new-window')) {
                        this._newWindowMenuItem = this._appendMenuItem(_("New Window"));
                        this._newWindowMenuItem.connect('activate', () => {
                            this.closeMenus();
                            this._app.open_new_window(-1);
                            this.emit('activate-window', null);
                        });  
                    }
                    if (this.discreteGpuAvailable &&
                        this._app.state == Shell.AppState.STOPPED &&
                        !actions.includes('activate-discrete-gpu')) {
                        this._onDiscreteGpuMenuItem = this._appendMenuItem(_("Launch using Dedicated Graphics Card"));
                        this._onDiscreteGpuMenuItem.connect('activate', () => {
                            this.closeMenus();
                            this._app.launch(0, -1, true);
                            this.emit('activate-window', null);
                        });
                    }
        
                    for (let i = 0; i < actions.length; i++) {
                        let action = actions[i];
                        let item = this._appendMenuItem(this.appInfo.get_action_name(action));
                        item.connect('activate', (emitter, event) => {
                            this.closeMenus();
                            this._app.launch_action(action, event.get_time(), -1);
                            this.emit('activate-window', null);
                        });
                    }

                    let desktopIcons = Main.extensionManager.lookup("desktop-icons@csoriano");
                    let desktopIconsNG = Main.extensionManager.lookup("ding@rastersoft.com")   ;
                    if((desktopIcons && desktopIcons.stateObj) || (desktopIconsNG && desktopIconsNG.stateObj) ){
                        this._appendSeparator();
                        let fileSource = this.appInfo.get_filename();
                        let fileDestination = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DESKTOP);
                        let file = Gio.File.new_for_path(fileDestination + "/" + this._app.get_id());
                        let exists = file.query_exists(null);
                        if(exists){
                            let item = this._appendMenuItem(_("Delete Desktop Shortcut"));
                            item.connect('activate', () => {
                                if(fileSource && fileDestination)
                                    Util.spawnCommandLine("rm " + fileDestination + "/" + this._app.get_id());
                                this.close();
                            });
                        }
                        else{
                            let item = this._appendMenuItem(_("Create Desktop Shortcut"));
                            item.connect('activate', () => {
                                if(fileSource && fileDestination)
                                    Util.spawnCommandLine("cp " + fileSource + " " + fileDestination);
                                this.close();
                            });
                        }
                    }

                    let canFavorite = global.settings.is_writable('favorite-apps');
                    if (canFavorite) {
                        this._appendSeparator();
                        let isFavorite = AppFavorites.getAppFavorites().isFavorite(this._app.get_id());
                        if (isFavorite) {
                            let item = this._appendMenuItem(_("Remove from Favorites"));
                            item.connect('activate', () => {
                                let favs = AppFavorites.getAppFavorites();
                                favs.removeFavorite(this._app.get_id());
                            });
                        } else {
                            let item = this._appendMenuItem(_("Add to Favorites"));
                            item.connect('activate', () => {
                                let favs = AppFavorites.getAppFavorites();
                                favs.addFavorite(this._app.get_id());
                            });
                        }
                    }
                    if(this._isPinnedApp || this.layout == Constants.MENU_LAYOUT.Default || this.layout == Constants.MENU_LAYOUT.Windows || 
                        this.layout == Constants.MENU_LAYOUT.UbuntuDash || this.layout == Constants.MENU_LAYOUT.Raven){
                        let pinnedApps = this._settings.get_strv('pinned-app-list');
                        let pinnedAppID=[];
                        for(let i=2;i<pinnedApps.length;i+=3){
                            pinnedAppID.push(pinnedApps[i]);  
                        }
                        let match = pinnedAppID.find( (element)=>{
                            return element == this._app.get_id();
                        });
                        if(match){ //if app is pinned add Unpin
                            let item = new PopupMenu.PopupMenuItem(_("Unpin from Arc Menu"));  
                            item.connect('activate', ()=>{
                                this.close();
                                for(let i = 0;i<pinnedApps.length;i+=3){
                                    if(pinnedApps[i+2]==this._app.get_id()){
                                        pinnedApps.splice(i,3);
                                        this._settings.set_strv('pinned-app-list',pinnedApps);
                                        break;
                                    }
                                }
                            });      
                            this.addMenuItem(item);
                        }
                        else{ //if app is not pinned add pin
                            let item = new PopupMenu.PopupMenuItem(_("Pin to Arc Menu"));   
                            item.connect('activate', ()=>{
                                this.close();
                                pinnedApps.push(this.appInfo.get_display_name());
                                pinnedApps.push(this.appInfo.get_icon().to_string());
                                pinnedApps.push(this._app.get_id());
                                this._settings.set_strv('pinned-app-list',pinnedApps);
                            });      
                            this.addMenuItem(item);
                        }
                    }
                    
                    if (Shell.AppSystem.get_default().lookup_app('org.gnome.Software.desktop')) {
                        this._appendSeparator();
                        let item = this._appendMenuItem(_("Show Details"));
                        item.connect('activate', () => {
                            let id = this._app.get_id();
                            let args = GLib.Variant.new('(ss)', [id, '']);
                            Gio.DBus.get(Gio.BusType.SESSION, null, (o, res) => {
                                let bus = Gio.DBus.get_finish(res);
                                bus.call('org.gnome.Software',
                                        '/org/gnome/Software',
                                        'org.gtk.Actions', 'Activate',
                                        GLib.Variant.new('(sava{sv})',
                                                        ['details', [args], null]),
                                        null, 0, -1, null, null);
                                this.closeMenus();
                            });
                        });
                    }
                }   
            
            }
        }  
        else{  //if pinned custom shortcut add unpin option to menu    
            if(this._isPinnedApp || this.layout == Constants.MENU_LAYOUT.Default || this.layout == Constants.MENU_LAYOUT.Windows || 
                this.layout == Constants.MENU_LAYOUT.UbuntuDash || this.layout == Constants.MENU_LAYOUT.Raven){
                this._appendSeparator();
                let item = new PopupMenu.PopupMenuItem(_("Unpin from Arc Menu"));   
                item.connect('activate', ()=>{
                    this.close();
                    let pinnedApps = this._settings.get_strv('pinned-app-list');
                    for(let i = 0;i<pinnedApps.length;i+=3){
                        if(pinnedApps[i+2]==this._app){
                            pinnedApps.splice(i,3);
                            this._settings.set_strv('pinned-app-list',pinnedApps);
                            break;
                        }
                    }
                });      
                this.addMenuItem(item);
            }
        }
    }

    _appendSeparator() {
        let separator = new PopupMenu.PopupSeparatorMenuItem();
        separator.actor.style_class='app-right-click-sep';
        separator._separator.style_class='';
        this.addMenuItem(separator);
    }

    _appendMenuItem(labelText) {
        let item = new PopupMenu.PopupMenuItem(labelText);
        this.addMenuItem(item);
        return item;
    }
    _onKeyPress(actor, event) {
        // Disable toggling the menu by keyboard
        // when it cannot be toggled by pointer
        if (!actor.reactive)
            return Clutter.EVENT_PROPAGATE;

        let navKey;
        switch (this._boxPointer.arrowSide) {
        case St.Side.TOP:
            navKey = Clutter.KEY_Down;
            break;
        case St.Side.BOTTOM:
            navKey = Clutter.KEY_Up;
            break;
        case St.Side.LEFT:
            navKey = Clutter.KEY_Right;
            break;
        case St.Side.RIGHT:
            navKey = Clutter.KEY_Left;
            break;
        }

        let state = event.get_state();

        // if user has a modifier down (except capslock)
        // then don't handle the key press here
        state &= ~Clutter.ModifierType.LOCK_MASK;
        state &= Clutter.ModifierType.MODIFIER_MASK;

        if (state)
            return Clutter.EVENT_PROPAGATE;

        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return) {
            this.toggle();
            return Clutter.EVENT_STOP;
        } else if (symbol == Clutter.KEY_Escape && this.isOpen) {
            this.close();
            return Clutter.EVENT_STOP;
        } else if (symbol == navKey) {
            if (this.isOpen){
                this.actor.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
                return Clutter.EVENT_STOP;
            }
            else 
                return Clutter.EVENT_PROPAGATE;
        } else {
            return Clutter.EVENT_PROPAGATE;
        }
    }
};

var ArcMenuPopupBaseMenuItem = GObject.registerClass(
    class ArcMenu_PopupBaseMenuItem extends PopupMenu.PopupBaseMenuItem{
    _init(params){
        params = imports.misc.params.parse(params, {
            reactive: true,
            hover: true
        });
        super._init();

        this.shouldShow = true;

        if(params.reactive)
            this.actor.connect('notify::active',()=> this.setActive(this.actor.active));
        if(params.hover)   
            this.actor.connect('notify::hover',this._onHover.bind(this));
    }
    setShouldShow(){
        //If a saved shortcut link is a desktop app, check if currently installed.
        //Do NOT display if application not found.
        if(this._command.endsWith(".desktop") && !Shell.AppSystem.get_default().lookup_app(this._command)){
            this.shouldShow = false;
        } 
    }
    setFakeActive(active) {
        if (active) {
            this.add_style_class_name('selected');
        } else {
            this.remove_style_class_name('selected');
        }
    }
    _onHover() {
        if(this.actor.hover && this._button.newSearch && this._button.newSearch._highlightDefault)
            this._button.newSearch.highlightDefault(false);
        if(this.tooltip==undefined && this.actor.hover && this.label){
            let description = this.description;
            if(this._app)
                description = this._app.get_description();
            Utils.createTooltip(this._button, this, this.label, description);
        }
    }
    setActive(active){
        if(active){
            if(this._button.activeMenuItem && this._button.activeMenuItem != this)
                this._button.activeMenuItem.setFakeActive(false);
            this._button.activeMenuItem = this;
        }            
        else if(this._button.leftClickMenu.isOpen)
            this._button.activeMenuItem = null;
    }
    vfunc_button_press_event(){
        let event = Clutter.get_current_event();
        this.pressed = false;
        if(event.get_button() == 1 && !this._button.appMenuManager.activeMenu){
            this._button._blockActivateEvent = false;
            this.pressed = true;
            this.contextMenuTimeOut();
        }
        else if(event.get_button() == 3 && !this._button.appMenuManager.activeMenu){
            this.pressed = true;
        }
        else if(this._button.appMenuManager.activeMenu){
            this._button._blockActivateEvent = false;
            this._button.appMenuManager.activeMenu.toggle();
        }
        return Clutter.EVENT_PROPAGATE;
    }
    vfunc_button_release_event(){
        let event = Clutter.get_current_event();
        if(event.get_button() == 1 && !this._button._blockActivateEvent && this.pressed){
            this.activate(event); 
        }
  	    if(event.get_button() == 3 && this.pressed){
            if(this.popupContextMenu)
                this.popupContextMenu();
        }
        return Clutter.EVENT_STOP;
    }
    vfunc_touch_event(event){
        if (event.type() == Clutter.EventType.TOUCH_END && !this._button._blockActivateEvent && this.pressed) {
            this.remove_style_pseudo_class('active');
            this.activate(event);
            this.pressed = false;
            return Clutter.EVENT_STOP;
        } else if (event.type() == Clutter.EventType.TOUCH_BEGIN && !this._button.appMenuManager.activeMenu) {
            this.pressed = true;
            this._button._blockActivateEvent = false;
            this.contextMenuTimeOut();
            this.add_style_pseudo_class('active');
        }
        else if(event.type() == Clutter.EventType.TOUCH_BEGIN && this._button.appMenuManager.activeMenu){
            this.pressed = false;
            this._button._blockActivateEvent = false;
            this._button.appMenuManager.activeMenu.toggle();
        }
        return Clutter.EVENT_PROPAGATE;
    }
    contextMenuTimeOut(){
        this._popupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this.pressed = false;
            this._popupTimeoutId = null;
            if(this.popupContextMenu && this._button.leftClickMenu.isOpen && !this._button._blockActivateEvent) {
                this.popupContextMenu();
            }
            return GLib.SOURCE_REMOVE;
        });
    }
});

var SeparatorDrawingArea = GObject.registerClass(class ArcMenu_SeparatorDrawingArea extends St.DrawingArea {
    _init(settings,alignment,style,params) {
        super._init(params);
        this._settings = settings;
        this._alignment = alignment;
        this._style = style;

        if(this._style == Constants.SEPARATOR_STYLE.SHORT)
            this.set_height(15);
        else if(this._style == Constants.SEPARATOR_STYLE.LONG)
            this.set_height(10);
        else if(this._style == Constants.SEPARATOR_STYLE.MAX)
            this.set_height(1);
    }
    vfunc_repaint(){
       
        let shouldDraw = this._settings.get_boolean('vert-separator');
        if((this._alignment == Constants.SEPARATOR_ALIGNMENT.VERTICAL && shouldDraw) || 
            this._alignment == Constants.SEPARATOR_ALIGNMENT.HORIZONTAL || 
            (this._alignment == Constants.SEPARATOR_ALIGNMENT.VERTICAL && this._style == Constants.SEPARATOR_STYLE.SHORT)){
            let cr = this.get_context();
            let [width, height] = this.get_surface_size();
            let color = this._settings.get_string('separator-color')
            let b, stippleColor;   
            [b,stippleColor] = Clutter.Color.from_string(color);   
            let stippleWidth = 1;
            if(this._alignment == Constants.SEPARATOR_ALIGNMENT.VERTICAL){
                let x = Math.floor(width / 2) + 0.5;
                if(this._style == Constants.SEPARATOR_STYLE.SHORT){
                    cr.moveTo(x,  height / 5);
                    cr.lineTo(x, 4 * height / 5);
                }
                else{
                    cr.moveTo(x,  0.5);
                    cr.lineTo(x, height - 0.5);
                }
            }
            else if (this._alignment == Constants.SEPARATOR_ALIGNMENT.HORIZONTAL){
                if(this._style == Constants.SEPARATOR_STYLE.SHORT){
                    cr.moveTo(width / 4, height - 7.5);
                    cr.lineTo(3 * width / 4, height - 7.5);
                }
                else if(this._style == Constants.SEPARATOR_STYLE.LONG){
                    cr.moveTo(25, height - 4.5);
                    cr.lineTo(width - 25, height - 4.5);
                }
                else if(this._style == Constants.SEPARATOR_STYLE.MAX){
                    cr.moveTo(4, 0.5);
                    cr.lineTo(width - 4, 0.5);
                }
            }
            Clutter.cairo_set_source_color(cr, stippleColor);
            cr.setLineWidth(stippleWidth);
            cr.stroke();
            cr.$dispose();
        }
        return false;
    }
});

var ActivitiesMenuItem = GObject.registerClass(class ArcMenu_ActivitiesMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(button) {
        super._init();
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        this.label = new St.Label({
            text: _("Activities Overview"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
    }
    activate(event) {
        this._button.leftClickMenu.toggle();
        Main.overview.show();
        super.activate(event);
    }
});

var Tooltip = class ArcMenu_Tooltip{
    constructor(menu, sourceActor, text) {
        this._button = menu._button;
        this._settings = this._button._settings;
        this.sourceActor = sourceActor;
        
        this.flipY = false;
        this.actor = new St.Label({
            name: 'tooltip-menu-item',
            style_class: 'dash-label',
            text: text ? _(text) : "",
            opacity: 0,
            y_align: .5
        });
        global.stage.add_actor(this.actor);
        this.actor.connect('destroy',()=>{
            if(this.destroyID){
                this.sourceActor.disconnect(this.destroyID);
                this.destroyID=null
            }
            if(this.hoverID){
                this.sourceActor.disconnect(this.hoverID);
                this.hoverID=null
            }
            if(this.toggleID){
                this._settings.disconnect(this.toggleID);
                this.toggleID=null
            }
        })
        this.destroyID = this.sourceActor.connect('destroy',this.destroy.bind(this));
        this.hoverID = this.sourceActor.connect('notify::hover', this._onHover.bind(this));
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
        this.toggleID = this._settings.connect('changed::disable-tooltips', this.disableTooltips.bind(this));
    }

    set isButton(isButton){
        this._isButton = isButton;
    }

    disableTooltips() {
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
    }

    _onHover() {
        if (this.sourceActor.hover) {
            if(this._button.tooltipShowing){
                this.show();
            }
            else{
                this._button.tooltipShowingID = GLib.timeout_add(0, 750, () => {
                    this.show();
                    this._button.tooltipShowing = true;
                    this._button.tooltipShowingID = null;
                    return GLib.SOURCE_REMOVE;
                });
            }
            if (this._button.tooltipHidingID) {
                GLib.source_remove(this._button.tooltipHidingID);
                this._button.tooltipHidingID = null;
            }
        } 
        else {
            this.hide();
            if (this._button.tooltipShowingID) {
                GLib.source_remove(this._button.tooltipShowingID);
                this._button.tooltipShowingID = null;
            }
            this._button.tooltipHidingID = GLib.timeout_add(0, 750, () => {
                this._button.tooltipShowing = false;
                this._button.tooltipHidingID = null;
                return GLib.SOURCE_REMOVE;
            });          
        }
    }

    show() {
        if(this._useTooltips){
            let [stageX, stageY] = this.sourceActor.get_transformed_position();
            let [width, height] = this.sourceActor.get_transformed_size();
            let [menuX, menuY] = this._button.leftClickMenu.actor.get_transformed_position();
            
            let x = this._isButton ? stageX - Math.round((this.actor.get_width() - width) / 2) : stageX;
            let y = this._isButton ? stageY - this.actor.get_height() - 5 : stageY + height;
            if(this.flipY) 
                y = stageY + height + 5;
            if((x <= 0) || (x - menuX) < 10)
                x = menuX + 10;

            this.actor.show();
            this.actor.set_position(x, y);
            this.actor.ease({
                opacity: 255,
                duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    hide() {
        if(this._useTooltips){
            this.actor.ease({
                opacity: 0,
                duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.actor.hide()
            });
        }
    }

    destroy() {
        if (this._button.tooltipShowingID) {
            GLib.source_remove(this._button.tooltipShowingID);
            this._button.tooltipShowingID = null;
        }
        if (this._button.tooltipHidingID) {
            GLib.source_remove(this._button.tooltipHidingID);
            this._button.tooltipHidingID = null;
        }
        if(this.toggleID>0){
            this._settings.disconnect(this.toggleID);
            this.toggleID = 0;
        }
        if(this.hoverID>0){
            this.sourceActor.disconnect(this.hoverID);
            this.hoverID = 0;
        }
        
        global.stage.remove_actor(this.actor);
        this.actor.destroy();
    }
};


/**
 * A base class for custom session buttons.
 */
var SessionButton = class ArcMenu_SessionButton{
    constructor(button, accessible_name, icon_name, gicon) {
        this._button = button;
        this._settings = this._button._settings;
        this.menuToggle = true;
        
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: accessible_name ? accessible_name : "",
            style_class: "arc-menu-button"
        });

        this.tooltip = new Tooltip(this._button, this.actor, accessible_name);
        this.tooltip.isButton = true;
        this.tooltip.hide();
        let layout = this._settings.get_enum('menu-layout');
        let iconSize;
        if(layout == Constants.MENU_LAYOUT.Mint)
            iconSize = 21;
        else
            iconSize = SMALL_ICON_SIZE;
        this._icon = new St.Icon({ 
            gicon: gicon ? gicon : Gio.icon_new_for_string(icon_name),
            fallback_icon_name : icon_name,
            icon_size: iconSize
        });

        this.actor.child = this._icon;
        this.actor.connect('clicked', this._onClick.bind(this));
    }

    disableMenuToggle(){
        this.menuToggle = false;
    }

    _onClick() {
        if(this.menuToggle)
            this._button.leftClickMenu.toggle();
        this.activate();
    }

    activate() {
    }
};
// Menu Place Button Shortcut item class
var PlaceButtonItem = class ArcMenu_PlaceButtonItem extends SessionButton {
    constructor(button, info) {
        super(button, _(info.name), info.icon, info.gicon ? info.gicon : null);
        this._button = button;
        this._info = info;
    }
    activate() {
        this._info.launch();
    }

};
// Menu Category item class
var CategoryMenuButton = class ArcMenu_CategoryMenuButton extends SessionButton {
    constructor(button, category) {
        let name;
        let icon;
        let gicon;
        if(category == Constants.CategoryType.FREQUENT_APPS){
            name = _("Frequent Apps");
            icon = 'emblem-favorite-symbolic';
        }
        else if(category == Constants.CategoryType.HOME_SCREEN){
            name = _("Home Screen");  
            icon = 'emblem-favorite-symbolic';
        }    
        else if(category == Constants.CategoryType.ALL_PROGRAMS){
            name = _("All Programs"); 
            icon = 'view-grid-symbolic';
        }  
        else if(category == Constants.CategoryType.FAVORITES){
            name = _("Favorites");
            icon = 'emblem-favorite-symbolic';
        }  
        else{
            name = category.get_name();
            gicon = category.get_icon() ? category.get_icon() : null;
            icon = category.get_icon() ? category.get_icon().to_string() : null;
        }    
        super(button, _(name), icon, gicon);
        this._name = name;
        this.appList = [];
        this.isRecentlyInstalled = false;
        this.actor.style = "padding: 10px; min-height: 0px; border-width: 0px;";
        this._button = button;
        this._settings = this._button._settings;
        this._category = category;
        this.disableMenuToggle();
    }
    
    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        this.updateStyle();
    }
    
    updateStyle(){
        if(this.isRecentlyInstalled){
            let color = this._settings.get_string('indicator-color');
            this.actor.style = "border-color: " + color + "; border-width: 1px; padding: 10px; min-height: 0px;";
        }
        else{
            this.actor.style = "padding: 10px; min-height: 0px; border-width: 0px;";
        }
    }

    activate(event) {
        this._button.activeCategory = this._name;
        if(this._category == Constants.CategoryType.HOME_SCREEN){
            this._button.activeCategory = _("Pinned Apps");
            this._button.displayFavorites();
        }  
        else
            this._button.displayCategoryAppList(this.appList);
    }
    destroy(){
        
    }
}
// Settings Button
var MintButton = class ArcMenu_MintButton extends SessionButton {
    constructor(button, name, icon, command) {
        super(button, name, icon);
        this._command = command;
        this._button = button;
        this._settings = this._button._settings;
        this.layout = this._settings.get_enum('menu-layout');
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        if(this._app){
            this.actor.connect("button-release-event", this._onButtonReleaseEvent.bind(this));
        }
        this.disableMenuToggle();
    }
    _onButtonReleaseEvent(actor, event) {
  	    if(event.get_button()==3){
            if(this.rightClickMenu == undefined){
                this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
                if(this.layout == Constants.MENU_LAYOUT.UbuntuDash)
                    this.rightClickMenu.centerBoxPointerPosition();
                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
            this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
	    }   
    }
    activate() {
        if(this._app){
            this._button.leftClickMenu.toggle();
            this._app.open_new_window(-1);
        }
        else if(this._command === "ArcMenu_LogOut"){
            this._button.leftClickMenu.toggle();
            this._button._session.LogoutRemote(0);
        }
        else if(this._command === "ArcMenu_Lock"){
            this._button.isRunning = false;
            this._button.leftClickMenu.toggle();
            Main.screenShield.lock(true);
        }
        else if(this._command === "ArcMenu_PowerOff"){
            this._button.leftClickMenu.toggle();
            this._button._session.ShutdownRemote(0);
        }
        else if(this._command === "ArcMenu_Suspend"){
            this._button.leftClickMenu.toggle();
            let loginManager = LoginManager.getLoginManager();
            loginManager.canSuspend((result) => {
                if (result) {
                    loginManager.suspend();
                }
            });
        }
        else{
            this._button.leftClickMenu.toggle();
            Util.spawnCommandLine(this._command);
        }
            
    }
};
// Settings Button
var SettingsButton = class ArcMenu_SettingsButton extends SessionButton {
    constructor(button) {
        super(button, _("Settings"), 'emblem-system-symbolic');
    }
    activate() {
        Util.spawnCommandLine('gnome-control-center');
    }
};

// Arc Menu Settings Button
var ArcMenuSettingsButton = class ArcMenu_ArcMenuSettingsButton extends SessionButton {
    constructor(button) {
        super(button, _("Arc Menu Settings"), Me.path + '/media/icons/arc-menu-symbolic.svg');
        this.tooltip.flipY = true;
    }
    activate() {
        Util.spawnCommandLine('gnome-extensions prefs arc-menu@linxgem33.com');
    }
};
//'Windows' layout favorites hamburger button
var FavoritesButton = class ArcMenu_FavoritesButton extends SessionButton {
    constructor(button) {
        super(button, _("Favorites"), Me.path + Constants.HAMBURGER.Path);
        super.disableMenuToggle();
    }
    activate() {
        this.actor.hover=false;
        this.tooltip._onHover();
        this._button.toggleFavoritesMenu();
    }
};
//'Ubuntu Dash' layout categories hamburger button
var CategoriesButton = class ArcMenu_CategoriesButton extends SessionButton {
    constructor(button) {
        super(button, _("Categories"), Me.path + Constants.HAMBURGER.Path);
        super.disableMenuToggle();
    }
    activate() {
        this.actor.hover = false;
        this.tooltip._onHover();
        this._button.toggleFavoritesMenu();
    }
};
// User Button
var UserButton = class ArcMenu_UserButton extends SessionButton {
    constructor(button) {
        super(button, _("Users"), 'system-users-symbolic');
    }
    activate() {
        Util.spawnCommandLine("gnome-control-center user-accounts");
    }
};
// User Button
var CurrentUserButton = class ArcMenu_CurrentUserButton extends SessionButton {
    constructor(button) {
        super(button, GLib.get_real_name(), 'system-users-symbolic');
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.iconBin = new St.Bin({ 
            style_class: 'menu-user-avatar'
        });
        this.iconBin.style = "width: "+SMALL_ICON_SIZE+"px; height: "+SMALL_ICON_SIZE+"px;";
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();

        this.actor.child = this.iconBin;
    }
    activate() {
        Util.spawnCommandLine("gnome-control-center user-accounts");
    }
    _onUserChanged() {
        if (this._user.is_loaded) {
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName, GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.iconBin.child = null;
                this.iconBin.style = 'background-image: url("%s");'.format(iconFileName) + "width: "+SMALL_ICON_SIZE+"px; height: "+SMALL_ICON_SIZE+"px;";
            } else {
                this.iconBin.style = null;
                this.iconBin.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: SMALL_ICON_SIZE
                });
            }
        }    
    }
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
};

// Power Button
var PowerButton = class ArcMenu_PowerButton extends SessionButton {
    constructor(button) {
        super(button, _("Power Off"), 'system-shutdown-symbolic');
    }
    activate() {
        this._button._session.ShutdownRemote(0);
    }
};

// Logout Button
var LogoutButton = class ArcMenu_LogoutButton extends SessionButton {
    constructor(button) {
        super(button, _("Log Out"), 'application-exit-symbolic');
        this.disableMenuToggle();
    }
    activate() {
        this._button.leftClickMenu.toggle();
        this._button._session.LogoutRemote(0);
    }
};

// Suspend Button
var SuspendButton = class ArcMenu_SuspendButton extends SessionButton {
    constructor(button) {
        super(button, _("Suspend"), 'media-playback-pause-symbolic');
    }
    activate() {
        let loginManager = LoginManager.getLoginManager();
        loginManager.canSuspend((result) => {
            if (result) {
                loginManager.suspend();
            }
        });
    }
};

// Lock Screen Button
var LockButton = class ArcMenu_LockButton extends SessionButton {
    constructor(button) {
        super(button, _("Lock"), 'changes-prevent-symbolic');
        this.disableMenuToggle();
    }
    activate() {
        this._button.isRunning = false;
        this._button.leftClickMenu.toggle();
        Main.screenShield.lock(true);
    }
};

// Menu item to go back to category view
var BackMenuItem = GObject.registerClass(class ArcMenu_BackMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(button) {
        super._init({
            reactive:false,
            hover: false
        });
        this._button = button;
        this._layout = this._button.layout;
        this._settings = this._button._settings;
        
        this._icon = new St.Icon({
            icon_name: 'go-previous-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("Back"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
    }
    activate(event) {
        if(this._layout == Constants.MENU_LAYOUT.Default){
            if(this._button.currentMenu !== Constants.CURRENT_MENU.FAVORITES)
                this._button._clearActorsFromBox();
            if(this._button.currentMenu == Constants.CURRENT_MENU.SEARCH_RESULTS){ 
                if(this._settings.get_boolean('enable-pinned-apps')){
                    this._button.currentMenu = Constants.CURRENT_MENU.FAVORITES;
                    this._button.resetSearch();
                    this._button.displayFavorites();
                }
                else {
                    this._button.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
                    this._button.resetSearch();
                    this._button.displayCategories();
                }
            }
            else if(this._button.currentMenu == Constants.CURRENT_MENU.CATEGORIES){ 
                if(this._settings.get_boolean('enable-pinned-apps')){
                    this._button.currentMenu = Constants.CURRENT_MENU.FAVORITES;
                    this._button.displayFavorites();
                }   
            }
            else if(this._button.currentMenu == Constants.CURRENT_MENU.CATEGORY_APPLIST){
                this._button.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
                this._button.displayCategories();
            }
        }
        else{
            if(this._button.favoritesMenu) 
                this._button.favoritesMenu.toggle();
        }
        super.activate(event);
    }
});

// Menu item to view all apps
var ViewAllPrograms = GObject.registerClass(class ArcMenu_ViewAllPrograms extends ArcMenuPopupBaseMenuItem{
    _init(button) {
        super._init({
            reactive:false,
            hover: false
        });
        this._button = button;
        this._settings = this._button._settings;
    
        this._icon = new St.Icon({
            icon_name: 'go-next-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24,
             x_align: Clutter.ActorAlign.START
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("All Programs"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
    }
    activate(event) {
      this._button._clearActorsFromBox();
      if(this._settings.get_boolean('enable-pinned-apps')){
	      this._button.displayCategories();
	      this._button.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
      }
      else{ 
       	  this._button.displayAllApps();
          this._button.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;
      }
      super.activate(event);
    }
});

// Menu shortcut item class
var ShortcutMenuItem = GObject.registerClass(class ArcMenu_ShortcutMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(button, name, icon, command) {
        super._init();
        this._button = button;
        this._settings = this._button._settings;
        this._command = command;
        //Check for default commands--------
        if(this._command == "ArcMenu_Software"){
            if(GLib.find_program_in_path('gnome-software'))
                this._command='org.gnome.Software.desktop';
            else if(GLib.find_program_in_path('pamac-manager'))
                this._command='pamac-manager.desktop';
            else if(GLib.find_program_in_path('io.elementary.appcenter')){
                this._command='io.elementary.appcenter.desktop';
            }  
        }
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        //---------
        this._icon = new St.Icon({
            icon_name: icon,
            gicon: Gio.icon_new_for_string(icon),
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        this.label = new St.Label({
            text: _(name), y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        this.setShouldShow();
    }
    popupContextMenu(){
        if(this._app && this.rightClickMenu == undefined){
            this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
            if(this.actor.vertical)
                this.rightClickMenu.centerBoxPointerPosition();
            if(this._path) 
                this.rightClickMenu.path = this._path;
            this._button.appMenuManager.addMenu(this.rightClickMenu);
            this.rightClickMenu.actor.hide();
            Main.uiGroup.add_actor(this.rightClickMenu.actor);
            this.actor.connect('destroy', ()=>{
                this.rightClickMenu.destroy();
            });
        }
        if(this.rightClickMenu != undefined){
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
        }
    }
    setAsIcon(){
        this.actor.vertical = true;
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active));

        let layout = this._settings.get_enum('menu-layout');        
        if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash){
            this._iconSize = 52;
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
        } 
        else{
            this._iconSize = 36;  
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px;height:80px;';
        }
        this._icon.icon_size = this._iconSize;
        this.label.y_expand = true;
        this.label.x_expand= true;
        this.label.x_align = Clutter.ActorAlign.CENTER;
        this.label.y_align=  Clutter.ActorAlign.CENTER;
    }
    activate(event) {
        this._button.leftClickMenu.toggle();
        if(this._command == "ArcMenu_ActivitiesOverview")
            Main.overview.show();
        else if(this._command == "ArcMenu_RunCommand")
            Main.openRunDialog();
        else if(this._app)
            this._app.open_new_window(-1);
        else
            Util.spawnCommandLine(this._command);
        super.activate(event);
    }
    setIconSizeLarge(){
        this._icon.icon_size = MEDIUM_ICON_SIZE;
    }
});

// Menu item which displays the current user
var UserMenuItem = GObject.registerClass(class ArcMenu_UserMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(button, userAvatarSize) {
        super._init({
            reactive:false,
            hover: false
        });
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.iconBin =  new St.Bin({ 
            style_class: 'menu-user-avatar'
        });
        
        this._userAvatarSize = userAvatarSize ? userAvatarSize : USER_AVATAR_SIZE;

        this.iconBin.style = "width: "+this._userAvatarSize +"px; height: "+this._userAvatarSize +"px;";
        this.actor.add_child(this.iconBin);
        this._userLabel = new St.Label({
            text: GLib.get_real_name(),
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this._userLabel);
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
    }
    activate(event) {
        Util.spawnCommandLine("gnome-control-center user-accounts");
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }
    _onUserChanged() {
        if (this._user.is_loaded) {
            this._userLabel.set_text(this._user.get_real_name());
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName ,GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.iconBin.child = null;
                this.iconBin.style = 'background-image: url("%s");'.format(iconFileName) + "width: "+this._userAvatarSize +"px; height: "+this._userAvatarSize +"px;";
            } else {
                this.iconBin.style = null;
                this.iconBin.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: this._userAvatarSize
                });
            }
        }
    }
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
});

var UserMenuIcon = class ArcMenu_UserMenuIcon{
    constructor(button) {
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.actor = new St.Bin({ 
            style_class: 'menu-user-avatar',
            track_hover:true,
            reactive: true
        });
        this.actor.style = "width: 75px; height: 75px;";
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
        this.actor.connect('notify::hover',this._onHover.bind(this));
    }
    _onHover() {
        if(this.tooltip==undefined && this.actor.hover){
            this.tooltip = new Tooltip(this._button, this.actor, GLib.get_real_name());
            this.tooltip.isButton = true;
            this.tooltip.flipY = true;
            this.tooltip._onHover();
        }
    }
    _onUserChanged() {
        if (this._user.is_loaded) {
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName ,GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.actor.child = null;
                this.actor.style = 'background-image: url("%s");'.format(iconFileName) + "width: 75px; height: 75px;";
            } else {
                this.actor.style = null;
                this.actor.child = new St.Icon({ icon_name: 'avatar-default-symbolic',
                                                    icon_size: 75});
            }
        }
        
    }
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
};

// Menu pinned apps/favorites item class
var FavoritesMenuItem = GObject.registerClass({ 
    Signals: {  'saveSettings': {}, }, 
}, class ArcMenu_FavoritesMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(button, name, icon, command, isIconGrid = false) {
        super._init();
        this._button = button;
        this._settings = this._button._settings;
        this._command = command;
        this._iconPath = icon;
        this._name = name;
        this._isIconGrid = isIconGrid;
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);

        //Modifiy the Default Pinned Apps---------------------
        if(this._name == "Arc Menu Settings"){
            this._name = _("Arc Menu Settings");
        }
        else if(this._name == "Terminal"){
            this._name = _("Terminal");
        }
        if(this._iconPath === "ArcMenu_ArcMenuIcon"){
            this._iconPath = Me.path + '/media/icons/arc-menu-symbolic.svg';
        }
        //-------------------------------------------------------

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconPath),
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        })
        this.actor.add_child(this._icon);
 
        this.label = new St.Label({
            text: _(this._name), y_expand: true, x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        if(!isIconGrid){
            this._draggable = DND.makeDraggable(this.actor);
            this.isDraggableApp = true;
            this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
            this._draggable.connect('drag-cancelled', this._onDragCancelled.bind(this));
            this._draggable.connect('drag-end', this._onDragEnd.bind(this));
        }
        else{
            this.actor.vertical = true;
            this.label.x_align = Clutter.ActorAlign.CENTER;

            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash){
                this._icon.icon_size = 52;
                this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
            }
            else{
                this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px;height:80px;';
                this._icon.icon_size = 36;  
            }
        }
        this.setShouldShow();
    }
   
    popupContextMenu(){
        if(this.rightClickMenu == undefined){
            let app = this._app ? this._app : this._command;
            this.rightClickMenu = new AppRightClickMenu(this.actor, app, this._button);
            if(this._isIconGrid)
                this.rightClickMenu.centerBoxPointerPosition();
            this.rightClickMenu.isPinnedApp = true;

            this._button.appMenuManager.addMenu(this.rightClickMenu);
            this.rightClickMenu.actor.hide();
            Main.uiGroup.add_actor(this.rightClickMenu.actor);
            this.actor.connect('destroy', ()=>{
                this.rightClickMenu.destroy();
            });
        }
        if(this.tooltip!=undefined)
            this.tooltip.hide();
        if(!this.rightClickMenu.isOpen)
            this.rightClickMenu.redisplay();
        this.rightClickMenu.toggle();
    }

   _onDragBegin() {   
        if(this.rightClickMenu && this.rightClickMenu.isOpen)
            this.rightClickMenu.toggle();

        if(this._popupTimeoutId){
            GLib.source_remove(this._popupTimeoutId);
            this._popupTimeoutId = null;
        }

        this._dragMonitor = {
            dragMotion: (this, this._onDragMotion.bind(this))
        };

        this._parentBox = this.actor.get_parent();
        DND.addDragMonitor(this._dragMonitor); 
        DND.SNAP_BACK_ANIMATION_TIME = 0;

        this.dragStartY = (this._draggable._dragStartY); 
        this._emptyDropTarget = new Dash.EmptyDropTargetItem();
        this._emptyDropTarget.setChild(new St.Bin({ style_class: 'arc-empty-dash-drop-target' }));  

        if(this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Windows)
            this._emptyDropTarget.style = "width: 250px;";
        
        let p = this._parentBox.get_transformed_position();
        this.posY= p[1]; 

        this.rowHeight = this._parentBox.get_child_at_index(0).height;

        this.startIndex = 0;
        for(let i = 0; i < this._parentBox.get_children().length; i++){
            if(this.actor == this._parentBox.get_child_at_index(i))
                this.startIndex = i;
        }
        this._parentBox.insert_child_at_index(this._emptyDropTarget, this.startIndex);
            
        Main.overview.beginItemDrag(this);  
        this._emptyDropTarget.show(true); 
    }
    _onDragMotion(dragEvent) {
        this.newIndex = Math.floor((this._draggable._dragY - this.posY) / (this.rowHeight));
        
    	if(this.newIndex > this._parentBox.get_children().length -1)
            this.newIndex = this._parentBox.get_children().length -1;
        if(this.newIndex < 0)
            this.newIndex = 0;	
    	if(this._parentBox.get_child_at_index(this.newIndex) != this._emptyDropTarget)
            this._parentBox.set_child_at_index(this._emptyDropTarget, this.newIndex);
	    
	    return DND.DragMotionResult.CONTINUE;
    }
    _onDragCancelled() {
        Main.overview.cancelledItemDrag(this);
    }
    _onDragEnd() {    
 	    this._parentBox.remove_child(this._emptyDropTarget); 
        let index = this.newIndex;
        if(index > this.startIndex)
        	index--;
        if(index > this._parentBox.get_children().length -1)
        	index = this._parentBox.get_children().length -1;
        if(index < 0)
            index = 0;	
        if(index != this.startIndex){	
            this._parentBox.set_child_at_index(this.actor,index);    	
            let temp = this._button.favoritesArray[this.startIndex];
            this._button.favoritesArray.splice(this.startIndex,1);
            this._button.favoritesArray.splice(index,0,temp);
        }
        Main.overview.endItemDrag(this);
        DND.removeDragMonitor(this._dragMonitor);   
        this.emit('saveSettings');	  
    }
    getDragActor() {
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        let icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconPath),
            style_class: 'popup-menu-icon',
            icon_size: 40
        });
        addStyle ? icon.add_style_class_name('arc-menu-action') : icon.remove_style_class_name('arc-menu-action');
        return icon;
    }
    getDragActorSource() {
        return this.actor;
    }
    activate(event) {
        if(this._app)
            this._app.open_new_window(-1);
        else
            Util.spawnCommandLine(this._command);

        this._button.leftClickMenu.toggle();
        super.activate(event);
    }
});

var ApplicationMenuItem = GObject.registerClass(class ArcMenu_ApplicationMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(button, app, isIconGrid = false) {
        super._init();
        this._app = app;
        this._button = button;
        this._settings = this._button._settings;
        this._isIconGrid = isIconGrid;
        
        let disableRecentAppsIndicator = this._settings.get_boolean("disable-recently-installed-apps")
        if(!disableRecentAppsIndicator){
            let recentApps = this._settings.get_strv('recently-installed-apps');
            this.isRecentlyInstalled = recentApps.some( (app) => app === this._app.get_id());
        }

        this._iconBin = new St.Bin();
        this.actor.add_child(this._iconBin);
        this.label = new St.Label({
            text: app.get_name(),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        this.actor.label_actor = this.label;

        if(this.isRecentlyInstalled){
            this._indicator = new St.Label({
                text: _('New'),
                style_class: "arc-menu-menu-item-text-indicator",
                style: "border-radius: 15px; margin: 0px; padding: 0px 10px;",
                x_expand: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.actor.add_child(this._indicator);
        }
        if(this._isIconGrid){
            this.actor.vertical = true;
            if(this.isRecentlyInstalled){
                this.actor.remove_child(this._ornamentLabel);
                this.actor.remove_child(this._indicator);
                this.actor.insert_child_at_index(this._indicator, 0);
                this._indicator.x_align = Clutter.ActorAlign.CENTER;
                this._indicator.y_align = Clutter.ActorAlign.START;
                this._indicator.y_expand = false;
            }
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash)
                this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
            else
                this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px; height:80px;';
     
            this._iconBin.x_align = Clutter.ActorAlign.CENTER;
            this._iconBin.y_align = Clutter.ActorAlign.CENTER;
            this.label.x_align = Clutter.ActorAlign.CENTER;
            this.label.y_align = Clutter.ActorAlign.END;
        }
        this._updateIcon();
    }

    removeIndicator(){
        if(this.isRecentlyInstalled){
            this.isRecentlyInstalled = false;
            if(!this.actor.contains(this._ornamentLabel))
                this.actor.insert_child_at_index(this._ornamentLabel, 0);
            let recentApps = this._settings.get_strv('recently-installed-apps');
            let index = recentApps.indexOf(this._app.get_id());
            if(index > -1){
                recentApps.splice(index, 1);
            }
            this._settings.set_strv('recently-installed-apps', recentApps);

            this._indicator.hide();
            this._button.setRecentlyInstalledIndicator();
        }
    }

    popupContextMenu(){
        this.removeIndicator();
        if(this.rightClickMenu == undefined){
            this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
            if(this._isIconGrid)
                this.rightClickMenu.centerBoxPointerPosition();
            this._button.appMenuManager.addMenu(this.rightClickMenu);
            this.rightClickMenu.actor.hide();
            Main.uiGroup.add_actor(this.rightClickMenu.actor);
            this.actor.connect('destroy', ()=>{
                this.rightClickMenu.destroy();
            });
        }
        if(this.tooltip!=undefined)
            this.tooltip.hide();
        if(!this.rightClickMenu.isOpen)
            this.rightClickMenu.redisplay();
        this.rightClickMenu.toggle();
    }  
    get_app_id() {
        return this._app.get_id();
    }
    _createIcon(iconSize) {
        return this._app.create_icon_texture(iconSize);
    }
    activate(event) {
        this.removeIndicator();
        this._app.open_new_window(-1);
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }
    grabKeyFocus() {
        this.actor.grab_key_focus();
    }
    _updateIcon() {
        if(this._isIconGrid){
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash){
                let icon = this._app.create_icon_texture(52);
                this._iconBin.set_child(icon);
            } 
            else{
                let icon = this._app.create_icon_texture(36);  
                this._iconBin.set_child(icon);
            }        
        }
        else{
            let largeIcons = this._settings.get_boolean('enable-large-icons');
            let icon = this._app.create_icon_texture(largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE);
            this._iconBin.set_child(icon);
        }
    }
});
var SearchResultItem = GObject.registerClass(class ArcMenu_SearchResultItem extends ArcMenuPopupBaseMenuItem{
    _init(button, app, path) {
        super._init();
        this._button = button;
        this._app = app;
        this._path = path;
    }
    _createIcon(iconSize) {
        return this._app.create_icon_texture(iconSize);
    }
    popupContextMenu(){
        if(this._app && this.rightClickMenu == undefined){
            this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
            if(this._path) 
                this.rightClickMenu.path = this._path;
            this._button.appMenuManager.addMenu(this.rightClickMenu);
            this.rightClickMenu.actor.hide();
            Main.uiGroup.add_actor(this.rightClickMenu.actor);
            this.actor.connect('destroy', ()=>{
                this.rightClickMenu.destroy();
            });
        }
        if(this.rightClickMenu != undefined){
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
        }
    }
});
// Menu Category item class
var CategoryMenuItem = GObject.registerClass(class ArcMenu_CategoryMenuItem extends ArcMenuPopupBaseMenuItem{  
    _init(button, category) {
        super._init();
        this.appList = [];
        this._button = button;
        this._settings = this._button._settings;
        this._layout = this._settings.get_enum('menu-layout');
        this._category = category;
        this._name = "";

        this._icon = new St.Icon({
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        });

        if(this._category == Constants.CategoryType.FREQUENT_APPS){
            this._name = _("Frequent Apps");
            this._icon.icon_name = 'emblem-favorite-symbolic';
        }
        else if(this._category == Constants.CategoryType.HOME_SCREEN){
            this._name = _("Home Screen");  
            this._icon.icon_name = 'emblem-favorite-symbolic';
        }    
        else if(this._category == Constants.CategoryType.ALL_PROGRAMS){
            this._name = _("All Programs"); 
            this._icon.icon_name = 'view-grid-symbolic';
        }  
        else if(this._category == Constants.CategoryType.FAVORITES){
            this._name = _("Favorites");
            this._icon.icon_name = 'emblem-favorite-symbolic';
        }  
        else{
            this._name = this._category.get_name();
            this._icon.gicon = this._category.get_icon() ? this._category.get_icon() : null;
            this._icon.fallback_icon_name = this._category.get_icon() ? this._category.get_icon().to_string() : null;
        }            
        this.actor.add_child(this._icon);
        
        this.label = new St.Label({
            text: this._name,
            y_expand: true,
            x_expand:true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);

        if(this.isRecentlyInstalled)
            this.setRecentlyInstalledIndicator(true);

        if(!this._settings.get_boolean("disable-category-arrows")){
            this._arrowIcon = new St.Icon({
                icon_name: 'go-next-symbolic',
                style_class: 'popup-menu-icon',
                x_align: Clutter.ActorAlign.END,
                icon_size: 12,
            });
            this.actor.add_child(this._arrowIcon);
        }

        this.actor.label_actor = this.label;
    }

    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            if(this._settings.get_boolean("disable-category-arrows"))
                this.actor.add_child(this._indicator);
            else
                this.actor.insert_child_at_index(this._indicator, this.actor.get_n_children() - 1);
        }
        else if(this._indicator && this.actor.contains(this._indicator)){
            this.actor.remove_child(this._indicator);
        }
    }

    activate(event) {
        this._button.activeCategory = this._name;
        if(this._category == Constants.CategoryType.HOME_SCREEN){
            this._button.activeCategory = _("Pinned Apps");
            this._button.displayFavorites();
        }
        else
            this._button.displayCategoryAppList(this.appList);       
        if(Utils.isTwoPanedLayout(this._layout))
            this._button.setActiveCategory(this, true);
    }

    _onHover() {
        if (this.actor.hover){
            if(Utils.isTwoPanedLayout(this._layout) && this._settings.get_boolean('activate-on-hover')){
                this._button.displayCategoryAppList(this.appList);    
                this._button.setActiveCategory(this, true);
            } 
        }  
        super._onHover(); 
    }
});
// Simple Menu item class
var SimpleMenuItem = GObject.registerClass(class ArcMenu_SimpleMenuItem extends PopupMenu.PopupBaseMenuItem{  
    _init(button, category) {
        super._init();
        this.appList = [];
        this._category = category;
        this._button = button;
        this._settings = this._button._settings;
        this.name = "";
        this._active = false;

        this._icon = new St.Icon({
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        });

        if(this._category == Constants.CategoryType.FREQUENT_APPS){
            this._name = _("Frequent Apps");
            this._icon.icon_name = 'emblem-favorite-symbolic';
        }
        else if(this._category == Constants.CategoryType.HOME_SCREEN){
            this._name = _("Home Screen");  
            this._icon.icon_name = 'emblem-favorite-symbolic';
        }    
        else if(this._category == Constants.CategoryType.ALL_PROGRAMS){
            this._name = _("All Programs"); 
            this._icon.icon_name = 'view-grid-symbolic';
        }  
        else if(this._category == Constants.CategoryType.FAVORITES){
            this._name = _("Favorites");
            this._icon.icon_name = 'emblem-favorite-symbolic';
        }  
        else{
            this._name = this._category.get_name();
            this._icon.gicon = this._category.get_icon() ? this._category.get_icon() : null;
            this._icon.fallback_icon_name = this._category.get_icon() ? this._category.get_icon().to_string() : null;
        }           

        this.actor.add_child(this._icon);
        let categoryLabel = new St.Label({
            text: _(this._name),
            y_expand: true,
            x_expand:true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(categoryLabel);
        if(!this._settings.get_boolean("disable-category-arrows")){
            this._arrowIcon = new St.Icon({
                icon_name: 'go-next-symbolic',
                style_class: 'popup-menu-icon',
                x_align: Clutter.ActorAlign.END,
                icon_size: 12,
            });
            this.actor.add_child(this._arrowIcon);
        }
        this.actor.label_actor = categoryLabel;
        this.actor.connect('notify::hover', this._onHover.bind(this));
            
        this.subMenu = new PopupMenu.PopupMenu(this.actor,.5,St.Side.LEFT);

        Main.uiGroup.add_actor(this.subMenu.actor);  
        this.section = new PopupMenu.PopupMenuSection();
        this.subMenu.addMenuItem(this.section);  
        this.updateStyle();
        this.mainBox = new St.BoxLayout({
            vertical: false
        });    
        this.mainBox._delegate = this.mainBox;
        this.mainBox.style = 'max-height: 25em;';
        this.section.actor.add_actor(this.mainBox);   
        this.applicationsScrollBox = this._button._createScrollBox({
            x_expand: true, 
            y_expand: true,
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true
        });           
        this._button.subMenuManager.addMenu(this.subMenu);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.mainBox.add(this.applicationsScrollBox);
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active));
        if(this.subMenu._keyPressId)
            this.actor.disconnect(this.subMenu._keyPressId);
        this.applicationsScrollBox.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            switch (symbol) {
                case Clutter.KEY_Right:
                case Clutter.KEY_Left:
                    this.subMenu.toggle();
                    this.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                        this.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                    }
                    return Clutter.EVENT_STOP;
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
        this.actor.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            switch (symbol) {
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                    }
                    return Clutter.EVENT_STOP;
                case Clutter.KEY_Left:    
                case Clutter.KEY_Right:
                    if(!this.subMenu.isOpen){
                        let navigateFocus = true;
                        this.activate(event, navigateFocus);
                        this.subMenu.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                        return Clutter.EVENT_STOP;
                    }
                    else{
                        return Clutter.EVENT_PROPAGATE;
                    }
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
    }

    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            if(this._settings.get_boolean("disable-category-arrows"))
                this.actor.add_child(this._indicator);
            else
                this.actor.insert_child_at_index(this._indicator, this.actor.get_n_children() - 1);
        }
        else if(this._indicator && this.actor.contains(this._indicator)){
            this.actor.remove_child(this._indicator);
        }
    }

    setActive(active){
        if(this._button.activeMenuItem != null && this._button.leftClickMenu.isOpen)
            this._button.activeMenuItem = null;
    }
    updateStyle(){
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
       
        this.subMenu.actor.hide();
            if(addStyle){
                this.subMenu.actor.style_class = 'arc-menu-boxpointer';
                this.subMenu.actor.add_style_class_name('arc-menu');
            }
            else
            {       
                this.subMenu.actor.style_class = 'popup-menu-boxpointer';
                this.subMenu.actor.add_style_class_name('popup-menu');
            }
    }
    activate(event, navigateFocus = true) {
        this._button.activeCategory = this._name;
        this._button.displayCategoryAppList(this.appList, this);
        this.subMenu.toggle();
        if(navigateFocus)
            this.subMenu.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
    }
    _onHover(event) {
        if (this.actor.hover) {
            let navigateFocus = false;
            this.activate(event, navigateFocus);
        }
    }
    setFakeActive(active, params) {

    }
});
// SubMenu Category item class
var CategorySubMenuItem = GObject.registerClass(class ArcMenu_CategorySubMenuItem extends PopupMenu.PopupSubMenuMenuItem{  
    _init(button, category) {
        super._init('',true);
        this._category = category;
        this._button = button;
        this._settings = this._button._settings;
        this.name = "";
        this.isSimpleMenuItem = false;
        this._active = false;
        this.applicationsMap = new Map();
        this.appList = [];

        if(this._category == Constants.CategoryType.FREQUENT_APPS){
            this.name = _("Frequent Apps");
            this.icon.icon_name = 'emblem-favorite-symbolic';
        }
        else if(this._category == Constants.CategoryType.HOME_SCREEN){
            this.name = _("Home Screen");  
            this.icon.icon_name = 'emblem-favorite-symbolic';
        }    
        else if(this._category == Constants.CategoryType.ALL_PROGRAMS){
            this.name = _("All Programs"); 
            this.icon.icon_name = 'view-grid-symbolic';
        }  
        else if(this._category == Constants.CategoryType.FAVORITES){
            this.name = _("Favorites");
            this.icon.icon_name = 'emblem-favorite-symbolic';
        }  
        else{
            this.name = this._category.get_name();
            this.icon.gicon = this._category.get_icon() ? this._category.get_icon() : null;
            this.icon.fallback_icon_name = this._category.get_icon() ? this._category.get_icon().to_string() : null;
        }           

        this.label.text = this.name;
        this.icon.icon_size = MEDIUM_ICON_SIZE;

        this.menu.actor.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this._button.scrollToItem(this._button.activeMenuItem, this.menu.actor, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this._button.scrollToItem(this._button.activeMenuItem, this.menu.actor, Constants.DIRECTION.DOWN);
        }) ; 

        let panAction = new Clutter.PanAction({ interpolate: false });
        panAction.connect('pan', (action) => {
            this._button._blockActivateEvent = true;
            this._button.onPan(action, this.menu.actor);
        });
        panAction.connect('gesture-cancel',(action) =>  this._button.onPanEnd(action, this.menu.actor));
        panAction.connect('gesture-end', (action) => this._button.onPanEnd(action, this.menu.actor));
        this.menu.actor.add_action(panAction);
        
        this._updateIcons();
        this.menu.actor.style = 'max-height: 250px;';
        this.menu.actor.overlay_scrollbars = true;
        this.menu.actor.style_class = 'vfade popup-sub-menu';
        let scrollbar = this.menu.actor.get_vscroll_bar();
        scrollbar.style="padding-right:15px;";
        this.menu._needsScrollbar = this._needsScrollbar.bind(this);
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active));
        this.menu.connect('open-state-changed', () => {
            if(!this.menu.isOpen){
                let scrollbar= this.menu.actor.get_vscroll_bar().get_adjustment();
                scrollbar.set_value(0);
            }
        });
    }

    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            if(this._settings.get_boolean("disable-category-arrows"))
                this.actor.add_child(this._indicator);
            else
                this.actor.insert_child_at_index(this._indicator, this.actor.get_n_children() - 1);
        }
        else if(this._indicator && this.actor.contains(this._indicator)){
            this.actor.remove_child(this._indicator);
        }
    }

    setActive(active){
        if(active){
            if(this._button.activeMenuItem && this._button.activeMenuItem != this)
                this._button.activeMenuItem.setFakeActive(false);
            this._button.activeMenuItem = this;
        }            
        else if(this._button.leftClickMenu.isOpen)
            this._button.activeMenuItem = null;
    }
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    }
    _updateIcons() {
        let largeIcons = this._settings.get_boolean('enable-large-icons');
        if(this._settings.get_enum('menu-layout') !== Constants.MENU_LAYOUT.Simple2){
            this.icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
        } 
    }
    _updateIcon() {
    }
    _needsScrollbar() {
        let topMenu = this.menu;
        let [, topNaturalHeight] = topMenu.actor.get_preferred_height(-1);
        let topThemeNode = topMenu.actor.get_theme_node();

        let topMaxHeight = topThemeNode.get_max_height();
        let needsScrollbar = topMaxHeight >= 0 && topNaturalHeight >= topMaxHeight;
        if(needsScrollbar)
            this.menu.actor.style = 'min-height:150px; max-height: 250px;';
        else
            this.menu.actor.style = 'max-height: 250px;';
        return needsScrollbar;
    }
    loadMenu(){
        let children = this.menu.box.get_children();
        for (let i = 0; i < children.length; i++) {
            let item = children[i];
            this.menu.box.remove_actor(item);
        }
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        }); 
        for (let i = 0; i < appList.length; i++) {
            let app = appList[i];
            let item = this.applicationsMap.get(app);
            if(item.actor.get_parent()){
                item.actor.get_parent().remove_actor(item.actor);
            }
            if (!item.actor.get_parent()) {
                this.menu.box.add_actor(item.actor);
            }  
        }
    }
    _setOpenState(open) {
        if(this.isSimpleMenuItem){
            if(open){
                this._button.activeCategory = this._name;
                this._button.displayCategoryAppList(this.appList, this);
            }
        }
        else{
            if(open){
                this.loadMenu();
            }
        }
        this.setSubmenuShown(open);
    }
});

// Place Info class
var PlaceInfo = class ArcMenu_PlaceInfo {
    constructor(file, name, icon) {
        this.file = file;
        this.name = name ? name : this._getFileName();
        this.icon = icon ? icon : null;
        this.gicon = icon ? null : this.getIcon();
    }
    launch(timestamp) {
        let launchContext = global.create_app_launch_context(timestamp, -1);
        Gio.AppInfo.launch_default_for_uri(this.file.get_uri(), launchContext);
    }
    getIcon() {
        try {
            let info = this.file.query_info('standard::symbolic-icon', 0, null);
            return info.get_symbolic_icon();

        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!this.file.is_native()) {
                    return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    return new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
    }
    _getFileName() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                return this.file.get_basename();
            }
        }
    }
};
Signals.addSignalMethods(PlaceInfo.prototype);

// Menu Place Shortcut item class
var PlaceMenuItem = GObject.registerClass(class ArcMenu_PlaceMenuItem extends ArcMenuPopupBaseMenuItem{ 
    _init(button, info) {
        super._init();
        this._button = button;
        this._info = info;
        this._icon = new St.Icon({
            gicon: info.gicon ? info.gicon : Gio.icon_new_for_string(info.icon),
            icon_size: SMALL_ICON_SIZE
        });

        this.actor.add_child(this._icon);
        this.label = new St.Label({
            text: _(info.name),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        this._changedId = this._info.connect('changed', this._propertiesChanged.bind(this));
    }
    destroy() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = 0;
        }
    }
    activate(event) {
        this._info.launch(event.get_time());
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }
    _propertiesChanged(info) {
        this._icon.gicon = info.icon;
        this.label.text = info.name;
    }
});

var SearchBox = class ArcMenu_SearchBox{
    constructor(button) {
        this.newSearch= button.newSearch;
        this.actor = new St.BoxLayout({
            x_expand: true,
            style_class: 'search-box search-box-padding'
        });
        this._stEntry = new St.Entry({
            hint_text: _("Type to search…"),
            track_hover: true,
            can_focus: true,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START
        });
        this._stEntry.style = "min-height: 0px; border-radius:4px; padding: 7px 9px;";
        this._findIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-find-symbolic',
            icon_size: 16
        });
        this._clearIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-clear-symbolic',
            icon_size: 16
        });
        this._stEntry.set_primary_icon(this._findIcon);
        this.actor.add(this._stEntry);

        this._text = this._stEntry.get_clutter_text();
        this._textChangedId = this._text.connect('text-changed', this._onTextChanged.bind(this));
        this._keyPressId = this._text.connect('key-press-event', this._onKeyPress.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-in', this._onKeyFocusIn.bind(this));
        this._searchIconClickedId = 0;
        this._inputHistory = [];
        this._maxInputHistory = 5;

        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    updateStyle(removeBorder){
        let style = this._stEntry.style;
        this._stEntry.style = style.replace("border-width: 0;", "");
        if(removeBorder)
            this._stEntry.style += 'border-width: 0;'; 
    }

    _pushInput(searchString) {
        if (this._inputHistory.length == this._maxInputHistory) {
            this._inputHistory.shift();
        }
        this._inputHistory.push(searchString);
    }

    _lastInput() {
        if (this._inputHistory.length != 0) {
            return this._inputHistory[this._inputHistory.length - 1];
        }
        return '';
    }

    _previousInput() {
        if (this._inputHistory.length > 1) {
            return this._inputHistory[this._inputHistory.length - 2];
        }
        return '';
    }

    getText() {
        return this._stEntry.get_text();
    }

    setText(text) {
        this._stEntry.set_text(text);
    }

    grabKeyFocus() {
        this._stEntry.grab_key_focus();
    }

    hasKeyFocus() {
        return this._stEntry.contains(global.stage.get_key_focus());
    }

    clear() {
        this._stEntry.set_text('');
        this.emit('cleared');
    }

    isEmpty() {
        return this._stEntry.get_text() == '';
    }

    _isActivated() {
        return this._stEntry.get_text() != '';
    }

    _setClearIcon() {
        this._stEntry.set_secondary_icon(this._clearIcon);
        if (this._searchIconClickedId == 0) {
            this._searchIconClickedId = this._stEntry.connect('secondary-icon-clicked',
                this.clear.bind(this));
        }
    }

    _unsetClearIcon() {
        if (this._searchIconClickedId > 0) {
            this._stEntry.disconnect(this._searchIconClickedId);
        }
        this._searchIconClickedId = 0;
        this._stEntry.set_secondary_icon(null);
    }

    _onTextChanged(entryText) {
        let searchString = this._stEntry.get_text();
        this._pushInput(searchString);
        if (this._isActivated()) {
            this._setClearIcon();
        } else {
            this._unsetClearIcon();
            if (searchString == '' && this._previousInput() != '') {
                this.emit('cleared');
               
            }
        }
        this.emit('changed', searchString);
    }

    _onKeyPress(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            if (!this.isEmpty()) {
                if (this.newSearch.getTopResult()) {
                    this.newSearch.getTopResult().activate(event);
                }
            }
            return Clutter.EVENT_STOP;
        }
        this.emit('key-press-event', event);
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyFocusIn(actor) {
        this.emit('key-focus-in');
        return Clutter.EVENT_PROPAGATE;
    }

    _onDestroy() {
        if (this._textChangedId > 0) {
            this._text.disconnect(this._textChangedId);
            this._textChangedId = 0;
        }
        if (this._keyPressId > 0) {
            this._text.disconnect(this._keyPressId);
            this._keyPressId = 0;
        }
        if (this._keyFocusInId > 0) {
            this._text.disconnect(this._keyFocusInId);
            this._keyFocusInId = 0;
        }
    }
};
Signals.addSignalMethods(SearchBox.prototype);

/**
 * This class is responsible for the appearance of the menu button.
 */
var MenuButtonWidget = class ArcMenu_MenuButtonWidget{
    constructor() {
        this.actor = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            pack_start: false
        });
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);

        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            reactive: true
        });
        this._label = new St.Label({
            text: _("Applications"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.actor.add_child(this._icon);
        this.actor.add_child(this._label);
        this.actor.add_child(this._arrowIcon);

    }

    getPanelLabel() {
        return this._label;
    }

    getPanelIcon() {
        return this._icon;
    }
    showArrowIcon() {
        if (!this.actor.contains(this._arrowIcon)) {
            this.actor.add_child(this._arrowIcon);
        }
    }

    hideArrowIcon() {
        if (this.actor.contains(this._arrowIcon)) {
            this.actor.remove_child(this._arrowIcon);
        }
    }

    showPanelIcon() {
        if (!this.actor.contains(this._icon)) {
            this.actor.add_child(this._icon);
        }
    }

    hidePanelIcon() {
        if (this.actor.contains(this._icon)) {
            this.actor.remove_child(this._icon);
        }
    }

    showPanelText() {
        if (!this.actor.contains(this._label)) {
            this.actor.add_child(this._label);
        }
    }

    hidePanelText() {
        if (this.actor.contains(this._label)) {
            this.actor.remove_child(this._label);
        }
    }
};

var DashMenuButtonWidget = class ArcMenu_DashMenuButtonWidget{
    constructor(button, settings) {
        this._button = button;
        this._settings = settings;
        this.actor = new St.Button({
            style_class: 'show-apps',
            track_hover: true,
            can_focus: true,
            toggle_mode: false
        });
        this.actor._delegate = this;
        this.icon = new imports.ui.iconGrid.BaseIcon(_("Show Applications"),
                                            { setSizeManually: true,
                                            showLabel: false,
                                            createIcon: this._createIcon.bind(this) });
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            icon_size: 15,
            track_hover:true,
            reactive: true
        });
        this.actor.connect("notify::hover", () => {
            if(this.actor.hover)
                this._icon.add_style_pseudo_class('active');
            else if(!this._button.menuManager.activeMenu)
                this._icon.remove_style_pseudo_class('active');
        })
        this._labelText = _("Arc Menu");
        this.label = new St.Label({ style_class: 'dash-label' });
        this.label.hide();
        Main.layoutManager.addChrome(this.label);
        this.label_actor = this.label;
        this.actor.add_actor(this.icon);
        
        this.child = this.actor;
    }   
    showLabel() {
        if (!this._labelText)
            return;

        this.label.set_text(this._labelText);
        this.label.opacity = 0;
        this.label.show();

        let [stageX, stageY] = this.actor.get_transformed_position();
        let node = this.label.get_theme_node();

        let itemWidth  = this.actor.allocation.x2 - this.actor.allocation.x1;
        let itemHeight = this.actor.allocation.y2 - this.actor.allocation.y1;

        let labelWidth = this.label.get_width();
        let labelHeight = this.label.get_height();

        let x, y, xOffset, yOffset;

        let position = this._button._panel._settings.get_enum('dock-position');
        this._isHorizontal = ((position == St.Side.TOP) || (position == St.Side.BOTTOM));
        let labelOffset = node.get_length('-x-offset');
        switch (position) {
            case St.Side.LEFT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = stageX + this.actor.get_width() + xOffset;
                break;
            case St.Side.RIGHT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = Math.round(stageX) - labelWidth - xOffset;
                break;
            case St.Side.TOP:
                y = stageY + labelOffset + itemHeight;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
            case St.Side.BOTTOM:
                yOffset = labelOffset;
                y = stageY - labelHeight - yOffset;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
        }
        
        // keep the label inside the screen border
        // Only needed fot the x coordinate.
    
        // Leave a few pixel gap
        let gap = 5;
        let monitor = Main.layoutManager.findMonitorForActor(this.actor);
        if (x - monitor.x < gap)
            x += monitor.x - x + labelOffset;
        else if (x + labelWidth > monitor.x + monitor.width - gap)
            x -= x + labelWidth - (monitor.x + monitor.width) + gap;
    
        this.label.remove_all_transitions();
        this.label.set_position(x, y);
        this.label.ease({
            opacity: 255,
            duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD
        });
    }
    hideLabel() {
        this.label.ease({
            opacity: 0,
            duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.label.hide()
        });
    }
    _createIcon(size) {
        this._icon = new St.Icon({  
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            icon_size: size,
            reactive: true
        });
        let path = this._settings.get_string('custom-menu-button-icon');
        let iconEnum = this._settings.get_enum('menu-button-icon');

        if(iconEnum == Constants.MENU_BUTTON_ICON.Custom){
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                this._icon.set_gicon(Gio.icon_new_for_string(path));
            }
        }
        else if(iconEnum == Constants.MENU_BUTTON_ICON.System){
            this._icon.set_icon_name('start-here-symbolic');
        }
        else if(iconEnum == Constants.MENU_BUTTON_ICON.Arc_Menu){
            path = Me.path + Constants.ARC_MENU_ICON.path;
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                this._icon.set_gicon(Gio.icon_new_for_string(path));
            } 
        }
        else{
            path = Me.path + Constants.MENU_ICONS[iconEnum - 3].path;
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                this._icon.set_gicon(Gio.icon_new_for_string(path));
            } 
        }
        return this._icon;
    }
    getPanelIcon() {
        return this._icon;
    }

};

var WorldClocksSection = GObject.registerClass(class ArcMenu_WorldClocksSection extends St.Button {
    _init() {
        super._init({
            style_class: 'world-clocks-button',
            can_focus: true,
            x_expand: true,
            x_fill: true
        });
        this._clock = new imports.gi.GnomeDesktop.WallClock();
        this._clockNotifyId = 0;

        this._locations = [];

        let layout = new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._grid = new St.Widget({ style_class: 'world-clocks-grid',
                                        x_expand: true,
                                        layout_manager: layout });
        layout.hookup_style(this._grid);

        this.child = this._grid;

        this._clocksApp = null;
        this._clocksProxy = new ClocksProxy(
            Gio.DBus.session,
            'org.gnome.clocks',
            '/org/gnome/clocks',
            this._onProxyReady.bind(this),
            null /* cancellable */,
            Gio.DBusProxyFlags.DO_NOT_AUTO_START | Gio.DBusProxyFlags.GET_INVALIDATED_PROPERTIES);

        this._clockSettings = new Gio.Settings({
            schema_id: 'org.gnome.shell.world-clocks',
        });
        this.clocksChangedID = this._clockSettings.connect('changed', this._clocksChanged.bind(this));
        this._clocksChanged();

        this._appSystem = Shell.AppSystem.get_default();
        this.syncID = this._appSystem.connect('installed-changed',
            this._sync.bind(this));
        this._sync();
    }

    destroy(){
        if(this.syncID){
            this._appSystem.disconnect(this.syncID);
            this.syncID = null;
        } 
        if(this.clocksChangedID){
            this._clockSettings.disconnect(this.clocksChangedID);
            this.clocksChangedID = null;
        }
        if(this.clocksProxyID){
            this._clocksProxy.disconnect(this.clocksProxyID);
            this.clocksProxyID = null;
        }
        if (this._clockNotifyId){
            this._clock.disconnect(this._clockNotifyId);
            this._clockNotifyId = null;
        }
    }

    vfunc_clicked() {
        if (this._clocksApp)
            this._clocksApp.activate();
    }

    _sync() {
        this._clocksApp = this._appSystem.lookup_app('org.gnome.clocks.desktop');
        this.visible = this._clocksApp != null;
    }

    _clocksChanged() {
        this._grid.destroy_all_children();
        this._locations = [];

        let world = imports.gi.GWeather.Location.get_world();
        let clocks = this._clockSettings.get_value('locations').deep_unpack();
        for (let i = 0; i < clocks.length; i++) {
            let l = world.deserialize(clocks[i]);
            if (l && l.get_timezone() != null)
                this._locations.push({ location: l });
        }

        this._locations.sort((a, b) => {
            return a.location.get_timezone().get_offset() -
                    b.location.get_timezone().get_offset();
        });

        let layout = this._grid.layout_manager;
        let title = this._locations.length == 0
            ? _("Add world clocks…")
            : _("World Clocks");
        let header = new St.Label({ x_align: Clutter.ActorAlign.START,
                                    text: title });
        header.style = "font-weight: bold;";
        layout.attach(header, 0, 0, 2, 1);
        this.label_actor = header;

        let localOffset = GLib.DateTime.new_now_local().get_utc_offset();

        for (let i = 0; i < this._locations.length; i++) {
            let l = this._locations[i].location;

            let name = l.get_city_name() || l.get_name();
            let label = new St.Label({  text: name,
                                        x_align: Clutter.ActorAlign.START,
                                        y_align: Clutter.ActorAlign.CENTER,
                                        x_expand: true });
            label.style = "font-weight: normal; font-size: 0.9em;";
            let time = new St.Label();
            time.style = "font-feature-settings: \"tnum\"; font-size: 1.2em;";
            let otherOffset = this._getTimeAtLocation(l).get_utc_offset();
            let offset = (otherOffset - localOffset) / GLib.TIME_SPAN_HOUR;
            let fmt = Math.trunc(offset) == offset ? '%s%.0f' : '%s%.1f';
            let prefix = offset >= 0 ? '+' : '-';
            let tz = new St.Label({ text: fmt.format(prefix, Math.abs(offset)),
                                    x_align: Clutter.ActorAlign.END,
                                    y_align: Clutter.ActorAlign.CENTER });
            tz.style = "font-feature-settings: \"tnum\"; font-size: 0.9em;";
            if (this._grid.text_direction == Clutter.TextDirection.RTL) {
                layout.attach(tz, 0, i + 1, 1, 1);
                layout.attach(time, 1, i + 1, 1, 1);
                layout.attach(label, 2, i + 1, 1, 1);
            } else {
                layout.attach(label, 0, i + 1, 1, 1);
                layout.attach(time, 1, i + 1, 1, 1);
                layout.attach(tz, 2, i + 1, 1, 1);
            }

            this._locations[i].actor = time;
        }

        if (this._grid.get_n_children() > 1) {
            if (!this._clockNotifyId) {
                this._clockNotifyId =
                    this._clock.connect('notify::clock', this._updateLabels.bind(this));
            }
            this._updateLabels();
        } else {
            if (this._clockNotifyId)
                this._clock.disconnect(this._clockNotifyId);
            this._clockNotifyId = 0;
        }
    }

    _getTimeAtLocation(location) {
        let tz = GLib.TimeZone.new(location.get_timezone().get_tzid());
        return GLib.DateTime.new_now(tz);
    }

    _updateLabels() {
        for (let i = 0; i < this._locations.length; i++) {
            let l = this._locations[i];
            let now = this._getTimeAtLocation(l.location);
            l.actor.text = Util.formatTime(now, { timeOnly: true });
        }
    }

    _onProxyReady(proxy, error) {
        if (error) {
            log(`Failed to create GNOME Clocks proxy: ${error}`);
            return;
        }

        this.clocksProxyID = this._clocksProxy.connect('g-properties-changed',
            this._onClocksPropertiesChanged.bind(this));
        this._onClocksPropertiesChanged();
    }

    _onClocksPropertiesChanged() {
        if (this._clocksProxy.g_name_owner == null)
            return;

        this._clockSettings.set_value('locations',
            new GLib.Variant('av', this._clocksProxy.Locations));
    }
});
    
var WeatherSection = GObject.registerClass(class ArcMenu_WeatherSection extends St.Button {
    _init() {
        super._init({
            style_class: 'weather-button',
            can_focus: true,
            x_expand: true,
            x_fill: true
        });
        this._weatherClient = new imports.misc.weather.WeatherClient();

        let box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });

        this.child = box;

        let titleBox = new St.BoxLayout({ });
        let label = new St.Label({
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_align: Clutter.ActorAlign.END,
            text: _('Weather'),
        })
        label.style = "font-weight: bold; padding-bottom: 5px;";
        titleBox.add_child(label);
        box.add_child(titleBox);

        this._titleLocation = new St.Label({
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END,
        });
        this._titleLocation.style = "font-weight: bold; padding-bottom: 5px;";
        titleBox.add_child(this._titleLocation);

        let layout = new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._forecastGrid = new St.Widget({
            style_class: 'weather-grid',
            layout_manager: layout,
        });
        layout.hookup_style(this._forecastGrid);
        box.add_child(this._forecastGrid);

        this.syncID = this._weatherClient.connect('changed', this._sync.bind(this));
        this._sync();
    }
    destroy(){
        if(this.syncID){
            this._weatherClient.disconnect(this.syncID);
            this.syncID = null;
        } 
        this._weatherClient = null;
    }
    vfunc_map() {
        this._weatherClient.update();
        super.vfunc_map();
    }

    vfunc_clicked() {
        this._weatherClient.activateApp();
    }

    _getInfos() {
        let forecasts = this._weatherClient.info.get_forecast_list();

        let now = GLib.DateTime.new_now_local();
        let current = GLib.DateTime.new_from_unix_local(0);
        let infos = [];
        for (let i = 0; i < forecasts.length; i++) {
            const [valid, timestamp] = forecasts[i].get_value_update();
            if (!valid || timestamp === 0)
                continue;  // 0 means 'never updated'

            const datetime = GLib.DateTime.new_from_unix_local(timestamp);
            if (now.difference(datetime) > 0)
                continue; // Ignore earlier forecasts

            if (datetime.difference(current) < GLib.TIME_SPAN_HOUR)
                continue; // Enforce a minimum interval of 1h

            if (infos.push(forecasts[i]) == 5)
                break; // Use a maximum of five forecasts

            current = datetime;
        }
        return infos;
    }

    _addForecasts() {
        let layout = this._forecastGrid.layout_manager;

        let infos = this._getInfos();
        if (this._forecastGrid.text_direction == Clutter.TextDirection.RTL)
            infos.reverse();

        let col = 0;
        infos.forEach(fc => {
            const [valid_, timestamp] = fc.get_value_update();
            let timeStr = Util.formatTime(new Date(timestamp * 1000), {
                timeOnly: true
            });
            const [, tempValue] = fc.get_value_temp(imports.gi.GWeather.TemperatureUnit.DEFAULT);
            const tempPrefix = tempValue >= 0 ? ' ' : '';

            let time = new St.Label({
                text: timeStr,
                x_align: Clutter.ActorAlign.CENTER,
            });
            time.style = "font-size: 0.8em;"
            let icon = new St.Icon({
                style_class: 'weather-forecast-icon',
                icon_name: fc.get_symbolic_icon_name(),
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            let temp = new St.Label({
                text: '%s%.0f°'.format(tempPrefix, tempValue),
                x_align: Clutter.ActorAlign.CENTER,
            });

            temp.clutter_text.ellipsize = imports.gi.Pango.EllipsizeMode.NONE;
            time.clutter_text.ellipsize = imports.gi.Pango.EllipsizeMode.NONE;

            layout.attach(time, col, 0, 1, 1);
            layout.attach(icon, col, 1, 1, 1);
            layout.attach(temp, col, 2, 1, 1);
            col++;
        });
    }

    _setStatusLabel(text) {
        let layout = this._forecastGrid.layout_manager;
        let label = new St.Label({ text });
        layout.attach(label, 0, 0, 1, 1);
    }

    _updateForecasts() {
        this._forecastGrid.destroy_all_children();

        if (!this._weatherClient.hasLocation) {
            this._setStatusLabel(_("Select a location…"));
            return;
        }

        let info = this._weatherClient.info;
        let loc = info.get_location();
        if (loc.get_level() !== imports.gi.GWeather.LocationLevel.CITY && loc.has_coords()) {
            let world = imports.gi.GWeather.Location.get_world();
            loc = world.find_nearest_city(...loc.get_coords());
        }
        this._titleLocation.text = loc.get_name();

        if (this._weatherClient.loading) {
            this._setStatusLabel(_("Loading…"));
            return;
        }

        if (info.is_valid()) {
            this._addForecasts();
            return;
        }

        if (info.network_error())
            this._setStatusLabel(_("Go online for weather information"));
        else
            this._setStatusLabel(_("Weather information is currently unavailable"));
    }

    _sync() {
        this.visible = this._weatherClient.available;

        if (!this.visible)
            return;

        this._titleLocation.visible = this._weatherClient.hasLocation;

        this._updateForecasts();
    }
});
    
function _isToday(date) {
    let now = new Date();
    return now.getYear() == date.getYear() &&
           now.getMonth() == date.getMonth() &&
           now.getDate() == date.getDate();
}
