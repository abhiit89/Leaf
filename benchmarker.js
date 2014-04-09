var Promise = require("bluebird");

var data = { name: "the name", PartitionKey: "the partition key", details: "the details", description: "the description" };

var iterations = 1000;
//tableStorageInsertParallel(iterations); // 100 -> 12778ms
mongoInsertParallel(iterations); // 1000 -> 3297ms
//mongoInsert(iterations); // 1000 -> 80714ms
//tableStorageInsert(iterations); // 1000 -> 296619ms

function mongoInsertParallel(iterations) {
	var mongoose = require("mongoose");

	var model = Promise.promisifyAll(mongoose.model("retrieval-test-data", mongoose.Schema({
		identifier: Number,
		name: String,
		details: String,
		description: String,
		date: Date
	})));

	mongoose.connect("mongodb://chrisharrington:benchmarkstest@ds030827.mongolab.com:30827/MongoLab-1v", {
		server: {
			poolSize: 5,
			socketOptions: {
				keepAlive: 1
			}
		}
	});

	var connection = mongoose.connection;
	connection.on("error", function(error) { console.log("Error connecting to database: " + error); reject(error);	});
	connection.once("open", function() {
		console.log("Connection opened.");

		var creates = [];
		for (var i = 1; i <= iterations; i++) {
			data.identifier = i;
			creates.push(model.createAsync(data));
		}

		var date = Date.now();
		Promise.all(creates).then(function() {
			console.log("Mongo insert done. Time elapsed: " + (Date.now() - date) + "ms.");
		}).catch(function(e) {
			console.log("Error during parallel mongo insert: " + e);
		}).finally(function() {
//			model.remove(function(err) {
//				if (err)
//					console.log("Error removing all data: " + err);
//				else
//					console.log("Removed all data.");
//				mongoose.connection.close();
//			});
		});
	});
}

function tableStorageInsertParallel(iterations) {
	var tableName = "parallel5";
	var azure = require("azure");
	var tableService = azure.createTableService("benchmarks", "+WdwI49Q5MzerAaR0NQf8uEx3XjF8b7fdGjT+U/GRWCeg2jCPcm0vkYzSWzBXKs1HIK3QGSnTPNrp0g9kz+inA==");
	tableService.createTableIfNotExists(tableName, function(error) {
		if (error) {
			console.log("Error creating table: " + error);
			return;
		}

		var date = Date.now();
		var creates = [];
		for (var i = 1; i <= iterations; i++)
			creates.push(_create(i, data));
		Promise.all(creates).then(function() {
			console.log("Parallel table storage insert done. Time elapsed: " + (Date.now() - date) + "ms.");
		}).catch(function(e) {
			console.log("Error during parallel table storage insert: " + e);
		}).finally(function() {
			tableService.deleteTable(tableName, function(error) {
				if (error)
					console.log("Error deleting table: " + error);
				else
					console.log("Removed all data.");
			});
		});

		function _create(identifier, data) {
			return new Promise(function(resolve, reject) {
				data.RowKey = identifier.toString();
				tableService.insertEntity(tableName, data, function(error) {
					if (error)
						reject(error);
					else {
						console.log("Inserted data with identifier " + identifier + ".");
						resolve();
					}
				})
			});
		}
	});
}

function tableStorageInsert(iterations) {
	var tableName = "benchmarkstableretrievaltest";
	var azure = require("azure");
	var tableService = azure.createTableService("benchmarks", "+WdwI49Q5MzerAaR0NQf8uEx3XjF8b7fdGjT+U/GRWCeg2jCPcm0vkYzSWzBXKs1HIK3QGSnTPNrp0g9kz+inA==");
	tableService.createTableIfNotExists(tableName, function(error){
		if (error) {
			console.log("Error creating table: " + error);
			return;
		}

		var date = Date.now();
		_create(1, iterations, function() {
			console.log("Table storage insert done. Time elapsed: " + (Date.now() - date) + "ms.");
			tableService.deleteTable(tableName, function(error) {
				if (error)
					console.log("Error deleting table: " + error);
				else
					console.log("Removed all data.");
			});
		});

		function _create(identifier, max, done) {
			data.RowKey = identifier.toString();
			tableService.insertEntity(tableName, data, function(error) {
				if (error) {
					console.log("Error while inserting data: " + error);
				} else {
					console.log("Inserted data with identifier " + identifier + ".");
					if (identifier < max)
						_create(identifier + 1, max, done);
					else
						done();
				}
			});
		}

		var task = {
			PartitionKey : 'hometasks'
			, RowKey : '1'
			, Description : 'Take out the trash'
			, DueDate: new Date(2012, 6, 20)
		};
		tableService.insertEntity('mytable', task, function(error){
			if(!error){
				// Entity inserted
			}
		});
	});
}

function mongoInsert(iterations) {
	var mongoose = require("mongoose");

	var model = mongoose.model("retrieval-test-data", mongoose.Schema({
		identifier: Number,
		name: String,
		details: String,
		description: String,
		date: Date
	}));

	mongoose.connect("mongodb://chrisharrington:benchmarkstest@ds030827.mongolab.com:30827/MongoLab-1v", {
		server: {
			poolSize: 5,
			socketOptions: {
				keepAlive: 1
			}
		}
	});

	var connection = mongoose.connection;
	connection.on("error", function(error) { console.log("Error connecting to database: " + error); reject(error);	});
	connection.once("open", function() {
		console.log("Connection opened.");
		var date = Date.now();
		_create(1, iterations, function() {
			console.log("Mongo insert done. Time elapsed: " + (Date.now() - date) + "ms.");
//			model.remove(function(err) {
//				if (err)
//					console.log("Error removing all data: " + err);
//				else
//					console.log("Removed all data.");
//				mongoose.connection.close();
//			});
		});
	});

	function _create(identifier, max, done) {
		model.create(data, function(e) {
			if (e)
				console.log("Error: " + e);
			else {
				console.log("Inserted data with identifier " + identifier + ".");
				if (identifier < max)
					_create(identifier + 1, max, done);
				else
					done();
			}
		});
	}
}