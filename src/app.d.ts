// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}

    type OpenIdConnectLocals =
      import("$lib/server/openid_connect_handler").OpenIdConnectLocals
    type UserLocals = import("$lib/server/user_handler").UserLocals
    interface Locals extends UserLocals, OpenIdConnectLocals {
      id_token?: string
      sql: postgres.Sql<>
      user_id?: string
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
