export interface TargetHardwareProfile {
  readonly id: string;
  readonly label: string;
  readonly designationSource: 'user-designated';
  readonly cpuModel: string;
  readonly physicalCoreCount: number;
  readonly logicalProcessorCount: number;
  readonly osReportedPhysicalMemoryGiB: number;
  readonly gpuModel: string;
  readonly gpuKind: 'integrated';
  readonly reportedGpuAdapterMemoryGiB: number;
  readonly gpuMemoryNote: string;
  readonly operatingSystem: string;
  readonly operatingSystemVersion: string;
  readonly operatingSystemBuild: string;
  readonly confirmationDate: string;
}

export const TARGET_HARDWARE_PROFILE: TargetHardwareProfile = Object.freeze({
  id: 'shared-vscode-browser-host',
  label: 'Rechner hinter den geteilten VS-Code-Browserseiten',
  designationSource: 'user-designated',
  cpuModel: 'Intel Core i5-8250U @ 1.60GHz',
  physicalCoreCount: 4,
  logicalProcessorCount: 8,
  osReportedPhysicalMemoryGiB: 7.86,
  gpuModel: 'Intel UHD Graphics 620',
  gpuKind: 'integrated',
  reportedGpuAdapterMemoryGiB: 1,
  gpuMemoryNote:
    'CIM reports 1 GiB AdapterRAM; this is not confirmed dedicated VRAM.',
  operatingSystem: 'Windows 11 Pro',
  operatingSystemVersion: '10.0.26200',
  operatingSystemBuild: '26200',
  confirmationDate: '2026-10-24'
});

const TARGET_BROWSER_MARKERS = [
  'Windows NT 10.0',
  'Code-Insiders/1.144.0-insider',
  'Electron/43.7.7',
  'Chrome/150.0.7871.250'
];

export function matchesTargetHardware(
  userAgent: string,
  logicalProcessorCount: number
): boolean {
  return (
    logicalProcessorCount === TARGET_HARDWARE_PROFILE.logicalProcessorCount &&
    TARGET_BROWSER_MARKERS.every((marker) => userAgent.includes(marker))
  );
}
