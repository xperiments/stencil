import { Component, h, Fragment } from '@stencil/core';
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
          render={(blogData: BlogData[]) => (
            <Fragment>
              <h1>Homepage</h1>
              <ul></ul>
              return <div>{JSON.stringify(blogData)}</div>;
            </Fragment>
          )}
        />
      </Router.Switch>
    );
  }
}
