export interface Version {
  buildTime: string;
  commitHash: string;
}

export const version: Version = {
  buildTime: '__BUILD_TIME__',
  commitHash: '__COMMIT_HASH__',
}; 