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
const Constants = Me.imports.constants;
const {Gio, GLib} = imports.gi;

function getMenuLayout(button, layout){
    let MenuLayout = Me.imports.menulayouts;
    switch(layout){
        case Constants.MENU_LAYOUT.Default:
            return new MenuLayout.arcmenu.createMenu(button);
        case Constants.MENU_LAYOUT.Brisk:
            return new MenuLayout.brisk.createMenu(button); 
        case Constants.MENU_LAYOUT.Whisker:
            return new MenuLayout.whisker.createMenu(button); 
        case Constants.MENU_LAYOUT.GnomeMenu:
            return new MenuLayout.gnomemenu.createMenu(button); 
        case Constants.MENU_LAYOUT.Mint:
            return new MenuLayout.mint.createMenu(button); 
        case Constants.MENU_LAYOUT.GnomeDash:
            return null;
        case Constants.MENU_LAYOUT.Elementary:
            return new MenuLayout.elementary.createMenu(button); 
        case Constants.MENU_LAYOUT.Redmond:
            return new MenuLayout.redmond.createMenu(button); 
        case Constants.MENU_LAYOUT.Simple:
            return new MenuLayout.simple.createMenu(button);  
        case Constants.MENU_LAYOUT.Simple2:
            return new MenuLayout.simple2.createMenu(button);  
        case Constants.MENU_LAYOUT.UbuntuDash:
            return new MenuLayout.ubuntudash.createMenu(button); 
        case Constants.MENU_LAYOUT.Budgie:
            return new MenuLayout.budgie.createMenu(button);
        case Constants.MENU_LAYOUT.Insider:
            return new MenuLayout.insider.createMenu(button);
        case Constants.MENU_LAYOUT.Runner:
            return new MenuLayout.runner.createMenu(button);
        case Constants.MENU_LAYOUT.Chromebook:
            return new MenuLayout.chromebook.createMenu(button);
        case Constants.MENU_LAYOUT.Raven:
            return new MenuLayout.raven.createMenu(button);
        case Constants.MENU_LAYOUT.Tognee:
            return new MenuLayout.tognee.createMenu(button);
        case Constants.MENU_LAYOUT.Plasma:
            return new MenuLayout.plasma.createMenu(button);
        case Constants.MENU_LAYOUT.Windows:
            return new MenuLayout.windows.createMenu(button);
        default:
            return new MenuLayout.arcmenu.createMenu(button);    
    }
}

function getCategoryDetails(currentCategory){
    let name, gicon, iconName, fallbackIconName;
    let categoryMatchFound = false;
    for(let entry of Constants.CATEGORIES){
        if(entry.Category === currentCategory){
            categoryMatchFound = true;
            name = entry.Name;
            if(entry.Icon.startsWith(Me.path))
                gicon = Gio.icon_new_for_string(entry.Icon);
            else
                iconName = entry.Icon;
            return [name, gicon, iconName, fallbackIconName];
        }
    }
    if(currentCategory === Constants.CategoryType.HOME_SCREEN){
        name = _("Home Screen");  
        gicon = Gio.icon_new_for_string(Me.path + '/media/icons/menu_icons/homescreen-symbolic.svg');
        return [name, gicon, iconName, fallbackIconName];
    }
    else if(!categoryMatchFound){
        name = currentCategory.get_name();
        gicon = currentCategory.get_icon() ? currentCategory.get_icon() : null;
        fallbackIconName = currentCategory.get_icon() ? currentCategory.get_icon().to_string() : null;
        return [name, gicon, iconName, fallbackIconName];
    }
}

function activateCategory(currentCategory, menuLayout, menuItem, extraParams = false){
    if(currentCategory === Constants.CategoryType.HOME_SCREEN){
        menuLayout.activeCategory = _("Pinned Apps");
        menuLayout.displayFavorites();
    }
    else if(currentCategory === Constants.CategoryType.PINNED_APPS)
        menuLayout.displayFavorites();
    else if(currentCategory === Constants.CategoryType.FREQUENT_APPS){
        menuLayout.setFrequentAppsList(menuItem);
        menuLayout.displayCategoryAppList(menuItem.appList, null, extraParams ? menuItem : null);  
    }
    else if(currentCategory === Constants.CategoryType.ALL_PROGRAMS)
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);  
    else if(currentCategory === Constants.CategoryType.RECENT_FILES)
        menuLayout.displayRecentFiles();   
    else
        menuLayout.displayCategoryAppList(menuItem.appList, null, extraParams ? menuItem : null);   

    menuLayout.activeCategoryType = currentCategory;  
}

function getMenuButtonIcon(settings, path){
    let iconType = settings.get_enum('menu-button-icon');

    if(iconType === Constants.MENU_BUTTON_ICON.Custom){
        if(path && GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }
    else if(iconType === Constants.MENU_BUTTON_ICON.Distro_Icon){
        let iconEnum = settings.get_int('distro-icon');
        path = Me.path + Constants.DISTRO_ICONS[iconEnum].path;
        if(Constants.DISTRO_ICONS[iconEnum].path === 'start-here-symbolic')
            return 'start-here-symbolic';
        else if(GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;   
    }
    else{
        let iconEnum = settings.get_int('arc-menu-icon');
        path = Me.path + Constants.MENU_ICONS[iconEnum].path;
        if(GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }

    global.log("ArcMenu - Menu Button Icon Error! Set to System Default.");
    return 'start-here-symbolic';
}

function setGridLayoutStyle(layout, actor, box){
    if(layout === Constants.MENU_LAYOUT.Elementary || layout === Constants.MENU_LAYOUT.UbuntuDash)
        actor.style = "width: 95px; height: 95px;";
    else
        actor.style = "width: 80px; height: 80px;"
    actor.style += "text-align: center; border-radius: 4px; padding: 5px; spacing: 0px";    
    box.style = "padding: 0px; margin: 0px; spacing: 0px;";
}

function getGridIconSize(layout){
    if(layout === Constants.MENU_LAYOUT.Elementary || layout === Constants.MENU_LAYOUT.UbuntuDash)
        return 52;
    else
        return 36;
}

function findSoftwareManager(){
    let softwareManager = null;
    let appSys = imports.gi.Shell.AppSystem.get_default();

    for(let softwareManagerID of Constants.SoftwareManagerIDs){
        if(appSys.lookup_app(softwareManagerID)){
            softwareManager = softwareManagerID;
            break;
        }
    }

    return softwareManager;
}

//Menu Layouts that have two panes with categories on left and apps on right
function isTwoPanedLayout(layout){
    return (layout == Constants.MENU_LAYOUT.Brisk || layout == Constants.MENU_LAYOUT.Whisker || layout == Constants.MENU_LAYOUT.GnomeMenu
                    || layout == Constants.MENU_LAYOUT.Mint || layout==Constants.MENU_LAYOUT.Budgie);
}

var ScrollViewShader = `uniform sampler2D tex;
uniform float height;
uniform float width;
uniform float vfade_offset;
uniform float hfade_offset;
uniform bool  fade_edges_top;
uniform bool  fade_edges_right;
uniform bool  fade_edges_bottom;
uniform bool  fade_edges_left;

uniform vec2 fade_area_topleft;
uniform vec2 fade_area_bottomright;

void main ()
{
    cogl_color_out = cogl_color_in * texture2D (tex, vec2 (cogl_tex_coord_in[0].xy));

    float y = height * cogl_tex_coord_in[0].y;
    float x = width * cogl_tex_coord_in[0].x;

    if (x > fade_area_topleft[0] && x < fade_area_bottomright[0] &&
        y > fade_area_topleft[1] && y < fade_area_bottomright[1]) {
        float ratio = 1.0;
        float fade_bottom_start = fade_area_bottomright[1] - vfade_offset;
        float fade_right_start = fade_area_bottomright[0] - hfade_offset;
        bool fade_top = y < vfade_offset && fade_edges_top;
        bool fade_bottom = y > fade_bottom_start && fade_edges_bottom;
        bool fade_left = x < hfade_offset && fade_edges_left;
        bool fade_right = x > fade_right_start && fade_edges_right;

        float vfade_scale = height / vfade_offset;
        if (fade_top) {
            ratio *= y / vfade_offset;
        }

        if (fade_bottom) {
            ratio *= (fade_area_bottomright[1] - y) / (fade_area_bottomright[1] - fade_bottom_start);
        }

        float hfade_scale = width / hfade_offset;
        if (fade_left) {
            ratio *= x / hfade_offset;
        }

        if (fade_right) {
            ratio *= (fade_area_bottomright[0] - x) / (fade_area_bottomright[0] - fade_right_start);
        }

        cogl_color_out *= ratio;
    }
}`;

function createXpmImage(color1, color2, color3, color4){
    let width = 42;
    let height = 14;
    let colors = 5;
    let xpm = [width + " " + height + " " + colors + " " + 1, "1 c " + rgbStringToHex(color1), "2 c " + rgbStringToHex(color2), 
                "3 c " + rgbStringToHex(color3), "4 c " + rgbStringToHex(color4), "x c #AAAAAA"];
    xpm.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    for(let i = 0; i < height - 2; i++)
        xpm.push("x1111111111222222222233333333334444444444x");
    xpm.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    return xpm;
}

function ensureActorVisibleInScrollView(actor) {
    let box = actor.get_allocation_box();
    let y1 = box.y1, y2 = box.y2;

    let parent = actor.get_parent();
    while (!(parent instanceof imports.gi.St.ScrollView)) {
        if (!parent)
            return;

        box = parent.get_allocation_box();
        y1 += box.y1;
        y2 += box.y1;
        parent = parent.get_parent();
    }

    let adjustment = parent.vscroll.adjustment;
    let [value, lower_, upper, stepIncrement_, pageIncrement_, pageSize] = adjustment.get_values();

    let offset = 0;
    let vfade = parent.get_effect("fade");
    if (vfade)
        offset = vfade.vfade_offset;

    if (y1 < value + offset)
        value = Math.max(0, y1 - offset);
    else if (y2 > value + pageSize - offset)
        value = Math.min(upper, y2 + offset - pageSize);
    else
        return;
    
    adjustment.set_value(value);  
}

function getArraysEqual(a, b) {
    if(a instanceof Array && b instanceof Array){
        if (a.length !== b.length)
            return false;
        for(let i = 0; i < a.length; i++)
            if (!getArraysEqual(a[i], b[i]))
                return false;
        return true;
    } 
    else
        return a === b;
}

function createTooltip(button, widget, titleLabel, description){
    let lbl = titleLabel.clutter_text;
    lbl.get_allocation_box();
    let isEllipsized = lbl.get_layout().is_ellipsized();
    if(isEllipsized || description){
        let titleText, descriptionText;
        if(isEllipsized && description){
            titleText = titleLabel.text.replace(/\n/g, " ");
            descriptionText = description;
        }
        else if(isEllipsized && !description)
            titleText = titleLabel.text.replace(/\n/g, " ");
        else if(!isEllipsized && description)
            descriptionText = description;
        widget.tooltip = new Me.imports.menuWidgets.Tooltip(button, widget.actor, titleText, descriptionText);
        widget.tooltip._onHover();
    } 
}

function getDashToPanelPosition(settings, index){
    var positions = null;
    var side;

    try{
        positions = JSON.parse(settings.get_string('panel-positions'))
    } catch(e){
        log('Error parsing Dash to Panel positions: ' + e.message);
    }
    
    if(!positions)
        side = settings.get_string('panel-position');
    else{
        side = positions[index];
    }

    if (side === 'TOP') 
        return imports.gi.St.Side.TOP;
    else if (side === 'RIGHT') 
        return imports.gi.St.Side.RIGHT;
    else if (side === 'BOTTOM')
        return imports.gi.St.Side.BOTTOM;
    else if (side === 'LEFT')
        return imports.gi.St.Side.LEFT;
    else
        return imports.gi.St.Side.TOP;
}

function getStylesheet(){
    let stylesheet = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arcmenu/stylesheet.css");

    if(!stylesheet.query_exists(null)){
        GLib.spawn_command_line_sync("mkdir " + GLib.get_home_dir() + "/.local/share/arcmenu");
        GLib.spawn_command_line_sync("touch " + GLib.get_home_dir() + "/.local/share/arcmenu/stylesheet.css");
        stylesheet = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arcmenu/stylesheet.css");
    }

    return stylesheet;
}

function rgbStringToHex(colorString) {
    let [r, g, b, a_] = parseRgbString(colorString)
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function parseRgbString(colorString){
    if(colorString.includes('rgba'))
		colorString = colorString.replace('rgba(','');
	if(colorString.includes('rgb'))
		colorString = colorString.replace('rgb(','');
	colorString = colorString.replace(')','');
    let rgbaColor = colorString.split(",");

    let r = parseFloat(rgbaColor[0]);
    let g = parseFloat(rgbaColor[1]);
    let b = parseFloat(rgbaColor[2]);
	let a;
	if(rgbaColor[3] != undefined)
		a = parseFloat(rgbaColor[3]); 
	else
        a = 1;
    return [r, g, b, a];
}

function modifyColorLuminance(colorString, luminanceFactor, modifyAlpha){
    let Clutter = imports.gi.Clutter;
    let color = Clutter.color_from_string(colorString)[1];
    let [hue, lum, sat] = color.to_hls();
    let modifiedLum = lum;

    if(luminanceFactor >= 0)
        modifiedLum += luminanceFactor;
    else
        modifiedLum -= Math.abs(luminanceFactor);

    //Reverse the darken/lighten effect if luminance out of range
    if(modifiedLum >= 1 || modifiedLum < 0){
        modifiedLum = lum;
        if(luminanceFactor < 0)
            modifiedLum += Math.abs(luminanceFactor);
        else
            modifiedLum -= luminanceFactor; 
    }
   
    let alpha = Math.round((color.alpha / 255) * 100) / 100;
    if(modifyAlpha){
        alpha = Math.round((color.alpha / 255) * 100) / 100;
        alpha = alpha * (1 - modifyAlpha);
    }

    let modifiedColor = Clutter.color_from_hls(hue, modifiedLum, sat);

    return "rgba("+modifiedColor.red+","+modifiedColor.green+","+modifiedColor.blue+","+alpha+")";
}

function createStylesheet(settings){
    //Added "Active Item Foreground Color" setting in v46. To update older color themes,
    //add a preset color based on "Menu Foreground Color' into existing array.
    //Old aray length was 12, New array length is 13
    let all_color_themes = settings.get_value('color-themes').deep_unpack();
    let changesMade = false;
    for(let i = 0; i < all_color_themes.length; i++){
        if(all_color_themes[i].length === 12){
            all_color_themes[i].splice(5, 0, modifyColorLuminance(all_color_themes[i][2], 0.15));
            changesMade = true;
        }
    }
    if(changesMade)
        settings.set_value('color-themes',new GLib.Variant('aas', all_color_themes));

    let customarcMenu = settings.get_boolean('enable-custom-arc-menu');
    let separatorColor = settings.get_string('separator-color');
    let menuColor = settings.get_string('menu-color');
    let menuForegroundColor = settings.get_string('menu-foreground-color');
    let borderColor = settings.get_string('border-color');
    let highlightColor = settings.get_string('highlight-color');
    let highlightForegroundColor = settings.get_string('highlight-foreground-color');
    let fontSize = settings.get_int('menu-font-size');
    let borderSize = settings.get_int('menu-border-size');
    let cornerRadius = settings.get_int('menu-corner-radius');
    let menuMargin = settings.get_int('menu-margin');
    let menuArrowSize = settings.get_int('menu-arrow-size');
    let leftPanelWidth = settings.get_int('menu-width');
    let leftPanelWidthSmall = settings.get_int('menu-width') - 85;
    let avatarStyle =  settings.get_enum('avatar-style');
    let avatarRadius = avatarStyle == 0 ? 999 : 0;
    let menuButtonColor = settings.get_string('menu-button-color');
    let menuButtonHoverColor = settings.get_string('menu-button-hover-color');
    let menuButtonActiveColor = settings.get_string('menu-button-active-color');
    let menuButtonHoverBackgroundcolor = settings.get_string('menu-button-hover-backgroundcolor');
    let menuButtonActiveBackgroundcolor = settings.get_string('menu-button-active-backgroundcolor');
    let gapAdjustment = settings.get_int('gap-adjustment');
    let indicatorColor = settings.get_string('indicator-color');
    let indicatorTextBackgroundColor = settings.get_string('indicator-text-color');
    let plasmaSelectedItemColor = settings.get_string('plasma-selected-color');
    let plasmaSelectedItemBackgroundColor = settings.get_string('plasma-selected-background-color');
    let plasmaSearchBarTop = settings.get_enum('searchbar-default-top-location');
    let disableMenuButtonActiveIndicator = settings.get_boolean('disable-menu-button-active-indicator');
    let tooltipStyle;
    let plasmaButtonStyle = plasmaSearchBarTop === Constants.SearchbarLocation.TOP ? 'border-top-width: 2px;' : 'border-bottom-width: 2px;';
    if(customarcMenu){
        tooltipStyle = ".tooltip-menu-item{\nbox-shadow:0 0 0 1px " + modifyColorLuminance(menuColor, 0.10) + ";\nfont-size:" + fontSize + "pt;\npadding: 2px 5px;\nmin-height: 0px;"
                        + "\ncolor:" + menuForegroundColor+ ";\nbackground-color:" + modifyColorLuminance(menuColor, 0.05) + ";\nmax-width:550px;\n}\n\n"; 
    }
    else
        tooltipStyle = ".tooltip-menu-item{\npadding: 2px 5px;\nmax-width:550px;\nmin-height: 0px;\n}\n\n";
    
    let menuButtonStyle = '';
    if(settings.get_boolean('override-menu-button-color'))
        menuButtonStyle += ".arc-menu-icon, .arc-menu-text, .arc-menu-arrow{\ncolor: " + menuButtonColor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-hover-background-color'))
        menuButtonStyle += ".arc-menu-panel-menu:hover{\nbackground-color: " + menuButtonHoverBackgroundcolor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-hover-color'))
        menuButtonStyle += ".arc-menu-panel-menu:hover .arc-menu-icon, .arc-menu-panel-menu:hover .arc-menu-text"
                            +", .arc-menu-panel-menu:hover .arc-menu-arrow{\ncolor: " + menuButtonHoverColor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-active-color'))
        menuButtonStyle += ".arc-menu-icon:active, .arc-menu-text:active, .arc-menu-arrow:active{\ncolor: " + menuButtonActiveColor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-active-background-color'))
        menuButtonStyle += ".arc-menu-panel-menu:active{\nbackground-color: " + menuButtonActiveBackgroundcolor + ";\n" + (disableMenuButtonActiveIndicator ? "box-shadow: none;\n" : '') + "}\n\n";
    else
        menuButtonStyle += ".arc-menu-panel-menu:active{\n" + (disableMenuButtonActiveIndicator ? "box-shadow: none;\n" : '') + "}\n\n"


    let stylesheetCSS = "#arc-search{\nwidth: " + leftPanelWidth + "px;\n}\n\n"
        +".arc-menu-status-text{\ncolor:" + menuForegroundColor + ";\nfont-size:" + fontSize + "pt;\n}\n\n"                                                     
        +".search-statustext{\nfont-size:11pt;\n}\n\n"    
        +".left-scroll-area{\nwidth:" + leftPanelWidth + "px;\n}\n\n"   
        +".left-scroll-area-small{\nwidth:" + leftPanelWidthSmall + "px;\n}\n\n"  
    	+".arc-empty-dash-drop-target{\nwidth: " + leftPanelWidth + "px; \nheight: 2px; \nbackground-color:" + separatorColor + "; \npadding: 0 0; \nmargin:0;\n}\n\n"     
        +".left-box{\nwidth:" + leftPanelWidth + "px;\n}\n\n"
        +".vert-sep{\nwidth:11px;\n}\n\n"
        +".default-search-entry{\nmax-width: 17.667em;\n}\n\n"
        +".arc-search-entry{\nmax-width: 17.667em;\nfont-size:" + fontSize + "pt;\nborder-color:" + separatorColor + ";\nborder-width: 1px;\n"
                            +"color:" + menuForegroundColor + ";\nbackground-color:" + menuColor + ";\n}\n\n"
        +".arc-search-entry:focus{\nborder-color:" + highlightColor + ";\nborder-width: 1px;\nbox-shadow: inset 0 0 0 1px " + modifyColorLuminance(highlightColor, 0.05) + ";\n}\n\n"
        +".arc-search-entry StLabel.hint-text{\ncolor: " + modifyColorLuminance(menuForegroundColor, 0, 0.3) + ";\n}\n\n"
                
        + menuButtonStyle
        
        +"#arc-menu-plasma-button{\n" + plasmaButtonStyle + ";\nborder-color: transparent;\n}\n\n"
        +"#arc-menu-plasma-button:active-item, .arc-menu-plasma-button:active{\nbackground-color: " + plasmaSelectedItemBackgroundColor + ";\n"
            + plasmaButtonStyle + "\nborder-color: " + plasmaSelectedItemColor + ";\n}\n\n"

        +"StScrollView .small-vfade{\n-st-vfade-offset: 44px;\n}\n\n"

        +".arc-menu-eject-button{\n-st-icon-style: symbolic;\nbackground-color: transparent;\nmin-width: 16px;\nmin-height: 0px;\nborder-radius: 6px;\npadding: 0px 13px;\n}\n\n"
        +".arc-menu-eject-button:hover{\nbackground-color: rgba(186, 196,201, 0.1);\n}\n\n"

        +".arc-menu-button{\n-st-icon-style: symbolic;\nmin-height: 0px;\nmin-width: 16px;\nborder-radius: 26px;\npadding: 13px;\n}\n\n"

        +".arc-menu-action{\nmargin: 1px;\nbackground-color: transparent;\nbox-shadow: none;\ncolor:" + menuForegroundColor + ";\nborder-width: 1px;\n"
                            +"border-color: transparent;\n}\n\n"
        +".arc-menu-action:hover, .arc-menu-action:focus{\ncolor:" + highlightForegroundColor + ";\nbackground-color:" + highlightColor + ";\nborder-width: 1px;\n"
                                +"box-shadow: 0 1px 1px 0 " + modifyColorLuminance(menuColor, -0.05) + ";\nborder-color:" + modifyColorLuminance(menuColor, -0.05) + ";\n}\n\n"
        +".arc-menu-action:active{\nbox-shadow: none;\ncolor:" + highlightForegroundColor + ";\nbackground-color:" + modifyColorLuminance(highlightColor, -0.15) + ";\nborder-width: 1px;\n"
                                +"border-color:" + modifyColorLuminance(menuColor, -0.1) + ";\n}\n\n"
        +".arc-menu-menu-item-indicator{\ncolor: " + indicatorColor + ";\n}\n\n"
        +".arc-menu-menu-item-text-indicator{\nbackground-color: " + indicatorTextBackgroundColor + ";\n}\n\n"

        +tooltipStyle

        +".arc-menu{\n-boxpointer-gap: " + gapAdjustment + "px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\n"
                        +"box-shadow: none;\nfont-size:" + fontSize + "pt;\n}\n\n"
        +".arc-menu .popup-sub-menu{\npadding-bottom: 1px;\nbackground-color: " + modifyColorLuminance(menuColor, 0.04) + ";\n}\n\n"
        +".arc-menu .popup-menu-content{\npadding: 1em 0em;\n}\n\n"
        +".arc-menu .popup-menu-item{\nspacing: 12px; \nborder: 0;\ncolor:" + menuForegroundColor + ";\n}\n\n"
        +".arc-menu .popup-menu-item:ltr{\npadding: .4em 1.75em .4em 0em;\n}\n\n.arc-menu .popup-menu-item:rtl\n{\npadding: .4em 0em .4em 1.75em;\n}\n\n"
        +".arc-menu .popup-menu-item:checked{\nbackground-color:" + modifyColorLuminance(menuColor, 0.04) + ";\nbox-shadow: 0;\nfont-weight: bold;\n"
                                                +"\nborder-color: " + modifyColorLuminance(menuColor,0.15) + ";\nborder-top-width:1px;\n}\n\n"
        +".arc-menu .popup-menu-item.selected, .arc-menu .popup-menu-item:active{\n"
                                +"background-color:" + highlightColor + "; \ncolor: " + highlightForegroundColor + ";\n}\n\n" 
        +".arc-menu .popup-menu-item:disabled{\ncolor: rgba(238, 238, 236, 0.5);\n}\n\n"
        +".arc-menu-boxpointer{ \n-arrow-border-radius:" + cornerRadius + "px;\n"
                                +"-arrow-background-color:" + menuColor + ";\n"
                                +"-arrow-border-color:" + borderColor + ";\n"
                                +"-arrow-border-width:" + borderSize + "px;\n"
                                +"-arrow-base:" + menuMargin + "px;\n"
                                +"-arrow-rise:" + menuArrowSize + "px;\n}\n\n"
        +".arc-menu .popup-menu-content{\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n\n"

        +".arc-menu-sep{\nheight: 1px;\nmargin: 5px 20px;\nbackground-color: transparent;\nborder-bottom-style: solid;"
                            +"\nborder-color:" + separatorColor + ";\nborder-bottom-width: 1px;\n}\n\n"

        +".menu-user-avatar{\nbackground-size: contain;\nborder: none;\nborder-radius: " + avatarRadius + "px;\n}\n\n"

        +".arc-right-click{\nmax-width:350px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nfont-size:" + fontSize + "pt;\nmargin:0px;\npadding:0px;"
                            +"box-shadow: none;\nspacing:0px;\n}\n\n"
        +".arc-right-click .popup-sub-menu{\npadding-bottom: 1px;\nbackground-color: #3a393b;\nbox-shadow: inset 0 -1px 0px #323233;\n}\n\n"
        +".arc-right-click .popup-menu-content{\npadding: 3px 0px;\n}\n\n"
        +".arc-right-click .popup-menu-item{\nspacing: 12px; \nborder: 0;\ncolor:" + menuForegroundColor + ";\n}\n\n" 
        +".arc-right-click .popup-menu-item:ltr{\npadding: .4em 1.75em .4em 0em;\n}\n\n.arc-right-click .popup-menu-item:rtl{\npadding: .4em 0em .4em 1.75em;\n}\n\n"
        +".arc-right-click .popup-menu-item:checked{\nbackground-color: #3a393b;\nbox-shadow: inset 0 1px 0px #323233;\nfont-weight: bold;\n}\n\n"
        +".arc-right-click .popup-menu-item.selected, .arc-right-click .popup-menu-item:active{"
                                +"\nbackground-color:" + modifyColorLuminance(highlightColor, 0.05) + "; \ncolor: " + highlightForegroundColor + ";\n}\n\n" 
        +".arc-right-click .popup-menu-item:disabled{\ncolor: rgba(238, 238, 236, 0.5);\n}\n\n"
        +".arc-right-click .popup-menu-item:insensitive{\ncolor:" + modifyColorLuminance(menuForegroundColor, 0.15) + ";\n}\n\n"
        +".arc-right-click-boxpointer{ \n-arrow-border-radius:" + cornerRadius + "px;\n"
                                        +"-arrow-background-color:" + modifyColorLuminance(menuColor, 0.05) + ";\n"
                                        +"-arrow-border-color:" + modifyColorLuminance(menuColor, 0.10) + ";\n"
                                        +"-arrow-border-width:" + (borderSize > 1 ? borderSize : 1) + "px;\n"
                                        +"-arrow-base:" + menuMargin + "px;\n"
                                        +"-arrow-rise:" + menuArrowSize + "px;\n}\n\n"
        +".arc-right-click .popup-menu-content{\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n\n"
        
        +".app-right-click-sep {\nheight: 1px;\nmargin: 2px 35px 3px 35px;\nbackground-color: transparent;\nborder-bottom-style: solid;"
                                    +"\nborder-color:" + separatorColor + ";\nborder-bottom-width: 1px;\n}\n";
    
    let stylesheet = getStylesheet();
    if(stylesheet){
        try{
            stylesheet.replace_contents(stylesheetCSS, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        }
        catch(e){
            global.log("Arc-Menu - Error updating stylesheet! " + e.message);
        }
    }
    else
        global.log("Arc-Menu - Error getting stylesheet!");
}
