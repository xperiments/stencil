import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'async-cmp',
})
export class AsyncCmp {
  async componentWillLoad() {
    console.log('async-cmp componentWillLoad start');
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('async-cmp componentWillLoad end');
        resolve();
      }, 1000);
    });
  }

  render() {
    return <Host>async-cmp</Host>;
  }
}
