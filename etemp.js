/**
 * Created with JetBrains WebStorm.
 * User: seb
 * Date: 26/09/12
 * Time: 12:01
 * To change this template use File | Settings | File Templates.
 */

var req = require("request"),
	async = require("async"),
	$ = require("jquery");


/**
 * pad any integer width 0 (2 digits padding)
 * @param i
 * @return {*}
 */
function zeroLeftPad(i) {
	if (i.toString().length == 1) i = '0'+i;
	return i;
}

/**
 * ignore H M S mS i date
 * @param date
 * @return {Date}
 */
function ignoreTime(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()); // ignore hours/min/sec/msec
}


function get(url, server, port) {
	return new Etemp(url, server, port);
}

exports.get = get;

function Etemp(url, server, port){
	this.url = url;
	this.server = server;
	this.port = port;

	this.pid = null;
	this.frame = null;
	this.user = null;
	this.loggued = false;

	this.refresh_rate = 0;
	this.refresh_date = false;


	this.h_week_data = {}; // raw week data
}


Etemp.prototype.login = function(user, password, callback) {

	this.refresh();

	// return if already loggued
	if(this.loggued) {
		callback();
		return;
	}

	self = this;

	async.series({
		home_load : function(callback) {
			self.get('/webquartz/auth/auth.do', function(e, r, b){
				self.pid = $(b).find('form').attr('action').split('=')[1];
				console.log("PID found :"+self.pid);
				callback(null, self.pid);
			});
		},
		auth : function(callback) {
			var auth_data = {
				'USERID' : user,
				'PASSWORD': password,
				'DECALHOR': '-120',
				'Connexion' : 'Connexion',
				'newpass' : 'false',
				'useruser' : 'false',
				'forceSession' : 'false',
				'downloadmsgs' : 'true'
			};

			self.post('/webquartz/auth/auth.do?pid='+self.pid, {form : auth_data}, function(e, r, b){
				self.frame = $(b).find('frame:eq(1)').attr('src');
				console.log("frame found : "+self.frame);
				callback(null, self.frame);
			});
		},
		frame_load : function(callback) {
			self.get('/webquartz/auth/'+self.frame, function(e, r, b){
				var rePattern = new RegExp(/^user="(.*)"$/m);
				self.user = b.match(rePattern)[1];
				console.log("JS user found : "+self.user);
				callback(null, self.user);
			});
		},
		loggued : function(callback) {
			self.loggued = true;
			callback(null, "Loggued")
		}

	}, function(err, result) {
		if(!err) callback(); // main callback
	});
};

/**
 * week hours
 *
 * @param date
 * @param callback(err, res)
 */
Etemp.prototype.getWeekHours = function(date, callback) {

	// RAZ date
	date = ignoreTime(date); // RAZ

	self.getWeekData(date, function(data) {
		var h_badge = {};
		var buf = data.raw.split('DATA/C20/7')[2];
		buf = buf.split('DATA/C20/8')[0];
		$.each(buf.split('!')[1].split(']'), function(i, e){
			if(i >= 7) return false;
			t = e.split(';');
			if(+date == +data.first_day+i*1000*60*60*24) {
				h_badge['today'] = t[t.length - 2];
			}
			h_badge[i+1] = t[t.length - 2];
		});
		callback(null, h_badge);
	});
};

/**
 * compute total worked hour today and send them to callback
 * @param callback(err, res)
 */
Etemp.prototype.getTodayWorkTime = function(callback) {


	date = ignoreTime(new Date()); // RAZ

	self.getWeekData(date, function(data) {

		// get today offset vs first week day
		var i_today = (date - data.first_day) / (86400*1000);
		var buf = data.raw.split('DATA/C20/3')[2];
		buf = buf.split('DATA/C20/4')[0].split('!')[1].split(']');
		t1 = buf[i_today*2].split(';');
		t2 = buf[i_today*2+1].split(';');
		var x = t1[t1.length - 3];
		if(t2[t2.length - 3]) x += '-'+ t2[t2.length - 3];

		// process data
		var now = new Date();
		var t = x.split('-');
		t.push(now.getHours()+"."+now.getMinutes()); // add now

		t.reverse();
		var old_time = 0, total_time = 0, wip_time = 0;

		$.each(t, function(i, e) {
			var t_time =  $.trim(e).split('.');
			now.setHours(t_time[0], t_time[1]); // now is iter time

			if(i % 2 == 1) {
				total_time += old_time - +now;
				if(wip_time == 0) wip_time = total_time; // more recent period (ie not finished)
			}
			old_time = +now;
		});

		callback(null, {
			total : total_time / (1000*60),
			wip : wip_time / (1000*60)
		}); // msec => minutes
	});
};


/**
 * send raw week data (self.h_week_data) to callback
 * @param date
 */
Etemp.prototype.getWeekData = function(date, callback) {

	date = ignoreTime(date); // RAZ

	if(self.h_week_data[+date]) {
		callback(self.h_week_data[+date]);
		return;
	}

	self.cmd('<req user="'+self.user+'" name="HR/HEB" action="GET"></req>', function(e, r, b) {
		var today = zeroLeftPad(date.getDate())+'/'+zeroLeftPad(date.getMonth()+1)+'/'+date.getFullYear();
		self.cmd('<req user="'+self.user+'" name="HR/HEB" function="CHXDAT" action="CHOICE"><param name="DATE" value="'+today+'"/></req>', function(e, r, b){
			var t_date = $(b).find('field[name="DATE"]').attr('value').split('/');
			var first_day = new Date(t_date[2], t_date[1]-1, t_date[0]);
			console.log("1st day of week is :"+first_day.toDateString());

			// do the search refresh hit
			self.cmd('<req user="'+self.user+'" name="HR/HEB" action="SEARCH"><param name="DATA/C20" value=""></param></req>', function(e, r, b){
				self.h_week_data[+date] = {raw: b, first_day: first_day};

				callback(self.h_week_data[+date]);
			});
		});
	});
};

Etemp.prototype.setRefreshRate = function(min) {
	this.refresh_rate = min * 60;
	var now = new Date();
	this.refresh_date = +now;
};

Etemp.prototype.refresh = function() {
	var now = new Date();

	if((+now - this.refresh_date)/1000 > this.refresh_rate ) {
		this.h_week_data = {};
		this.refresh_date = +now;
		this.loggued = false;
	}
};

/** low level */


Etemp.prototype.cmd = function(cmd, callback) {
	self.post(
		'/webquartz/net/js.do?server='+self.server+'&port='+self.port+'&pid='+self.pid,
		{
			body : cmd,
			headers : { "Content-Type" : "text/xml" }
		},
		callback
	);
};

Etemp.prototype.get = function(service, callback) {
	req.get(self.url+service, callback);
};

Etemp.prototype.post = function(service, post_data, callback) {
	req.post(self.url+service, post_data, callback);
};