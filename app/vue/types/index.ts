// Core Type Definitions for Kobold Fight Club

// ============================================================================
// Challenge Rating Types
// ============================================================================

export interface ChallengeRating {
  text: string; // "0", "1/8", "1/4", "1/2", "1", "2", etc.
  string: string; // Same as text
  value: number; // Numeric value (0, 0.125, 0.25, 0.5, 1, 2, etc.)
  exp: number; // XP value for this CR
}

// ============================================================================
// Alignment Types
// ============================================================================

export interface Alignment {
  text: string; // "Lawful Good", "Chaotic Evil", etc.
  tags: string[]; // ["lawful", "good"]
  neutral?: boolean;
}

// ============================================================================
// Monster Types
// ============================================================================

export interface MonsterSource {
  name: string; // e.g., "Monster Manual", "Volo's Guide"
  page?: string | number; // Page number or URL
}

export interface Monster {
  // Identifiers
  id: string; // fid or guid
  fid?: string; // Format: "source.monster-name-hyphenated"
  guid?: string; // UUID for homebrew monsters

  // Basic Info
  name: string;
  section?: string; // Subsection within a source book

  // Stats
  ac: string | number; // Armor class
  hp: string | number; // Hit points
  init: string | number; // Initiative modifier
  cr: ChallengeRating;

  // Classification
  type: string; // "Aberration", "Beast", "Humanoid", etc.
  size: string; // "Tiny", "Small", "Medium", "Large", etc.
  alignment: Alignment;

  // Flags
  legendary: boolean;
  lair: boolean;
  unique: boolean; // Named NPCs
  special: boolean;

  // Metadata
  tags?: string[]; // Array of tag strings
  environment?: string[]; // Array of environment strings
  sources: MonsterSource[]; // Array of source objects

  // Computed/Searchable
  searchable?: string; // Lowercased searchable text
}

// ============================================================================
// Encounter Types
// ============================================================================

export interface MonsterGroup {
  monster: Monster;
  qty: number; // Quantity of this monster in the encounter
}

export interface EncounterGroups {
  [monsterId: string]: MonsterGroup; // Keyed by monster.id
}

export interface SavedEncounter {
  name: string;
  groups: EncounterGroups; // Map of monster ID to MonsterGroup
  reference?: string | null;
}

// ============================================================================
// Party/Player Types
// ============================================================================

export interface PlayerLevelThresholds {
  level: number;
  budget: number; // XP budget for adventuring day
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
}

export interface PartyLevels {
  [level: number]: number; // level -> player count
}

export interface ExpThresholds {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
}

export interface ThreatThresholds extends ExpThresholds {
  pair: number;
  group: number;
  trivial: number;
}

export interface Player {
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  init: number;
  initRoll?: number;
}

export interface PlayerData {
  text: string; // Raw player text format
  players: Player[];
}

// ============================================================================
// Combat/Battle Tracker Types
// ============================================================================

export interface Combatant {
  type: 'player' | 'enemy' | 'lair';
  name: string;
  ac?: number;
  hp?: number;
  initiativeMod?: number;
  advantageOnInitiative?: boolean;
  initiative: number;
  damage?: number;
  id?: string; // Monster ID (for enemies)
  active?: boolean; // Currently active in turn order
  fixedInitiative?: boolean; // For lair actions
  noHp?: boolean; // For lair actions
  initiativeRolled?: boolean; // Whether initiative was rolled
}

export interface CombatState {
  active: number; // Index of active combatant
  combatants: Combatant[];
  delta: number; // Damage/healing delta being applied
}

// Combat initialization status constants
export const CombatStatus = {
  READY: 1,
  NO_MONSTERS: 2,
  NO_PLAYERS: 4,
} as const;

export type CombatStatusType = typeof CombatStatus[keyof typeof CombatStatus];

// ============================================================================
// Source/Content Pack Types
// ============================================================================

export interface Source {
  name: string;
  shortname: string;
  type: string; // "official", "third-party", "community"
  default_selected: boolean;
}

export interface SourceFilters {
  [sourceName: string]: boolean; // source name -> enabled
}

// ============================================================================
// Metadata Types (for filters, dropdowns, etc.)
// ============================================================================

export interface MetaOption<T = string | number> {
  text: string; // Display text
  value: T; // Actual value
}

export interface FilterOptions {
  crs: MetaOption<number>[];
  types: string[];
  sizes: string[];
  alignments: string[];
  environments: string[];
  tags: string[];
}

// ============================================================================
// Search/Filter Types
// ============================================================================

export interface SearchFilters {
  text: string;
  isRegex: boolean;
  sizeFilters: string[];
  typeFilters: string[];
  alignmentFilters: string[];
  tagFilters: string[];
  environmentFilters: string[];
  sourceFilters: SourceFilters;
  legendary: boolean | null;
  lair: boolean | null;
  unique: boolean | null;
  minCr: number;
  maxCr: number;
}

// ============================================================================
// Database Query Result Types
// ============================================================================

export interface MonsterRow {
  fid?: string;
  guid?: string;
  name: string;
  section?: string;
  ac: string | number;
  hp: string | number;
  init: string | number;
  cr: string; // CR label like "1/2", "5", etc.
  type: string;
  size: string;
  alignment: string;
  legendary: number; // SQLite boolean (0 or 1)
  lair: number;
  unique: number;
  special: number;
  tags?: string; // Comma-separated
  environment?: string; // Comma-separated
  sources: string; // Comma-separated with page numbers
}

export interface SourceRow {
  name: string;
  shortname: string;
  type: string;
  default_selected: number; // SQLite boolean (0 or 1)
}

// ============================================================================
// Service State Types
// ============================================================================

export interface MonstersState {
  all: Monster[];
  byId: Record<string, Monster>;
  byCr: Record<string, Monster[]>; // Keyed by CR text like "1/2", "5"
}

export interface EncounterState {
  groups: EncounterGroups;
  reference: string | null;
}

export interface LibraryState {
  encounters: SavedEncounter[];
}

export interface PartyInfoState {
  levels: PartyLevels;
  totalPlayerCount: number;
  totalPartyExpLevels: ExpThresholds;
}

export interface PlayersState {
  text: string;
  players: Player[];
}

// ============================================================================
// Homebrew Import Types
// ============================================================================

export interface HomebrewMonster {
  // At minimum needs name and CR
  name: string;
  cr: string | number; // Can be string like "1/2" or number
  type?: string;
  size?: string;
  ac?: string | number;
  hp?: string | number;
  init?: string | number;
  alignment?: string;
  legendary?: boolean;
  lair?: boolean;
  unique?: boolean;
  special?: boolean;
  tags?: string;
  environment?: string;
  sources?: string;
}

export interface HomebrewPack {
  name: string;
  monsters: HomebrewMonster[];
}

// ============================================================================
// Random Encounter Types
// ============================================================================

export interface RandomEncounterOptions {
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  partyLevel: number;
  partySize: number;
}

// ============================================================================
// Utility Types
// ============================================================================

// For localStorage keys
export type StorageKey =
  | 'partyLevels'
  | 'savedEncounters'
  | 'players'
  | 'filters'
  | 'sources'
  | 'homebrewPacks';

// For SQL.js types
export interface SQLJsDatabase {
  exec(sql: string, params?: any[]): Array<{
    columns: string[];
    values: any[][];
  }>;
  close(): void;
}

export interface SQLJsStatic {
  Database: new (data: Uint8Array) => SQLJsDatabase;
}

export interface InitSqlJsConfig {
  locateFile: (file: string) => string;
}

// Extend Window interface for global types
declare global {
  interface Window {
    initSqlJs: (config: InitSqlJsConfig) => Promise<SQLJsStatic>;
    _: any; // lodash
  }
}
