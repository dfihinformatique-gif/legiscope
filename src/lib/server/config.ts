import "dotenv/config"
import { z } from "zod"

const DatabaseSchema = z.object({
	host: z.string({
		required_error:
			"PG_HOST is required in .env - Modify .env and reload server",
		invalid_type_error:
			"PG_HOST must be a string in .env - Modify .env and reload server",
	}),
	database: z.string({
		required_error:
			"PG_DATABASE is required in .env - Modify .env and reload server",
		invalid_type_error:
			"PG_DATABASE must be a string in .env - Modify .env and reload server",
	}),
	port: z.number({
		required_error:
			"PG_PORT is required in .env - Modify .env and reload server",
		invalid_type_error:
			"PG_PORT must be a number in .env - Modify .env and reload server",
	}),
	username: z.string({
		required_error:
			"PG_USERNAME is required in .env - Modify .env and reload server",
		invalid_type_error:
			"PG_USERNAME must be a string in .env - Modify .env and reload server",
	}),
	password: z.string({
		required_error:
			"PG_PASSWORD is required in .env - Modify .env and reload server",
		invalid_type_error:
			"PG_PASSWORD must be a string in .env - Modify .env and reload server",
	}),
})

const ConfigSchema = z.object({
	db: DatabaseSchema,
	verbose: z.boolean().default(false),
})

const config = ConfigSchema.parse({
	db: {
		host: process.env["PG_HOST"],
		database: process.env["PG_DATABASE"],
		port: Number(process.env["PG_PORT"]),
		username: process.env["PG_USERNAME"],
		password: process.env["PG_PASSWORD"],
	},
})

export default config
