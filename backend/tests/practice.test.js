const request = require('supertest');
const express = require('express');

// Mock Kit model
const mockKitFindOne = jest.fn();
const mockKitSave = jest.fn();

jest.mock('../src/models/Kit', () => ({
  findOne: mockKitFindOne
}));

const practiceRouter = require('../src/routes/practice');
const app = express();
app.use(express.json());

// Mock session middleware
app.use((req, res, next) => {
  req.session = { userId: 'user1' };
  next();
});

const kitsRouter = express.Router();
kitsRouter.use('/:kitId/practice', practiceRouter);
app.use('/api/kits', kitsRouter);

describe('Practice API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const generateMockKit = () => ({
    _id: 'kit1',
    userId: 'user1',
    flashcards: [
      { id: 'f1', front: 'Q1', back: 'A1', requirement_ids: ['r1'] },
      { id: 'f2', front: 'Q2', back: 'A2', requirement_ids: ['r1'] }
    ],
    practice: {
      entries: () => [['f2', { confidence: 5, attempts: 1, lastPracticedAt: new Date(Date.now() - 10000) }]],
      get: (id) => id === 'f2' ? { confidence: 5, attempts: 1, lastPracticedAt: new Date(Date.now() - 10000) } : undefined,
      set: jest.fn()
    },
    save: mockKitSave
  });

  it('GET returns practice state and logically ordered next card', async () => {
    mockKitFindOne.mockResolvedValueOnce(generateMockKit());

    const res = await request(app).get(`/api/kits/kit1/practice`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.practiced).toBe(1);
    
    // Ordering logic: Unpracticed f1 should be first
    expect(res.body.nextCard.id).toBe('f1');
  });

  it('POST records confidence safely', async () => {
    const mockKit = generateMockKit();
    mockKitFindOne.mockResolvedValueOnce(mockKit);
    mockKitSave.mockResolvedValueOnce(mockKit);

    const res = await request(app)
      .post(`/api/kits/kit1/practice/f1`)
      .send({ confidence: 4 });
      
    expect(res.status).toBe(200);
    expect(mockKit.practice.set).toHaveBeenCalledWith('f1', expect.objectContaining({
      confidence: 4,
      attempts: 1
    }));
    expect(mockKitSave).toHaveBeenCalled();
  });

  it('POST rejects invalid confidence scores', async () => {
    const res = await request(app)
      .post(`/api/kits/kit1/practice/f1`)
      .send({ confidence: 6 });
      
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('integer');
  });

  it('POST rejects invalid flashcard IDs', async () => {
    mockKitFindOne.mockResolvedValueOnce(generateMockKit());

    const res = await request(app)
      .post(`/api/kits/kit1/practice/f99`)
      .send({ confidence: 3 });
      
    expect(res.status).toBe(404);
  });
});
