import express from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as cheerio from 'cheerio';
import validator from 'validator';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const EXTERNAL_API = 'https://techvishalboss.com/service_tool.php';

// ========== MIDDLEWARE ==========

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request Logging Middleware
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

  if (!/^[+]?[\d]{7,15}$/.test(cleaned.replace(/\s/g, ''))) {
    return { valid: false, error: 'Invalid number format. Use 7-15 digits' };
  }

  const sanitized = validator.escape(cleaned);

  return { valid: true, data: sanitized };
}

function parseHTMLResponse(htmlContent) {
  try {
    const $ = cheerio.load(htmlContent);
    
    const result = $('body').text() || htmlContent;
    
    const cleaned = result
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    return {
      raw: cleaned,
      extracted: extractKeyData(cleaned)
    };
  } catch (error) {
    console.error('HTML Parsing Error:', error.message);
    return {
      raw: htmlContent.substring(0, 500),
      extracted: null,
      parseError: error.message
    };
  }
}

function extractKeyData(text) {
  const data = {};

  const patterns = {
    operator: /operator[:\s]+([^\n,;]+)/i,
    carrier: /carrier[:\s]+([^\n,;]+)/i,
    type: /type[:\s]+([^\n,;]+)/i,
    circle: /circle[:\s]+([^\n,;]+)/i,
    status: /status[:\s]+([^\n,;]+)/i,
    country: /country[:\s]+([^\n,;]+)/i,
  };

  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      data[key] = match[1].trim();
    }
  });

  return Object.keys(data).length > 0 ? data : null;
}

// ========== API ENDPOINTS ==========

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TechVishalBoss API Wrapper',
    version: '1.0.0'
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
    console.log(`Processing number: ${cleanNumber}`);

    let externalResponse;
    try {
      externalResponse = await axios.post(
        EXTERNAL_API,
        { type: 'number', number: cleanNumber },
        {
          params: { type: 'number' },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000,
          validateStatus: () => true
        }
      );
    } catch (axiosError) {
      console.error('Axios Error:', axiosError.message);
      return res.status(503).json({
        status: 'error',
        message: 'External service unavailable',
        input: cleanNumber,
        error: axiosError.message
      });
    }

    const parsedResponse = parseHTMLResponse(externalResponse.data);

    return res.status(200).json({
      status: 'success',
      input: cleanNumber,
      result: parsedResponse.raw,
      extracted: parsedResponse.extracted,
      source: 'techvishalboss.com',
      timestamp: new Date().toISOString()
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

        const response = await axios.post(
          EXTERNAL_API,
          { type: 'number', number: validation.data },
          {
            params: { type: 'number' },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000,
            validateStatus: () => true
          }
        );

        return {
          input: validation.data,
          result: parseHTMLResponse(response.data)
        };
      })
    );

    const processed = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          number: numbers[index],
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

// ========== STATIC FILES & FRONTEND ==========

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

// ========== 404 HANDLER ==========

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ========== ERROR HANDLER ==========

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.message);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error'
  });
});

// ========== SERVER START ==========

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});

export default app;