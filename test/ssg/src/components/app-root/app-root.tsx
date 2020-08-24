import { Component, Host, h } from '@stencil/core';
import { Route, href, match, staticState } from '../../stencil-router';
import { Router } from '../../router';
import { getBlog, getBlogs, BlogData } from '../../data.server';

@Component({
  tag: 'app-root',
})
export class AppRoot {
  render() {
    return (
      <Host>
        <Router.Switch>
          <Route path="/log-in" to="/account" />

          <Route
            path="/blogs"
            mapParams={staticState(getBlogs)}
            render={(blogData: BlogData[]) => {
              return (
                <div>
                  <h1>Blogs!</h1>
                  <ul>
                    {blogData.map(blog => (
                      <li>
                        <a {...href(`/blog/${blog.id}`)}>{blog.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }}
          />

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
