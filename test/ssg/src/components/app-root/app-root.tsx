import { Component, h } from '@stencil/core';
import { Route, staticState } from '../../stencil-router';
import { Router } from '../../router';
import { getBlogs, BlogData } from '../../data.server';

@Component({
  tag: 'app-root',
})
export class AppRoot {
  render() {
    return (
      <Router.Switch>
        <Route
          path="/"
          mapParams={staticState(getBlogs)}
          render={(blogData: BlogData[]) => {
            return <div>{JSON.stringify(blogData)}</div>;
          }}
        />
      </Router.Switch>
    );
  }
}
