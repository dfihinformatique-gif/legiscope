import config from "$lib/server/config"
import postgres from "postgres"

let sql: ReturnType<typeof postgres> | null = null

export async function getDbPool() {
	if (!sql) {
		sql = postgres({
			host: config.db.host,
			database: config.db.database,
			port: config.db.port,
			username: config.db.username,
			password: config.db.password,
			max: 20,
			idle_timeout: 30,
			connection: {
				application_name: "legi-ui",
			},
		})
	}
	return sql
}

export async function closeDbPool() {
	if (sql) {
		await sql.end()
		sql = null
	}
}
