/**
 * Usage: 
 * var logger = require('nodeutil').logger.getInstance();
 * or
 * var logger = require('nodeutil').logger.getInstance("log_name");
 * logger.debug('TEST...123');
 */
var fs = require('fs')
	, util = require('util')
	, callerId = require('caller-id')
	, _ = require('underscore')
	, isWriteFile = process.env.WRITE_FILE && process.env.WRITE_FILE == 'false' ? false : true
	, defaultPath = fs.existsSync('/tmp') ? '/tmp/node.log' : (__dirname + '/../../../node.log')
  , logFile = process.env.LOGPATH ? process.env.LOGPATH : defaultPath
  , logCategory = process.env.LOGCATG ? process.env.LOGCATG : 'default'
  , logLevel = process.env.LOGLEVEL ? process.env.LOGLEVEL : 'DEBUG'
  , logPattern = process.env.LOGPATTERN ? process.env.LOGPATTERN : '-yyyy-MM-dd.log'
  , logMaxSize = process.env.LOG_MAX_SIZE ? process.env.LOG_MAX_SIZE : 204800000
  , logBackup = process.env.LOG_BACKUP ? process.env.LOG_BACKUP : 7;

var log4js = require('log4js')
var appenderNames = [logCategory];
var defaultPattern = {
			"type": "dateFile",
			"filename": logFile,
			"pattern": logPattern,
			"alwaysIncludePattern": true,
      "level":"INFO"
		};

var appenders = [ { type: 'console' } ];

if(isWriteFile) {
	appenders.push(defaultPattern);
}

//Default appender
log4js.configure( { "appenders": appenders } );

exports.addAppender = addAppender;
function addAppender(catg, opts) {
  var categories = _.map(appenders, function(v) {
		if(v[catg]) {
			return v[catg];
		}
	});

  if(categories.indexOf(catg) < 0 || catg == logCategory) {
		if(!opts) opts = defaultPattern;
		opts['category'] = catg;
		if(catg == logCategory) { //remove default category for new insert
			appenders = _.filter(appenders, function(v) {
				if(v.category != logCategory) {
					return v;
				}
			});
		}	
		appenders.push(opts);
		log4js.configure( { "appenders": appenders } );
	}

	if (appenderNames.indexOf(catg) >= 0) {
		return log4js.getLogger(catg);
	} else {
	  appenderNames.push(catg);
	}

  var logger = log4js.getLogger(catg);	
	logger.setLevel(opts.level || process.env.LOGLEVEL || logLevel);
	logger.trace('Initial nodeutil log4js %s log for [%s] in path:%s', 
		opts.level || process.env.LOGLEVEL || logLevel, 
		catg, opts.filename);

	return logger;
}

exports.currentAppenders = function() {
	return appenders;
}

//Append other appender
exports.getInstance = getInstance;
function getInstance(catg, opts) {
	if (appenderNames.indexOf(catg) >= 0) {
		return log4js.getLogger(catg);
	} 
	if (!opts) opts = {}

	opts.type = opts['type'] || 'dateFile';
	opts.filename = opts['path'] || logFile;
	opts.category = catg || logCategory;
	opts.level = opts.level || logLevel;
	opts.logPattern = opts.pattern || logPattern;
	opts.alwaysIncludePattern = opts.alwaysIncludePattern || true;
	return addAppender(catg, opts);
}


