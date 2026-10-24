/** Configuration the browser needs. Every value here is sent to every visitor, so never add a secret. */
export interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey: string;
}
