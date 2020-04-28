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

const {Atk, Clutter, GLib, GMenu, GObject, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var ApplicationsButton = GObject.registerClass(class ArcMenu_DashApplicationsButton extends PanelMenu.Button{
    _init(settings, panel) {
        super._init(0.5, null, true);
        this._settings = settings;
        this._panel = panel;
        this._menuButtonWidget = new MW.DashMenuButtonWidget(this, this._settings);

        this.child = this._menuButtonWidget.icon;
        this.icon = this._menuButtonWidget.icon;
        this.label = this._menuButtonWidget.label;
        this.container.showLabel = () => this._menuButtonWidget.showLabel();
        this.container.hideLabel = () => this._menuButtonWidget.hideLabel();
        this.toggleButton = this._menuButtonWidget.actor;
        this.container.toggleButton = this._menuButtonWidget.actor;
        this.container.setDragApp = () => {};
        
        //Tooltip showing/hiding
        this.tooltipShowing = false;
        this.tooltipHidingID = null;
        this.tooltipShowingID = null;
        //Create Main Button Left and Right Click Menus---------------------------------------------------
        this.style_class = 'dash-item-container';
        this.rightClickMenu = new RightClickMenu(this,0.5,St.Side.TOP);	
        this.rightClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
        
        this.leftClickMenu = new ApplicationsMenu(this, 0.5, St.Side.TOP, this, this._settings);
        this.leftClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
        //------------------------------------------------------------------------------------------------

        //Main Menu Manager--------------------------------------------------------
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menuManager._changeMenu = (menu) => {};
        this.menuManager.addMenu(this.rightClickMenu); 	
        this.menuManager.addMenu(this.leftClickMenu); 
        //-------------------------------------------------------------------------

        //Sub Menu Manager - For Simple Menu Layout--------------------------------
        this.subMenuManager = new PopupMenu.PopupMenuManager(this);
        this.subMenuManager._changeMenu = (menu) => {};
        //-------------------------------------------------------------------------

        //Applications Right Click Context Menu------------------------------------
        this.appMenuManager = new PopupMenu.PopupMenuManager(this);
        this.appMenuManager._changeMenu = (menu) => {};
        this.appMenuManager._onMenuSourceEnter = (menu) =>{
            if (this.appMenuManager.activeMenu && this.appMenuManager.activeMenu != menu)
                return Clutter.EVENT_STOP;

            return Clutter.EVENT_PROPAGATE;
        }
        //-------------------------------------------------------------------------

        //Dash to Dock Integration----------------------------------------------------------------------
        this.rightClickMenu.addDTDSettings();  
        
        this.dtdPostionChangedID = this._panel._settings.connect('changed::dock-position', ()=> {
            let side = this._panel._settings.get_enum('dock-position');
            this.updateArrowSide(side);
        });
        //----------------------------------------------------------------------------------
        this._iconThemeChangedId = St.TextureCache.get_default().connect('icon-theme-changed', this.reload.bind(this));

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this.updateHeight();
        });

        this._appList = this.listAllApps();

        //Update Categories on 'installed-changed' event-------------------------------------
        this._installedChangedId = appSys.connect('installed-changed', () => {
            this._newAppList = this.listAllApps();

            //Filter to find if a new application has been installed
            let newApps = this._newAppList.filter(app => !this._appList.includes(app));

            //A New Application has been installed
            //Save it in settings
            if(newApps.length){
                let recentApps = this._settings.get_strv('recently-installed-apps');
                let newRecentApps = [...new Set(recentApps.concat(newApps))];
                this._settings.set_strv('recently-installed-apps', newRecentApps);
            }
            
            this._appList = this._newAppList;
            this.reload();
        });
        //-----------------------------------------------------------------------------------
        this._setMenuPositionAlignment();
        //Add Menu Button Widget to Button
        this.add_actor(this._menuButtonWidget.actor);
        this._menuButtonWidget.actor.connect("event",this._onEvent.bind(this));
        //Create Basic Layout ------------------------------------------------
        this.createLayoutID = GLib.timeout_add(0, 100, () => {
            this.createMenuLayout();
            this.createLayoutID = null;
            return GLib.SOURCE_REMOVE;
        });
        //--------------------------------------------------------------------
    }
    listAllApps(){
        let appList = appSys.get_installed().filter(appInfo => {
            try {
                appInfo.get_id(); // catch invalid file encodings
            } catch (e) {
                return false;
            }
            return appInfo.should_show();
        });

        return appList.map(app => app.get_id());
    }
    setDragApp(){

    }
    handleDragOver(source, _actor, _x, _y, _time) {
        return imports.ui.dnd.DragMotionResult.NO_DROP;
    }
    acceptDrop(source, _actor, _x, _y, _time) {
        return false;
    }
    createMenuLayout(){
        this.section = new PopupMenu.PopupMenuSection();
        this.leftClickMenu.addMenuItem(this.section);            
        this.mainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL
        });       
        this.mainBox._delegate = this.mainBox; 

        let monitorIndex = Main.layoutManager.findIndexForActor(this.getWidget().actor);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);
        let height = Math.round(this._settings.get_int('menu-height') / scaleFactor);

        if(height > monitorWorkArea.height){
            height = (monitorWorkArea.height * 8) / 10;
        }

        this.mainBox.style = `height: ${height}px`;        
        this.section.actor.add_actor(this.mainBox);          
        this.MenuLayout = Utils.getMenuLayout(this, this._settings.get_enum('menu-layout'));
        this._setMenuPositionAlignment();
        this.updateStyle();
    }
    getMenu(){
        return this.MenuLayout;
    }
    _setMenuPositionAlignment(){
        let layout = this._settings.get_enum('menu-layout');
        if(layout != Constants.MENU_LAYOUT.Runner){
            let side = this._panel._settings.get_enum('dock-position');
            this.updateArrowSide(side, false);
        }
        else{
            this.updateArrowSide(St.Side.TOP, false);
        }

    }
    updateArrowSide(side, setAlignment = true){
        let arrowAlignment = 0.5;

        this.rightClickMenu._arrowSide = side;
        this.rightClickMenu._boxPointer._arrowSide = side;
        this.rightClickMenu._boxPointer._userArrowSide = side;
        this.rightClickMenu._boxPointer.setSourceAlignment(arrowAlignment);
        this.rightClickMenu._arrowAlignment = arrowAlignment
        this.rightClickMenu._boxPointer._border.queue_repaint();

        this.leftClickMenu._arrowSide = side;
        this.leftClickMenu._boxPointer._arrowSide = side;
        this.leftClickMenu._boxPointer._userArrowSide = side;
        this.leftClickMenu._boxPointer.setSourceAlignment(arrowAlignment);
        this.leftClickMenu._arrowAlignment = arrowAlignment
        this.leftClickMenu._boxPointer._border.queue_repaint();
        
        if(setAlignment)
            this._setMenuPositionAlignment();  
    }
    updateStyle(){
        let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow');   
        let layout = this._settings.get_enum('menu-layout');
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        let gapAdjustment = this._settings.get_int('gap-adjustment');

        this.leftClickMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.leftClickMenu.actor.add_style_class_name(addStyle ? 'arc-menu' : 'popup-menu');

        this.rightClickMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.rightClickMenu.actor.add_style_class_name(addStyle ? 'arc-menu' : 'popup-menu');

        if(removeMenuArrow){
            this.leftClickMenu.actor.style = "-arrow-base:0px; -arrow-rise:0px; -boxpointer-gap: " + gapAdjustment + "px;";
            this.leftClickMenu.box.style = "margin:0px;";
        }  
        else if(layout != Constants.MENU_LAYOUT.Raven){
            this.leftClickMenu.actor.style = "-boxpointer-gap: " + gapAdjustment + "px;";
            this.leftClickMenu.box.style = null;
        }
        if(this.MenuLayout)
            this.MenuLayout.updateStyle(); 
    }
    updateSearch(){
        if(this.MenuLayout)
            this.MenuLayout.updateSearch();
    }
    setSensitive(sensitive) {
        this.reactive = sensitive;
        this.can_focus = sensitive;
        this.track_hover = sensitive;
    }
    _onEvent(actor, event){
        if (event.type() == Clutter.EventType.BUTTON_PRESS){   
            if(event.get_button()==1 && actor instanceof St.Button ){    
                let layout = this._settings.get_enum('menu-layout');
                if(layout == Constants.MENU_LAYOUT.GnomeDash)
                    Main.overview.toggle();
                else{
                    if(layout == Constants.MENU_LAYOUT.Runner || layout == Constants.MENU_LAYOUT.Raven)
                        this.MenuLayout.updateRunnerLocation();
                    this.leftClickMenu.toggle();
                    if(this.leftClickMenu.isOpen){
                        this.mainBox.grab_key_focus();	
                    }    
                }                
            }    
            else if(event.get_button()==3 && actor instanceof St.Button){                      
                this.rightClickMenu.toggle();	                	
            }   
            return Clutter.EVENT_STOP; 
        }
        else if(event.type() == Clutter.EventType.TOUCH_BEGIN){         
            let layout = this._settings.get_enum('menu-layout');
                if(layout == Constants.MENU_LAYOUT.GnomeDash)
                    Main.overview.toggle();
                else{
                    if(layout == Constants.MENU_LAYOUT.Runner || layout == Constants.MENU_LAYOUT.Raven)
                        this.MenuLayout.updateRunnerLocation();
                    this.leftClickMenu.toggle();	
                    if(this.leftClickMenu.isOpen){
                        this.mainBox.grab_key_focus();	
                    }	
                }         
        }
                
        return Clutter.EVENT_PROPAGATE;
    }
    toggleMenu() {
        if(this.appMenuManager.activeMenu)
            this.appMenuManager.activeMenu.toggle();

        if(this.subMenuManager.activeMenu)
            this.subMenuManager.activeMenu.toggle();

        //If Layout is GnomeDash - toggle Main Overview   
        let layout = this._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.GnomeDash)
            Main.overview.toggle();
        else{
            if(layout == Constants.MENU_LAYOUT.Runner || layout == Constants.MENU_LAYOUT.Raven)
                this.MenuLayout.updateRunnerLocation();
            this.leftClickMenu.toggle();
            if(this.leftClickMenu.isOpen){
                this.mainBox.grab_key_focus();	
            }
        }
    }
    getActiveMenu(){
        if(this.appMenuManager.activeMenu)
            return this.appMenuManager.activeMenu;
        else if(this.subMenuManager.activeMenu)
            return this.appMenuManager.activeMenu;
        else if(this.leftClickMenu.isOpen)
            return this.leftClickMenu;
        else if(this.rightClickMenu.isOpen)
            return this.rightClickMenu;
        else
            return null;
    }
    toggleRightClickMenu(){
        if(this.rightClickMenu.isOpen)
            this.rightClickMenu.toggle();   
    }
    getWidget() {
        return this._menuButtonWidget;
    }
    updateHeight(){
        let layout = this._settings.get_enum('menu-layout');

        let monitorIndex = Main.layoutManager.findIndexForActor(this.getWidget().actor);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);
        let height = Math.round(this._settings.get_int('menu-height') / scaleFactor);

        if(height > monitorWorkArea.height){
            height = (monitorWorkArea.height * 8) / 10;
        }

        if(!(layout == Constants.MENU_LAYOUT.Simple || layout == Constants.MENU_LAYOUT.Simple2 || layout == Constants.MENU_LAYOUT.Runner) && this.MenuLayout)
            this.mainBox.style = `height: ${height}px`;
        
        
        this.reload();
    }
    destroy() {  
        if (this._iconThemeChangedId){
            St.TextureCache.get_default().disconnect(this._iconThemeChangedId);
            this._iconThemeChangedId = null;
        }
        if (this._monitorsChangedId){
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if(this.reloadID){
            GLib.source_remove(this.reloadID);
            this.reloadID = null;
        }
        if(this.createLayoutID){
            GLib.source_remove(this.createLayoutID);
            this.createLayoutID = null;
        }
        if(this.updateMenuLayoutID){
            GLib.source_remove(this.updateMenuLayoutID);
            this.updateMenuLayoutID = null;
        }
        if (this.tooltipShowingID) {
            GLib.source_remove(this.tooltipShowingID);
            this.tooltipShowingID = null;
        }     
        if (this.tooltipHidingID) {
            GLib.source_remove(this.tooltipHidingID);
            this.tooltipHidingID = null;
        }    
        if(this.MenuLayout)
            this.MenuLayout.destroy();

        if(this.dtdPostionChangedID && this._panel._settings){
            this._panel._settings.disconnect(this.dtdPostionChangedID);
            this.dtdPostionChangedID = null;
        }
        if(this._installedChangedId){
            appSys.disconnect(this._installedChangedId);
            this._installedChangedId = null;
        }
        if(this.leftClickMenu){
            this.leftClickMenu.destroy();
        }
        if(this.rightClickMenu){
            this.rightClickMenu.destroy();
        }
        
        this.container.child = null;
        this.container.destroy();
    }
    _updateMenuLayout(){
        this.tooltipShowing = false;
        if (this.tooltipShowingID) {
            GLib.source_remove(this.tooltipShowingID);
            this.tooltipShowingID = null;
        }     
        if (this.tooltipHidingID) {
            GLib.source_remove(this.tooltipHidingID);
            this.tooltipHidingID = null;
        }
        this.MenuLayout.destroy();
        this.MenuLayout = null;
        this.leftClickMenu.removeAll();
        this.updateMenuLayoutID = GLib.timeout_add(0, 100, () => {
            this.createMenuLayout();
            this.updateMenuLayoutID = null;
            return GLib.SOURCE_REMOVE;
        });  
    }
    _loadPinnedShortcuts(){
        if(this.MenuLayout)
            this.MenuLayout.loadPinnedShortcuts();
    }
    updateRunnerLocation(){
        if(this.MenuLayout)
            this.MenuLayout.updateRunnerLocation();
    }
    updateIcons(){
        if(this.MenuLayout)
            this.MenuLayout.updateIcons();
    }
    _loadCategories(){
        if(this.MenuLayout)
            this.MenuLayout.loadCategories();
    }
    _clearApplicationsBox() {
        if(this.MenuLayout)
            this.MenuLayout.clearApplicationsBox();
    }
    _displayCategories() {
        if(this.MenuLayout)
            this.MenuLayout.displayCategories();
    }
    _displayFavorites() {
        if(this.MenuLayout)
            this.MenuLayout.displayFavorites();
    }
    _loadFavorites() {
        if(this.MenuLayout)
            this.MenuLayout.loadFavorites();
    }
    _displayAllApps() {
        if(this.MenuLayout)
            this.MenuLayout.displayAllApps();
    }
    selectCategory(dir) {
        if(this.MenuLayout)
            this.MenuLayout.selectCategory(dir);
    }
    _displayGnomeFavorites(){
        if(this.MenuLayout)
            this.MenuLayout.displayGnomeFavorites();
    }
    _setActiveCategory(){
        if(this.MenuLayout)
            this.MenuLayout.setActiveCategory();
    }
    scrollToButton(button){
        if(this.MenuLayout)
            this.MenuLayout.scrollToButton(button);
    }
    reload(){
        if(this.MenuLayout)
            this.MenuLayout.needsReload = true;
    }
    setCurrentMenu(menu) {
        if(this.MenuLayout)
            this.MenuLayout.setCurrentMenu(menu);
    }
    getCurrentMenu(){
        if(this.MenuLayout)
            return this.MenuLayout.getCurrentMenu();
    }
    getShouldLoadFavorites(){
        if(this.MenuLayout)
            return this.MenuLayout.shouldLoadFavorites;
    }
    resetSearch(){
        if(this.MenuLayout)
            this.MenuLayout.resetSearch();
    }
    setDefaultMenuView(){
        if(this.MenuLayout)
            this.MenuLayout.setDefaultMenuView();
    }
    _onOpenStateChanged(menu, open) {
        if (open){
            if(this.menuManager.activeMenu) 
                this.menuManager.activeMenu.toggle();
            this.getWidget().actor.add_style_pseudo_class('selected');
            this.getWidget()._icon.add_style_pseudo_class('active');
        }      
        else{ 
            this.getWidget().actor.remove_style_pseudo_class('selected');
            if(!this.getWidget().actor.hover)
                this.getWidget()._icon.remove_style_pseudo_class('active');
        }
    }
});

var ApplicationsMenu = class ArcMenu_ApplicationsDashMenu extends PopupMenu.PopupMenu{
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
        this.connect('menu-closed', () => this._onCloseEvent());
    }

    open(animation){
        this._onOpenEvent();
        super.open(animation);
    }

    close(animation){
        if(this._button.appMenuManager.activeMenu)
            this._button.appMenuManager.activeMenu.toggle();
        if(this._button.subMenuManager.activeMenu)
            this._button.subMenuManager.activeMenu.toggle();
        super.close(animation);
    }

    _onOpenEvent(){
        this._button.leftClickMenu.actor._muteInput = false;
        if(this._button.MenuLayout && this._button.MenuLayout.needsReload){
            this._button.MenuLayout.reload();
            this._button.MenuLayout.needsReload = false;
            this._button.setDefaultMenuView(); 
        } 
    }

    _onCloseEvent(){
        if(this._button.MenuLayout && this._button.MenuLayout.isRunning){
            if(this._button.MenuLayout.needsReload)
                this._button.MenuLayout.reload();
            this._button.MenuLayout.needsReload = false;
            this._button.setDefaultMenuView(); 
        }
    }
};

var RightClickMenu = class ArcMenu_RightClickDashMenu extends PopupMenu.PopupMenu {
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
        this.DTDSettings=false;

        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
        let item = new PopupMenu.PopupMenuItem(_("Arc Menu Settings"));
        item.connect('activate', ()=>{
            Util.spawnCommandLine('gnome-extensions prefs arc-menu@linxgem33.com');
        });
        this.addMenuItem(item);        
        item = new PopupMenu.PopupSeparatorMenuItem();     
        item._separator.style_class='arc-menu-sep';     
        this.addMenuItem(item);      
        
        item = new PopupMenu.PopupMenuItem(_("Arc Menu GitLab Page"));        
        item.connect('activate', ()=>{
            Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu');
        });     
        this.addMenuItem(item);  
        item = new PopupMenu.PopupMenuItem(_("Arc Menu User Manual"));          
        item.connect('activate', ()=>{
            Util.spawnCommandLine('xdg-open ' + Constants.ARCMENU_MANUAL_URL);
        });      
        this.addMenuItem(item);
    }
    addDTDSettings(){
        if(this.DTDSettings==false){
            let dashToDock = Main.extensionManager.lookup("dash-to-dock@micxgx.gmail.com");
            let ubuntuDash = Main.extensionManager.lookup("ubuntu-dock@ubuntu.com");
            let dashExtensionSettings, dashExtensionName;
            if(dashToDock && dashToDock.stateObj && dashToDock.stateObj.dockManager){
                dashExtensionName = _("Dash to Dock Settings");
                dashExtensionSettings = 'gnome-extensions prefs dash-to-dock@micxgx.gmail.com'; 
            }
            if(ubuntuDash && ubuntuDash.stateObj && ubuntuDash.stateObj.dockManager){
                dashExtensionName = _("Ubuntu Dock Settings");
                dashExtensionSettings = 'gnome-control-center ubuntu'; 
            }
            let item = new PopupMenu.PopupMenuItem(_(dashExtensionName));
            item.connect('activate', ()=>{
                Util.spawnCommandLine(dashExtensionSettings);
            });
            this.addMenuItem(item,1);   
            this.DTDSettings=true;
        }
    }
    removeDTDSettings(){
        let children = this._getMenuItems();
        if(children[1] instanceof PopupMenu.PopupMenuItem)
            children[1].destroy();
        this.DTDSettings=false;
    }
};
