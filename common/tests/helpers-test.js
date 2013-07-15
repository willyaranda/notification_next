/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */
'use strict';

var vows = require('vows'), assert = require('assert');

var Helpers = require('../Helpers.js');

vows.describe('Helpers tests').addBatch({
    'getAppToken "hola" - "hola"': {
        topic: Helpers.getAppToken('hola', 'hola'),
        'we have a valid appToken': function (appToken) {
            assert.equal('5819b005d5c142ae151889bcbe0872bbbdbeecc26c4785a48e65b04abd7a6926', appToken);
        }
    },
    'getAppToken "hola" - "hola2"': {
        topic: Helpers.getAppToken('hola', 'hola2'),
        'we have a valid appToken': function (appToken) {
            assert.equal('5fa45098ca43c9cbf377a2682062aedb3ba2cde1dabb4a956d9c67b281aab3fe', appToken);
        }
    },
    'getAppToken "hola2" - "hola"': {
        topic: Helpers.getAppToken('hola2', 'hola'),
        'we have a valid appToken': function (appToken) {
            assert.equal('e0ec933047a6e724df1f8af9d92b00e42c825000f43da7560ad3c578c9b0ea3d', appToken);
        }
    },
    'getAppToken "hola2" - "hola2"': {
        topic: Helpers.getAppToken('hola2', 'hola2'),
        'we have a valid appToken': function (appToken) {
            assert.equal('0c5919c1c33a48e290f0892b0fc31ce9d1a6ccfbae989f1e78ef7aba769c6f99', appToken);
        }
    },
}).addBatch({
    'padNumber 3 with 3 digits': {
        topic: Helpers.padNumber('3', 3),
        'we have a padded number': function (padded) {
            assert.equal('003', padded);
        },
        'is String': function (padded) {
            assert.isString(padded);
        }
    },
    'padNumber 20 with 4 digits': {
        topic: Helpers.padNumber('20', 4),
        'we have a padded number': function (padded) {
            assert.equal('0020', padded);
        },
        'is String': function (padded) {
            assert.isString(padded);
        }
    },
    'padNumber 0 with 20 digits': {
        topic: Helpers.padNumber('0', 20),
        'we have a padded number': function (padded) {
            assert.equal('00000000000000000000', padded);
        },
        'is String': function (padded) {
            assert.isString(padded);
        }
    },
    'padNumber 3333 with 3 digits': {
        topic: Helpers.padNumber('3333', 3),
        'we have a padded number': function (padded) {
            assert.equal('3333', padded);
        },
        'is String': function (padded) {
            assert.isString(padded);
        }
    }/*
}).addBatch({
    'checkCallback(function)': {
        topic: Helpers.checkCallback(3),
        'we have a function': function (funct) {
            assert.isFunction(funct);
        }
    },
    'checkCallback(string)': {
        topic: Helpers.checkCallback('hola'),
        'we have a function': function (funct) {
            assert.isFunction(funct);
        }
    }*/
}).export(module); // Export the Suite