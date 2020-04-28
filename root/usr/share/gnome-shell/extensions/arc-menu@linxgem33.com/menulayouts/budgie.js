/*
 * Arc Menu - A traditional application menu for GNOME 3
 *
 * Arc Menu Lead Developer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * Arc Menu Founder/Maintainer/Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33
 * 
 * Budgie.js Layout Created By: MagneFire https://gitlab.com/MagneFire 
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
            SearchType: Constants.SearchType.LIST_VIEW,
            VerticalMainBox: true
        });
    }
    createLayout(){
        this.searchBox = new MW.SearchBox(this);
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px;";
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.mainBox.add(this.searchBox.actor);

        this.mainBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.MAX));

        //Sub Main Box -- stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.mainBox.add(this.subMainBox);

        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box',
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
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
        rightPanelWidth += 70;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px; padding-top:6px;";

        // Disable horizontal scrolling, hide vertical scrollbar, but allow vertical scrolling.
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.EXTERNAL);

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START
        });
        this.subMainBox.add(this.leftBox);
        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_fill: true,
            y_fill: false,
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            style_class: 'vfade',
            overlay_scrollbars: true
        });
        this.categoriesScrollBox.style = "padding-top:6px; width:185px;";
        this.leftBox.add(this.categoriesScrollBox);   
         
        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox);

        this.loadCategories();
        this.displayCategories();
        this.setDefaultMenuView(); 
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayAllApps();
    }
    
    reload() {
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 70;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;  padding-top:6px;";
        super.reload(); 
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 

        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.ALL_PROGRAMS);
        this.categoryDirectories.set(Constants.CategoryType.ALL_PROGRAMS, categoryMenuItem);

        super.loadCategories();
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.actor.style = "padding-top: 10px; padding-bottom: 10px; margin: 0; spacing: 0;";
            categoryMenuItem.actor.remove_actor(categoryMenuItem._icon);
            if(categoryMenuItem._arrowIcon)
                categoryMenuItem.actor.remove_actor(categoryMenuItem._arrowIcon);
        }
    }
    
    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
