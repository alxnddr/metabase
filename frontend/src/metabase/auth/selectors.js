import { PLUGIN_AUTH_PROVIDERS } from "metabase/plugins";

console.log("as a user I want to see a console message");

export function getAuthProviders(state, props) {
  return PLUGIN_AUTH_PROVIDERS.reduce(
    (providers, getProviders) => getProviders(providers, state, props),
    [],
  );
}
