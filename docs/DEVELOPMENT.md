# Development Guide

## Running Without Contracts

Both frontend and backend can run without deployed contracts. This allows development and testing without access to Stellar testnet or real contract IDs.

### Mock Contracts

The codebase includes mock contract implementations in:
- **Backend**: `backend/src/mocks/contractMocks.js`
- **Frontend**: `frontend/src/mocks/contractMocks.js`

These mocks provide dummy implementations of contract methods for deterministic testing.

### Backend Mock Setup

When starting the backend, you can omit contract IDs:

```bash
cd backend
npm install
npm run dev
# Server runs at http://localhost:3001
# GET /api/v1/config returns null for contract IDs
```

The backend functions normally without contract IDs. API endpoints return campaign data, and contract IDs are optional in the config response.

### Frontend Mock Setup

The frontend automatically works without contract IDs. If neither `VITE_REWARDS_CONTRACT_ID` nor `VITE_CAMPAIGN_CONTRACT_ID` are set:

```bash
cd frontend
npm install
npm run dev
# Vite dev server at http://localhost:5173
# Frontend runs without contract interactions
```

The UI displays campaigns and user interface without attempting contract calls.

### Using Mock Contracts in Tests

To use mock contracts in integration tests:

```javascript
import { createMockContract, createMockSorobanServer } from '../mocks/contractMocks.js';

const mockServer = createMockSorobanServer();
const mockCampaignContract = createMockContract('CAAAA...');

// Use in tests with predictable results
const result = await mockCampaignContract.methods.getTotalSupply();
// Returns: '1000000'
```

### Environment Variables for Development

**Backend** (`.env` or environment):
```
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
# Optional contract IDs (omit for mock mode):
# REWARDS_CONTRACT_ID=CAAAA...
# CAMPAIGN_CONTRACT_ID=CBBB...
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Frontend** (`.env.local` or `.env`):
```
VITE_API_URL=http://localhost:3001
VITE_STELLAR_NETWORK=testnet
# Optional contract IDs (omit for mock mode):
# VITE_REWARDS_CONTRACT_ID=CAAAA...
# VITE_CAMPAIGN_CONTRACT_ID=CBBB...
```

### Running Tests Deterministically

Both backend and frontend tests can run without contract interaction:

```bash
# Backend tests use in-memory SQLite and mocked Soroban
npm run test:backend

# Frontend tests use Playwright with mocked UI interactions
npm run test:frontend
```

Tests don't require real contract IDs or RPC endpoints.
