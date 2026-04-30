declare global {
  interface Window {
    __env?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

export {};
