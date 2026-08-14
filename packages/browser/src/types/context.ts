export type DeviceType = 'Mobile' | 'Tablet' | 'Desktop';

export type CampaignParam =
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content';

export type CampaignProperties = Partial<Record<CampaignParam, string>>;

export type WebContextProperties = CampaignProperties & {
  $current_url?: string;
  $pathname?: string;
  $referrer?: string;
  $referring_domain?: string;
  $screen_width?: number;
  $screen_height?: number;
  $viewport_width?: number;
  $viewport_height?: number;
  $device_type?: DeviceType;
  $browser_language?: string;
  $timezone?: string;
};
