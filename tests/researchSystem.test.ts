import { describe, expect, it } from 'vitest';
import {
  ResearchProjectRegistry,
  ResearchSystem
} from '../src/research/researchSystem';

const projects = new ResearchProjectRegistry([
  { id: 'laser', researchPointCost: 10, durationSeconds: 5 },
  { id: 'scanner', researchPointCost: 5, durationSeconds: 2 }
]);

describe('research system', () => {
  it('requires research points, tracks progress, and completes one project', () => {
    const system = new ResearchSystem(projects);

    expect(system.startResearch('laser')).toEqual({
      status: 'insufficient-points',
      projectId: 'laser',
      requiredPoints: 10,
      availablePoints: 0
    });
    expect(system.researchPoints).toBe(0);

    system.addResearchPoints(12);
    expect(system.startResearch('laser')).toEqual({
      status: 'started',
      projectId: 'laser',
      remainingResearchPoints: 2
    });
    expect(system.startResearch('scanner')).toEqual({
      status: 'already-researching',
      projectId: 'scanner',
      activeProjectId: 'laser'
    });
    expect(system.advance(2)).toEqual({
      status: 'in-progress',
      projectId: 'laser',
      elapsedSeconds: 2,
      remainingSeconds: 3,
      completedProjectIds: []
    });
    expect(system.advance(4)).toEqual({
      status: 'completed',
      projectId: 'laser',
      overflowSeconds: 1,
      completedProjectIds: ['laser']
    });
    expect(system.startResearch('laser')).toEqual({
      status: 'already-completed',
      projectId: 'laser'
    });
    expect(system.researchPoints).toBe(2);
  });

  it('rejects invalid project definitions, duplicate IDs, and unknown requests', () => {
    expect(
      () =>
        new ResearchProjectRegistry([
          { id: 'laser', researchPointCost: 0, durationSeconds: 1 }
        ])
    ).toThrow('Research point cost must be finite and positive.');
    expect(
      () =>
        new ResearchProjectRegistry([
          { id: 'laser', researchPointCost: 1, durationSeconds: 1 },
          { id: 'laser', researchPointCost: 2, durationSeconds: 2 }
        ])
    ).toThrow('Duplicate research project ID: laser.');

    const system = new ResearchSystem(projects);
    expect(() => system.startResearch('missing')).toThrow(
      'Unknown research project ID: missing.'
    );
    expect(() => system.addResearchPoints(0)).toThrow(
      'Research point grant must be finite and positive.'
    );
    expect(() => system.advance(-1)).toThrow(
      'Research delta time must be finite and non-negative.'
    );
  });

  it('round-trips active and completed research through a validated snapshot', () => {
    const system = new ResearchSystem(projects, 20);
    system.startResearch('laser');
    system.advance(2);
    system.addResearchPoints(3);
    const restored = ResearchSystem.fromSnapshot(projects, system.getSnapshot());

    expect(restored.getSnapshot()).toEqual(system.getSnapshot());
    expect(restored.advance(3)).toMatchObject({
      status: 'completed',
      projectId: 'laser'
    });
    expect(restored.startResearch('laser')).toEqual({
      status: 'already-completed',
      projectId: 'laser'
    });
  });

  it('rejects malformed and inconsistent snapshots', () => {
    expect(() =>
      ResearchSystem.fromSnapshot(projects, {
        schemaVersion: 2,
        availableResearchPoints: 0,
        completedProjectIds: [],
        activeProject: null
      })
    ).toThrow('Research system snapshot is invalid.');
    expect(() =>
      ResearchSystem.fromSnapshot(projects, {
        schemaVersion: 1,
        availableResearchPoints: 0,
        completedProjectIds: ['laser'],
        activeProject: { projectId: 'laser', elapsedSeconds: 1 }
      })
    ).toThrow('Active research project is already completed: laser.');
  });
});
