import { describe, expect, it } from 'vitest';
import {
  PROVISIONAL_TECHNOLOGY_TREE,
  TechnologyTree
} from '../src/research/technologyTree';
import { ResearchSystem } from '../src/research/researchSystem';

describe('technology tree', () => {
  it('exposes the three research branches and only unlocks root nodes initially', () => {
    const system = PROVISIONAL_TECHNOLOGY_TREE.createResearchSystem(100);

    expect(
      PROVISIONAL_TECHNOLOGY_TREE.getAllNodes().map(({ category }) => category)
    ).toEqual([
      'industry',
      'industry',
      'industry',
      'military',
      'military',
      'military',
      'science',
      'science',
      'science'
    ]);
    expect(
      PROVISIONAL_TECHNOLOGY_TREE
        .getAvailableNodes(system)
        .map(({ id }) => id)
    ).toEqual([
      'industry-mining',
      'military-laser',
      'science-scanner'
    ]);
  });

  it('blocks missing prerequisites without spending points and unlocks descendants on completion', () => {
    const tree = PROVISIONAL_TECHNOLOGY_TREE;
    const system = tree.createResearchSystem(100);

    expect(tree.startResearch(system, 'industry-automation')).toEqual({
      status: 'locked',
      projectId: 'industry-automation',
      missingPrerequisiteIds: ['industry-mining']
    });
    expect(system.researchPoints).toBe(100);
    expect(tree.startResearch(system, 'industry-mining')).toMatchObject({
      status: 'started',
      projectId: 'industry-mining'
    });
    expect(system.advance(10)).toMatchObject({
      status: 'completed',
      projectId: 'industry-mining'
    });
    expect(
      tree.getAvailableNodes(system).map(({ id }) => id)
    ).toContain('industry-automation');
  });

  it('rejects unknown prerequisites, duplicate IDs, cycles, and foreign research systems', () => {
    expect(
      () =>
        new TechnologyTree([
          {
            id: 'node-a',
            name: 'Node A',
            category: 'science',
            prerequisites: ['missing'],
            researchPointCost: 1,
            durationSeconds: 1
          }
        ])
    ).toThrow('Unknown prerequisite missing on technology node-a.');
    expect(
      () =>
        new TechnologyTree([
          {
            id: 'node-a',
            name: 'Node A',
            category: 'science',
            prerequisites: ['node-b'],
            researchPointCost: 1,
            durationSeconds: 1
          },
          {
            id: 'node-b',
            name: 'Node B',
            category: 'industry',
            prerequisites: ['node-a'],
            researchPointCost: 1,
            durationSeconds: 1
          }
        ])
    ).toThrow('Technology prerequisite cycle includes node-a.');

    const foreignSystem = new ResearchSystem(
      PROVISIONAL_TECHNOLOGY_TREE.projectRegistry
    );
    const otherTree = new TechnologyTree([
      {
        id: 'other-root',
        name: 'Other Root',
        category: 'science',
        prerequisites: [],
        researchPointCost: 1,
        durationSeconds: 1
      }
    ]);
    expect(() =>
      otherTree.getAvailableNodes(foreignSystem)
    ).toThrow('Research system must be created from this technology tree.');
  });
});
