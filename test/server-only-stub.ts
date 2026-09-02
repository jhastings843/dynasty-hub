// `server-only` is a build-time guard with no runtime behaviour. Vitest runs
// the pure logic in these modules outside Next's bundler, where the package
// does not resolve, so it is aliased to this empty module for tests.
export {};
