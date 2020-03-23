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
const MW = Me.imports.menuWidgets;

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
        widget.tooltip = new MW.Tooltip(button, widget.actor, tooltipText);
        widget.tooltip._onHover();
    } 
}

function _onPan(action, scrollbox) {
    let [dist_, dx_, dy] = action.get_motion_delta(0);
    let adjustment = scrollbox.get_vscroll_bar().get_adjustment();
    adjustment.value -= (dy / scrollbox.height) * adjustment.page_size;
    return false;
}
function _onPanEnd(action, scrollbox) {
    let velocity = -action.get_velocity(0)[2];
    let endPanValue = scrollbox.get_vscroll_bar().get_adjustment().value + velocity;
    let adjustment = scrollbox.get_vscroll_bar().get_adjustment();
    adjustment.value = endPanValue;
}
