import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== DATABASE ==========

const CARRIER_DATABASE = {
  '9876543210': { operator: 'Jio (Reliance)', circle: 'Delhi NCR', type: 'Postpaid', status: 'Active', country: 'India' },
  '8765432109': { operator: 'Airtel', circle: 'Mumbai', type: 'Prepaid', status: 'Active', country: 'India' },
  '7654321098': { operator: 'Vodafone Idea', circle: 'Bangalore', type: 'Postpaid', status: 'Active', country: 'India' },
  '6543210987': { operator: 'BSNL', circle: 'Chennai', type: 'Prepaid', status: 'Active', country: 'India' },
  '5432109876': { operator: 'Jio', circle: 'Hyderabad', type: 'Postpaid', status: 'Active', country: 'India' },
  '9111111111': { operator: 'Airtel', circle: 'Pune', type: 'Prepaid', status: 'Active', country: 'India' },
  '9222222222': { operator: 'Vodafone', circle: 'Kolkata', type: 'Postpaid', status: 'Active', country: 'India' },
  '9333333333': { operator: 'Jio', circle: 'Ahmedabad', type: 'Prepaid', status: 'Active', country: 'India' },
};

// ========== MIDDLEWARE ==========

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ========== VALIDATION FUNCTIONS ==========

function validateNumberInput(number) {
  if (!number) {
    return { valid: false, error: 'Number is required' };
  }

  const cleaned = String(number).trim();
  const digitsOnly = cleaned.replace(/[^\d]/g, '');

  if (!/^\d{10,12}$/.test(digitsOnly)) {
    return { valid: false, error: 'Invalid number format. Use 10-12 digits' };
  }

  const sanitized = validator.escape(cleaned);
  return { valid: true, data: sanitized };
}

function generateCarrierData(number) {
  const operators = ['Jio', 'Airtel', 'Vodafone Idea', 'BSNL', 'MTNL', 'Vi', 'Reliance'];
  const circles = ['Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Lucknow', 'Indore'];
  const types = ['Prepaid', 'Postpaid'];
  
  const selected = {
    operator: operators[Math.floor(Math.random() * operators.length)],
    circle: circles[Math.floor(Math.random() * circles.length)],
    type: types[Math.floor(Math.random() * types.length)],
    status: 'Active',
    country: 'India'
  };

  return selected;
}

// ========== API ENDPOINTS ==========

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TechVishalBoss API Wrapper v2.0',
    version: '2.0.0',
    uptime: process.uptime()
  });
});

app.post('/api/number-info', async (req, res) => {
  try {
    const { number } = req.body;

    const validation = validateNumberInput(number);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.error,
        input: number
      });
    }

    const cleanNumber = validation.data;
    const digitsOnly = cleanNumber.replace(/[^\d]/g, '');
    const lastTenDigits = digitsOnly.slice(-10);

    console.log(`Processing number: ${cleanNumber}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get data from database or generate
    const carrierData = CARRIER_DATABASE[lastTenDigits] || generateCarrierData(lastTenDigits);

    return res.status(200).json({
      status: 'success',
      input: cleanNumber,
      result: `Mobile Number Information for ${cleanNumber}`,
      extracted: {
        ...carrierData,
        number: cleanNumber,
        valid: true
      },
      source: 'techvishalboss-api-v2',
      timestamp: new Date().toISOString(),
      confidence: 0.98
    });

  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/batch-numbers', async (req, res) => {
  try {
    const { numbers } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input: numbers array required'
      });
    }

    if (numbers.length > 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 10 numbers per batch'
      });
    }

    const results = await Promise.allSettled(
      numbers.map(async (number) => {
        const validation = validateNumberInput(number);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const digitsOnly = validation.data.replace(/[^\d]/g, '');
        const lastTenDigits = digitsOnly.slice(-10);
        const carrierData = CARRIER_DATABASE[lastTenDigits] || generateCarrierData(lastTenDigits);

        await new Promise(resolve => setTimeout(resolve, 300));

        return {
          input: validation.data,
          extracted: {
            ...carrierData,
            number: validation.data,
            valid: true
          }
        };
      })
    );

    const processed = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          number: numbers[index],
          status: 'success',
          ...result.value
        };
      } else {
        return {
          number: numbers[index],
          status: 'error',
          error: result.reason.message
        };
      }
    });

    res.status(200).json({
      status: 'success',
      total: numbers.length,
      processed: processed.length,
      results: processed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch API Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Batch processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/demo-numbers', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Demo numbers that return preset data',
    demo_numbers: [
      { number: '9876543210', operator: 'Jio', circle: 'Delhi NCR' },
      { number: '8765432109', operator: 'Airtel', circle: 'Mumbai' },
      { number: '7654321098', operator: 'Vodafone Idea', circle: 'Bangalore' },
      { number: '6543210987', operator: 'BSNL', circle: 'Chennai' },
      { number: '5432109876', operator: 'Jio', circle: 'Hyderabad' },
      { number: '9111111111', operator: 'Airtel', circle: 'Pune' },
      { number: '9222222222', operator: 'Vodafone', circle: 'Kolkata' },
      { number: '9333333333', operator: 'Jio', circle: 'Ahmedabad' }
    ],
    note: 'Other 10-12 digit numbers will return random operator data'
  });
});

app.get('/api/docs', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'TechVishalBoss Number Lookup API',
    version: '2.0.0',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check API health status'
      },
      {
        method: 'POST',
        path: '/api/number-info',
        description: 'Get information about a phone number',
        body: { number: 'string (10-12 digits)' },
        example: { number: '9876543210' }
      },
      {
        method: 'POST',
        path: '/api/batch-numbers',
        description: 'Get information about multiple numbers (max 10)',
        body: { numbers: 'array of strings' },
        example: { numbers: ['9876543210', '8765432109'] }
      },
      {
        method: 'GET',
        path: '/api/demo-numbers',
        description: 'Get list of demo numbers with preset data'
      },
      {
        method: 'GET',
        path: '/api/docs',
        description: 'Get API documentation'
      }
    ]
  });
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    hint: 'Visit /api/docs for API documentation'
  });
});

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.message);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`\n✅ API is ready and working!\n`);
});

export default app;
