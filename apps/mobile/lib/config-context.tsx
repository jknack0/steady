import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { AppState } from "react-native";
import { api } from "./api";

interface ClientConfig {
  enabledModules: string[];
  activeTrackers: Array<{ id: string; name: string }>;
  activeAssessments: Array<{ instrumentId: string; frequency: string; nextDue?: string }>;
  activeMedications: Array<{ name: string; dosage: string; frequency: string }>;
  branding: {
    color: string | null;
    practiceName: string | null;
    logoUrl: string | null;
  };
}

const DEFAULT_CONFIG: ClientConfig = {
  enabledModules: ["daily_tracker", "homework", "journal", "assessments", "strategy_cards", "todo_list", "calendar", "program_modules"],
  activeTrackers: [],
  activeAssessments: [],
  activeMedications: [],
  branding: { color: null, practiceName: null, logoUrl: null },
};

interface ConfigContextType {
  config: ClientConfig;
  isLoading: boolean;
  isModuleEnabled: (moduleId: string) => boolean;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: DEFAULT_CONFIG,
  isLoading: true,
  isModuleEnabled: () => true,
  refresh: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getMyConfig();
      if (res.success && res.data) {
        setConfig(res.data as ClientConfig);
      }
    } catch {
      // Offline mode — keep current config (falls back to DEFAULT_CONFIG on first load)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const isModuleEnabled = useCallback(
    (moduleId: string) => config.enabledModules.includes(moduleId),
    [config.enabledModules]
  );

  return (
    <ConfigContext.Provider value={{ config, isLoading, isModuleEnabled, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
