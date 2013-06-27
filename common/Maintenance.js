/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var log = require('./Logger.js');

function Maintenance() {
    this.onmaintenance = false;
}

Maintenance.prototype.active = function () {
    log.debug('Setting under Maintenance');
    this.onmaintenance = true;
};

Maintenance.prototype.inactive = function () {
    log.debug('Removing under Maintenance');
    this.onmaintenance = false;
};

Maintenance.prototype.getStatus = function () {
    return this.onmaintenance;
};

///////////////////////////////////////////
// Singleton
///////////////////////////////////////////
var _maintenance = new Maintenance();
function getMaintenance() {
    return _maintenance;
}

///////////////////////////////////////////
// Manage onmaintenance status with signals
///////////////////////////////////////////
process.on('SIGUSR1', function () {
    getMaintenance().active();
});
process.on('SIGUSR2', function () {
    getMaintenance().inactive();
});

module.exports = getMaintenance();
