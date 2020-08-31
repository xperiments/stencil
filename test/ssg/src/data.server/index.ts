import type { MapParamData } from '../stencil-router';
import { slugify, ParseMarkdownOptions, ParseMarkdownResults } from '@stencil/markdown';
import { parse } from '@stencil/markdown/parse';
import { cache } from '@stencil/markdown/cache';
import fs from 'fs';
import { promisify } from 'util';
import { basename, join } from 'path';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

export interface BlogAttributes {
  title?: string;
}

export interface BlogData extends ParseMarkdownResults<BlogAttributes> {
  filePath?: string;
  slug?: string;
}

export interface BlogItem {
  slug: string;
  title: string;
}

const blogDir = join(__dirname, '..', 'blogs');

const parseOpts: ParseMarkdownOptions = {};

const parseBlog = async (filePath: string) => {
  const blogMarkdown = await readFile(filePath, 'utf8');
  const results: BlogData = await parse<BlogAttributes>(blogMarkdown, parseOpts, cache);
  results.filePath = filePath;
  results.slug = slugify(basename(filePath));
  return results;
};

export const getBlogs = async () => {
  const blogFileNames = await readdir(join(blogDir));

  const blogs = await Promise.all(
    blogFileNames.map(async blogFileName => {
      const blogFilePath = join(blogDir, blogFileName);
      const blogData = await parseBlog(blogFilePath);
      // minimal data to keep the static data object for all blogs small
      const blogItem: BlogItem = {
        slug: blogData.slug,
        title: blogData.attributes.title,
      };
      return blogItem;
    }),
  );

  return blogs;
};

export const getBlog: MapParamData = async ({ params }) => {
  const fileName = `${params.id}.md`;
  const filePath = join(blogDir, fileName);
  return parseBlog(filePath);
};
