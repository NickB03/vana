import { useState, useCallback } from "react";
import { SPARKLE_DEFAULTS } from "@/components/ui/sparkle-background";

export type SparkleSettings = typeof SPARKLE_DEFAULTS;

export function useSparkleSettings(initialSettings = SPARKLE_DEFAULTS) {
  const [settings, setSettings] = useState<SparkleSettings>({...initialSettings});
  const [resetCounter, setResetCounter] = useState(0);

  const updateSetting = useCallback(<K extends keyof SparkleSettings>(
    key: K,
    value: SparkleSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettings({...SPARKLE_DEFAULTS});
    setResetCounter(prev => prev + 1); // Increment to trigger error boundary reset
  }, []);

  return { settings, updateSetting, reset, setSettings, resetCounter };
}
