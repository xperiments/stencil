import { Component, h, Fragment } from '@stencil/core';
import { Route, href, match, staticState } from '../../stencil-router';
import { Router } from '../../router';
import { getBlogs, getBlog, BlogData } from '../../data.server';
import { Markdown } from '@stencil/markdown';
import { Helmet } from '@stencil/helmet';

@Component({
  tag: 'app-root',
})
export class AppRoot {
  render() {
    return (
      <Router.Switch>
        <Route
          path={match('/blog/:id')}
          mapParams={staticState(getBlog)}
          render={(pageState: BlogData) => {
            return (
              <Fragment>
                <Helmet>
                  <title>{pageState.title}</title>
                </Helmet>
                <Markdown ast={pageState.ast} />
                <hr />
                <p>
                  <a {...href('/')}>Homepage</a>
                </p>
              </Fragment>
            );
          }}
        />

        <Route
          path="/"
          mapParams={staticState(getBlogs)}
          render={(blogs: BlogData[]) => (
            <Fragment>
              <h1>Homepage</h1>
              <ul>
                {blogs.map(blog => (
                  <li>
                    <a {...href(`/blog/${blog.id}`)}>{blog.title}</a>
                  </li>
                ))}
              </ul>
            </Fragment>
          )}
        />
      </Router.Switch>
    );
  }
}
