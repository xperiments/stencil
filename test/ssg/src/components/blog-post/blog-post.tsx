import { Component, Prop, Host, h } from '@stencil/core';
// import type { BlogData } from '../../data';

@Component({
  tag: 'blog-post',
})
export class BlogPost {
  @Prop() data: any;

  async componentWillLoad() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 1000);
    })
  }

  render() {
    return <Host>{this.data.content}</Host>;
  }
}
