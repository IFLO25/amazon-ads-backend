import { OptimizationService } from './optimization.service';
export declare class OptimizationController {
    private readonly optimizationService;
    constructor(optimizationService: OptimizationService);
    optimize(): Promise<{
        message: string;
        actionsCount: number;
        actions: import("./optimization.service").OptimizationAction[];
        timestamp: Date;
    }>;
    getHistory(limit?: string): Promise<any>;
}
