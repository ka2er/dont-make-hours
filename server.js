var nconf = require("nconf"),
	async = require("async"),
	http = require("http"),
	etemp = require("./etemp.js"),
	time = require("./time.js");



function loadConfig() {
	o_conf = {};

	nconf.file('config.json');

	var t_conf_k = ['user', 'password', 'url', 'server', 'port'];
	for(var i in t_conf_k) {
		var param = nconf.get(t_conf_k[i]);
		if(param == undefined) {
			return new Error('please define param '+t_conf_k[i]+' in config file');
		}
		o_conf[t_conf_k[i]] = param;
	}
	return o_conf;
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
			var html = "Today work time (max = 10) : " + worked + "<br/>";

			var week_min = res.today.wip + time.timeToMin(res.badging_current['today']);
			var week = time.minToTime(week_min);
			//console.log("Instant week cmpt (abs, max = 64) : " + week);
			html += "Instant week cmpt (abs, max = 64) : " + week + "<br/>";

			var extra_week_min = week_min - time.timeToMin(res.badging_previous[7]);
			var extra_week = time.minToTime(extra_week_min);
			//console.log("Week extra hours (rel, max = 5) : " + extra_week +" --- "+ res.badging_previous[7] +"=>"+week);
			html += "Week extra hours (rel, max = 5) : " + extra_week +" --- "+ res.badging_previous[7] +"=>"+week + "<br/>";

			var rtt = Math.floor(week_min / (7*60));
			//console.log("Rtt possible : "+rtt);
			html += "Rtt possible : "+rtt + "<br/>";

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(html);
		}
	);

}).listen(9999);