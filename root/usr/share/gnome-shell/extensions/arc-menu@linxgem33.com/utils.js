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
            return new MenuLayout.gnomedash.createMenu(button); 
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
        case Constants.MENU_LAYOUT.Windows:
            return new MenuLayout.windows.createMenu(button);
        case Constants.MENU_LAYOUT.Runner:
            return new MenuLayout.runner.createMenu(button);
        case Constants.MENU_LAYOUT.Chromebook:
            return new MenuLayout.chromebook.createMenu(button);
        case Constants.MENU_LAYOUT.Raven:
            return new MenuLayout.raven.createMenu(button);
    }
}

//Menu Layouts that have two panes with categories on left and apps on right
function isTwoPanedLayout(layout){
    return (layout == Constants.MENU_LAYOUT.Brisk || layout == Constants.MENU_LAYOUT.Whisker || layout == Constants.MENU_LAYOUT.GnomeMenu
                    || layout == Constants.MENU_LAYOUT.Mint || layout==Constants.MENU_LAYOUT.Budgie);
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

function createTooltip(button, widget, label, description){
    let lbl = label.clutter_text;
    lbl.get_allocation_box();
    let isEllipsized = lbl.get_layout().is_ellipsized();
    if(isEllipsized || description){
        let tooltipText = "";
        if(isEllipsized && description)
            tooltipText = label.text.replace(/\n/g, " ") + "\n" + description;
        else if(isEllipsized && !description)
            tooltipText = label.text.replace(/\n/g, " ");
        else if(!isEllipsized && description)
            tooltipText = description;
        else if(!isEllipsized && !description)
            tooltipText = '';
        widget.tooltip = new Me.imports.menuWidgets.Tooltip(button, widget.actor, tooltipText);
        widget.tooltip._onHover();
    } 
}

function getStylesheet(){
    let stylesheet = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arc-menu/stylesheet.css");

    if(!stylesheet.query_exists(null)){
        GLib.spawn_command_line_sync("mkdir " + GLib.get_home_dir() + "/.local/share/arc-menu");
        GLib.spawn_command_line_sync("touch " + GLib.get_home_dir() + "/.local/share/arc-menu/stylesheet.css");
        stylesheet = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arc-menu/stylesheet.css");
    }

    return stylesheet;
}

function lighten_rgb(colorString, percent, modifyAlpha){ // implemented from https://stackoverflow.com/a/141943
	if(colorString.includes('rgba'))
		colorString = colorString.replace('rgba(','');
	if(colorString.includes('rgb'))
		colorString = colorString.replace('rgb(','');
	colorString = colorString.replace(')','');
    let rgbaColor = colorString.split(",");

    let r = parseFloat(rgbaColor[0]) + 255 * percent;
    let g = parseFloat(rgbaColor[1]) + 255 * percent;
    let b = parseFloat(rgbaColor[2]) + 255 * percent;
	let a;
	if(rgbaColor[3] != undefined)
		a = parseFloat(rgbaColor[3]); 
	else
        a = 1;
    if(modifyAlpha)
        a = a * (1 - modifyAlpha);
	let m = Math.max(r, g, b);
	let threshold = 255.9999;
	r = Math.round(r);
	g = Math.round(g);
    b = Math.round(b);
    if(r < 0) r = 0;
    if(g < 0) g = 0;
    if(b < 0) b =0;
	if(m <= threshold){
		return "rgba("+r+","+g+","+b+","+a+")";
	}
	let total = r + g + b;
	if(total >= 3 * threshold){
		return "rgba(255,255,255,"+a+")";
	}
	let x = (3 * threshold - total) / (3 * m - total);
	let gray = threshold - x * m;
	r = gray + x * r;
	g = gray + x * g;
	b = gray + x * b;
	r = Math.round(r);
	g = Math.round(g);
	b = Math.round(b);
	return "rgba("+r+","+g+","+b+","+a+")";
}

function createStylesheet(settings){
    let customArcMenu = settings.get_boolean('enable-custom-arc-menu');
    let separatorColor = settings.get_string('separator-color');
    let menuColor = settings.get_string('menu-color');
    let menuForegroundColor = settings.get_string('menu-foreground-color');
    let borderColor = settings.get_string('border-color');
    let highlightColor = settings.get_string('highlight-color');
    let fontSize = settings.get_int('menu-font-size');
    let borderSize = settings.get_int('menu-border-size');
    let cornerRadius = settings.get_int('menu-corner-radius');
    let menuMargin = settings.get_int('menu-margin');
    let menuArrowSize = settings.get_int('menu-arrow-size');
    let menuWidth = settings.get_int('menu-width');
    let avatarStyle =  settings.get_enum('avatar-style');
    let avatarRadius = avatarStyle == 0 ? 999 : 0;
    let menuButtonColor = settings.get_string('menu-button-color');
    let menuButtonActiveColor =  settings.get_string('menu-button-active-color');
    let gapAdjustment = settings.get_int('gap-adjustment');
    let tooltipForegroundColor = customArcMenu ? "\n color:"+  menuForegroundColor+";\n" : "";
    let tooltipBackgroundColor = customArcMenu ? "\n background-color:"+lighten_rgb(menuColor,0.05)+";\n" : "";
    let indicatorColor = settings.get_string('indicator-color');
    let indicatorTextBackgroundColor = settings.get_string('indicator-text-color');
        
    let tooltipStyle = customArcMenu ?   
        ("#tooltip-menu-item{border-color:"+  borderColor+ ";\n border: 1px;\nfont-size:"+fontSize+"pt;\n padding: 2px 5px;\n min-height: 0px;"
        + tooltipForegroundColor + tooltipBackgroundColor+"\nmax-width:550px;\n}") 
        : ("#tooltip-menu-item{\n padding: 2px 5px;\nmax-width:550px;\n min-height: 0px;\n}");

    let stylesheetCSS = "#arc-search{width: "+  menuWidth+"px;} \n.arc-menu-status-text{\ncolor:"+ menuForegroundColor +";\nfont-size:" + fontSize+"pt;\n}\n "+                                                      
        ".search-statustext {font-size:11pt;}\n "+    
        ".left-scroll-area{ \nwidth:"+  menuWidth+"px;\n}\n"   
    	+".arc-empty-dash-drop-target{\nwidth: "+  menuWidth+"px; \nheight: 2px; \nbackground-color:"+  separatorColor+"; \npadding: 0 0; \nmargin:0;\n}\n"     
        +".left-box{\nwidth:"+  menuWidth+"px;\n}" + "\n.vert-sep{\nwidth:11px;\n}\n"
        +".default-search-entry{\nmax-width: 17.667em;\n}\n"
        +".arc-search-entry{\nmax-width: 17.667em;\nfont-size:" + fontSize+"pt;\n border-color:"+ separatorColor+"; border-width: 1px;\n"
        +" color:"+  menuForegroundColor+";\n background-color:" +  menuColor + ";\n}\n"
        +".arc-search-entry:focus { \nborder-color:"+separatorColor+";border-width: 1px; box-shadow: inset 0 0 0 1px "+lighten_rgb(separatorColor, 0.05)+";}\n"
        +".arc-search-entry StLabel.hint-text { color: "+lighten_rgb( menuForegroundColor,0, 0.3)+";}"

        +".arc-menu-icon{\ncolor: "+menuButtonColor+";\n}\n"
        +"\n.arc-menu-icon:hover,\n.arc-menu-icon:active{\ncolor: "+menuButtonActiveColor+";\n}\n"
        
        +".arc-menu-button{ -st-icon-style: symbolic;  border-radius: 32px; border: 0; padding: 13px;\n background-color:transparent;}"
        +".arc-menu-button:hover, .arc-menu-button:focus{ background-color: rgba(146, 146, 146, 0.25);}"

        +".arc-menu-action{background-color:transparent;\ncolor:"+  menuForegroundColor+";\n}\n"
        +".arc-menu-action:hover, .arc-menu-action:focus {\ncolor:"+ lighten_rgb( menuForegroundColor,0.15)+";\n background-color:"+  highlightColor+";\n}\n"

        +".arc-menu-menu-item-indicator{color: " + indicatorColor + ";}\n"
        +".arc-menu-menu-item-text-indicator{background-color: " + indicatorTextBackgroundColor + ";}\n"

        +tooltipStyle

        +".arc-menu{\n-boxpointer-gap: "+gapAdjustment+"px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nbox-shadow: none;\nfont-size:" + fontSize+"pt;\n}\n"
        +".arc-menu .popup-sub-menu {\npadding-bottom: 1px;\nbackground-color: "+lighten_rgb( menuColor,0.04)+";\n}\n"
        +".arc-menu .popup-menu-content {padding: 1em 0em;}\n .arc-menu .popup-menu-item {\nspacing: 12px; \nborder: 0;\ncolor:"+  menuForegroundColor+";\n }\n" 
        +".arc-menu .popup-menu-item:ltr {padding: .4em 1.75em .4em 0em; }\n.arc-menu .popup-menu-item:rtl {padding: .4em 0em .4em 1.75em;}\n"
        +".arc-menu .popup-menu-item:checked {\nbackground-color:"+lighten_rgb( menuColor,0.04)+";\n box-shadow: 0;\nfont-weight: bold;\n border-color: "+lighten_rgb( menuColor,0.15)+";\n border-top-width:1px;\n}\n"
        +".arc-menu .popup-menu-item.selected, .arc-menu .popup-menu-item:active{\nbackground-color:"+  highlightColor+"; \ncolor: "+ lighten_rgb( menuForegroundColor,0.15)+";\n }\n" 
        +".arc-menu .popup-menu-item:disabled {color: rgba(238, 238, 236, 0.5); }\n"
        +".arc-menu-boxpointer{ \n-arrow-border-radius:"+  cornerRadius+"px;\n"
        +"-arrow-background-color:" +  menuColor + ";\n"
        +"-arrow-border-color:"+  borderColor+ ";\n"
        +"-arrow-border-width:"+  borderSize+"px;\n"
        +"-arrow-base:"+  menuMargin+"px;\n"
        +"-arrow-rise:"+  menuArrowSize+"px;\n"
        +"-arrow-box-shadow: 0 1px 3px black;\n }"
        +"\n.arc-menu .popup-menu-content\n {\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n"
        
        +"\n.arc-menu-sep {\nheight: 1px;\nmargin: 5px 20px;\nbackground-color: transparent;"
        +"\nborder-color:"+  separatorColor+";\n border-bottom-width: 1px;\nborder-bottom-style: solid;\n }"

        +".menu-user-avatar {\n background-size: contain; \n border: none;\n border-radius: "+avatarRadius+"px;\n }"
        + "#rightClickMenu{max-width:350px;}"
        +".arc-right-click{\nmax-width:350px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nfont-size:" + fontSize+"pt;\nmargin:2px;\npadding:2px;"
        +"\nspacing:2px;\nbox-shadow: 1px 1px 4px rgb(53, 52, 52);\n}\n"
        +".arc-right-click .popup-sub-menu {\npadding-bottom: 1px;\nbackground-color: #3a393b;\nbox-shadow: inset 0 -1px 0px #323233;\n }\n"
        +".arc-right-click .popup-menu-content {padding: 2px;}\n .arc-right-click .popup-menu-item {\nspacing: 12px; \nborder: 0;\ncolor:"+  menuForegroundColor+";\n }\n" 
        +".arc-right-click .popup-menu-item:ltr {padding: .4em 1.75em .4em 0em; }\n.arc-right-click .popup-menu-item:rtl {padding: .4em 0em .4em 1.75em;}\n"
        +".arc-right-click .popup-menu-item:checked {\nbackground-color: #3a393b;\n box-shadow: inset 0 1px 0px #323233;\nfont-weight: bold;\n }\n"
        +".arc-right-click .popup-menu-item.selected, .arc-right-click .popup-menu-item:active{\nbackground-color:"+  highlightColor+"; \ncolor: "+ lighten_rgb( menuForegroundColor,0.15)+";\n }\n" 
        +".arc-right-click .popup-menu-item:disabled {color: rgba(238, 238, 236, 0.5); }\n"
        +".arc-right-click .popup-menu-item:insensitive {color:" +  lighten_rgb( menuForegroundColor,-0.30) + "; }\n"
        +".arc-right-click-boxpointer{ \n-arrow-border-radius:"+  cornerRadius+"px;\n"
        +"-arrow-background-color:" +  lighten_rgb( menuColor,0.05) + ";\n"
        +"-arrow-border-color:"+  borderColor+ ";\n"
        +"-arrow-border-width:"+  "1px;\n"
        +"-arrow-base:"+  menuMargin+"px;\n"
        +"-arrow-rise:"+  menuArrowSize+"px;\n"
        +"-arrow-box-shadow: 0 1px 3px black;\n }"
        +"\n.arc-right-click .popup-menu-content\n {\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n"
        
        +"\n.app-right-click-sep {\nheight: 1px;\nmargin: 2px 35px;\nbackground-color: transparent;"
        +"\nborder-color:"+  lighten_rgb(separatorColor,0.05) +";\nborder-bottom-width: 1px;\nborder-bottom-style: solid; \n}";
    
    let stylesheet = getStylesheet();
    stylesheet.replace_contents(stylesheetCSS, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
}
