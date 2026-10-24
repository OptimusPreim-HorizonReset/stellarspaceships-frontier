import { isResourceType } from '../core/tiles';
import type { ResourceCost, ResourceType } from '../core/tiles';
import type {
  ResourceInventory,
  ResourceInventoryTransactionResult
} from '../mining/resourceLoot';

export interface RecipeDefinition {
  readonly id: string;
  readonly inputs: ResourceCost;
  readonly outputs: ResourceCost;
  readonly durationSeconds: number;
}

export type RecipeExecutionResult =
  | {
      readonly status: 'crafted';
      readonly recipeId: string;
      readonly inputs: ResourceCost;
      readonly outputs: ResourceCost;
      readonly durationSeconds: number;
    }
  | {
      readonly status: 'insufficient-resources';
      readonly recipeId: string;
      readonly resourceType: ResourceType;
      readonly requestedAmount: number;
      readonly availableAmount: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseResourceCost(value: unknown, field: string): ResourceCost {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new TypeError(`Recipe ${field} must contain at least one resource.`);
  }

  const cost: Partial<Record<ResourceType, number>> = {};

  for (const key of Object.keys(value)) {
    if (!isResourceType(key)) {
      throw new TypeError(`Unknown recipe resource type: ${key}.`);
    }

    const amount = value[key];

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new RangeError(
        `Recipe ${field} amount for ${key} must be finite and positive.`
      );
    }

    cost[key] = amount;
  }

  return Object.freeze(cost);
}

export function createRecipe(value: unknown): RecipeDefinition {
  if (!isRecord(value)) {
    throw new TypeError('Recipe must be an object.');
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    throw new TypeError('Recipe ID must not be empty.');
  }

  if (
    typeof value.durationSeconds !== 'number' ||
    !Number.isFinite(value.durationSeconds) ||
    value.durationSeconds <= 0
  ) {
    throw new RangeError('Recipe duration must be finite and positive.');
  }

  return Object.freeze({
    id: value.id,
    inputs: parseResourceCost(value.inputs, 'inputs'),
    outputs: parseResourceCost(value.outputs, 'outputs'),
    durationSeconds: value.durationSeconds
  });
}

export class RecipeRegistry {
  private readonly recipes: ReadonlyMap<string, RecipeDefinition>;

  constructor(definitions: readonly RecipeDefinition[]) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('Recipe definitions must be an array.');
    }

    const recipes = new Map<string, RecipeDefinition>();

    for (const definition of definitions) {
      const recipe = createRecipe(definition);

      if (recipes.has(recipe.id)) {
        throw new TypeError(`Duplicate recipe ID: ${recipe.id}.`);
      }

      recipes.set(recipe.id, recipe);
    }

    this.recipes = recipes;
    Object.freeze(this);
  }

  get(recipeId: string): RecipeDefinition | undefined {
    return this.recipes.get(recipeId);
  }

  getAll(): readonly RecipeDefinition[] {
    return Object.freeze(
      Array.from(this.recipes.values()).sort((left, right) =>
        left.id.localeCompare(right.id)
      )
    );
  }
}

export const PROVISIONAL_PRODUCTION_RECIPES = new RecipeRegistry([
  {
    id: 'smelt-steel',
    inputs: { ore: 1 },
    outputs: { steel: 1 },
    durationSeconds: 5
  },
  {
    id: 'assemble-components',
    inputs: { steel: 2, crystal: 1 },
    outputs: { components: 1 },
    durationSeconds: 10
  },
  {
    id: 'assemble-ship-parts',
    inputs: { components: 1, steel: 1 },
    outputs: { shipParts: 1 },
    durationSeconds: 15
  }
]);

export function executeRecipe(
  registry: RecipeRegistry,
  inventory: ResourceInventory,
  recipeId: string
): RecipeExecutionResult {
  if (recipeId.trim().length === 0) {
    throw new TypeError('Recipe ID must not be empty.');
  }

  const recipe = registry.get(recipeId);

  if (recipe === undefined) {
    throw new RangeError(`Unknown recipe ID: ${recipeId}.`);
  }

  const result: ResourceInventoryTransactionResult = inventory.applyTransaction(
    recipe.inputs,
    recipe.outputs
  );

  if (result.status === 'insufficient-resources') {
    return {
      status: result.status,
      recipeId,
      resourceType: result.resourceType,
      requestedAmount: result.requestedAmount,
      availableAmount: result.availableAmount
    };
  }

  return {
    status: 'crafted',
    recipeId,
    inputs: recipe.inputs,
    outputs: recipe.outputs,
    durationSeconds: recipe.durationSeconds
  };
}
