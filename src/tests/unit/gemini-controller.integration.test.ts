import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { GeminiController } from '../../server/modules/proxy/gemini.controller';

function createReplyMock() {
  const reply: Record<string, any> = {};
  reply.status = vi.fn(() => reply);
  reply.header = vi.fn(() => reply);
  reply.send = vi.fn(() => reply);
  return reply;
}

describe('GeminiController Integration', () => {
  it('supports list and get model endpoints', () => {
    const proxyService = {};
    const controller = new GeminiController(proxyService as any);
    const replyList = createReplyMock();
    const replyGet = createReplyMock();

    controller.listModels(replyList as any);
    controller.getModel('gemini-2.5-flash', replyGet as any);

    expect(replyList.status).toHaveBeenCalledWith(200);
    expect(replyList.send).toHaveBeenCalledWith(
      expect.objectContaining({
        models: expect.any(Array),
      }),
    );
    expect(replyList.send).toHaveBeenCalledWith(
      expect.objectContaining({
        models: expect.arrayContaining([
          expect.objectContaining({
            name: 'models/gemini-2.5-flash',
            description: '',
            inputTokenLimit: 128000,
            outputTokenLimit: 8192,
            supportedGenerationMethods: ['generateContent', 'countTokens'],
          }),
        ]),
      }),
    );
    expect(replyGet.status).toHaveBeenCalledWith(200);
    expect(replyGet.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'models/gemini-2.5-flash',
        displayName: 'gemini-2.5-flash',
      }),
    );
  });

  it('handles generateContent action from colon endpoint format', async () => {
    const proxyService = {
      handleGeminiGenerateContent: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: { role: 'model', parts: [{ text: 'hello' }] },
            finishReason: 'STOP',
            avgLogprobs: -0.1,
          },
        ],
        usageMetadata: {
          promptTokenCount: 1,
          candidatesTokenCount: 1,
          totalTokenCount: 2,
        },
        createTime: '2026-02-10T10:00:00.000Z',
        modelVersion: 'gemini-2.5-flash-latest',
        responseId: 'resp_123',
      }),
      handleGeminiStreamGenerateContent: vi.fn(),
    };
    const controller = new GeminiController(proxyService as any);
    const reply = createReplyMock();

    await controller.modelAction(
      'models/gemini-2.5-flash:generateContent',
      { contents: [{ role: 'user', parts: [{ text: 'hello' }] }] } as any,
      reply as any,
    );

    expect(proxyService.handleGeminiGenerateContent).toHaveBeenCalledWith(
      'models/gemini-2.5-flash',
      expect.any(Object),
    );
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      candidates: [
        {
          content: { role: 'model', parts: [{ text: 'hello' }] },
          finishReason: 'STOP',
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 1,
        totalTokenCount: 2,
      },
    });
  });

  it('handles streamGenerateContent action and emits SSE headers', async () => {
    const stream = of('data: {"ok":true}\n\n');
    const proxyService = {
      handleGeminiGenerateContent: vi.fn(),
      handleGeminiStreamGenerateContent: vi.fn().mockResolvedValue(stream),
    };
    const controller = new GeminiController(proxyService as any);
    const reply = createReplyMock();

    await controller.modelAction(
      'gemini-2.5-flash:streamGenerateContent',
      { contents: [{ role: 'user', parts: [{ text: 'hello' }] }] } as any,
      reply as any,
    );

    expect(reply.header).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(reply.header).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(reply.send).toHaveBeenCalledWith(stream);
  });

  it('supports countTokens action', async () => {
    const proxyService = {
      handleGeminiGenerateContent: vi.fn(),
      handleGeminiStreamGenerateContent: vi.fn(),
    };
    const controller = new GeminiController(proxyService as any);
    const reply = createReplyMock();

    await controller.countTokens(
      'gemini-2.5-flash',
      { contents: [{ role: 'user', parts: [{ text: 'abcd efgh' }] }] } as any,
      reply as any,
    );

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ totalTokens: 0 });
  });

  it('returns bad request for invalid combined endpoint action', async () => {
    const proxyService = {
      handleGeminiGenerateContent: vi.fn(),
      handleGeminiStreamGenerateContent: vi.fn(),
    };
    const controller = new GeminiController(proxyService as any);
    const reply = createReplyMock();

    await controller.modelAction(
      'models/gemini-2.5-flash-generateContent',
      { contents: [{ role: 'user', parts: [{ text: 'hello' }] }] } as any,
      reply as any,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          status: 'INVALID_ARGUMENT',
        }),
      }),
    );
  });
});
