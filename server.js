var nconf = require("nconf"),
	async = require("async"),
	http = require("http"),
	etemp = require("./etemp.js"),
	time = require("./time.js");



function loadConfig() {
	o_conf = {};

	// retrieve home dir
	var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

	nconf.file(home+'/.dontmakehours.json');

	var t_conf_k = ['user', 'password', 'url', 'server', 'port'];
	for(var i in t_conf_k) {
		var param = nconf.get(t_conf_k[i]);
		if(param == undefined) {
			return new Error('please define param '+t_conf_k[i]+' in config file (~/.dontmakehours.json)');
		}
		o_conf[t_conf_k[i]] = param;
	}
	return o_conf;
}

function green(str) {
	return '<span style="color:green">'+str+'</span>';
}

function red(str) {
	return '<span style="color:red">'+str+'</span>';
}

// 1 - init config
var o_conf = loadConfig();
if ( o_conf instanceof Error ) {
	// handle the error
	console.log(o_conf);
	process.exit();
}
console.log('init conf done');


et = etemp.get(o_conf.url, o_conf.server, o_conf.port);
et.setRefreshRate(60);

// Create an HTTP server
http.createServer(function (req, response) {
	console.log("***** Hit received *****");
	async.series(
		{
			log: function(callback) {
				et.login(o_conf.user,  o_conf.password, callback);
			},
			badging_current: function(callback) {
				et.getWeekHours(new Date(), callback);
			},
			badging_previous: function(callback) {
				var d = new Date();
				d.setDate(d.getDate() - 7); // lastweek
				et.getWeekHours(d, callback);
			},
			today: function(callback) {
				et.getTodayWorkTime(callback);
			}
		},
		function(err, res) {

			var worked = time.minToTime(res.today.total);
			//console.log("Today work time (max = 10) : " + worked);
			worked = res.today.total > 60*10 ? red(worked) : green(worked);
			var html = "Today work time (max = 10) : " + worked + "<br/>";

			var week_min = res.today.wip + time.timeToMin(res.badging_current['today']);
			var week = time.minToTime(week_min);
			week = week_min > 64*60 ? red(week) : green(week);
			//console.log("Instant week cmpt (abs, max = 64) : " + week);
			html += "Instant week cmpt (abs, max = 64) : " + week + "<br/>";

			var extra_week_min = week_min - time.timeToMin(res.badging_previous[7]);
			var extra_week = time.minToTime(extra_week_min);
			extra_week = extra_week_min > 5*60 ? red(extra_week) : green(extra_week);
			//console.log("Week extra hours (rel, max = 5) : " + extra_week +" --- "+ res.badging_previous[7] +"=>"+week);
			html += "Week extra hours (rel, max = 5) : " + extra_week +" --- "+ res.badging_previous[7] +"=>"+week + "<br/>";

			var rtt = Math.floor(week_min / (7*60));
			//console.log("Rtt possible : "+rtt);
			rtt = rtt > 0 ? green(rtt) : red(rtt);
			html += "Rtt possible : "+rtt + "<br/>";

			if(res.today.total > 10*60 || extra_week_min > 5*60 || week_min > 64*60 ) {
				html += "<b style='color:green;'>GO GO GO GO !!</b><br/>";
			} else {
				// 8 hours by day
				var now = new Date();
				var mins = 8*60-res.today.total;
				var ttl_date = time.minToTime(mins);
				now.setMinutes(now.getMinutes()+mins);
				var ttl = now.getFullYear()+'_'+etemp.zeroLeftPad(now.getMonth()+1)+'_'+etemp.zeroLeftPad(now.getDate())+'_'+etemp.zeroLeftPad(now.getHours())+'_'+etemp.zeroLeftPad(now.getMinutes());
				ttl_date = mins > 8*60 ? red(ttl_date) : green(ttl_date);
				html += "Today remaining time (8H): <span>"+ttl_date+"</span><br />";
				html += '<iframe src="http://www.countdownr.com/external.html?logo=clock.png&amp;alert=gong.mp3&amp;time='+ttl+'&amp;title=Go%20Home&amp;repeat=0&amp;url=&amp;background=transparent" frameborder="0" width="320" height="130" scrolling="no"><a href="http://www.countdownr.com">Countdownr</a></iframe>';
			}

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(html);
		}
	);

}).listen(9999);
