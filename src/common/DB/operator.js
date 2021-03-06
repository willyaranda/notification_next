'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var operatorSchema = new Schema({
    _id: String,
    country: String,
    operator: String,
    mcc: Number,
    mnc: Number,
    wakeup: String
});
mongoose.model('operator', operatorSchema);

var operator = mongoose.model('operator');
var helpers = require('../Helpers/Helpers.js');

exports.getByMccMnc = function (mcc, mnc, callback) {
    var id = helpers.padNumber(mcc, 3) + '-' + helpers.padNumber(mnc, 2);
    operator.findById(id, function (error, operator) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, operator);
    });
};
