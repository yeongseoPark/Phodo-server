var util = require('util')
	, callerId = require('caller-id')
  , log = null;

//exports.getInstance = function() {
	if(!log) log = require('./logger').getInstance();

	['Trace','Debug','Info','Warn','Error','Fatal'].forEach(function(levelString) {
		exports[levelString.toLowerCase()] = function() {
			var _name = formatCallerId(callerId.getData());
			var msg = util.format.apply(this, arguments);
			log[levelString.toLowerCase()]('%s %s', _name, msg );
		}
	});
//}

/**
 * Format caller id for print
 **/
function formatCallerId(w) {
	return util.format('[%s - %s]', 
			w.filePath.split('/')[w.filePath.split('/').length-1], 
			w.functionName || 'this');
}

exports.setLevel = function(level){
  log.setLevel(level);
}
