/**
 * Created with JetBrains WebStorm.
 * User: seb
 * Date: 27/09/12
 * Time: 15:12
 * To change this template use File | Settings | File Templates.
 */

var $ = require('jquery');


timeToMin = function(time) {
	var t = $.trim(time).split('.');
	return t[0]*60 + +t[1];
};

minToTime = function(min) {
	var sign = min < 0 ? "-" : '';
	min = Math.abs(min);
	return sign+Math.floor(min / 60)+"h"+(min % 60);
};


//console.log(timeToMin(" 1.30"));

exports.timeToMin = timeToMin;
exports.minToTime = minToTime;