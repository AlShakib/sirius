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
const {GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var Notebook = GObject.registerClass(class ArcMenu_Notebook extends Gtk.Notebook{
    _init() {
        super._init({
            margin_left: 0,
            margin_right: 0
        });
    }

    append_page(notebookPage) {
        Gtk.Notebook.prototype.append_page.call(
            this,
            notebookPage,
            notebookPage.getTitleLabel()
        );
    }
});

var NotebookPage = GObject.registerClass(class ArcMenu_NotebookPage extends Gtk.Box {
    _init(title) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 24,
            spacing: 20,
            homogeneous: false
        });
        this._title = new Gtk.Label({
            label: "<b>" + title + "</b>",
            use_markup: true,
            xalign: 0
        });
    }

    getTitleLabel() {
        return this._title;
    }
});

var IconButton = GObject.registerClass(class ArcMenu_IconButton extends Gtk.Button {
    _init(params) {
        super._init();
        this._params = params;

        if (this._params.circular) {
            let context = this.get_style_context();
            context.add_class('circular');
        }
        if (this._params.icon_name) {
            let image = new Gtk.Image({
                icon_name: this._params.icon_name,
                halign: Gtk.Align.CENTER
            });
            this.add(image);
        }
        if (this._params.tooltip_text){
            this.set_tooltip_text(this._params.tooltip_text);
        }
    }
});

var InfoButton = GObject.registerClass(class ArcMenu_InfoButton extends Gtk.Button{
    _init(params) {
        super._init();
        this.halign = Gtk.Align.END;
        this.valign = Gtk.Align.END;
        let infoImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string(Me.path + '/media/misc/info-circle-symbolic.svg')
        });
        this.image = infoImage;
        if(params && params.tooltip_text){
            this.set_tooltip_text(params.tooltip_text);
        }
    }

});

var DialogWindow = GObject.registerClass(class ArcMenu_DialogWindow extends Gtk.Dialog {
    _init(title, parent) {
        super._init({
            title: title,
            transient_for: parent.get_toplevel(),
            use_header_bar: true,
            modal: true
        });
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            homogeneous: false,
            margin: 5
        });

        this._createLayout(vbox);
        this.get_content_area().add(vbox);
    }

    _createLayout(vbox) {
        throw "Not implemented!";
    }
});

var FrameBox = GObject.registerClass(class ArcMenu_FrameBox extends Gtk.Frame {
    _init() {
        super._init({ label_yalign: 0.50 });
        this._listBox = new Gtk.ListBox();
        this._listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.count=0;
        Gtk.Frame.prototype.add.call(this, this._listBox);
    }

    add(boxRow) {
        this._listBox.add(boxRow);
        this.count++;
    }
    show() {
        this._listBox.show_all();
    }
    length() {
        return this._listBox.length;
    }
    remove(boxRow) {
        this._listBox.remove(boxRow);
        this.count = this.count -1;
    }
    remove_all_children() {
        let children = this._listBox.get_children();
        for(let i = 0; i < children.length; i++){
            let child = children[i];
            this._listBox.remove(child);
        }
        this.count = 0;
        this._listBox.show_all();
    }
    get_index(index){
        return this._listBox.get_row_at_index(index);
    }
    insert(row,pos){
        this._listBox.insert(row,pos);
        this.count++;
    }
});

var FrameBoxRow = GObject.registerClass(class ArcMenu_FrameBoxRow extends Gtk.ListBoxRow {
    _init(params) {
        super._init(params);
        this.selectable = false;
        this.activatable = false;
        this._grid = new Gtk.Grid({
            margin: 5,
            column_spacing: 20,
            row_spacing: 20
        });
        Gtk.ListBoxRow.prototype.add.call(this, this._grid);
    }

    add(widget) {
        this._grid.add(widget);
    }
    
    setVerticalAlignmentBottom(){
        this._grid.vexpand = true;
        this._grid.valign = Gtk.Align.END;
    }
});

var StackListBox = GObject.registerClass(class ArcMenu_StackListBox extends Gtk.ListBox{
    _init(widget, params){
        super._init(params);
        this.valign = Gtk.Align.FILL;
        this.vexpand = true;
        this.hexpand = false;
        this.settingsFrameStack = widget.settingsFrameStack;
        this.settingsListStack = widget.settingsListStack
        this.connect("row-selected", (self, row) => {
            if(row){
                let listRow = row.get_children()[0];
                let stackName = listRow.stackName;
                this.settingsFrameStack.set_visible_child_name(stackName);
                if(listRow.nextPage){
                    widget.leftHeaderBox.add(widget.backButton);
                    this.settingsListStack.set_visible_child_name(listRow.nextPage);
                    this.settingsListStack.get_child_by_name(listRow.nextPage).listBox.selectFirstRow();
                }
            }
        });
        this.scrollWindow =  new Gtk.ScrolledWindow({
            valign: Gtk.Align.FILL,
            vexpand: true
        });
        this.scrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.scrollWindow.add_with_viewport(this);
        this.scrollWindow.listBox = this;
    }

    getRowAtIndex(index){
        return this.get_row_at_index(index).get_children()[0];
    }

    getSelectedRow(){
        return this.get_selected_row().get_children()[0];
    }

    selectFirstRow(){
        this.select_row(this.get_row_at_index(0));
    }

    addRow(name, translateableName, iconName, nextPage){
        let row = new Gtk.Grid({margin: 12, column_spacing: 10});
        row.stackName = name;
        row.translateableName = translateableName;
        
        let image = new Gtk.Image({ 
            gicon: Gio.icon_new_for_string(iconName)
        });

        let label = new Gtk.Label({
            label: translateableName,
            halign: Gtk.Align.START,
        });
        row.add(image);
        row.add(label);

        if(nextPage){
            row.nextPage = nextPage;
            let image2 = new Gtk.Image({ 
                gicon: Gio.icon_new_for_string('go-next-symbolic'),
                halign: Gtk.Align.END,
                hexpand: true
            });
            row.add(image2);
        }

        this.add(row);
    }
});

var TileGrid = GObject.registerClass(class ArcMenu_TileGrid extends Gtk.FlowBox{
    _init(maxColumns) {
        super._init({
            row_spacing: 5,
            column_spacing: 5,
            vexpand: true,
            hexpand: true,
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
            max_children_per_line: maxColumns,
            homogeneous: true,
            selection_mode: Gtk.SelectionMode.NONE
        });
    }
});

var IconGrid = GObject.registerClass(class ArcMenu_IconGrid extends Gtk.FlowBox{
    _init() {
        super._init({
            max_children_per_line: 7,
            row_spacing: 10,
            column_spacing: 10,
            vexpand: true,
            hexpand: false,
            valign: Gtk.Align.START,
            halign: Gtk.Align.CENTER,
            homogeneous: true,
            selection_mode: Gtk.SelectionMode.SINGLE
        });
    }
});

var Tile = GObject.registerClass(class ArcMenu_Tile extends Gtk.Button{
    _init(name, file, width, height, layout) {
        super._init({
            hexpand: false,
            vexpand: false,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        });
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(file, width, height);
        this._image = new Gtk.Image({ pixbuf: pixbuf });
        this.name = name;
        this._label = new Gtk.Label({ label: _(this.name) });
        this.layout = layout;

        this._vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        this._vbox.add(this._image);
        this._vbox.add(this._label);
        this.add(this._vbox);
        this.margin=1;
    }
});

var LayoutTile = GObject.registerClass(class ArcMenu_LayoutTile extends FrameBox{
    _init(name, file, width, height, layout) {
        super._init();
        this.name = name;
        this.layout = layout.layoutStyle;
        this.info = "<b>"+ _(this.name) + "</b>\n\n" + _(layout.description) + "\n\n" + _("Included Layouts") + ":";
        
        this.box = new FrameBoxRow({ 
            selectable: false,
            activatable: false
        });
        this.box._grid.row_spacing = 10;

        this.layoutList = "";
        this.layout.forEach((style) => {
            this.layoutList += "•   " + _(style.name) + "\n";
        });

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(file, 75, 75);
        this._image = new Gtk.Image({ 
            hexpand: false,
            halign: Gtk.Align.START,
            pixbuf: pixbuf 
        });
        this.box._grid.attach(this._image, 0, 0, 1, 1);
        let styleLabel = new Gtk.Label({
            label: "<b>" + _(this.name) + " " + _("Menu Layouts") + "</b>",
            use_markup: true,
            hexpand: false,
            halign: Gtk.Align.START,
            wrap: true,
        })
        let descriptoinLabel = new Gtk.Label({
            label: _(layout.description),
            use_markup: true,
            hexpand: true,
            halign: Gtk.Align.START,
            wrap: true,
            xalign: 0
        })
        let iconImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
        })
        this.layoutButton = new Gtk.Button({
            label: _(this.name),
            image: iconImage,
            always_show_image: true,
            image_position: Gtk.PositionType.RIGHT,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            tooltip_text: _("Browse all") + " " + _(this.name)
        });
        this.box._grid.attach(this.layoutButton, 1, 0, 1, 1);

       
        this.infoButton = new InfoButton({
            tooltip_text: _(this.name) + " " + _("Information")
        });
        this.box._grid.attach(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), 0, 1, 2, 1);
        this.box._grid.attach(styleLabel, 0, 2, 1, 1);
        this.box._grid.attach(descriptoinLabel, 0, 3, 1, 1);
        
        this.add(this.box);
   }
});
