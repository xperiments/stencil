import { Component, Host, h } from '@stencil/core';
import { Route, href, match, staticState } from 'stencil-router-v2';
import { Router } from '../../router';
import { getBlog } from '../../data';

@Component({
  tag: 'app-root',
})
export class AppRoot {
  render() {
    return (
      <Host>
        <Router.Switch>
          <Route path="/log-in" to="/account" />

          <Route path="/blogs">
            <h1>Blogs</h1>
            <ul>
              <li>
                <a {...href('/blog/static-site-generation')}>SSG</a>
              </li>
              <li>
                <a {...href('/blog/server-side-rendering')}>SSR</a>
              </li>
            </ul>
          </Route>

          <Route
            path={match('/blog/:id')}
            mapParams={staticState(getBlog)}
            render={params => <blog-post data={params} />}
          />

          <Route path="/">
            <h1>Homepage</h1>
            <p>
              <a {...href('/blogs')}>Blogs</a>
            </p>
            <p>
              <a {...href('/log-in')}>Log In</a>
            </p>
          </Route>
        </Router.Switch>
      </Host>
    );
  }
}
