const request = require('supertest');
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
const app = require('../src/app');
const mongoose = require('mongoose');
const Kit = require('../src/models/Kit');
const User = require('../src/models/User');

// Mock authentication middleware
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    if (req.headers.authorization === 'mock-auth') {
      req.session = { userId: 'mockUserId1' };
      return next();
    }
    if (req.headers.authorization === 'mock-auth-2') {
      req.session = { userId: 'mockUserId2' };
      return next();
    }
    return res.status(401).json({ error: { message: 'Unauthenticated' } });
  }
}));

// Mock kitService
jest.mock('../src/services/kitService', () => ({
  createKit: jest.fn((userId, data) => Promise.resolve({
    _id: 'mockKitId',
    userId,
    status: 'queued',
    source: { company_url: data.company_url, jd_chars: data.jd.length }
  })),
  getUserKits: jest.fn((userId) => {
    if (userId === 'mockUserId1') {
      return Promise.resolve([
        { _id: 'kit1', userId: 'mockUserId1', source: { company_url: 'http://a.com' } }
      ]);
    }
    return Promise.resolve([]);
  }),
  getUserKitById: jest.fn((id, userId) => {
    if (id === 'kit1' && userId === 'mockUserId1') {
      return Promise.resolve({ _id: 'kit1', userId: 'mockUserId1' });
    }
    return Promise.resolve(null);
  })
}));

describe('Kit API', () => {
  it('unauthenticated POST /api/kits -> 401', async () => {
    const res = await request(app).post('/api/kits').send({ jd: 'test', company_url: 'http://example.com', days: 5 });
    expect(res.statusCode).toBe(401);
  });

  it('valid authenticated kit creation', async () => {
    const res = await request(app)
      .post('/api/kits')
      .set('Authorization', 'mock-auth')
      .send({ jd: 'test', company_url: 'http://example.com', days: 5 });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.kit.id).toBe('mockKitId');
    expect(res.body.kit.status).toBe('queued');
  });

  it('invalid URL rejected', async () => {
    const res = await request(app)
      .post('/api/kits')
      .set('Authorization', 'mock-auth')
      .send({ jd: 'test', company_url: 'not-a-url', days: 5 });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/valid company URL/);
  });

  it('invalid days rejected', async () => {
    const res = await request(app)
      .post('/api/kits')
      .set('Authorization', 'mock-auth')
      .send({ jd: 'test', company_url: 'http://example.com', days: 100 });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/integer between 1 and 60/);
  });

  it('empty JD rejected', async () => {
    const res = await request(app)
      .post('/api/kits')
      .set('Authorization', 'mock-auth')
      .send({ jd: '   ', company_url: 'http://example.com', days: 5 });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/Job description is required/);
  });

  it('authenticated user can retrieve their own kits', async () => {
    const res = await request(app)
      .get('/api/kits')
      .set('Authorization', 'mock-auth');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.kits).toHaveLength(1);
    expect(res.body.kits[0].id).toBe('kit1');
  });

  it('another user\'s kit cannot be retrieved', async () => {
    const res = await request(app)
      .get('/api/kits/kit1')
      .set('Authorization', 'mock-auth-2'); // User 2 trying to get User 1's kit
    
    expect(res.statusCode).toBe(404);
  });

  it('user only sees their own kit list', async () => {
    const res = await request(app)
      .get('/api/kits')
      .set('Authorization', 'mock-auth-2');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.kits).toHaveLength(0); // User 2 has 0 kits
  });
});
