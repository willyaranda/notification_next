/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

exports.loglevels = {
    // Log levels bitwise
    NONE: 0,
    CRITICAL: 1,
    DEBUG: 2,
    INFO: 4,
    ERROR: 8,
    NOTIFY: 16,
    ALERT: 32,
    ALARM: 64
};

exports.connectionstate = {
    DISCONNECTED: 0,
    CONNECTED: 1,
    UDP: 2,
    WAPPUSH: 3
};

exports.statuscodes = {
    OK: 200,
    REGISTERED: 200,
    REGISTERED_UDP: 201,
    REGISTERED_WAPPUSH: 202,
    UNREGISTERED: 220
};