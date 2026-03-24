export interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  borderRadius: number;
  hasNotch: boolean;
  hasDynamicIsland: boolean;
}

export const DEVICES: Record<string, DeviceConfig> = {
  "iphone-15": {
    name: "iPhone 15",
    width: 393,
    height: 852,
    borderRadius: 47,
    hasNotch: false,
    hasDynamicIsland: true,
  },
  "iphone-se": {
    name: "iPhone SE",
    width: 375,
    height: 667,
    borderRadius: 38,
    hasNotch: false,
    hasDynamicIsland: false,
  },
};

export type DeviceId = keyof typeof DEVICES;
