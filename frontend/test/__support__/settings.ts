import MetabaseSettings from "metabase/lib/settings";
import type { EnterpriseSettings, Settings } from "metabase-types/api";
import { createMockSettings } from "metabase-types/api/mocks";
import { createMockSettingsState } from "metabase-types/store/mocks";

/**
 * This function mocks the settings also in MetabaseSettings,
 * without that, you'll get the annoying "Unknown premium feature xxx" warning.
 */
export function mockSettings(
  params: Partial<Settings | EnterpriseSettings> = {},
) {
  const settings = createMockSettings(params);
  const state = createMockSettingsState(settings);

  MetabaseSettings.setAll(settings);

  return state;
}
