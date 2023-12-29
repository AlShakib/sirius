'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GObject from 'gi://GObject';

export default class windowIsReadyRemover {
    enable() {
        this.blockSignal('window-demands-attention');
        this.blockSignal('window-marked-urgent');
    }

    disable() {
        this.unblockSignal('window-demands-attention');
        this.unblockSignal('window-marked-urgent');
    }

    blockSignal(id) {
        let signalId = GObject.signal_handler_find(global.display, { signalId: id });
        GObject.signal_handler_block(global.display, signalId);
    }

    unblockSignal(id){
        let signalId = GObject.signal_handler_find(global.display, { signalId: id });
        GObject.signal_handler_unblock(global.display, signalId);
    }
}
