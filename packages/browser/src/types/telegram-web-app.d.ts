declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        platform?: string;
        version?: string;
        colorScheme?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          start_param?: string;
        };
      };
    };
  }
}

export {};
