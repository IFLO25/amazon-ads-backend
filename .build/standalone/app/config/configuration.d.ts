declare const _default: () => {
    port: number;
    nodeEnv: string;
    amazon: {
        clientId: string | undefined;
        clientSecret: string | undefined;
        refreshToken: string | undefined;
        advertisingAccountId: string | undefined;
        marketplace: string;
        sellerId: string | undefined;
        apiEndpoint: string;
        tokenEndpoint: string;
    };
    budget: {
        monthlyMin: number;
        monthlyMax: number;
    };
    acos: {
        targetMin: number;
        targetMax: number;
        pauseMin: number;
        pauseMax: number;
    };
    database: {
        url: string | undefined;
    };
};
export default _default;
