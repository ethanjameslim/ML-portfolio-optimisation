import { filePortfolioApi } from '@/services/adapters/filePortfolioApi';
import { httpPortfolioApi } from '@/services/adapters/httpPortfolioApi';

const apiMode = import.meta.env.VITE_PORTFOLIO_API_MODE;

export const portfolioApi = apiMode === 'http' ? httpPortfolioApi : filePortfolioApi;
