var mongoose = require("mongoose");
var objectId = mongoose.Schema.Types.ObjectId;

var schema = mongoose.Schema({
    name: String,
    isDeleted: { type: Boolean, default: false },
    emailAddress: String,
    isActivated: { type: Boolean, default: false },
    activationToken: String,
	salt: String,
	password: String,
	session: String,
	expiration: Date,
    
    project: { type: objectId, ref: "project" }
});

module.exports = require("bluebird").promisifyAll(mongoose.model("user", schema));