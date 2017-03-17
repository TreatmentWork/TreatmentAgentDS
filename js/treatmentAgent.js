var express = require('express');
var bodyParser = require('body-parser');
var gpg = require('./gpgConfig.js');
var fs = require('fs');
var commonConfig = require(appRoot + '/config/commonConfig.json');
var gpgTAConfig = require(appRoot + '/config/gpgTAConfig.json');
var logger = require(appRoot + '/js/util/winstonConfig.js');
var resultCallback = require(appRoot + '/js/httpClient.js');

var app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.set('port', process.env.PORT || commonConfig.port);
app.set('host', process.env.HOST || '127.0.0.1');

app.post('/dSign/singlescan', function(req, res) {
	var requestId = req.body.requestId;
	var scanFile = req.body.scanFile;
	var vmName = req.body.vmName;
	var configData = req.body.configData;
	var reqIp = req.ip;
	logger.debug('DigitalSignature request received from IP:' + reqIp);
	logger.info(requestId + 'Starting verification of single files.');
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFile:' + scanFile);
	res.send('Treatment is being performed asynchrounously. Once treatment completes result will be sent back to Treatment Controller.');

	validateInput(scanFile, function (err, isValid) {
		var postData;
		if (err) {
			postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : {msg: err.message, error : err}};
			resultCallback.sendHttpRequest(postData, gpgTAConfig.endpoint, reqIp, gpgTAConfig.port);
		} else {
			var is_infected = gpg.scan_files(scanFile,  function(a, good_files, bad_files) {
					var finalBody = [];
					finalBody.push({msg: "Good files:" + good_files});
					finalBody.push({msg: "Bad files:" + bad_files});
					logger.info(requestId + 'Finished scan of single file.');
					postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : finalBody};
					resultCallback.sendHttpRequest(postData, gpgTAConfig.endpoint, reqIp, gpgTAConfig.port);
				 }, function(err, file, is_infected) {
					 	var intermediateBody = [];
						if(err) {
							intermediateBody.push({msg: err.message, error : err});
						} else {
							intermediateBody.push(is_infected);
						}
						postData = {"requestId" : requestId, "vmName": null, "configData": null, "result" : intermediateBody};
						resultCallback.sendHttpRequest(postData, gpgTAConfig.endpoint, reqIp, gpgTAConfig.port);
				}	);
		}
	});
});

app.post('/dSign/multiscan', function(req, res) {
	var requestId = req.body.requestId;
	var vmName = req.body.vmName;
	var configData = req.body.configData;
	var scanFiles = req.body.scanFiles;
	var reqIp = req.ip;
	var postData;
	logger.debug('DigitalSignature verification request received from IP:' + reqIp);
	logger.info(requestId + 'Starting scan of multiple files.');
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFiles:' + scanFiles);
	res.send('Treatment is being performed asynchrounously. Once treatment completes result will be sent back to Treatment Controller.');
	var is_infected = gpg.scan_files(scanFiles,  function(a, good_files, bad_files) {
			var finalBody = [];
			finalBody.push({msg: "Multiple scan files aggregated result..." });
			finalBody.push({msg: "Good files:" + good_files});
			finalBody.push({msg: "Bad files:" + bad_files});
			logger.info(requestId + 'Finished scan of multiple files.');
			postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : finalBody};
			resultCallback.sendHttpRequest(postData, gpgTAConfig.endpoint, reqIp, gpgTAConfig.port);
		 }, function(err, file, is_infected) {
			 	var intermediateBody = [];
				if(err) {
					intermediateBody.push({msg: err.message, error : err});
				} else {
					intermediateBody.push(is_infected);
				}
				postData = {"requestId" : requestId, "vmName": null, "configData": null, "result" : intermediateBody};
				resultCallback.sendHttpRequest(postData, gpgTAConfig.endpoint, reqIp, gpgTAConfig.port);
		}	);
	});



// Checking if supplied file path is valid
var validateInput = function  (file, callback) {
	fs.stat(file, function (err, stats){
    if (err) {
      logger.error(err);
			return callback(err);
    } else {
    	return callback(null, true);
		}
  });
};

var server = app.listen(app.get('port'), function (req, res){
  logger.info('Treatment Agent is listening on port ' + app.get('host') + ':' + app.get('port'));
});

// Never timeout as DigitalSignature scan could be very  long running process
server.timeout = 0;
