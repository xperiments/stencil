import { Component, Prop, Host, h } from '@stencil/core';
// import type { BlogData } from '../../data';

@Component({
  tag: 'blog-post',
})
export class BlogPost {
  @Prop() data: any;

  async componentWillLoad() {
    console.log('blog-post componentWillLoad start');
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('blog-post componentWillLoad end');
        resolve();
      }, 1000);
    });
  }

  render() {
    return <Host>blog post</Host>;
  }
}
