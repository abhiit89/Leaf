exports.table = "priorities";

exports.build = function(connection) {
	return connection.schema.createTable(exports.table, function (table) {
		table.increments("id");
		table.timestamps();
		table.boolean("isDeleted").notNullable().defaultTo(false);
		table.string("name").notNullable();
		table.integer("order").notNullable();
		table.string("colour").notNullable();

		table.integer("projectId").notNullable().references("projects.id");
	});
};