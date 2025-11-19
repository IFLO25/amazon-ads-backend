
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  amazon: {
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    advertisingAccountId: process.env.AMAZON_ADVERTISING_ACCOUNT_ID,
    apiScope: process.env.AMAZON_ADVERTISING_API_SCOPE,
    marketplace: process.env.AMAZON_MARKETPLACE || 'EU',
    sellerId: process.env.AMAZON_SELLER_ID,
    apiEndpoint: 'https://advertising-api-eu.amazon.com',
    tokenEndpoint: 'https://api.amazon.com/auth/o2/token',
  },
  
  budget: {
    monthlyMin: parseInt(process.env.MONTHLY_BUDGET_MIN || '1000', 10),
    monthlyMax: parseInt(process.env.MONTHLY_BUDGET_MAX || '2000', 10),
  },
  
  acos: {
    targetMin: parseFloat(process.env.TARGET_ACOS_MIN || '5'),
    targetMax: parseFloat(process.env.TARGET_ACOS_MAX || '15'),
    pauseMin: parseFloat(process.env.PAUSE_ACOS_MIN || '40'),
    pauseMax: parseFloat(process.env.PAUSE_ACOS_MAX || '60'),
  },
  
  database: {
    url: process.env.DATABASE_URL,
  },
});
