#!/usr/bin/python3
# coding=utf-8

from gi.repository import Gtk, Gdk, GdkPixbuf, Peas, GObject, RB
import os
import sys
import math


class TrayIcon(GObject.Object, Peas.Activatable):

    __gtype_name = 'TrayIcon'
    object = GObject.property(type=GObject.Object)

    rhythmbox_icon = os.path.join(sys.path[0], "tray_stopped.png")
    play_icon = os.path.join(sys.path[0], "tray_playing.png")
    menu = None

    def position_menu_cb(self, m, x, y=None, i=None):
        try:
            return Gtk.StatusIcon.position_menu(self.menu, x, y, self.icon)
        except (AttributeError, TypeError):
            return Gtk.StatusIcon.position_menu(self.menu, self.icon)

    def show_popup_menu(self, icon, button, time, data = None):
        """
        Called when the icon is right clicked, displays the menu
        """

        self.create_popup_menu()
        device = Gdk.Display.get_default().get_device_manager().get_client_pointer()
        self.menu.popup_for_device(device, None, None, self.position_menu_cb, self.icon, 3, time)

    def create_popup_menu(self):
        """
        Creates menu items for popup menu, including star rating
        """

        if not self.menu:
            self.set_menu_css()

        self.menu = Gtk.Menu()

        if self.playing:
            menuitem_playpause = Gtk.ImageMenuItem(_("Pause"))
            menuitem_playpause.set_image(Gtk.Image.new_from_icon_name("media-playback-pause-symbolic", Gtk.IconSize.MENU))
        else:
            menuitem_playpause = Gtk.ImageMenuItem(_("Play"))
            menuitem_playpause.set_image(Gtk.Image.new_from_icon_name("media-playback-start-symbolic", Gtk.IconSize.MENU))
        menuitem_next = Gtk.ImageMenuItem(_("Next"))
        menuitem_next.set_image(Gtk.Image.new_from_icon_name("media-skip-forward-symbolic", Gtk.IconSize.MENU))
        menuitem_prev = Gtk.ImageMenuItem(_("Previous"))
        menuitem_prev.set_image(Gtk.Image.new_from_icon_name("media-skip-backward-symbolic", Gtk.IconSize.MENU))
        menuitem_quit = Gtk.ImageMenuItem(_("Close"))
        menuitem_quit.set_image(Gtk.Image.new_from_icon_name("window-close-symbolic", Gtk.IconSize.MENU))

        menuitem_star = self.get_rating_menuitem()
        if menuitem_star:
           self.menu.append(menuitem_star)

        menuitem_playpause.connect("activate", self.play)
        menuitem_next.connect("activate", self.next)
        menuitem_prev.connect("activate", self.previous)
        menuitem_quit.connect("activate", self.quit)

        self.menu.append(menuitem_playpause)
        self.menu.append(menuitem_next)
        self.menu.append(menuitem_prev)
        self.menu.append(menuitem_quit)

        self.menu.show_all()

    def set_menu_css(self):
        """
        Sets style for popup menu, hides hover background for stars
        """

        #Prevent background color when mouse hovers
        screen = Gdk.Screen.get_default()
        css_provider = Gtk.CssProvider()

        # This line breaks the plugin with Rhythmbox 3, so I've commented it out. Seems to have absolutely
        # no effect on the plugin.
    #    css_provider.load_from_data("GtkMenuItem { border:@bg_color; background:@bg_color; } GtkMenuItem:hover { background:@selected_bg_color; } GtkWidget{ border: @bg_color; } #starMenu:hover { color:@fg_color;background: @bg_color; -unico-inner-stroke-width: 0; }")

        context = Gtk.StyleContext()
        context.add_provider_for_screen(screen, css_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)


    def get_rating_menuitem(self):
        """
        Gets a Gtk.MenuItem with the current song's ratings in filled stars
        """

        menuitem_star = Gtk.MenuItem(self.get_stars_markup(0,5))
        self.star_value =  self.get_song_rating()
        label = menuitem_star.get_children()[0]
        label.set_markup(self.get_stars_markup(self.star_value,5))

        menuitem_star.set_name('starMenu')

        menuitem_star.connect("motion_notify_event", self.on_star_mouseover)
        menuitem_star.connect("button_press_event", self.on_star_click)
        menuitem_star.connect("leave_notify_event", self.on_star_mouseout)

        if self.star_value >= 0:
            return menuitem_star
        else:
            return None

    def get_song_rating(self):
        """
        Gets the current song's user rating from Rhythmbox.
        """
        current_entry = self.shell.props.shell_player.get_playing_entry()

        if current_entry:
            return int(current_entry.get_double(RB.RhythmDBPropType.RATING))
        else:
            return -1

    def on_star_click(self, widget, event):
        """
        Method called when stars are clicked on. Determines chosen stars and sets song rating.
        """
        label = widget.get_children()[0]
        self.star_value = self.get_chosen_stars(label, event.x)
        self.set_song_rating(self.star_value)

    def set_song_rating(self, rating):
        """
        Sets the current song rating in Rhythmbox.
        """
        current_entry = self.shell.props.shell_player.get_playing_entry()
        self.db.entry_set(current_entry, RB.RhythmDBPropType.RATING, rating)


    def get_chosen_stars(self, label, mouseX):
        """
        Calculates the number of chosen stars to show based on the mouse's X position
        """
        star_width = int(label.get_layout().get_pixel_size()[0]/5)
        chosen = math.ceil((mouseX-label.get_layout_offsets()[0])/star_width)
        if chosen <= 0:
            chosen = 0

        if chosen >= 5:
            chosen = 5

        return chosen

    def on_star_mouseout(self, widget, event):
        """
        Method called when mouse leaves the rating stars. Resets stars to original value.
        """
        label = widget.get_children()[0]
        label.set_markup(self.get_stars_markup(self.star_value, 5))


    def on_star_mouseover(self, widget, event):
        """
        Method called when mouse hovers over the rating stars. Shows filled stars as mouse hovers.
        """
        label = widget.get_children()[0]
        label.set_markup(self.get_stars_markup(self.get_chosen_stars(label,event.x), 5))

    def get_stars_markup(self, filled_stars, total_stars):
        """
        Gets the Pango Markup for the star rating label
        """

        if filled_stars is None or filled_stars <= 0:
                    filled_stars = 0

        if filled_stars >= total_stars:
            filled_stars = total_stars

        filled_stars = int(math.ceil(filled_stars))
        total_stars = int(total_stars)

        starString = '★' * filled_stars + '☆' * (total_stars-filled_stars)
        return "<span size='x-large' foreground='#000000'>" + starString + "</span>"

    def toggle_player_visibility(self, icon, event, data = None):
        """
        Toggles visibility of Rhythmbox player
        """
        if event.button == 1: # left button
            if self.wind.get_visible():
                self.wind.hide()
            else:
                self.wind.show()
                self.wind.present()
        elif event.button == 2: # middle button
            self.player.do_next()

    def play(self, widget):
        """
        Starts playing
        """
        try:
            self.player.playpause() # does nothing argument
        except:
            # Rhythmbox 3.3 support
            self.player.playpause(True)

    def next(self, widget):
        """
        Goes to next song
        """
        self.player.do_next()

    def previous(self, widget):
        """
        Goes to previous song
        """
        self.player.do_previous()

    def quit(self, widget):
        """
        Exits Rhythmbox
        """
        self.shell.quit()

    def hide_on_delete(self, widget, event):
        self.wind.hide()
        return True # don't actually delete

    def on_playing_changed(self, player, playing):
        """
        Sets icon and tooltip when playing status changes
        """

        self.playing = playing

        if playing:
            self.icon.set_from_file(self.play_icon)
            current_entry = self.shell.props.shell_player.get_playing_entry()
            self.set_tooltip_text("%s\n%s" % (current_entry.get_string(RB.RhythmDBPropType.ARTIST), current_entry.get_string(RB.RhythmDBPropType.TITLE)))
        else:
            self.icon.set_from_file(self.rhythmbox_icon)
            self.set_tooltip_text("Rhythmbox")

    def set_tooltip_text(self, message=""):
        """
        Sets tooltip to given message
        """
        self.icon.set_tooltip_text(message)

    def do_activate(self):
        """
        Called when the plugin is activated
        """
        self.shell = self.object
        self.wind = self.shell.get_property("window")
        self.player = self.shell.props.shell_player
        self.db = self.shell.props.db
        self.playing = False

        self.wind.connect("delete-event", self.hide_on_delete)
        self.create_popup_menu()

        self.icon =  Gtk.StatusIcon()
        self.icon.set_from_file(self.rhythmbox_icon)
        self.icon.connect("scroll-event", self.on_scroll)
        self.icon.connect("popup-menu", self.show_popup_menu)
        self.icon.connect("button-press-event", self.toggle_player_visibility)
        self.player.connect("playing-changed", self.on_playing_changed)

        self.set_tooltip_text("Rhythmbox")

    def on_scroll(self, widget, event):
        """
        Lowers or raises Rhythmbox's volume
        """
        vol = round(self.player.get_volume()[1],1)

        if event.direction == Gdk.ScrollDirection.UP:
            vol+=0.1
        elif event.direction == Gdk.ScrollDirection.DOWN:
            vol-=0.1

        if vol <= 0:
            vol = 0

        if vol >=1:
            vol = 1

        self.player.set_volume(vol)


    def do_deactivate(self):
        """
        Called when plugin is deactivated
        """
        self.icon.set_visible(False)
        del self.icon
