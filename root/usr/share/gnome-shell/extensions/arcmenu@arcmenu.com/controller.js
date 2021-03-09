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

const {Gdk, Gio, GLib, Gtk, St} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Helper = Me.imports.helper;
const Main = imports.ui.main;
const MenuButton = Me.imports.menuButton;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var MenuSettingsController = class {
    constructor(settings, settingsControllers, panel, panelIndex, arcMenuPlacement) {
        this._settings = settings;
        if(this._settings.get_boolean('reload-theme'))
            this._settings.reset('reload-theme');
        this.panel = panel;
        this.arcMenuPlacement = arcMenuPlacement;

        this.updateThemeID = GLib.timeout_add(0, 100, () => {
            Utils.createStylesheet(this._settings);
            Main.loadTheme();
            this.updateThemeID = null;
            return GLib.SOURCE_REMOVE;
        });
        this.currentMonitorIndex = 0;
        this._activitiesButton = Main.panel.statusArea.activities;
        this.enableHotkey = panelIndex === 0 ? true : false;

        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            this._menuButton = new MenuButton.MenuButton(settings, this.arcMenuPlacement, panel);
        }
        else if(this.arcMenuPlacement == Constants.ArcMenuPlacement.DASH){
            this._menuButton = new MenuButton.MenuButton(settings, this.arcMenuPlacement, panel, panelIndex);
            this.menuButtonAdjustedActor = this._menuButton.container;
            this._configureActivitiesButton();
        }
            
        this._settingsControllers = settingsControllers
        this._hotCornerManager = new Helper.HotCornerManager(this._settings,() => this.toggleMenus());
        if(this.enableHotkey){
            this._menuHotKeybinder = new Helper.MenuHotKeybinder(() => this._onHotkey());
            this._keybindingManager = new Helper.KeybindingManager(this._settings); 
        }
        this._applySettings();
    }

    // Load and apply the settings from the arc-menu settings
    _applySettings() {
        this._updateHotCornerManager();
        if(this.enableHotkey)
            this._updateHotKeyBinder();
        this._setButtonAppearance();
        this._setButtonText();
        this._setButtonIcon();
        this._setButtonIconSize();
        this._setButtonIconPadding();
    }
    // Bind the callbacks for handling the settings changes to the event signals
    bindSettingsChanges() {
        this.settingsChangeIds = [
            this._settings.connect('changed::hot-corners', this._updateHotCornerManager.bind(this)),
            this._settings.connect('changed::menu-hotkey', this._updateHotKeyBinder.bind(this)),
            this._settings.connect('changed::position-in-panel', this._setButtonPosition.bind(this)),
            this._settings.connect('changed::menu-position-alignment', this._setMenuPositionAlignment.bind(this)),
            this._settings.connect('changed::menu-button-appearance', this._setButtonAppearance.bind(this)),
            this._settings.connect('changed::custom-menu-button-text', this._setButtonText.bind(this)),
            this._settings.connect('changed::menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::distro-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::arc-menu-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon-size', this._setButtonIconSize.bind(this)),
            this._settings.connect('changed::button-padding', this._setButtonIconPadding.bind(this)),
            this._settings.connect('changed::enable-menu-button-arrow', this._setMenuButtonArrow.bind(this)),
            this._settings.connect('changed::enable-custom-arc-menu', this._updateStyle.bind(this)),
            this._settings.connect('changed::remove-menu-arrow', this._updateStyle.bind(this)),
            this._settings.connect('changed::disable-searchbox-border', this._updateStyle.bind(this)),
            this._settings.connect('changed::indicator-color', this._updateStyle.bind(this)),
            this._settings.connect('changed::indicator-text-color', this._updateStyle.bind(this)),
            this._settings.connect('changed::krunner-show-details', this._updateKRunnerSearchLayout.bind(this)),
            this._settings.connect('changed::directory-shortcuts-list', this._reload.bind(this)),
            this._settings.connect('changed::application-shortcuts-list', this._reload.bind(this)),
            this._settings.connect('changed::disable-recently-installed-apps', this._reload.bind(this)),
            this._settings.connect('changed::extra-categories', this._reload.bind(this)),
            this._settings.connect('changed::show-power-button', this._reload.bind(this)),
            this._settings.connect('changed::show-restart-button', this._reload.bind(this)),
            this._settings.connect('changed::show-logout-button', this._reload.bind(this)),
            this._settings.connect('changed::show-lock-button', this._reload.bind(this)),
            this._settings.connect('changed::show-external-devices', this._reload.bind(this)),
            this._settings.connect('changed::show-bookmarks', this._reload.bind(this)),
            this._settings.connect('changed::show-suspend-button', this._reload.bind(this)),
            this._settings.connect('changed::disable-user-avatar', this._reload.bind(this)),
            this._settings.connect('changed::enable-activities-shortcut', this._reload.bind(this)),
            this._settings.connect('changed::enable-horizontal-flip', this._reload.bind(this)),
            this._settings.connect('changed::searchbar-default-bottom-location', this._reload.bind(this)),
            this._settings.connect('changed::searchbar-default-top-location', this._plasmaMenuReloadExtension.bind(this)),
            this._settings.connect('changed::searchbar-default-top-location', this._reload.bind(this)),
            this._settings.connect('changed::recently-installed-apps', this._reload.bind(this)),
            this._settings.connect('changed::multi-lined-labels', this._reload.bind(this)),
            this._settings.connect('changed::plasma-show-descriptions', this._reload.bind(this)),
            this._settings.connect('changed::menu-height', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::right-panel-width', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::reload-theme', this._reloadExtension.bind(this)),
            this._settings.connect('changed::pinned-app-list',this._updateFavorites.bind(this)),
            this._settings.connect('changed::enable-weather-widget-ubuntu',this._updateFavorites.bind(this)),
            this._settings.connect('changed::enable-clock-widget-ubuntu',this._updateFavorites.bind(this)),
            this._settings.connect('changed::enable-weather-widget-raven',this._updateFavorites.bind(this)),
            this._settings.connect('changed::enable-clock-widget-raven',this._updateFavorites.bind(this)),
            this._settings.connect('changed::brisk-shortcuts-list',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::mint-pinned-app-list',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::mint-separator-index',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::ubuntu-dash-pinned-app-list',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::ubuntu-dash-separator-index',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::default-menu-view',this._reload.bind(this)),
            this._settings.connect('changed::default-menu-view-tognee',this._reload.bind(this)),
            this._settings.connect('changed::alphabetize-all-programs',this._reload.bind(this)),
            this._settings.connect('changed::enable-ubuntu-homescreen',this._setDefaultMenuView.bind(this)),
            this._settings.connect('changed::menu-layout', this._updateMenuLayout.bind(this)),
            this._settings.connect('changed::enable-large-icons', this.updateIcons.bind(this)),
            this._settings.connect('changed::runner-position', this.updateLocation.bind(this)),
            this._settings.connect('changed::enable-sub-menus', this._reload.bind(this)), 
            this._settings.connect('changed::disable-category-arrows', this._reload.bind(this)),
            this._settings.connect('changed::disable-activities-button', this._configureActivitiesButton.bind(this)),
            this._settings.connect('changed::restore-activities-button', this._removeActivitiesButtonFromMainPanel.bind(this)),
        ];
    }

    _reload(){
        this._menuButton.reload();
    }

    _plasmaMenuReloadExtension(){
        if(this._settings.get_enum('menu-layout') === Constants.MENU_LAYOUT.Plasma){
            if(this._settings.get_boolean('reload-theme'))
                this._settings.reset('reload-theme');
            this._settings.set_boolean('reload-theme', true);
        }
    }

    updateLocation(){
        this._menuButton.updateLocation();
    }

    updateIcons(){
        this._menuButton.updateIcons();
    }

    _updateMenuLayout(){
        this._menuButton._updateMenuLayout();
    }

    _setDefaultMenuView(){
        this._menuButton.setDefaultMenuView();
    }

    toggleMenus(){
        if(Main.overview.visible)
            Main.overview.hide();
        else{
            if((global.dashToPanel) || this.arcMenuPlacement == Constants.ArcMenuPlacement.DASH){
                this.currentMonitor = Main.layoutManager.currentMonitor;
                //close current menus that are open on monitors other than current monitor
                if(this._settingsControllers.length > 1){
                    for (let i = 0; i < this._settingsControllers.length; i++) {
                        let actor = this._settingsControllers[i]._menuButton.menuButtonWidget.actor;
                        let monitorForActor = Main.layoutManager.findMonitorForActor(actor);
                        if(this.currentMonitor == monitorForActor){
                            this.currentMonitorIndex = i;
                        }
                        else{
                            if(this._settingsControllers[i]._menuButton.arcMenu.isOpen)
                                this._settingsControllers[i]._menuButton.toggleMenu();
                            if(this._settingsControllers[i]._menuButton.arcMenuContextMenu.isOpen)
                                this._settingsControllers[i]._menuButton.toggleArcMenuContextMenu(); 
                        }
                    } 
                    //open the current monitors menu
                    this._settingsControllers[this.currentMonitorIndex]._menuButton.toggleMenu();
                }
                else{
                    this._menuButton.toggleMenu();
                }
            }
            else {
                this._menuButton.toggleMenu();
            }
        }
    }

    _reloadExtension(){
        if(this._settings.get_boolean('reload-theme')){
            this._settings.reset('reload-theme');
            Utils.createStylesheet(this._settings);
            Main.loadTheme();
            this._updateStyle();
        }
    }

    _updateStyle() {
        this._menuButton.updateStyle();
    }

    _updateKRunnerSearchLayout(){
        if(this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Runner || this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Raven)
            this._menuButton.updateSearch();
    }

    _updateMenuHeight(){
        this._menuButton.updateHeight();
    }

    _updateFavorites(){
        let layout = this._settings.get_enum('menu-layout');

        if(this._menuButton.getShouldLoadFavorites())
            this._menuButton._loadFavorites();
        //If the active category is Pinned Apps, redisplay the new Pinned Apps
        if(this._menuButton.MenuLayout && (this._menuButton.MenuLayout.activeCategoryType === Constants.CategoryType.PINNED_APPS || 
                this._menuButton.MenuLayout.activeCategoryType === Constants.CategoryType.HOME_SCREEN))
            this._menuButton._displayFavorites();  
    }

    _updateButtonFavorites(){
        let layout = this._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.UbuntuDash || layout == Constants.MENU_LAYOUT.Mint || layout == Constants.MENU_LAYOUT.Brisk){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadPinnedShortcuts();
        }
    }

    _updateHotCornerManager() {
        let hotCornerAction = this._settings.get_enum('hot-corners');
        if (hotCornerAction == Constants.HOT_CORNERS_ACTION.Default) {
            this._hotCornerManager.restoreDefaultHotCorners();
        } 
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Disabled) {
            this._hotCornerManager.disableHotCorners();
        }
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.ToggleArcMenu) {
            this._hotCornerManager.modifyHotCorners();
        }
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Custom) {
            this._hotCornerManager.modifyHotCorners();
        }
    }

    _updateHotKeyBinder() {
        if (this.enableHotkey) {
            let hotkeySettingsKey = 'menu-keybinding-text';
            let menuKeyBinding = '';
            let hotKeyPos = this._settings.get_enum('menu-hotkey');

            this._keybindingManager.unbind(hotkeySettingsKey);
            this._menuHotKeybinder.disableHotKey();
            this._menuKeyBindingKey = 0;
            
            if(hotKeyPos === Constants.HOT_KEY.Custom){
                this._keybindingManager.bind(hotkeySettingsKey, 'menu-keybinding', () => this._onHotkey());
                menuKeyBinding = this._settings.get_string(hotkeySettingsKey);
            }
            else if(hotKeyPos === Constants.HOT_KEY.Super_L || hotKeyPos === Constants.HOT_KEY.Super_R){
                let hotKey = Constants.HOT_KEY[hotKeyPos];
                this._menuHotKeybinder.enableHotKey(hotKey);
                menuKeyBinding = hotKey;
            }
            if(menuKeyBinding){
                this._menuKeyBindingKey = Gtk.accelerator_parse(menuKeyBinding)[0];
            }
        } 
    }

    _onHotkey() {
        let hotKeyPos = this._settings.get_enum('menu-hotkey');
        if(hotKeyPos === Constants.HOT_KEY.Super_L)
            this.toggleMenus();
        else{
            if(this._settings.get_boolean('disable-hotkey-onkeyrelease'))
                this.toggleMenus();
            else
                this._onHotkeyRelease();
        }
    }

    _onHotkeyRelease() {
        let activeMenu = this._settingsControllers[this.currentMonitorIndex]._menuButton.getActiveMenu();
        let focusPanel;

        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL)
            focusPanel = this.panel;
        else
            focusPanel = this.panel._allDocks[0].dash;

        let focusTarget = activeMenu ? 
                          (activeMenu.actor || activeMenu) : focusPanel;
        
        this.disconnectKeyRelease();

        this.keyInfo = {
            pressId: focusTarget.connect('key-press-event', _ => this.disconnectKeyRelease()),
            releaseId: focusTarget.connect('key-release-event', (actor, event) => {
                this.disconnectKeyRelease();

                if (this._menuKeyBindingKey == event.get_key_symbol()) {
                    this.toggleMenus();
                }
            }),
            target: focusTarget
        };

        focusTarget.grab_key_focus();
    }

    disconnectKeyRelease() {
        if (this.keyInfo && this.keyInfo.target) {
            this.keyInfo.target.disconnect(this.keyInfo.pressId);
            this.keyInfo.target.disconnect(this.keyInfo.releaseId);
            this.keyInfo = 0;
        }
    }

    // Place the menu button to main panel as specified in the settings
    _setButtonPosition() {
        if (this._isButtonEnabled()) {
            this._removeMenuButtonFromMainPanel();
            this._addMenuButtonToMainPanel();
            this._setMenuPositionAlignment();
        }
    }
    _setMenuPositionAlignment(){
        this._menuButton._setMenuPositionAlignment();
    }
    // Change the menu button appearance as specified in the settings
    _setButtonAppearance() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            this._removeActivitiesButtonFromMainPanel();
            this._menuButton.container.set_width(-1);
            this._menuButton.container.set_height(-1);
            menuButtonWidget.actor.show();
            switch (this._settings.get_enum('menu-button-appearance')) {
                case Constants.MENU_APPEARANCE.Text:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.showPanelText();
                    break;
                case Constants.MENU_APPEARANCE.Icon_Text:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelIcon();
                    menuButtonWidget.showPanelText();
                    menuButtonWidget.setPanelTextStyle('padding-left: 3px;');
                    break;
                case Constants.MENU_APPEARANCE.Text_Icon:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelText();
                    menuButtonWidget.setPanelTextStyle('padding-right: 3px;');
                    menuButtonWidget.showPanelIcon();
                    break;
                case Constants.MENU_APPEARANCE.None:
                    let activitiesButton = this._settings.get_boolean('restore-activities-button');
                    activitiesButton ? this._addActivitiesButtonToMainPanel() : this._removeActivitiesButtonFromMainPanel();
                    menuButtonWidget.actor.hide();
                    this._menuButton.container.set_width(0);
                    this._menuButton.container.set_height(0);
                    break;
                case Constants.MENU_APPEARANCE.Icon: /* falls through */
                default:
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelIcon();
            }
            this._setMenuButtonArrow();
        }
    }
    _setMenuButtonArrow() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            if (this._settings.get_boolean('enable-menu-button-arrow')) {
                menuButtonWidget.hideArrowIcon();
                menuButtonWidget.showArrowIcon();
            } else {
                menuButtonWidget.hideArrowIcon();
            }
        }
    }

    // Update the text of the menu button as specified in the settings
    _setButtonText() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            // Update the text of the menu button
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            let label = menuButtonWidget.getPanelLabel();

            let customTextLabel = this._settings.get_string('custom-menu-button-text');
            label.set_text(customTextLabel);
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIcon() {
        let path = this._settings.get_string('custom-menu-button-icon');
        let menuButtonWidget = this._menuButton.menuButtonWidget;
        let stIcon = menuButtonWidget.getPanelIcon();
        
        let iconString = Utils.getMenuButtonIcon(this._settings, path);
        stIcon.set_gicon(Gio.icon_new_for_string(iconString));
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIconSize() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            let stIcon = menuButtonWidget.getPanelIcon();
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let size = iconSize;
            stIcon.icon_size = size;
        }
    }
    _setButtonIconPadding() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let padding = this._settings.get_int('button-padding');
            if(padding > -1)
                this._menuButton.style = "-natural-hpadding: " + (padding  * 2 ) + "px; -minimum-hpadding: " + padding + "px;";
            else
                this._menuButton.style = null;
        }
    }

    // Get the current position of the menu button and its associated position order
    _getMenuPositionTuple() {
        switch (this._settings.get_enum('position-in-panel')) {
            case Constants.MENU_POSITION.Center:
                return ['center', 0];
            case Constants.MENU_POSITION.Right:
                return ['right', -1];
            case Constants.MENU_POSITION.Left: /* falls through */
            default:
                return ['left', 0];
        }
    }
    _configureActivitiesButton(restore = false){
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.DASH){
            let isActivitiesButtonPresent = Main.panel.statusArea.activities && Main.panel.statusArea.activities.container &&
                                            Main.panel._leftBox.contains(Main.panel.statusArea.activities.container);
            let disable = this._settings.get_boolean('disable-activities-button'); 
            if(!disable || restore){
                if(!isActivitiesButtonPresent){
                    Main.panel._leftBox.insert_child_at_index(Main.panel.statusArea.activities.container, 0);
                }
            }                          
            if(disable){
                if(isActivitiesButtonPresent)
                    Main.panel._leftBox.remove_child(Main.panel.statusArea.activities.container);   
            }
        }
    }
    // Check if the activities button is present on the main panel
    _isActivitiesButtonPresent() {
        // Thanks to lestcape @github.com for the refinement of this method.
        return (this._activitiesButton &&
            this._activitiesButton.container &&
            this.panel._leftBox.contains(this._activitiesButton.container));
    }

    // Remove the activities button from the main panel
    _removeActivitiesButtonFromMainPanel() {
        let buttonAppearance = this._settings.get_enum('menu-button-appearance');
        let activitiesButton = this._settings.get_boolean('restore-activities-button');

        if(buttonAppearance == Constants.MENU_APPEARANCE.None){
            if(!activitiesButton && this._isActivitiesButtonPresent()){
                this.panel._leftBox.remove_child(this._activitiesButton.container);
            }
            else{
                this._addActivitiesButtonToMainPanel();
            }
        }
        else if (this._isActivitiesButtonPresent()) {
            this.panel._leftBox.remove_child(this._activitiesButton.container);
        }
    }

    // Add or restore the activities button on the main panel
    _addActivitiesButtonToMainPanel() {
        if (this.panel == Main.panel && !this._isActivitiesButtonPresent()) {
            // Retsore the activities button at the default position
            let parent = this._activitiesButton.container.get_parent();
            if(!parent)
                this.panel._leftBox.insert_child_at_index(this._activitiesButton.container, 0);
        }
    }

    // Add the menu button to the main panel
    _addMenuButtonToMainPanel() {
        let [menuPosition, order] = this._getMenuPositionTuple();
        this.panel.addToStatusArea('ArcMenu', this._menuButton, order, menuPosition);
    }

    // Remove the menu button from the main panel
    _removeMenuButtonFromMainPanel() {
        this.panel.menuManager.removeMenu(this._menuButton.arcMenu);
        this.panel.menuManager.removeMenu(this._menuButton.arcMenuContextMenu);
        this.panel.statusArea['ArcMenu'] = null;
    }

    // Enable the menu button
    enableButton(index) {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.DASH){
            this.dashIndex = index;
            this.reEstablishDash();
        }
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            this._removeActivitiesButtonFromMainPanel();
            this._addMenuButtonToMainPanel();
        }

        this._menuButton.initiate();
    }

    reEstablishDash(){
        let container = this.panel._allDocks[this.dashIndex].dash._container;
        this.panel._allDocks[this.dashIndex].dash.arcMenuEnabled = true;
        this.oldShowAppsIcon = this.panel._allDocks[this.dashIndex].dash._showAppsIcon;
        container.remove_actor(this.oldShowAppsIcon);

        this._setButtonIcon();
        let iconSize = this.panel._allDocks[this.dashIndex].dash.iconSize;
        this._menuButton.menuButtonWidget.icon.setIconSize(iconSize);

        container.add_actor(this.menuButtonAdjustedActor);
        this.panel._allDocks[this.dashIndex].dash._showAppsIcon = this.menuButtonAdjustedActor;

        this.hoverID = this.menuButtonAdjustedActor.child.connect('notify::hover', () => {
            this.panel._allDocks[this.dashIndex].dash._syncLabel(this.menuButtonAdjustedActor, null);
        });

        this.hidingID = Main.overview.connect('hiding', () => {
            this.panel._allDocks[this.dashIndex].dash._labelShowing = false;
            this.menuButtonAdjustedActor.hideLabel();
        });

        this.panel._allDocks[this.dashIndex].dash._queueRedisplay();
        this.oldDashDestroy = this.panel._allDocks[this.dashIndex].dash.destroy;
        this.panel._allDocks[this.dashIndex].dash.destroy = ()=> {
            this.panel._allDocks[this.dashIndex].dash.arcMenuEnabled = false;
            if(this.hoverID){
                this.menuButtonAdjustedActor.child.disconnect(this.hoverID);
                this.hoverID = null;
            }
            if(this.hidingID){
                Main.overview.disconnect(this.hidingID);
                this.hidingID = null;
            }
            
            let container = this.panel._allDocks[this.dashIndex].dash._container;
            if(container)
                container.remove_actor(this.menuButtonAdjustedActor);
            
            this.panel._allDocks[this.dashIndex].dash._signalsHandler.destroy();
        };
    }

    // Disable the menu button
    _disableButton() {
        this._removeMenuButtonFromMainPanel();
        this._addActivitiesButtonToMainPanel();
        this._menuButton.destroy();
    }

    _isButtonEnabled() {
        return this.panel.statusArea['ArcMenu'] !== null;
    }

    // Destroy this object
    destroy() {
        if (this.updateThemeID) {
            GLib.source_remove(this.updateThemeID);
            this.updateThemeID = null;
        }
        this.settingsChangeIds.forEach(id => this._settings.disconnect(id));
        this._hotCornerManager.destroy();
        
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.DASH){
            if(this.panel._allDocks[this.dashIndex] && this.panel._allDocks[this.dashIndex].dash.arcMenuEnabled){
                if(this.hoverID){
                    this.menuButtonAdjustedActor.child.disconnect(this.hoverID);
                    this.hoverID = null;
                }
                if(this.hidingID){
                    Main.overview.disconnect(this.hidingID);
                    this.hidingID = null;
                }
                let parent = this.menuButtonAdjustedActor.get_parent();
                if(parent)
                    parent.remove_actor(this.menuButtonAdjustedActor);
                if(this.panel._allDocks[this.dashIndex]){
                    this.panel._allDocks[this.dashIndex].dash.arcMenuEnabled = false;
                    let container = this.panel._allDocks[this.dashIndex].dash._container;
                    this.panel._allDocks[this.dashIndex].dash._showAppsIcon = this.oldShowAppsIcon;
                    container.add_actor(this.panel._allDocks[this.dashIndex].dash._showAppsIcon);
                    this.panel._allDocks[this.dashIndex].dash.destroy = this.oldDashDestroy;
                    this.panel._allDocks[this.dashIndex].dash._queueRedisplay();
                }
            }

            this._configureActivitiesButton(true);
            this._menuButton.destroy();
        }
        else if(this.panel == undefined)
            this._menuButton.destroy();
        else if (this._isButtonEnabled()) {
            this._disableButton();
        }

        if(this.enableHotkey){
            this.disconnectKeyRelease();
            this._menuHotKeybinder.destroy();
            this._keybindingManager.destroy();
        }
        this._settings = null;
        this._activitiesButton = null;
        this._menuButton = null;
    }
};
