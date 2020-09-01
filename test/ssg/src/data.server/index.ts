import type { MapParamData } from '../stencil-router';
import { slugify, ParseMarkdownOptions } from '@stencil/markdown';
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

export interface BlogData {
  id: string;
  title: string;
  ast: any;
}

const blogDir = join(__dirname, '..', '..', 'blogs');

const parseOpts: ParseMarkdownOptions = {};

const parseBlog = async (filePath: string) => {
  const blogMarkdown = await readFile(filePath, 'utf8');
  const results = await parse<BlogAttributes>(blogMarkdown, parseOpts, cache);
  const blogData: BlogData = {
    id: slugify(basename(filePath)),
    title: results.attributes.title,
    ast: results.ast,
  };
  return blogData;
};

export const getBlogs = async () => {
  const blogFileNames = await readdir(join(blogDir));

  const blogs = await Promise.all(
    blogFileNames.map(async blogFileName => {
      const blogFilePath = join(blogDir, blogFileName);
      return parseBlog(blogFilePath);
    }),
  );

  return blogs;
};

export const getBlog: MapParamData = async ({ params }) => {
  const fileName = `${params.id}.md`;
  const filePath = join(blogDir, fileName);
  return parseBlog(filePath);
};
