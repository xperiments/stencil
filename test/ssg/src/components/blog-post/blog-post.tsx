import { Component, Prop, Host, h } from '@stencil/core';
// import type { BlogData } from '../../data';

@Component({
  tag: 'blog-post',
})
export class BlogPost {
  @Prop() data: any;

  render() {
    return <Host>{this.data.content}</Host>;
  }
}
