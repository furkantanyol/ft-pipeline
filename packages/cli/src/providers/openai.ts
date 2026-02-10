import type { Provider, FineTuneConfig, JobStatus, Message } from './types.js';

export class OpenAIProvider implements Provider {
  name = 'openai';

  async uploadTrainingFile(_filePath: string): Promise<string> {
    // TODO: implement OpenAI file upload
    throw new Error('Not implemented');
  }

  async createFineTuneJob(_config: FineTuneConfig): Promise<string> {
    // TODO: implement OpenAI fine-tune job creation
    throw new Error('Not implemented');
  }

  async getJobStatus(_jobId: string): Promise<JobStatus> {
    // TODO: implement OpenAI job status check
    throw new Error('Not implemented');
  }

  async runInference(_model: string, _messages: Message[]): Promise<string> {
    // TODO: implement OpenAI inference
    throw new Error('Not implemented');
  }
}
