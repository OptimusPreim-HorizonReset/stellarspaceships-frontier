import { describe, expect, it } from 'vitest';
import {
  matchesTargetHardware,
  TARGET_HARDWARE_PROFILE
} from '../src/benchmark/targetHardware';

const confirmedTargetUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'Code-Insiders/1.144.0-insider ' +
  'Chrome/150.0.7871.250 Electron/43.7.7';

describe('confirmed target hardware profile', () => {
  it('matches the user-designated shared VS Code browser host', () => {
    expect(matchesTargetHardware(confirmedTargetUserAgent, 8)).toBe(true);
    expect(TARGET_HARDWARE_PROFILE.physicalCoreCount).toBe(4);
    expect(TARGET_HARDWARE_PROFILE.logicalProcessorCount).toBe(8);
    expect(TARGET_HARDWARE_PROFILE.cpuModel).toContain('i5-8250U');
    expect(TARGET_HARDWARE_PROFILE.gpuModel).toContain('UHD Graphics 620');
    expect(TARGET_HARDWARE_PROFILE.operatingSystem).toBe('Windows 11 Pro');
  });

  it('does not confirm a different browser environment or CPU thread count', () => {
    expect(
      matchesTargetHardware(
        confirmedTargetUserAgent.replace('Chrome/150.0.7871.250', 'Chrome/151'),
        8
      )
    ).toBe(false);
    expect(matchesTargetHardware(confirmedTargetUserAgent, 16)).toBe(false);
  });
});
