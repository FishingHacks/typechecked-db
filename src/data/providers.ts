export const remoteProviders = ['mongodb'] as const;
export type remoteProvidersType = typeof remoteProviders[number];
export const localProviders = ['enmap'] as const;
export type localProvidersType = typeof localProviders[number];
