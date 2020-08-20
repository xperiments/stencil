import type { Params } from 'stencil-router-v2';

export interface BlogData {
  id: string;
  title: string;
  content: string;
}

const blogs: BlogData[] = [];

export const getBlogs = async () => {
  const rsp = await fetch(`/data/blogs.json`);
};

export const getBlog = async (params: Params) => blogs.find(b => b.id === params.id);
