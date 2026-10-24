import {
  ResearchProjectRegistry,
  ResearchSystem
} from './researchSystem';
import type {
  ResearchProjectDefinition,
  StartResearchResult
} from './researchSystem';

export const RESEARCH_CATEGORIES = [
  'military',
  'industry',
  'science'
] as const;

export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number];

export interface TechnologyNodeDefinition extends ResearchProjectDefinition {
  readonly name: string;
  readonly category: ResearchCategory;
  readonly prerequisites: readonly string[];
}

export type TechnologyNode = TechnologyNodeDefinition;

export type TechnologyResearchResult =
  | StartResearchResult
  | {
      readonly status: 'locked';
      readonly projectId: string;
      readonly missingPrerequisiteIds: readonly string[];
    };

const categorySet = new Set<string>(RESEARCH_CATEGORIES);

function isResearchCategory(value: unknown): value is ResearchCategory {
  return typeof value === 'string' && categorySet.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTechnologyNode(value: unknown): TechnologyNode {
  if (!isRecord(value)) {
    throw new TypeError('Technology node must be an object.');
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    throw new TypeError('Technology node ID must not be empty.');
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    throw new TypeError(`Technology node name must not be empty: ${value.id}.`);
  }

  if (!isResearchCategory(value.category)) {
    throw new TypeError(
      `Unknown research category: ${String(value.category)}.`
    );
  }

  if (
    typeof value.researchPointCost !== 'number' ||
    !Number.isFinite(value.researchPointCost) ||
    value.researchPointCost <= 0
  ) {
    throw new RangeError(
      'Research point cost must be finite and positive.'
    );
  }

  if (
    typeof value.durationSeconds !== 'number' ||
    !Number.isFinite(value.durationSeconds) ||
    value.durationSeconds <= 0
  ) {
    throw new RangeError('Research duration must be finite and positive.');
  }

  if (!Array.isArray(value.prerequisites)) {
    throw new TypeError(
      `Technology prerequisites must be an array: ${value.id}.`
    );
  }

  const prerequisites: string[] = [];
  const seenPrerequisites = new Set<string>();

  for (const prerequisite of value.prerequisites) {
    if (typeof prerequisite !== 'string' || prerequisite.trim().length === 0) {
      throw new TypeError(
        `Technology prerequisite IDs must not be empty: ${value.id}.`
      );
    }

    if (seenPrerequisites.has(prerequisite)) {
      throw new TypeError(
        `Duplicate prerequisite ${prerequisite} on technology ${value.id}.`
      );
    }

    seenPrerequisites.add(prerequisite);
    prerequisites.push(prerequisite);
  }

  return Object.freeze({
    id: value.id,
    researchPointCost: value.researchPointCost,
    durationSeconds: value.durationSeconds,
    name: value.name,
    category: value.category as ResearchCategory,
    prerequisites: Object.freeze(prerequisites)
  });
}

export class TechnologyTree {
  private readonly nodes: ReadonlyMap<string, TechnologyNode>;
  readonly projectRegistry: ResearchProjectRegistry;

  constructor(definitions: readonly TechnologyNodeDefinition[]) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('Technology node definitions must be an array.');
    }

    const nodes = new Map<string, TechnologyNode>();

    for (const definition of definitions) {
      const node = parseTechnologyNode(definition);

      if (nodes.has(node.id)) {
        throw new TypeError(`Duplicate technology node ID: ${node.id}.`);
      }

      nodes.set(node.id, node);
    }

    for (const node of nodes.values()) {
      for (const prerequisiteId of node.prerequisites) {
        if (!nodes.has(prerequisiteId)) {
          throw new TypeError(
            `Unknown prerequisite ${prerequisiteId} on technology ${node.id}.`
          );
        }
      }
    }

    this.assertAcyclic(nodes);
    this.nodes = nodes;
    this.projectRegistry = new ResearchProjectRegistry(
      Array.from(nodes.values()).map(
        ({ id, researchPointCost, durationSeconds }) => ({
          id,
          researchPointCost,
          durationSeconds
        })
      )
    );
    Object.freeze(this);
  }

  getNode(nodeId: string): TechnologyNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): readonly TechnologyNode[] {
    return Object.freeze(
      Array.from(this.nodes.values()).sort((left, right) =>
        left.id.localeCompare(right.id)
      )
    );
  }

  getAvailableNodes(system: ResearchSystem): readonly TechnologyNode[] {
    this.assertResearchSystem(system);
    const completed = new Set(system.completedProjects);

    return Object.freeze(
      this.getAllNodes().filter(
        (node) =>
          !completed.has(node.id) &&
          node.prerequisites.every((id) => completed.has(id))
      )
    );
  }

  createResearchSystem(initialResearchPoints = 0): ResearchSystem {
    return new ResearchSystem(this.projectRegistry, initialResearchPoints);
  }

  startResearch(
    system: ResearchSystem,
    nodeId: string
  ): TechnologyResearchResult {
    this.assertResearchSystem(system);
    const node = this.nodes.get(nodeId);

    if (node === undefined) {
      throw new RangeError(`Unknown technology node ID: ${nodeId}.`);
    }

    if (system.completedProjects.includes(nodeId)) {
      return system.startResearch(nodeId);
    }

    const completed = new Set(system.completedProjects);
    const missingPrerequisiteIds = node.prerequisites
      .filter((id) => !completed.has(id))
      .sort();

    if (missingPrerequisiteIds.length > 0) {
      return {
        status: 'locked',
        projectId: nodeId,
        missingPrerequisiteIds: Object.freeze(missingPrerequisiteIds)
      };
    }

    return system.startResearch(nodeId);
  }

  private assertResearchSystem(system: ResearchSystem): void {
    if (system.projectRegistry !== this.projectRegistry) {
      throw new TypeError(
        'Research system must be created from this technology tree.'
      );
    }
  }

  private assertAcyclic(nodes: ReadonlyMap<string, TechnologyNode>): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new TypeError(`Technology prerequisite cycle includes ${nodeId}.`);
      }

      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      const node = nodes.get(nodeId);

      if (node === undefined) {
        throw new Error(`Technology node disappeared during validation: ${nodeId}.`);
      }

      for (const prerequisiteId of node.prerequisites) {
        visit(prerequisiteId);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    for (const nodeId of nodes.keys()) {
      visit(nodeId);
    }
  }
}

export const PROVISIONAL_TECHNOLOGY_TREE = new TechnologyTree([
  {
    id: 'military-laser',
    name: 'Laser Weapons',
    category: 'military',
    prerequisites: [],
    researchPointCost: 10,
    durationSeconds: 10
  },
  {
    id: 'military-missiles',
    name: 'Missile Weapons',
    category: 'military',
    prerequisites: ['military-laser'],
    researchPointCost: 25,
    durationSeconds: 20
  },
  {
    id: 'military-shields',
    name: 'Energy Shields',
    category: 'military',
    prerequisites: ['military-laser'],
    researchPointCost: 25,
    durationSeconds: 20
  },
  {
    id: 'industry-mining',
    name: 'Advanced Mining',
    category: 'industry',
    prerequisites: [],
    researchPointCost: 10,
    durationSeconds: 10
  },
  {
    id: 'industry-automation',
    name: 'Industrial Automation',
    category: 'industry',
    prerequisites: ['industry-mining'],
    researchPointCost: 25,
    durationSeconds: 20
  },
  {
    id: 'industry-production',
    name: 'Advanced Production',
    category: 'industry',
    prerequisites: ['industry-automation'],
    researchPointCost: 35,
    durationSeconds: 30
  },
  {
    id: 'science-scanner',
    name: 'Deep Space Scanner',
    category: 'science',
    prerequisites: [],
    researchPointCost: 10,
    durationSeconds: 10
  },
  {
    id: 'science-jump-drive',
    name: 'Jump Drive',
    category: 'science',
    prerequisites: ['science-scanner'],
    researchPointCost: 30,
    durationSeconds: 25
  },
  {
    id: 'science-xeno-tech',
    name: 'Xeno Technology',
    category: 'science',
    prerequisites: ['science-jump-drive'],
    researchPointCost: 50,
    durationSeconds: 45
  }
]);
