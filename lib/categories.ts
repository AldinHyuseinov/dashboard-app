/**
 * Categories: the single source of truth for the business areas Tasks are
 * posted into, and for the Category Groups that bundle them in navigation.
 *
 * A Category Group (Venues / Обекти) is only a heading: it holds no Tasks,
 * has no page of its own and is never a valid Category.
 */

export type Category = {
  readonly kind: "category";
  /** URL segment and the value stored on a Task, e.g. "golf-clubs". */
  readonly slug: string;
  readonly label: string;
};

export type CategoryGroup = {
  readonly kind: "group";
  readonly label: string;
  readonly categories: readonly Category[];
};

/** A Category Group with its Categories, or a standalone Category. */
export type CategoryTreeItem = CategoryGroup | Category;

const category = (slug: string, label: string): Category => ({ kind: "category", slug, label });

const CATEGORY_TREE: readonly CategoryTreeItem[] = [
  {
    kind: "group",
    label: "Обекти",
    categories: [
      category("golf-clubs", "Голф Клубове"),
      category("bars", "Барове"),
      category("hotels", "Хотели"),
      category("catering", "Кетъринг"),
      category("party-centers", "Парти центрове"),
      category("premium-liquor-stores", "Премиум магазини за алкохол"),
      category("wedding-agencies", "Сватбени агенции"),
    ],
  },
  category("events", "Събития"),
  category("cocktails", "Коктейли"),
  category("social-media", "Социални мрежи"),
  category("resources", "Ресурси"),
  category("warehouse", "Склад"),
];

const CATEGORIES: readonly Category[] = CATEGORY_TREE.flatMap((item) =>
  item.kind === "group" ? item.categories : [item],
);

const LABELS = new Map(CATEGORIES.map((c) => [c.slug, c.label]));

/** Category Groups (with their Categories) and standalone Categories, in display order. */
export function listCategoryTree(): readonly CategoryTreeItem[] {
  return CATEGORY_TREE;
}

/** A heading over a run of Categories, as navigation and pickers lay them out. */
export type CategorySection = {
  readonly heading: string;
  /** Whether the heading is a Category Group's (Venues), not just a label for the rest. */
  readonly isGroup: boolean;
  readonly categories: readonly Category[];
};

const CATEGORY_SECTIONS: readonly CategorySection[] = [
  ...CATEGORY_TREE.flatMap((item) =>
    item.kind === "group"
      ? [{ heading: item.label, isGroup: true, categories: item.categories }]
      : [],
  ),
  {
    heading: "Още категории",
    isGroup: false,
    categories: CATEGORY_TREE.filter((item): item is Category => item.kind === "category"),
  },
];

/** Each Category Group's Categories under its heading, then the standalone Categories. */
export function listCategorySections(): readonly CategorySection[] {
  return CATEGORY_SECTIONS;
}

/** Every Category, in display order. Category Groups are not included. */
export function listCategories(): readonly Category[] {
  return CATEGORIES;
}

/** The Bulgarian label of a Category, or `undefined` if `slug` isn't a Category. */
export function getCategoryLabel(slug: string): string | undefined {
  return LABELS.get(slug);
}

const GROUP_LABELS = new Map(
  CATEGORY_TREE.flatMap((item) =>
    item.kind === "group" ? item.categories.map((c) => [c.slug, item.label] as const) : [],
  ),
);

/** The label of the Category Group the Category `slug` belongs to, or `undefined` if none. */
export function getCategoryGroupLabel(slug: string): string | undefined {
  return GROUP_LABELS.get(slug);
}

/**
 * The label to show for a Task's stored Category. Falls back to the stored
 * value when it isn't a Category, so a stray legacy value stays readable.
 */
export function categoryLabelOrSlug(slug: string): string {
  return LABELS.get(slug) ?? slug;
}

/** Whether Tasks can be posted into and listed under `slug`. */
export function isCategory(slug: string): boolean {
  return LABELS.has(slug);
}
