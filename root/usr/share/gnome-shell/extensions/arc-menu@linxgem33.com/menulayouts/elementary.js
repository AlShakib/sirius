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
const MW = Me.imports.menuWidgets;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            SearchType: Constants.SearchType.GRID_VIEW,
            VerticalMainBox: true
        });
    }
    createLayout(){
        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 10px; padding-top: 0.0em; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.mainBox.add(this.searchBox.actor);

        this.subMainBox= new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START
        });
        this.mainBox.add(this.subMainBox);

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: 30,
            row_spacing: 30 
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
            x_fill: true,
            y_fill: true,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'apps-menu vfade',
            reactive:true
        });  
        this.applicationsScrollBox.style = "width:750px;";   
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.subMainBox.add(this.applicationsScrollBox);

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
        super._displayAppGridList(apps, 5);
    }

    _displayAppIcons(){
        this.applicationsBox.add(this.grid);
        this.activeMenuItem = this.firstItem;
        if(this.leftClickMenu.isOpen){
            this.mainBox.grab_key_focus();
        }
    }
}
