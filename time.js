var $ = require('jquery'),
	etemp = require('./etemp.js');


timeToMin = function(time) {
	var t = $.trim(time).split('.');
	return t[0]*60 + +t[1];
};

minToTime = function(min) {
	var sign = min < 0 ? "-" : '';
	min = Math.abs(min);
	return sign+Math.floor(min / 60)+"h"+etemp.zeroLeftPad(min % 60);
};


//console.log(timeToMin(" 1.30"));

exports.timeToMin = timeToMin;
exports.minToTime = minToTime;
