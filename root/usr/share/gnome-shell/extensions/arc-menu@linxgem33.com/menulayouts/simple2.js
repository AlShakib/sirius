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

const {St} = imports.gi;
const AppFavorites = imports.ui.appFavorites;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: false,
            SearchType: null,
            VerticalMainBox: true
        });
    }

    createLayout(){
        this.mainBox.style = null;
        
        this.loadCategories();
        this._display(); 
        this.leftClickMenu.actor.style = 'max-height: ' + (this.leftClickMenu.actor.height + 250) + 'px;';
    }

    setDefaultMenuView(){
        this.activeMenuItem = this.categoryDirectories.values().next().value;   
        let actors = this.mainBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            if(actor._delegate instanceof MW.CategorySubMenuItem)
                actor._delegate.menu.close();
        }
    }

    _display() {
        this.displayCategories(); 
        this.activeMenuItem = this.categoryDirectories.values().next().value;       
    }
    
    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let categoryMenuItem = new MW.CategorySubMenuItem(this, Constants.CategoryType.FAVORITES);
        this.categoryDirectories.set(Constants.CategoryType.FAVORITES, categoryMenuItem);

        categoryMenuItem = new MW.CategorySubMenuItem(this, Constants.CategoryType.ALL_PROGRAMS);
        this.categoryDirectories.set(Constants.CategoryType.ALL_PROGRAMS, categoryMenuItem);

        super.loadCategories(MW.CategorySubMenuItem);

        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem._setParent(this.leftClickMenu);  
            categoryMenuItem.isSimpleMenuItem = true;
        }
    }
   
    displayCategories(){
        this._clearActorsFromBox();
        let isActiveMenuItemSet = false;
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.mainBox.add_actor(categoryMenuItem.actor);	
            this.mainBox.add_actor(categoryMenuItem.menu.actor);
            if(!isActiveMenuItemSet){
                isActiveMenuItemSet = true;
                this.activeMenuItem = categoryMenuItem;
                if(this.leftClickMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }	 
        }
    }

    _clearActorsFromBox(box) {
        super._clearActorsFromBox(this.mainBox);
    }

    displayCategoryAppList(appList, categoryMenuItem){
        this._displayAppList(appList, categoryMenuItem);
    }

    _displayAppList(apps, categoryMenuItem) {
        if (apps) {
            let children = categoryMenuItem.menu.box.get_children();
            for (let i = 0; i < children.length; i++) {
                let item = children[i];
                categoryMenuItem.menu.box.remove_actor(item);
            }
            for (let i = 0; i < apps.length; i++) {
                let app = apps[i];
                let item = this.applicationsMap.get(app);
                if (!item) {
                    item = new MW.ApplicationMenuItem(this, app);
                    this.applicationsMap.set(app, item);
                }
                if(item.actor.get_parent()){
                    item.actor.get_parent().remove_actor(item.actor);
                }
                if (!item.actor.get_parent()) {
                    categoryMenuItem.menu.box.add(item.actor);
                }
                if(i==0){
                    item.setFakeActive(true);
                    item.grabKeyFocus();
                }
            }
        }
    }

    destroy(isReload){
        this.leftClickMenu.actor.style = null;
        super.destroy(isReload);
    }
}
