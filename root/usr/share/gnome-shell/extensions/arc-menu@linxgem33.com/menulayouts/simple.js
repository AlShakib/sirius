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

const {GMenu, St} = imports.gi;
const AppFavorites = imports.ui.appFavorites;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const _ = Gettext.gettext;

var createMenu =  class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: false,
            SearchType: null,
            VerticalMainBox: true
        });
    }
    createLayout(){
        this.mainBox.style = null;
        this.section = this.menuButton.section;
        let actors = this.section.actor.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.section.actor.remove_actor(actor);
        }
        this.section.actor.add_actor(this.mainBox);  

        this.loadFavorites();
        this.loadCategories();
        this._display(); 
    }

    setDefaultMenuView(){
        this.activeMenuItem = this.categoryDirectories.values().next().value;
    }

    _display() {
        this.displayCategories();
        this.activeMenuItem = this.categoryDirectories.values().next().value;       
    }

    updateStyle(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.updateStyle(); 
        }
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.SimpleMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        
        
        super.loadCategories(MW.SimpleMenuItem);
    }
    
    displayCategories(){
        super.displayCategories(this.mainBox);
    }

    displayFavorites() {
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.PINNED_APPS);
        if(categoryMenuItem){
            let children = categoryMenuItem.applicationsBox.get_children();
            for (let i = 0; i < children.length; i++) {
                let actor = children[i];
                if(actor._delegate instanceof MW.CategorySubMenuItem)
                    actor._delegate.menu.close();
                categoryMenuItem.applicationsBox.remove_actor(actor);
            }
            for(let i = 0;i < this.favoritesArray.length; i++){
                categoryMenuItem.applicationsBox.add_actor(this.favoritesArray[i].actor);	
                if(!this.favoritesArray[i].shouldShow)
                    this.favoritesArray[i].actor.hide();
                if(i==0){
                    this.activeMenuItem = this.favoritesArray[i];
                    if(this.arcMenu.isOpen){
                        this.mainBox.grab_key_focus();
                    }
                }	   
            }
        } 
    }

    _clearActorsFromBox(box) {
        
    }

    displayCategoryAppList(appList, categoryMenuItem, category){
        this._displayAppList(appList, categoryMenuItem, category);
    }

    _displayAppList(apps, categoryMenuItem, displayAllApps) {
        let currentCharacter;
        let needsNewSeparator = false; 
        let listByCharacter = this._settings.get_boolean("alphabetize-all-programs");
        if (apps) {
            let children = categoryMenuItem.applicationsBox.get_children();
            for (let i = 0; i < children.length; i++) {
                let actor = children[i];
                if(actor._delegate instanceof MW.CategorySubMenuItem)
                    actor._delegate.menu.close();
                categoryMenuItem.applicationsBox.remove_actor(actor);
            }
            for (let i = 0; i < apps.length; i++) {
                let app = apps[i];
                if(listByCharacter && displayAllApps){
                    if(currentCharacter !== app.get_name().charAt(0).toLowerCase()){
                        currentCharacter = app.get_name().charAt(0).toLowerCase();
                        needsNewSeparator = true;
                    }
                    else{
                        needsNewSeparator = false;
                    }
                    if(needsNewSeparator){
                        let characterLabel = new PopupMenu.PopupMenuItem(currentCharacter.toUpperCase(), {
                            hover: false,
                            can_focus: false
                        });  
                        characterLabel.actor.add_style_pseudo_class = () => { return false;};
                        characterLabel.actor.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG));
                        characterLabel.label.style = 'font-weight: bold;';
                        categoryMenuItem.applicationsBox.add_actor(characterLabel.actor)
                    }
                }
                let item = this.applicationsMap.get(app);
                if (!item) {
                    item = new MW.ApplicationMenuItem(this, app);
                    this.applicationsMap.set(app, item);
                }
                if(item.actor.get_parent()){
                    item.actor.get_parent().remove_actor(item.actor);
                }
                if (!item.actor.get_parent()) {
                    categoryMenuItem.applicationsBox.add_actor(item.actor); 
                }
                if(item instanceof MW.CategorySubMenuItem){
                    if(item.menu.actor.get_parent()){
                        item.menu.actor.get_parent().remove_actor(item.menu.actor);
                    }
                    categoryMenuItem.applicationsBox.add_actor(item.menu.actor);
                }
            }
        }
    }
}
