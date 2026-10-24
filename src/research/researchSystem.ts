export interface ResearchProjectDefinition {
  readonly id: string;
  readonly researchPointCost: number;
  readonly durationSeconds: number;
}

export interface ActiveResearchProject {
  readonly projectId: string;
  readonly elapsedSeconds: number;
}

export interface ResearchSystemSnapshot {
  readonly schemaVersion: 1;
  readonly availableResearchPoints: number;
  readonly completedProjectIds: readonly string[];
  readonly activeProject: ActiveResearchProject | null;
}

export type StartResearchResult =
  | {
      readonly status: 'started';
      readonly projectId: string;
      readonly remainingResearchPoints: number;
    }
  | {
      readonly status: 'already-completed';
      readonly projectId: string;
    }
  | {
      readonly status: 'already-researching';
      readonly projectId: string;
      readonly activeProjectId: string;
    }
  | {
      readonly status: 'insufficient-points';
      readonly projectId: string;
      readonly requiredPoints: number;
      readonly availablePoints: number;
    };

export type ResearchAdvanceResult =
  | {
      readonly status: 'idle';
      readonly completedProjectIds: readonly string[];
    }
  | {
      readonly status: 'in-progress';
      readonly projectId: string;
      readonly elapsedSeconds: number;
      readonly remainingSeconds: number;
      readonly completedProjectIds: readonly string[];
    }
  | {
      readonly status: 'completed';
      readonly projectId: string;
      readonly overflowSeconds: number;
      readonly completedProjectIds: readonly string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createResearchProject(value: unknown): ResearchProjectDefinition {
  if (!isRecord(value)) {
    throw new TypeError('Research project must be an object.');
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    throw new TypeError('Research project ID must not be empty.');
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

  return Object.freeze({
    id: value.id,
    researchPointCost: value.researchPointCost,
    durationSeconds: value.durationSeconds
  });
}

export class ResearchProjectRegistry {
  private readonly projects: ReadonlyMap<string, ResearchProjectDefinition>;

  constructor(definitions: readonly ResearchProjectDefinition[]) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('Research project definitions must be an array.');
    }

    const projects = new Map<string, ResearchProjectDefinition>();

    for (const definition of definitions) {
      const project = createResearchProject(definition);

      if (projects.has(project.id)) {
        throw new TypeError(`Duplicate research project ID: ${project.id}.`);
      }

      projects.set(project.id, project);
    }

    this.projects = projects;
    Object.freeze(this);
  }

  get(projectId: string): ResearchProjectDefinition | undefined {
    return this.projects.get(projectId);
  }

  getAll(): readonly ResearchProjectDefinition[] {
    return Object.freeze(
      Array.from(this.projects.values()).sort((left, right) =>
        left.id.localeCompare(right.id)
      )
    );
  }
}

export class ResearchSystem {
  private availableResearchPoints: number;
  private readonly completedProjectIds = new Set<string>();
  private activeProject: ActiveResearchProject | null = null;

  constructor(
    private readonly projects: ResearchProjectRegistry,
    initialResearchPoints = 0
  ) {
    if (
      !Number.isFinite(initialResearchPoints) ||
      initialResearchPoints < 0
    ) {
      throw new RangeError(
        'Initial research points must be finite and non-negative.'
      );
    }

    this.availableResearchPoints = initialResearchPoints;
  }

  get researchPoints(): number {
    return this.availableResearchPoints;
  }

  get projectRegistry(): ResearchProjectRegistry {
    return this.projects;
  }

  get completedProjects(): readonly string[] {
    return Object.freeze(Array.from(this.completedProjectIds).sort());
  }

  get activeResearch(): ActiveResearchProject | null {
    return this.activeProject === null
      ? null
      : Object.freeze({ ...this.activeProject });
  }

  addResearchPoints(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('Research point grant must be finite and positive.');
    }

    const nextAmount = this.availableResearchPoints + amount;

    if (!Number.isFinite(nextAmount)) {
      throw new RangeError('Research point balance overflow.');
    }

    this.availableResearchPoints = nextAmount;
    return this.availableResearchPoints;
  }

  startResearch(projectId: string): StartResearchResult {
    if (typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw new TypeError('Research project ID must not be empty.');
    }

    const project = this.projects.get(projectId);

    if (project === undefined) {
      throw new RangeError(`Unknown research project ID: ${projectId}.`);
    }

    if (this.completedProjectIds.has(projectId)) {
      return { status: 'already-completed', projectId };
    }

    if (this.activeProject !== null) {
      return {
        status: 'already-researching',
        projectId,
        activeProjectId: this.activeProject.projectId
      };
    }

    if (this.availableResearchPoints < project.researchPointCost) {
      return {
        status: 'insufficient-points',
        projectId,
        requiredPoints: project.researchPointCost,
        availablePoints: this.availableResearchPoints
      };
    }

    this.availableResearchPoints -= project.researchPointCost;
    this.activeProject = { projectId, elapsedSeconds: 0 };

    return {
      status: 'started',
      projectId,
      remainingResearchPoints: this.availableResearchPoints
    };
  }

  advance(deltaTimeSeconds: number): ResearchAdvanceResult {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new RangeError(
        'Research delta time must be finite and non-negative.'
      );
    }

    if (this.activeProject === null) {
      return {
        status: 'idle',
        completedProjectIds: this.completedProjects
      };
    }

    const project = this.projects.get(this.activeProject.projectId);

    if (project === undefined) {
      throw new Error(
        `Active research project is missing: ${this.activeProject.projectId}.`
      );
    }

    const elapsedSeconds =
      this.activeProject.elapsedSeconds + deltaTimeSeconds;

    if (!Number.isFinite(elapsedSeconds)) {
      throw new RangeError('Research elapsed time overflow.');
    }

    if (elapsedSeconds >= project.durationSeconds) {
      const overflowSeconds = elapsedSeconds - project.durationSeconds;
      this.completedProjectIds.add(project.id);
      this.activeProject = null;

      return {
        status: 'completed',
        projectId: project.id,
        overflowSeconds,
        completedProjectIds: this.completedProjects
      };
    }

    this.activeProject = { projectId: project.id, elapsedSeconds };

    return {
      status: 'in-progress',
      projectId: project.id,
      elapsedSeconds,
      remainingSeconds: project.durationSeconds - elapsedSeconds,
      completedProjectIds: this.completedProjects
    };
  }

  getSnapshot(): ResearchSystemSnapshot {
    return Object.freeze({
      schemaVersion: 1,
      availableResearchPoints: this.availableResearchPoints,
      completedProjectIds: this.completedProjects,
      activeProject: this.activeResearch
    });
  }

  static fromSnapshot(
    projects: ResearchProjectRegistry,
    value: unknown
  ): ResearchSystem {
    if (
      !isRecord(value) ||
      value.schemaVersion !== 1 ||
      typeof value.availableResearchPoints !== 'number' ||
      !Array.isArray(value.completedProjectIds)
    ) {
      throw new TypeError('Research system snapshot is invalid.');
    }

    const system = new ResearchSystem(
      projects,
      value.availableResearchPoints
    );

    for (const projectId of value.completedProjectIds) {
      if (typeof projectId !== 'string' || projectId.trim().length === 0) {
        throw new TypeError('Completed research project IDs must not be empty.');
      }

      if (projects.get(projectId) === undefined) {
        throw new TypeError(`Unknown completed research project ID: ${projectId}.`);
      }

      if (system.completedProjectIds.has(projectId)) {
        throw new TypeError(`Duplicate completed research project ID: ${projectId}.`);
      }

      system.completedProjectIds.add(projectId);
    }

    if (value.activeProject !== null) {
      if (
        !isRecord(value.activeProject) ||
        typeof value.activeProject.projectId !== 'string' ||
        typeof value.activeProject.elapsedSeconds !== 'number' ||
        !Number.isFinite(value.activeProject.elapsedSeconds) ||
        value.activeProject.elapsedSeconds < 0
      ) {
        throw new TypeError('Active research project snapshot is invalid.');
      }

      const activeProjectId = value.activeProject.projectId;
      const activeProjectDefinition = projects.get(activeProjectId);

      if (activeProjectDefinition === undefined) {
        throw new TypeError(
          `Unknown active research project ID: ${activeProjectId}.`
        );
      }

      if (system.completedProjectIds.has(activeProjectId)) {
        throw new TypeError(
          `Active research project is already completed: ${activeProjectId}.`
        );
      }

      if (value.activeProject.elapsedSeconds >= activeProjectDefinition.durationSeconds) {
        throw new RangeError(
          'Active research elapsed time must be less than its duration.'
        );
      }

      system.activeProject = {
        projectId: activeProjectId,
        elapsedSeconds: value.activeProject.elapsedSeconds
      };
    }

    return system;
  }
}
