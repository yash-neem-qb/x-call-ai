const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// Using a simple UUID implementation instead of the ESM uuid module
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock users
const users = [
  {
    id: '1',
    email: 'user@example.com',
    password: 'yourpassword123',
    name: 'Demo User',
    role: 'admin',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  }
];

// Mock organizations
const organizations = [
  {
    id: 'dfb82ba4-67e1-42e8-9217-dc1f0c05ca4c',
    name: 'My Company',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    is_personal: false,
    role: 'owner'
  },
  {
    id: '7a1b2c3d-4e5f-6789-0123-456789abcdef',
    name: 'Personal Workspace',
    created_at: '2023-02-15T00:00:00.000Z',
    updated_at: '2023-02-15T00:00:00.000Z',
    is_personal: true,
    role: 'owner'
  },
  {
    id: 'abc12345-6789-def0-1234-56789abcdef0',
    name: 'Client Project',
    created_at: '2023-05-20T00:00:00.000Z',
    updated_at: '2023-05-20T00:00:00.000Z',
    is_personal: false,
    role: 'member'
  }
];

// Default organization ID
const DEFAULT_ORG_ID = organizations[0].id;

// Mock assistants
const assistants = [
  {
    id: '45c480c0-6873-4877-8418-4ff86c5',
    name: 'Sarah',
    voice: {
      provider: 'openai',
      voiceId: 'alloy',
      stability: 0.5,
      similarity: 0.8,
      speakingRate: 1.0,
      pitch: 1.0
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant named Sarah.'
    },
    firstMessage: 'Hello, this is Sarah. How can I help you today?',
    voicemailMessage: 'Please leave a message after the tone.',
    endCallMessage: 'Thank you for calling. Goodbye!',
    transcriber: {
      provider: 'openai',
      model: 'whisper-1'
    },
    createdAt: '2023-05-15T10:30:00.000Z',
    updatedAt: '2023-06-20T14:45:00.000Z',
    organizationId: ORGANIZATION_ID
  },
  {
    id: '22a480c0-1234-5678-9012-3ff86c5',
    name: 'Riley',
    voice: {
      provider: 'elevenlabs',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      stability: 0.7,
      similarity: 0.7,
      speakingRate: 1.1,
      pitch: 0.9
    },
    model: {
      provider: 'anthropic',
      model: 'claude-3-opus',
      temperature: 0.8,
      systemPrompt: 'You are a helpful assistant named Riley.'
    },
    firstMessage: 'Hi there, Riley speaking. What can I do for you?',
    voicemailMessage: null,
    endCallMessage: 'Thanks for chatting with me today. Have a great day!',
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2'
    },
    createdAt: '2023-08-10T09:15:00.000Z',
    updatedAt: '2023-09-05T11:20:00.000Z',
    organizationId: ORGANIZATION_ID
  },
  {
    id: '33b590d1-4321-8765-0987-6ff86c5',
    name: 'New Assistant',
    voice: {
      provider: 'openai',
      voiceId: 'echo',
      stability: 0.6,
      similarity: 0.9,
      speakingRate: 1.0,
      pitch: 1.0
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.'
    },
    firstMessage: 'Hello, how can I assist you today?',
    voicemailMessage: null,
    endCallMessage: null,
    transcriber: {
      provider: 'openai',
      model: 'whisper-1'
    },
    createdAt: '2023-09-26T08:30:00.000Z',
    updatedAt: '2023-09-26T08:30:00.000Z',
    organizationId: ORGANIZATION_ID
  }
];

// Mock dashboard summary
const dashboardSummary = {
  totalAssistants: 3,
  totalCalls: 128,
  totalDuration: 720, // minutes
  successRate: 92.5 // percentage
};

// Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email);
  
  if (!user || user.password !== password) {
    return res.status(401).json({
      message: 'Invalid email or password'
    });
  }
  
  // Create token - using a real JWT format for testing
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4OGFmOTdjMi1mY2E4LTRmMDMtOGI1Yy0wZWYyZDVlYjc5ZjEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJvcmdfaWQiOiJkZmI4MmJhNC02N2UxLTQyZTgtOTIxNy1kYzFmMGMwNWNhNGMiLCJleHAiOjE3NTg4ODI5NDZ9.AJ9HBCOizFwFvfPpBKxbIxPDu1qpRs4GrdlKKtoc0bI';
  
  return res.status(200).json({
    access_token: token,
    token_type: 'bearer',
    expires_in: 1800,
    user_id: '88af97c2-fca8-4f03-8b5c-0ef2d5eb79f1',
    email: user.email,
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    organization_id: DEFAULT_ORG_ID,
    organization_name: organizations[0].name
  });
});

// Get organizations endpoint
app.get('/api/v1/auth/organizations', (req, res) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Unauthorized'
    });
  }
  
  // Return organizations
  return res.status(200).json(organizations);
});

// Get assistants endpoint
app.get('/api/v1/organizations/:organizationId/assistants', (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const pageSizeNum = parseInt(pageSize);
  
  const start = (pageNum - 1) * pageSizeNum;
  const end = start + pageSizeNum;
  
  const paginatedAssistants = assistants.slice(start, end);
  
  return res.status(200).json({
    items: paginatedAssistants,
    total: assistants.length,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(assistants.length / pageSizeNum)
  });
});

// Get assistant by ID endpoint
app.get('/api/v1/organizations/:organizationId/assistants/:assistantId', (req, res) => {
  const { assistantId } = req.params;
  
  const assistant = assistants.find(a => a.id === assistantId);
  
  if (!assistant) {
    return res.status(404).json({
      message: 'Assistant not found'
    });
  }
  
  return res.status(200).json(assistant);
});

// Create assistant endpoint
app.post('/api/v1/organizations/:organizationId/assistants', (req, res) => {
  const newAssistant = {
    ...req.body,
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organizationId: req.params.organizationId
  };
  
  assistants.push(newAssistant);
  
  return res.status(201).json(newAssistant);
});

// Update assistant endpoint
app.put('/api/v1/organizations/:organizationId/assistants/:assistantId', (req, res) => {
  const { assistantId } = req.params;
  
  const assistantIndex = assistants.findIndex(a => a.id === assistantId);
  
  if (assistantIndex === -1) {
    return res.status(404).json({
      message: 'Assistant not found'
    });
  }
  
  const updatedAssistant = {
    ...assistants[assistantIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  assistants[assistantIndex] = updatedAssistant;
  
  return res.status(200).json(updatedAssistant);
});

// Delete assistant endpoint
app.delete('/api/v1/organizations/:organizationId/assistants/:assistantId', (req, res) => {
  const { assistantId } = req.params;
  
  const assistantIndex = assistants.findIndex(a => a.id === assistantId);
  
  if (assistantIndex === -1) {
    return res.status(404).json({
      message: 'Assistant not found'
    });
  }
  
  assistants.splice(assistantIndex, 1);
  
  return res.status(200).json({
    message: 'Assistant deleted successfully'
  });
});

// Get dashboard summary endpoint
app.get('/api/v1/organizations/:organizationId/dashboard/summary', (req, res) => {
  return res.status(200).json(dashboardSummary);
});

// Get assistant analytics endpoint
app.get('/api/v1/organizations/:organizationId/dashboard/assistants', (req, res) => {
  const { assistant_id } = req.query;
  
  let result;
  
  if (assistant_id) {
    const assistant = assistants.find(a => a.id === assistant_id);
    
    if (!assistant) {
      return res.status(404).json({
        message: 'Assistant not found'
      });
    }
    
    result = {
      assistant: assistant,
      analytics: {
        totalCalls: 42,
        totalDuration: 240, // minutes
        successRate: 94.5, // percentage
        averageCallLength: 5.7, // minutes
        callsByDay: [5, 8, 12, 7, 6, 3, 1]
      }
    };
  } else {
    result = {
      assistants: assistants.map(a => ({
        id: a.id,
        name: a.name,
        totalCalls: Math.floor(Math.random() * 50) + 10,
        successRate: Math.floor(Math.random() * 20) + 80,
        averageCallLength: (Math.random() * 5 + 3).toFixed(1)
      }))
    };
  }
  
  return res.status(200).json(result);
});

// Get hourly distribution endpoint
app.get('/api/v1/organizations/:organizationId/dashboard/hourly-distribution', (req, res) => {
  const { days = 7 } = req.query;
  
  // Generate random distribution data
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    // More calls during business hours
    const baseCount = i >= 8 && i <= 18 ? 5 : 1;
    return {
      hour: i,
      count: Math.floor(Math.random() * 10) + baseCount
    };
  });
  
  return res.status(200).json({
    days: parseInt(days),
    distribution: hourlyData
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
});
