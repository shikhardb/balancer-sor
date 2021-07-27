import { SubGraphPools, Pools } from './types';
export declare class POOLS {
    getAllPublicSwapPools(URL: string, useTheGraphQuerry?: boolean): Promise<SubGraphPools>;
    formatPoolsBigNumber(pools: SubGraphPools): Promise<Pools>;
}
