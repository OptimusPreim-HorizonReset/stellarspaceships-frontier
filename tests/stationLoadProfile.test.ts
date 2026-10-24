import { describe, expect, it } from 'vitest';
import {
  createSF192Stations,
  SF_192_PROFILE
} from '../src/benchmark/stationLoadProfile';

describe('SF-192 station load profile', () => {
  it('creates ten independent 10,000-tile stations', () => {
    const stations = createSF192Stations();

    expect(stations).toHaveLength(SF_192_PROFILE.stationCount);
    expect(
      stations.every(
        (station) =>
          station.construction.tileCount === SF_192_PROFILE.tilesPerStation
      )
    ).toBe(true);
    expect(
      stations.reduce(
        (total, station) => total + station.construction.tileCount,
        0
      )
    ).toBe(100_000);
    expect(
      stations.reduce(
        (total, station) => total + station.construction.chunkCount,
        0
      )
    ).toBe(160);
    expect(new Set(stations.map((station) => station.id)).size).toBe(10);
  });
});
