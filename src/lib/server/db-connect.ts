import postgres from "postgres"

import config from "$lib/server/config"

export async function dbConnection() {
	try {
		const sql = postgres("postgres://username:password@host:port/database", {
			host: config.db.host,
			database: config.db.database,
			port: config.db.port,
			username: config.db.username,
			password: config.db.password,
			max: 10,
		})
		return sql
	} catch (error: unknown) {
		if (typeof error === "string") {
			console.log("An error occured while calling oracledb.createPool:\n", error)
		} else if (error instanceof Error) {
			console.log("An error occured while calling oracledb.createPool:\n", error.stack)
		}
		throw error
	}
}
