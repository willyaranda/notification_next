/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var publicBaseURL = require('../config.js').consts.publicBaseURL;
var Cryptography = require('./Cryptography.js');
var exec = require('child_process').exec;


function getNotificationURL(apptoken) {
    return publicBaseURL + '/notify/' + apptoken;
}
exports.getNotificationURL = getNotificationURL;


function getAppToken(watoken, pbkbase64) {
    return Cryptography.hashSHA256(watoken + pbkbase64);
}
exports.getAppToken = getAppToken;


function padNumber(number, len) {
    var str = '' + number;
    while (str.length < len) {
        str = '0' + str;
    }
    return str;
}
exports.padNumber = padNumber;


function checkCallback(callback) {
    if (typeof callback !== 'function') {
        callback = function () {};
    }
    return callback;
}
exports.checkCallback = checkCallback;


function getMaxFileDescriptors(cb) {
    exec('ulimit -n', function (error, stdout) {
        cb(error, stdout);
    });
}
exports.getMaxFileDescriptors = getMaxFileDescriptors;


function isVersion(n) {
    return !isNaN(parseInt(n, 10)) && isFinite(n) &&
        (n < 9007199254740992) && (n >= 0) && (n % 1 === 0);
}
exports.isVersion = isVersion;


function getCaChannel() {
    var log = require('./Logger.js');
    var caDir = require('../config.js').consts.caDir;

    var cas = [];
    if (!caDir) {
        log.error(log.messages.ERROR_CASDIRECTORYUNDEFINED);
        return cas;
    }

    var path = require('path');
    var fs = require('fs');
    try {
        var files = fs.readdirSync(caDir);

        var i;
        var len = files.length;
        if (len === 0) {
            log.error(log.messages.ERROR_NOCADEFINED, {
                path: caDir
            });
            return cas;
        }

        for (i = 0; i < len; i++) {
            cas.push(fs.readFileSync(caDir + path.sep + files[i]));
        }
    } catch (e) {
        log.error(log.messages.ERROR_NOCADEFINED, {
            path: caDir
        });
    }

    return cas;
}
exports.getCaChannel = getCaChannel;

