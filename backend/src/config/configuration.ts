export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3307', 10),
    name: process.env.DB_NAME ?? 'tixxgo_db',
    user: process.env.DB_USER ?? 'tixxgo_user',
    password: process.env.DB_PASSWORD ?? '',
  },
  pricing: {
    serviceFee: parseInt(process.env.TIXXGO_SERVICE_FEE ?? '299', 10),
    defaultDiscount: parseInt(process.env.TIXXGO_DEFAULT_DISCOUNT ?? ' 200', 10),
  },
  supplier: {
    timeoutMs: parseInt(process.env.SUPPLIER_TIMEOUT_MS ?? '10000', 10),
  },
});
