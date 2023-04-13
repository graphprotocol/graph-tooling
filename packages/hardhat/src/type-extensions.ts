import 'hardhat/types/config';

declare module 'hardhat/types/config' {
  export interface ProjectPathsUserConfig {
    subgraph: string;
  }

  export interface ProjectPathsConfig {
    subgraph: string;
  }

  export interface HardhatConfig {
    subgraph: Subgraph;
  }

  export interface Subgraph {
    name: string;
    product: string;
    indexEvents: boolean;
    allowSimpleName: boolean;
  }
}
