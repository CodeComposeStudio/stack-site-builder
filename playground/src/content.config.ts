import { defineAasCollections } from 'stack-site-builder/content';
import { categoryMap } from './data/categories';
import { courseCategoryMap } from './data/course-categories';

// The content model (stacks / articles / concepts / courses / slides) comes
// from the theme; this site only supplies its category trees for validation.
// `courseCategoryMap` is optional — only sites with `sections: { courses: true }`
// need it (passing it makes course category ids build-time-validated).
export const collections = defineAasCollections({ categoryMap, courseCategoryMap });
