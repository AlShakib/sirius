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
const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Prefs = Me.imports.prefs;
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var TweaksDialog = GObject.registerClass(
    class Arc_Menu_TweaksDialog extends PW.DialogWindow {
        _init(settings, parent, label) {
            this._settings = settings;
            this.addResponse = false;
            super._init(label, parent);
            this.set_default_size(550,250);
        }

        _createLayout(vbox) {    
            let menuLayout = this._settings.get_enum('menu-layout');
            if(menuLayout == Constants.MENU_LAYOUT.Default)
                this._loadArcMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Brisk)
                this._loadBriskMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Whisker)
                this._loadWhiskerMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.GnomeMenu)
                this._loadGnomeMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Mint)
                this._loadMintMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Elementary)
                this._loadElementaryTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.GnomeDash)
                this._loadGnomeDashTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Simple)
                this._loadPlaceHolderTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Simple2)
                this._loadPlaceHolderTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Redmond)
                this._loadRedmondMenuTweaks(vbox)
            else if(menuLayout == Constants.MENU_LAYOUT.UbuntuDash)
                this._loadUbuntuDashTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Raven)
                this._loadRavenTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Budgie)
                this._loadBudgieMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Insider)
                this._loadInsiderMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Runner)
                this._loadKRunnerMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Chromebook)
                this._loadChromebookTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Tognee)
                this._loadTogneeMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Plasma)
                this._loadPlasmaMenuTweaks(vbox);
            else
                this._loadPlaceHolderTweaks(vbox);
        }
        _createActivateOnHoverRow(){
            let activateOnHoverRow = new PW.FrameBoxRow();
            let activateOnHoverLabel = new Gtk.Label({
                label: _("Category Activation"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let activateOnHoverCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            activateOnHoverCombo.append_text(_("Mouse Click"));
            activateOnHoverCombo.append_text(_("Mouse Hover"));
            if(this._settings.get_boolean('activate-on-hover'))
                activateOnHoverCombo.set_active(1);
            else 
                activateOnHoverCombo.set_active(0);
                activateOnHoverCombo.connect('changed', (widget) => {
                if(widget.get_active()==0)
                    this._settings.set_boolean('activate-on-hover',false);
                if(widget.get_active()==1)
                    this._settings.set_boolean('activate-on-hover',true);
            });
            
            activateOnHoverRow.add(activateOnHoverLabel);
            activateOnHoverRow.add(activateOnHoverCombo);
            return activateOnHoverRow;
        }
        _createAvatarShapeRow(){
            let avatarStyleRow = new PW.FrameBoxRow();
            let avatarStyleLabel = new Gtk.Label({
                label: _('Avatar Icon Shape'),
                xalign:0,
                hexpand: true,
            });   
            let avatarStyleCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            avatarStyleCombo.append_text(_("Circular"));
            avatarStyleCombo.append_text(_("Square"));
            avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
            avatarStyleCombo.connect('changed', (widget) => {
                this._settings.set_enum('avatar-style', widget.get_active());
                this._settings.set_boolean('reload-theme', true);
            });
            avatarStyleRow.add(avatarStyleLabel);
            avatarStyleRow.add(avatarStyleCombo);
            return avatarStyleRow;
        }
        _createSearchBarLocationRow(bottomDefault){
            let searchBarLocationSetting = bottomDefault ? 'searchbar-default-bottom-location' : 'searchbar-default-top-location';
                 
            let searchbarLocationRow = new PW.FrameBoxRow();
            let searchbarLocationLabel = new Gtk.Label({
                label: _("Searchbar Location"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let searchbarLocationCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            searchbarLocationCombo.append_text(_("Bottom"));
            searchbarLocationCombo.append_text(_("Top"));
            searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting ));
            searchbarLocationCombo.connect('changed', (widget) => {
                this._settings.set_enum(searchBarLocationSetting , widget.get_active());
            });

            searchbarLocationRow.add(searchbarLocationLabel);
            searchbarLocationRow.add(searchbarLocationCombo);
            return searchbarLocationRow;
        }
        _createFlipHorizontalRow(){
            let horizontalFlipRow = new PW.FrameBoxRow();
            let horizontalFlipLabel = new Gtk.Label({
                label: _("Flip Layout Horizontally"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let horizontalFlipSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            horizontalFlipSwitch.set_active(this._settings.get_boolean('enable-horizontal-flip'));
            horizontalFlipSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-horizontal-flip', widget.get_active());
            });
            horizontalFlipRow.add(horizontalFlipLabel);
            horizontalFlipRow.add(horizontalFlipSwitch);
            return horizontalFlipRow;
        }
        _disableAvatarRow(){
            let disableAvatarRow = new PW.FrameBoxRow();
            let disableAvatarLabel = new Gtk.Label({
                label: _('Disable User Avatar'),
                xalign:0,
                hexpand: true,
            });   
            let disableAvatarSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            disableAvatarSwitch.set_active(this._settings.get_boolean('disable-user-avatar'));
            disableAvatarSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('disable-user-avatar', widget.get_active());
            });
            disableAvatarRow.add(disableAvatarLabel);
            disableAvatarRow.add(disableAvatarSwitch);
            return disableAvatarRow;
        }

        _loadGnomeDashTweaks(vbox){
            let gnomeDashTweaksFrame = new PW.FrameBox();
            let appsGridRow = new PW.FrameBoxRow();
            let appsGridLabel = new Gtk.Label({
                label: _("Show Applications Grid"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let appsGridSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            appsGridSwitch.set_active(this._settings.get_boolean('gnome-dash-show-applications'));
            appsGridSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('gnome-dash-show-applications', widget.get_active());
            });
            appsGridRow.add(appsGridLabel);
            appsGridRow.add(appsGridSwitch);
            gnomeDashTweaksFrame.add(appsGridRow);
            vbox.add(gnomeDashTweaksFrame);
        }

        _loadPlasmaMenuTweaks(vbox){
            let plasmaMenuTweaksFrame = new PW.FrameBox();
            
            let searchBarLocationSetting = 'searchbar-default-top-location';
                 
            let searchbarLocationRow = new PW.FrameBoxRow();
            let searchbarLocationLabel = new Gtk.Label({
                label: _("Searchbar Location"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let searchbarLocationCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            searchbarLocationCombo.append_text(_("Bottom"));
            searchbarLocationCombo.append_text(_("Top"));
            searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting));
            searchbarLocationCombo.connect('changed', (widget) => {
                this._settings.set_enum(searchBarLocationSetting , widget.get_active());
            });

            searchbarLocationRow.add(searchbarLocationLabel);
            searchbarLocationRow.add(searchbarLocationCombo);
            plasmaMenuTweaksFrame.add(searchbarLocationRow);

            let hoverRow = new PW.FrameBoxRow();
            let hoverLabel = new Gtk.Label({
                label: _("Activate on Hover"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hoverSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            hoverSwitch.set_active(this._settings.get_boolean('plasma-enable-hover'));
            hoverSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('plasma-enable-hover', widget.get_active());
            });
            hoverRow.add(hoverLabel);
            hoverRow.add(hoverSwitch);
            plasmaMenuTweaksFrame.add(hoverRow);

            let descriptionsRow = new PW.FrameBoxRow();
            let descriptionsLabel = new Gtk.Label({
                label: _("Show Application Descriptions"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let descriptionsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            descriptionsSwitch.set_active(this._settings.get_boolean('plasma-show-descriptions'));
            descriptionsSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('plasma-show-descriptions', widget.get_active());
            });
            descriptionsRow.add(descriptionsLabel);
            descriptionsRow.add(descriptionsSwitch);
            plasmaMenuTweaksFrame.add(descriptionsRow);

            let foregroundColorRow = new PW.FrameBoxRow();
            let foregroundColorLabel = new Gtk.Label({
                label: _('Selected Button Border Color'),
                xalign:0,
                hexpand: true,
             });   
            let foregroundColorChooser = new Gtk.ColorButton({use_alpha:true});   
            let color = new Gdk.RGBA();
            color.parse(this._settings.get_string('plasma-selected-color'));
            foregroundColorChooser.set_rgba(color);            
            foregroundColorChooser.connect('color-set', ()=>{
                this._settings.set_string('plasma-selected-color', foregroundColorChooser.get_rgba().to_string());
                this._settings.set_boolean('reload-theme', true);
            });
            foregroundColorRow.add(foregroundColorLabel);
            foregroundColorRow.add(foregroundColorChooser);
            plasmaMenuTweaksFrame.add(foregroundColorRow);

            let backgroundColorRow = new PW.FrameBoxRow();
            let backgroundColorLabel = new Gtk.Label({
                label: _('Selected Button Background Color'),
                xalign:0,
                hexpand: true,
             });   
            let backgroundColorChooser = new Gtk.ColorButton({use_alpha:true});   
            color = new Gdk.RGBA();
            color.parse(this._settings.get_string('plasma-selected-background-color'));
            backgroundColorChooser.set_rgba(color);            
            backgroundColorChooser.connect('color-set', ()=>{
                this._settings.set_string('plasma-selected-background-color',backgroundColorChooser.get_rgba().to_string());
                this._settings.set_boolean('reload-theme', true);
            });
            backgroundColorRow.add(backgroundColorLabel);
            backgroundColorRow.add(backgroundColorChooser);
            plasmaMenuTweaksFrame.add(backgroundColorRow);

            vbox.add(plasmaMenuTweaksFrame);

            let resetButton = new Gtk.Button({
                label: _("Restore Defaults"),
                tooltip_text: _("Restore the default settings on this page"),
                halign: Gtk.Align.START,
                hexpand: true
            });
            resetButton.set_sensitive(true);
            resetButton.connect('clicked', ()=> {
                let foregroundColor = this._settings.get_default_value('plasma-selected-color').unpack();
                let backgroundColor = this._settings.get_default_value('plasma-selected-background-color').unpack();
                let hoverEnabled = this._settings.get_default_value('plasma-enable-hover').unpack();
                let showDescriptions = this._settings.get_default_value('plasma-show-descriptions').unpack();
                this._settings.reset('searchbar-default-top-location');
                searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting));
                hoverSwitch.set_active(hoverEnabled);
                color.parse(foregroundColor);
                foregroundColorChooser.set_rgba(color); 
                color.parse(backgroundColor);
                backgroundColorChooser.set_rgba(color); 
                descriptionsSwitch.set_active(showDescriptions);
                this._settings.reset('plasma-selected-color');
                this._settings.reset('plasma-selected-background-color');
                this._settings.reset('plasma-enable-hover');
                this._settings.reset('plasma-show-descriptions');
                this._settings.set_boolean('reload-theme', true);
            });
            vbox.add(resetButton);
        }
        _loadBriskMenuTweaks(vbox){
            let briskMenuTweaksFrame = new PW.FrameBox();
            briskMenuTweaksFrame.add(this._createActivateOnHoverRow());
            briskMenuTweaksFrame.add(this._createSearchBarLocationRow());
            briskMenuTweaksFrame.add(this._createFlipHorizontalRow());
            let pinnedAppsFrame = new PW.FrameBox();
            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_max_content_height(100);
            pinnedAppsScrollWindow.set_min_content_height(100);

            let savePinnedAppsButton = new Gtk.Button({
                label: _("Save"),
            });
            savePinnedAppsButton.connect('clicked', ()=> {
                let array = [];
                for(let x = 0;x < pinnedAppsFrame.count; x++) {
                    array.push(pinnedAppsFrame.get_index(x)._name);
                    array.push(pinnedAppsFrame.get_index(x)._icon);
                    array.push(pinnedAppsFrame.get_index(x)._cmd);
                }
                this._settings.set_strv('brisk-shortcuts-list',array);
                savePinnedAppsButton.set_sensitive(false);
            }); 
            savePinnedAppsButton.set_halign(Gtk.Align.END);
            savePinnedAppsButton.set_sensitive(false);
            
            this._loadPinnedApps(this._settings.get_strv('brisk-shortcuts-list'), pinnedAppsFrame, savePinnedAppsButton, pinnedAppsScrollWindow);
            pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);

            let pinnedAppsHeaderLabel = new Gtk.Label({
                label: "<b>" + _("Brisk Menu Shortcuts") + "</b>",
                use_markup: true,
                xalign: 0
            });

            vbox.add(briskMenuTweaksFrame);
            vbox.add(pinnedAppsHeaderLabel);
            vbox.add(pinnedAppsScrollWindow);
            vbox.add(savePinnedAppsButton);
        }
        _loadChromebookTweaks(vbox){
            let chromeBookTweaksFrame = new PW.FrameBox();
            chromeBookTweaksFrame.add(this._createSearchBarLocationRow());
            vbox.add(chromeBookTweaksFrame);
        }
        _loadElementaryTweaks(vbox){
            let elementaryTweaksFrame = new PW.FrameBox();
            elementaryTweaksFrame.add(this._createSearchBarLocationRow());
            vbox.add(elementaryTweaksFrame);
        }
        _loadBudgieMenuTweaks(vbox){
            let budgieMenuTweaksFrame = new PW.FrameBox();
            budgieMenuTweaksFrame.add(this._createActivateOnHoverRow());
            budgieMenuTweaksFrame.add(this._createSearchBarLocationRow());
            budgieMenuTweaksFrame.add(this._createFlipHorizontalRow());

            let enableActivitiesRow = new PW.FrameBoxRow();
            let enableActivitiesLabel = new Gtk.Label({
                label: _('Enable Activities Overview Shortcut'),
                xalign:0,
                hexpand: true,
            });   
            let enableActivitiesSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            enableActivitiesSwitch.set_active(this._settings.get_boolean('enable-activities-shortcut'));
            enableActivitiesSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-activities-shortcut', widget.get_active());
            });
            enableActivitiesRow.add(enableActivitiesLabel);
            enableActivitiesRow.add(enableActivitiesSwitch);
            budgieMenuTweaksFrame.add(enableActivitiesRow);

            vbox.add(budgieMenuTweaksFrame);
        }
        _loadKRunnerMenuTweaks(vbox){
            let kRunnerMenuTweaksFrame = new PW.FrameBox();
            let runnerPositionRow = new PW.FrameBoxRow();
            let runnerPositionLabel = new Gtk.Label({
                label: _('KRunner Position'),
                xalign:0,
                hexpand: true,
            });   
            let runnerPositionCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            runnerPositionCombo.append_text(_("Top"));
            runnerPositionCombo.append_text(_("Centered"));
            runnerPositionCombo.set_active(this._settings.get_enum('runner-position'));
            runnerPositionCombo.connect('changed', (widget) => {
                this._settings.set_enum('runner-position', widget.get_active());
            });
            runnerPositionRow.add(runnerPositionLabel);
            runnerPositionRow.add(runnerPositionCombo);
            kRunnerMenuTweaksFrame.add(runnerPositionRow);
            
            let showMoreDetailsRow = new PW.FrameBoxRow();
            let showMoreDetailsLabel = new Gtk.Label({
                label: _("Show Extra Large Icons with App Descriptions"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let showMoreDetailsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            showMoreDetailsSwitch.set_active(this._settings.get_boolean('krunner-show-details'));
            showMoreDetailsSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('krunner-show-details', widget.get_active());
            });

            showMoreDetailsRow.add(showMoreDetailsLabel);
            showMoreDetailsRow.add(showMoreDetailsSwitch);
            kRunnerMenuTweaksFrame.add(showMoreDetailsRow);
            vbox.add(kRunnerMenuTweaksFrame);
        }
        _loadUbuntuDashTweaks(vbox){
            let pinnedAppsFrame = new PW.FrameBox();
            let notebook = new PW.Notebook();

            let generalPage = new PW.NotebookPage(_("General"));
            notebook.append_page(generalPage);

            let buttonsPage = new PW.NotebookPage(_("Buttons"));
            notebook.append_page(buttonsPage);
   
            vbox.add(notebook);

            let generalTweaksFrame = new PW.FrameBox();
            let homeScreenRow = new PW.FrameBoxRow();
            let homeScreenLabel = new Gtk.Label({
                label: _('Default Screen'),
                xalign:0,
                hexpand: true,
            });   
            let homeScreenCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            homeScreenCombo.append_text(_("Home Screen"));
            homeScreenCombo.append_text(_("All Programs"));
            let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
            homeScreenCombo.set_active(homeScreen ? 0 : 1);
            homeScreenCombo.connect('changed', (widget) => {
                let enable =  widget.get_active() ==0 ? true : false;
                this._settings.set_boolean('enable-ubuntu-homescreen', enable);
            });
            homeScreenRow.add(homeScreenLabel);
            homeScreenRow.add(homeScreenCombo);
            generalTweaksFrame.add(homeScreenRow);
            generalPage.add(generalTweaksFrame);
            
            let tweakStyleFrame = new PW.FrameBox();
            let tweakStyleRow = new PW.FrameBoxRow();
            let tweakStyleLabel = new Gtk.Label({
                label: _("Disable Menu Arrow"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let tweakStyleSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Disable current theme menu arrow pointer")
            });
            tweakStyleSwitch.set_active(this._settings.get_boolean('remove-menu-arrow'));
            tweakStyleSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('remove-menu-arrow', widget.get_active());
            });

            tweakStyleRow.add(tweakStyleLabel);
            tweakStyleRow.add(tweakStyleSwitch);
            tweakStyleFrame.add(tweakStyleRow);
            generalPage.add(tweakStyleFrame);

            let widgetFrame =  this._createWidgetsRows(Constants.MENU_LAYOUT.UbuntuDash);
            generalPage.add(widgetFrame);

            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_max_content_height(300);
            pinnedAppsScrollWindow.set_min_content_height(300);

            let savePinnedAppsButton = new Gtk.Button({
                label: _("Save"),
            });
            savePinnedAppsButton.connect('clicked', ()=> {
                let array = [];
                for(let x = 0;x < pinnedAppsFrame.count; x++) {
                    array.push(pinnedAppsFrame.get_index(x)._name);
                    array.push(pinnedAppsFrame.get_index(x)._icon);
                    array.push(pinnedAppsFrame.get_index(x)._cmd);
                }
                this._settings.set_strv('ubuntu-dash-pinned-app-list',array);
                savePinnedAppsButton.set_sensitive(false);
            }); 
            savePinnedAppsButton.set_halign(Gtk.Align.END);
            savePinnedAppsButton.set_sensitive(false);
            
            this._loadPinnedApps(this._settings.get_strv('ubuntu-dash-pinned-app-list'), pinnedAppsFrame, savePinnedAppsButton, pinnedAppsScrollWindow);
            pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);

            let pinnedAppsHeaderLabel = new Gtk.Label({
                label: "<b>" + _("Ubuntu Dash Buttons") + "</b>",
                use_markup: true,
                xalign: 0
            });
            buttonsPage.add(pinnedAppsHeaderLabel);
            buttonsPage.add(pinnedAppsScrollWindow);
            buttonsPage.add(savePinnedAppsButton);

            let pinnedAppsSeparatorHeaderLabel = new Gtk.Label({
                label: "<b>" + _("Button Separator Position") + "</b>",
                use_markup: true,
                xalign: 0
            });
            buttonsPage.add(pinnedAppsSeparatorHeaderLabel);

            let pinnedAppsSeparatorFrame = new PW.FrameBox();
            let pinnedAppsSeparatorRow = new PW.FrameBoxRow();
            let pinnedAppsSeparatorLabel = new Gtk.Label({
                label: _("Separator Position"),
                use_markup: true,
                xalign: 0
            });
            let pinnedAppsSeparatorScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL, 
                adjustment: new Gtk.Adjustment({lower: 0, upper: 7, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true
            });
            pinnedAppsSeparatorScale.add_mark(0, Gtk.PositionType.BOTTOM, _("None"));
            pinnedAppsSeparatorScale.set_value(this._settings.get_int('ubuntu-dash-separator-index'));
            pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
                this._settings.set_int('ubuntu-dash-separator-index', widget.get_value());
            }); 
            
            let infoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            infoButton.connect('clicked', ()=> {
                let dialog = new PW.MessageDialog({
                    text: _('Adjust the position of the separator in the button panel'),
                    buttons: Gtk.ButtonsType.OK,
                    transient_for: this.get_toplevel()
                });
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show_all();
            });

            pinnedAppsSeparatorRow.add(pinnedAppsSeparatorLabel);
            pinnedAppsSeparatorRow.add(pinnedAppsSeparatorScale);
            pinnedAppsSeparatorRow.add(infoButton);
            pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
            buttonsPage.add(pinnedAppsSeparatorFrame);
        }
        _loadRavenTweaks(vbox){
            let generalTweaksFrame = new PW.FrameBox();
            let homeScreenRow = new PW.FrameBoxRow();
            let homeScreenLabel = new Gtk.Label({
                label: _('Default Screen'),
                xalign:0,
                hexpand: true,
            });   
            let homeScreenCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            homeScreenCombo.append_text(_("Home Screen"));
            homeScreenCombo.append_text(_("All Programs"));
            let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
            homeScreenCombo.set_active(homeScreen ? 0 : 1);
            homeScreenCombo.connect('changed', (widget) => {
                let enable =  widget.get_active() ==0 ? true : false;
                this._settings.set_boolean('enable-ubuntu-homescreen', enable);
            });
            homeScreenRow.add(homeScreenLabel);
            homeScreenRow.add(homeScreenCombo);
            generalTweaksFrame.add(homeScreenRow);
            vbox.add(generalTweaksFrame);

            let showMoreDetailsFrame = new PW.FrameBox();
            let showMoreDetailsRow = new PW.FrameBoxRow();
            let showMoreDetailsLabel = new Gtk.Label({
                label: _("Show Extra Large Icons with App Descriptions"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let showMoreDetailsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            showMoreDetailsSwitch.set_active(this._settings.get_boolean('krunner-show-details'));
            showMoreDetailsSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('krunner-show-details', widget.get_active());
            });

            showMoreDetailsRow.add(showMoreDetailsLabel);
            showMoreDetailsRow.add(showMoreDetailsSwitch);
            showMoreDetailsFrame.add(showMoreDetailsRow);
            if(this._settings.get_enum('menu-layout') === Constants.MENU_LAYOUT.Raven)
                vbox.add(showMoreDetailsFrame);

            let widgetFrame =  this._createWidgetsRows(Constants.MENU_LAYOUT.Raven);
            vbox.add(widgetFrame);
        }
        _loadMintMenuTweaks(vbox){
            let mintMenuTweaksFrame = new PW.FrameBox();
            mintMenuTweaksFrame.add(this._createActivateOnHoverRow());
            mintMenuTweaksFrame.add(this._createSearchBarLocationRow());
            mintMenuTweaksFrame.add(this._createFlipHorizontalRow());
            vbox.add(mintMenuTweaksFrame);

            let pinnedAppsHeaderLabel = new Gtk.Label({
                label: "<b>" + _("Mint Menu Shortcuts") + "</b>",
                use_markup: true,
                xalign: 0
            });
            vbox.add(pinnedAppsHeaderLabel);

            let pinnedAppsFrame = new PW.FrameBox();
            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_max_content_height(300);
            pinnedAppsScrollWindow.set_min_content_height(300);
            let savePinnedAppsButton = new Gtk.Button({
                label: _("Save"),
            });
            savePinnedAppsButton.connect('clicked', ()=> {
                let array = [];
                for(let x = 0;x < pinnedAppsFrame.count; x++) {
                    array.push(pinnedAppsFrame.get_index(x)._name);
                    array.push(pinnedAppsFrame.get_index(x)._icon);
                    array.push(pinnedAppsFrame.get_index(x)._cmd);
                }
                this._settings.set_strv('mint-pinned-app-list',array);
                savePinnedAppsButton.set_sensitive(false);
            }); 
            savePinnedAppsButton.set_halign(Gtk.Align.END);
            savePinnedAppsButton.set_sensitive(false);
            
            this._loadPinnedApps(this._settings.get_strv('mint-pinned-app-list'), pinnedAppsFrame, savePinnedAppsButton, pinnedAppsScrollWindow);
            pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);
            vbox.add(pinnedAppsScrollWindow);

            vbox.add(savePinnedAppsButton);

            let pinnedAppsSeparatorHeaderLabel = new Gtk.Label({
                label: "<b>" + _("Shortcut Separator Position") + "</b>",
                use_markup: true,
                xalign: 0
            });
            vbox.add(pinnedAppsSeparatorHeaderLabel);

            let pinnedAppsSeparatorFrame = new PW.FrameBox();
            let pinnedAppsSeparatorRow = new PW.FrameBoxRow();
            let pinnedAppsSeparatorLabel = new Gtk.Label({
                label: _("Separator Position"),
                use_markup: true,
                xalign: 0
            });
            let pinnedAppsSeparatorScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL, 
                adjustment: new Gtk.Adjustment({lower: 0, upper: 7, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
            });
            pinnedAppsSeparatorScale.add_mark(0, Gtk.PositionType.BOTTOM, _("None"));
            pinnedAppsSeparatorScale.set_value(this._settings.get_int('mint-separator-index'));
            pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
                this._settings.set_int('mint-separator-index', widget.get_value());
            }); 

            let infoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            infoButton.connect('clicked', ()=> {
                let dialog = new PW.MessageDialog({
                    text: _('Adjust the position of the separator in the button panel'),
                    buttons: Gtk.ButtonsType.OK,
                    transient_for: this.get_toplevel()
                });
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show_all();
            });

            pinnedAppsSeparatorRow.add(pinnedAppsSeparatorLabel);
            pinnedAppsSeparatorRow.add(pinnedAppsSeparatorScale);
            pinnedAppsSeparatorRow.add(infoButton);
            pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
            vbox.add(pinnedAppsSeparatorFrame);
        }
        _loadPinnedApps(array,frame, savePinnedAppsButton, scrollWindow) {
            for(let i = 0; i < array.length; i += 3) {
                let frameRow = new PW.FrameBoxDragRow(scrollWindow);
                frameRow._name = array[i];
                frameRow._icon = Prefs.getIconPath([array[i], array[i+1], array[i+2]]);
                frameRow._cmd = array[i+2];
                frameRow.saveButton = savePinnedAppsButton;
                frameRow.hasEditButton = true;
                let iconString;
                if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                    iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                }
                frameRow._gicon = Gio.icon_new_for_string(iconString ? iconString : frameRow._icon);
                let arcMenuImage = new Gtk.Image( {
                    gicon: frameRow._gicon,
                    pixel_size: 22
                });
                
                let arcMenuImageBox = new Gtk.Box({
                    margin_start: 0,
                    hexpand: false,
                    vexpand: false,
                    spacing: 5,
                });
                let dragImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string("list-drag-handle-symbolic"),
                    pixel_size: 12
                });
                arcMenuImageBox.add(dragImage);
                arcMenuImageBox.add(arcMenuImage);
                frameRow.add(arcMenuImageBox);

                let frameLabel = new Gtk.Label({
                    use_markup: true,
                    xalign: 0,
                    hexpand: true
                });

                frameLabel.label = _(frameRow._name);
                frameRow.add(frameLabel);

                Prefs.checkIfValidShortcut(frameRow, frameLabel, arcMenuImage);

                let buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow, 
                    frame: frame, 
                    buttons: [savePinnedAppsButton],
                    modifyButton: true,
                    changeButton: true
                });

                buttonBox.connect('change', ()=> {
                    let dialog = new Prefs.AddAppsToPinnedListWindow(this._settings, this, Constants.DIALOG_TYPE.Mint_Pinned_Apps);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            let iconString;
                            if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                                iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                            }
                            let icon = Prefs.getIconPath(newPinnedApps);
                            arcMenuImage.gicon = Gio.icon_new_for_string(iconString ? iconString : icon);
                            dialog.destroy();
                            frame.show_all();
                            savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    }); 
                });

                buttonBox.connect('modify', ()=> {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new Prefs.AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Mint_Pinned_Apps, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            let iconString;
                            if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                                iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                            }
                            arcMenuImage.gicon = Gio.icon_new_for_string(iconString ? iconString : frameRow._icon);
                            dialog.destroy();
                            frame.show_all();
                            savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    });  
                });

                frameRow.add(buttonBox);
                frame.add(frameRow);
            }
        }
        _loadWhiskerMenuTweaks(vbox){
            let whiskerMenuTweaksFrame = new PW.FrameBox();
            whiskerMenuTweaksFrame.add(this._createActivateOnHoverRow());
            whiskerMenuTweaksFrame.add(this._createAvatarShapeRow());
            whiskerMenuTweaksFrame.add(this._createSearchBarLocationRow());
            whiskerMenuTweaksFrame.add(this._createFlipHorizontalRow());
            vbox.add(whiskerMenuTweaksFrame);
        }
        _loadRedmondMenuTweaks(vbox){
            let redmondMenuTweaksFrame = new PW.FrameBox();
            redmondMenuTweaksFrame.add(this._createSearchBarLocationRow());

            redmondMenuTweaksFrame.add(this._createFlipHorizontalRow());
            redmondMenuTweaksFrame.add(this._createAvatarShapeRow());
            redmondMenuTweaksFrame.add(this._disableAvatarRow());

            vbox.add(redmondMenuTweaksFrame);
        }
        _loadInsiderMenuTweaks(vbox){
            let insiderMenuTweaksFrame = new PW.FrameBox();
            insiderMenuTweaksFrame.add(this._createAvatarShapeRow());
            vbox.add(insiderMenuTweaksFrame);
        }
        _loadGnomeMenuTweaks(vbox){
            let gnomeMenuTweaksFrame = new PW.FrameBox();
            gnomeMenuTweaksFrame.add(this._createActivateOnHoverRow());
            gnomeMenuTweaksFrame.add(this._createFlipHorizontalRow());
            vbox.add(gnomeMenuTweaksFrame);
        }
        _loadPlaceHolderTweaks(vbox){
            let placeHolderFrame = new PW.FrameBox();
            let placeHolderRow = new PW.FrameBoxRow();
            let placeHolderLabel = new Gtk.Label({
                label: _("Nothing Yet!"),
                use_markup: true,
                halign: Gtk.Align.CENTER,
                hexpand: true
            });
            placeHolderRow.add(placeHolderLabel);
            placeHolderFrame.add(placeHolderRow);
            vbox.add(placeHolderFrame);
        }
        _loadTogneeMenuTweaks(vbox){
            let togneeMenuTweaksFrame = new PW.FrameBox();
            let searchBarBottomDefault = true;
            let defaultLeftBoxRow = new PW.FrameBoxRow();
            let defaultLeftBoxLabel = new Gtk.Label({
                label: _("Default Screen"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let defaultLeftBoxCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Choose the default screen for tognee Layout") 
            });
            defaultLeftBoxCombo.append_text(_("Categories List"));
            defaultLeftBoxCombo.append_text(_("All Programs"));
            defaultLeftBoxCombo.set_active(this._settings.get_enum('default-menu-view-tognee'));
            defaultLeftBoxCombo.connect('changed', (widget) => {
                this._settings.set_enum('default-menu-view-tognee', widget.get_active());
            });

            defaultLeftBoxRow.add(defaultLeftBoxLabel);
            defaultLeftBoxRow.add(defaultLeftBoxCombo);
            togneeMenuTweaksFrame.add(defaultLeftBoxRow);
            togneeMenuTweaksFrame.add(this._createSearchBarLocationRow(searchBarBottomDefault));
            togneeMenuTweaksFrame.add(this._createFlipHorizontalRow());
            togneeMenuTweaksFrame.add(this._createAvatarShapeRow());
            togneeMenuTweaksFrame.add(this._disableAvatarRow());
            vbox.add(togneeMenuTweaksFrame);
        }
        _loadArcMenuTweaks(vbox){
            let arcMenuTweaksFrame = new PW.FrameBox();
            let defaultLeftBoxRow = new PW.FrameBoxRow();
            let defaultLeftBoxLabel = new Gtk.Label({
                label: _("Default Screen"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let defaultLeftBoxCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Choose the default screen for ArcMenu") 
            });
            defaultLeftBoxCombo.append_text(_("Pinned Apps"));
            defaultLeftBoxCombo.append_text(_("Categories List"));
            defaultLeftBoxCombo.append_text(_("Frequent Apps"));
            defaultLeftBoxCombo.set_active(this._settings.get_enum('default-menu-view'));
            defaultLeftBoxCombo.connect('changed', (widget) => {
                this._settings.set_enum('default-menu-view', widget.get_active());
            });

            defaultLeftBoxRow.add(defaultLeftBoxLabel);
            defaultLeftBoxRow.add(defaultLeftBoxCombo);
            arcMenuTweaksFrame.add(defaultLeftBoxRow);

            let searchBarBottomDefault = true;
            arcMenuTweaksFrame.add(this._createSearchBarLocationRow(searchBarBottomDefault));
            arcMenuTweaksFrame.add(this._createFlipHorizontalRow());
            arcMenuTweaksFrame.add(this._createAvatarShapeRow());
            arcMenuTweaksFrame.add(this._disableAvatarRow());
            vbox.add(arcMenuTweaksFrame);
        }
        _createWidgetsRows(layout){
            let weatherWidgetSetting = 'enable-weather-widget-raven';
            let clockWidgetSetting = 'enable-clock-widget-raven';
            if(layout == Constants.MENU_LAYOUT.Raven){
                weatherWidgetSetting = 'enable-weather-widget-raven';
                clockWidgetSetting = 'enable-clock-widget-raven';
            }
            else{
                weatherWidgetSetting = 'enable-weather-widget-ubuntu';
                clockWidgetSetting = 'enable-clock-widget-ubuntu';
            }
            
            let widgetFrame = new PW.FrameBox();
            let weatherWidgetRow = new PW.FrameBoxRow();
            let weatherWidgetLabel = new Gtk.Label({
                label: _("Enable Weather Widget"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let weatherWidgetSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            weatherWidgetSwitch.set_active(this._settings.get_boolean(weatherWidgetSetting));
            weatherWidgetSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean(weatherWidgetSetting, widget.get_active());
            });

            weatherWidgetRow.add(weatherWidgetLabel);
            weatherWidgetRow.add(weatherWidgetSwitch);
            widgetFrame.add(weatherWidgetRow);

            let clockWidgetRow = new PW.FrameBoxRow();
            let clockWidgetLabel = new Gtk.Label({
                label: _("Enable Clock Widget"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let clockWidgetSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            clockWidgetSwitch.set_active(this._settings.get_boolean(clockWidgetSetting));
            clockWidgetSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean(clockWidgetSetting, widget.get_active());
            });

            clockWidgetRow.add(clockWidgetLabel);
            clockWidgetRow.add(clockWidgetSwitch);
            widgetFrame.add(clockWidgetRow);

            return widgetFrame;
        }
});
